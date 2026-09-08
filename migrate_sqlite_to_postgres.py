"""Copy the existing SQLite database to PostgreSQL without changing SQLite."""

import argparse
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from sqlalchemy import Boolean, DateTime, create_engine, func, select, text

from app.models import db


DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent / "database.db"


def _database_url():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL must point to the target PostgreSQL database")
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url[len("postgres://"):]
    if not database_url.startswith("postgresql://"):
        raise RuntimeError("DATABASE_URL must use the postgresql:// scheme")
    return database_url


def _open_sqlite_read_only(path):
    sqlite_uri = f"file:{quote(str(path.resolve()))}?mode=ro"
    connection = sqlite3.connect(sqlite_uri, uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def _source_counts(sqlite_connection, tables):
    return {
        table.name: sqlite_connection.execute(
            f'SELECT COUNT(*) FROM "{table.name}"'
        ).fetchone()[0]
        for table in tables
    }


def _target_counts(connection, tables):
    return {
        table.name: connection.execute(
            select(func.count()).select_from(table)
        ).scalar_one()
        for table in tables
    }


def _verify_foreign_keys(connection, tables):
    preparer = connection.dialect.identifier_preparer
    orphaned = []
    for table in tables:
        for foreign_key in table.foreign_keys:
            parent_table = foreign_key.column.table
            child_column = preparer.quote(foreign_key.parent.name)
            parent_column = preparer.quote(foreign_key.column.name)
            child_table = preparer.quote(table.name)
            parent_name = preparer.quote(parent_table.name)
            query = text(
                f"SELECT COUNT(*) FROM {child_table} AS child "
                f"LEFT JOIN {parent_name} AS parent "
                f"ON child.{child_column} = parent.{parent_column} "
                f"WHERE child.{child_column} IS NOT NULL "
                f"AND parent.{parent_column} IS NULL"
            )
            count = connection.execute(query).scalar_one()
            if count:
                orphaned.append(
                    f"{table.name}.{foreign_key.parent.name} -> "
                    f"{parent_table.name}.{foreign_key.column.name}: {count}"
                )
    if orphaned:
        raise RuntimeError(
            "Foreign-key verification failed: " + "; ".join(orphaned))


def _reset_sequence(connection, table):
    if "id" not in table.c:
        return
    sequence = connection.execute(
        text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
        {"table_name": table.name},
    ).scalar_one_or_none()
    if not sequence:
        return
    maximum = connection.execute(select(func.max(table.c.id))).scalar_one()
    if maximum is None:
        connection.execute(
            text("SELECT setval(:sequence_name, 1, false)"),
            {"sequence_name": sequence},
        )
    else:
        connection.execute(
            text("SELECT setval(:sequence_name, :value, true)"),
            {"sequence_name": sequence, "value": maximum},
        )


def _copy_table(sqlite_connection, connection, table):
    columns = [column.name for column in table.columns]
    selected_columns = ", ".join(f'"{column}"' for column in columns)
    rows = sqlite_connection.execute(
        f'SELECT {selected_columns} FROM "{table.name}"'
    ).fetchall()
    if rows:
        def convert_row(row):
            converted = {}
            for column, value in zip(table.columns, row):
                if value is not None and isinstance(column.type, DateTime):
                    value = datetime.fromisoformat(
                        str(value).replace("Z", "+00:00"))
                elif value is not None and isinstance(column.type, Boolean):
                    value = bool(value)
                converted[column.name] = value
            return converted

        connection.execute(
            table.insert(),
            [convert_row(row) for row in rows],
        )


def verify(sqlite_path, database_url):
    sqlite_connection = _open_sqlite_read_only(sqlite_path)
    engine = create_engine(database_url)
    tables = list(db.metadata.sorted_tables)
    try:
        source = _source_counts(sqlite_connection, tables)
        with engine.connect() as connection:
            target = _target_counts(connection, tables)
            _verify_foreign_keys(connection, tables)
        if source != target:
            raise RuntimeError(
                f"Row counts differ. SQLite: {source}; PostgreSQL: {target}")
        for table_name in source:
            print(f"{table_name}: {source[table_name]} rows")
        print("Verification passed: all table counts and foreign keys match.")
    finally:
        sqlite_connection.close()
        engine.dispose()


def migrate(sqlite_path, database_url):
    sqlite_connection = _open_sqlite_read_only(sqlite_path)
    engine = create_engine(database_url)
    tables = list(db.metadata.sorted_tables)
    try:
        broken_foreign_keys = sqlite_connection.execute(
            "PRAGMA foreign_key_check"
        ).fetchall()
        if broken_foreign_keys:
            raise RuntimeError("SQLite contains broken foreign-key references")
        source = _source_counts(sqlite_connection, tables)
        with engine.begin() as connection:
            db.metadata.create_all(connection)
            for table in tables:
                _copy_table(sqlite_connection, connection, table)
            for table in tables:
                _reset_sequence(connection, table)
            target = _target_counts(connection, tables)
            _verify_foreign_keys(connection, tables)
            if source != target:
                raise RuntimeError(
                    f"Row counts differ. SQLite: {source}; PostgreSQL: {target}"
                )
        for table_name in source:
            print(f"{table_name}: {source[table_name]} rows copied")
        print("Migration and verification completed. SQLite was not modified.")
    finally:
        sqlite_connection.close()
        engine.dispose()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sqlite-path", type=Path,
                        default=DEFAULT_SQLITE_PATH)
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="compare SQLite and PostgreSQL without copying data",
    )
    args = parser.parse_args()
    if not args.sqlite_path.is_file():
        raise FileNotFoundError(
            f"SQLite database not found: {args.sqlite_path}")
    database_url = _database_url()
    if args.verify_only:
        verify(args.sqlite_path, database_url)
    else:
        migrate(args.sqlite_path, database_url)


if __name__ == "__main__":
    main()
