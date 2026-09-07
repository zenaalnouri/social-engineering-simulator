async function adminRequest(endpoint, method = 'GET', data = null) {
  const options = { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } };
  if (data) options.body = JSON.stringify(data);
  const response = await fetch(endpoint, options);
  const body = await response.json();
  if (!response.ok || body.success === false) throw new Error(body.message || 'Request failed');
  return body.data;
}

function setAdminMessage(message, isError = false) {
  const element = document.getElementById('adminMessage');
  element.textContent = message;
  element.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
}

function setAdminAuthenticated(username) {
  document.getElementById('adminLoginPanel').hidden = true;
  document.getElementById('adminToolbar').hidden = false;
  document.getElementById('adminContent').hidden = false;
  document.getElementById('adminSubtitle').textContent = `Signed in as ${username}`;
}

function setAdminLoggedOut(message = 'You have been logged out.') {
  sessionStorage.removeItem('adminUsername');
  document.getElementById('adminLoginPanel').hidden = false;
  document.getElementById('adminToolbar').hidden = true;
  document.getElementById('adminContent').hidden = true;
  document.getElementById('adminLoginForm').reset();
  setAdminMessage(message);
}

function renderStats(stats) {
  const labels = [
    ['users', 'Regular users'],
    ['admin_users', 'Admin accounts'],
    ['scenarios', 'Scenarios'],
    ['alerts', 'Alerts'],
    ['results', 'Saved Results']
  ];
  document.getElementById('adminStats').innerHTML = labels.map(([key, label]) => `
    <div class="card admin-stat"><span>${label}</span><strong>${stats[key]}</strong></div>
  `).join('');
}

function renderResults(results) {
  document.getElementById('resultsRows').innerHTML = results.length ? results.map(result => `
    <tr><td>${result.user_name || result.user_id}</td><td>${result.score}/${result.total_questions}</td>
    <td>${result.percentage}%</td><td>${result.awareness_level}</td><td>${result.date || '-'}</td></tr>
  `).join('') : '<tr><td colspan="5">No saved results yet.</td></tr>';
}

function renderScenarios(scenarios) {
  window.adminScenarios = scenarios;
  document.getElementById('scenarioRows').innerHTML = scenarios.map(scenario => `
    <tr><td>${scenario.id}</td><td>${scenario.title}</td><td>${scenario.category}</td>
    <td>${Object.values(scenario.options || {}).map(option => `<div>${option}</div>`).join('')}</td>
    <td class="scenario-actions"><button class="scenario-action scenario-action-edit edit-scenario" data-id="${scenario.id}">Edit</button>
    <button class="scenario-action scenario-action-delete delete-scenario" data-id="${scenario.id}">Delete</button></td></tr>
  `).join('');
  document.querySelectorAll('.edit-scenario').forEach(button => button.addEventListener('click', editScenario));
  document.querySelectorAll('.delete-scenario').forEach(button => button.addEventListener('click', deleteScenario));
}

function renderAlerts(alerts) {
  document.getElementById('alertRows').innerHTML = alerts.map(alert => `
    <tr>
      <td><strong>${alert.title}</strong><p>${alert.description}</p></td>
      <td><strong>${alert.title_en}</strong><p>${alert.description_en}</p></td>
    </tr>
  `).join('');
}

function editScenario(event) {
  const scenario = window.adminScenarios.find(item => item.id === Number(event.currentTarget.dataset.id));
  if (!scenario) return;
  document.getElementById('scenarioId').value = scenario.id;
  document.querySelectorAll('[data-scenario-field]').forEach(field => {
    field.value = scenario[field.dataset.scenarioField] || '';
  });
  document.getElementById('scenarioForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteScenario(event) {
  const id = event.currentTarget.dataset.id;
  if (!window.confirm('Delete this scenario?')) return;
  try {
    await adminRequest(`/admin/scenarios/${id}`, 'DELETE');
    await loadAdmin();
    setAdminMessage('Scenario deleted.');
  } catch (error) {
    setAdminMessage(error.message, true);
  }
}

function clearScenarioForm() {
  document.getElementById('scenarioForm').reset();
  document.getElementById('scenarioId').value = '';
}

async function saveScenario(event) {
  event.preventDefault();
  const payload = {};
  document.querySelectorAll('[data-scenario-field]').forEach(field => {
    payload[field.dataset.scenarioField] = field.value.trim();
  });
  const id = document.getElementById('scenarioId').value;
  try {
    await adminRequest(id ? `/admin/scenarios/${id}` : '/admin/scenarios', id ? 'PUT' : 'POST', payload);
    clearScenarioForm();
    await loadAdmin();
    setAdminMessage(id ? 'Scenario updated.' : 'Scenario created.');
  } catch (error) {
    setAdminMessage(error.message, true);
  }
}

async function loadAdmin() {
  try {
    const [stats, results, scenarios, alerts] = await Promise.all([
      adminRequest('/admin/dashboard'),
      adminRequest('/admin/results'),
      adminRequest('/admin/scenarios'),
      adminRequest('/admin/alerts')
    ]);
    renderStats(stats);
    renderResults(results);
    renderScenarios(scenarios);
    renderAlerts(alerts);
    setAdminAuthenticated(sessionStorage.getItem('adminUsername') || 'admin');
    setAdminMessage('Admin data loaded.');
  } catch (error) {
    setAdminMessage(error.message, true);
  }
}

document.getElementById('adminLoginForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const data = await adminRequest('/admin/login', 'POST', {
      username: document.getElementById('adminUsername').value,
      password: document.getElementById('adminPassword').value
    });
    sessionStorage.setItem('adminUsername', data.username);
    setAdminAuthenticated(data.username);
    loadAdmin();
  } catch (error) {
    setAdminMessage(error.message, true);
  }
});

document.getElementById('refreshAdmin').addEventListener('click', loadAdmin);
document.getElementById('logoutAdmin').addEventListener('click', async () => {
  try {
    await adminRequest('/admin/logout', 'POST');
  } finally {
    setAdminLoggedOut();
  }
});
document.getElementById('scenarioForm').addEventListener('submit', saveScenario);
document.getElementById('clearScenarioForm').addEventListener('click', clearScenarioForm);
document.getElementById('passwordToggle').addEventListener('click', event => {
  const password = document.getElementById('adminPassword');
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  event.currentTarget.textContent = visible ? 'Show' : 'Hide';
  event.currentTarget.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
  event.currentTarget.setAttribute('title', visible ? 'Show password' : 'Hide password');
});
document.getElementById('langToggle').addEventListener('click', () => {
  if (typeof i18n !== 'undefined') i18n.toggleLanguage();
});

async function prepareAdminLogin() {
  try {
    await adminRequest('/admin/logout', 'POST');
  } catch (error) {
    console.debug('No previous admin session to clear.');
  }
  setAdminLoggedOut('Please sign in to open the admin panel.');
}

prepareAdminLogin();
