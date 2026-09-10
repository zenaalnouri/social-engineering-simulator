// API access for the simulator frontend.

class APIManager {
  constructor(baseURL = window.location.origin) {
    this.storageKeys = {
      sessionId: 'simulationSessionId',
      userId: 'simulationUserId',
      scenarioData: 'simulationScenarios',
      currentScenario: 'currentScenario',
      complete: 'simulationComplete',
      language: 'simulationLanguage'
    };
    this.baseURL = baseURL;
    this.timeout = 10000; // 10 seconds timeout
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`;

    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      options.signal = controller.signal;

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      const body = contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message = (body && (body.message || body.error))
          ? (body.message || body.error)
          : `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(message);
        error.status = response.status;
        error.body = body;
        throw error;
      }

      return body;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, 'GET');
  }

  async post(endpoint, data) {
    return this.request(endpoint, 'POST', data);
  }

  async startSimulation(username) {
    const language =
      (typeof i18n !== 'undefined' && typeof i18n.getCurrentLanguage === 'function')
        ? i18n.getCurrentLanguage()
        : 'en';

    const userResponse = await this.post('/users', { name: username });
    const user = userResponse.data;

    const simulationResponse = await this.post('/simulation/start', {
      user_id: user.id,
      language
    });

    const simulation = simulationResponse.data;
    const scenarios = Array.isArray(simulation.scenarios)
      ? simulation.scenarios
      : [];

    if (!simulation.attempt || !simulation.attempt.id || !scenarios.length) {
      throw new Error('Invalid simulation data returned by the server.');
    }

    this.setSimulationSession({
      sessionId: simulation.attempt.id,
      userId: user.id,
      language,
      scenarios
    });

    return {
      session_id: simulation.attempt.id,
      user_id: user.id,
      scenarios,
      language,
      source: 'backend'
    };
  }

  // ============================================
  // SESSION / SIMULATION STORAGE
  // ============================================

  getSessionId() {
    return sessionStorage.getItem(this.storageKeys.sessionId);
  }

  getUserId() {
    return sessionStorage.getItem(this.storageKeys.userId);
  }

  getSimulationLanguage() {
    return sessionStorage.getItem(this.storageKeys.language);
  }

  getScenarioPool() {
    try {
      const scenarios = JSON.parse(
        sessionStorage.getItem(this.storageKeys.scenarioData) || '[]'
      );
      return Array.isArray(scenarios) ? scenarios : [];
    } catch (error) {
      return [];
    }
  }

  setSimulationSession({ sessionId, userId, language, scenarios }) {
    sessionStorage.setItem(this.storageKeys.sessionId, String(sessionId));
    sessionStorage.setItem(this.storageKeys.userId, String(userId));
    sessionStorage.setItem(this.storageKeys.language, language);
    sessionStorage.setItem(this.storageKeys.scenarioData, JSON.stringify(scenarios));
    sessionStorage.setItem(this.storageKeys.currentScenario, '1');
    sessionStorage.setItem(this.storageKeys.complete, 'false');
  }

  setCurrentScenario(number) {
    sessionStorage.setItem(this.storageKeys.currentScenario, String(number));
  }

  getCurrentScenarioNumber() {
    return parseInt(
      sessionStorage.getItem(this.storageKeys.currentScenario) || '1',
      10
    );
  }

  getScenarioByIndex(index) {
    return this.getScenarioPool()[index] || null;
  }

  // Get one of the five scenarios assigned to the active simulation.
  getScenario(index) {
    return this.getScenarioByIndex(index);
  }

  async submitAnswer(scenarioId, answerId) {
    const sessionId = this.getSessionId();

    if (!sessionId) {
      throw new Error('No active simulation session.');
    }

    const response = await this.post('/simulation/answer', {
      attempt_id: Number(sessionId),
      scenario_id: Number(scenarioId),
      selected_answer: String.fromCharCode(64 + Number(answerId))
    });

    return response.data;
  }

  async finishSimulation() {
    const sessionId = this.getSessionId();

    if (!sessionId) {
      throw new Error('No active simulation session.');
    }

    const response = await this.post('/simulation/finish', {
      attempt_id: Number(sessionId)
    });

    return response.data;
  }

  clearSimulation() {
    Object.values(this.storageKeys).forEach(key => {
      sessionStorage.removeItem(key);
    });

    // Remove old keys from the previous frontend version as well.
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('scenarioPool');
  }

  async getResults(userId) {
    try {
      const response = await this.get(`/results/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching results:', error);
      return [];
    }
  }

  async getLeaderboard() {
    try {
      const response = await this.get('/leaderboard');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async getAlerts() {
    const lang = (typeof i18n !== 'undefined' && i18n.getCurrentLanguage) ? i18n.getCurrentLanguage() : 'en';
    try {
      const response = await this.get(`/alerts?lang=${lang}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

}

// Create global API instance
const API = new APIManager();
