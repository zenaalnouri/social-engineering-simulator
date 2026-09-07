// API access for the simulator frontend.

class APIManager {
  constructor(baseURL = window.location.origin) {
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
        const message = (body && body.error) ? body.error : `HTTP ${response.status}: ${response.statusText}`;
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
    const language = (typeof i18n !== 'undefined' && i18n.getCurrentLanguage)
      ? i18n.getCurrentLanguage()
      : 'en';
    try {
      const userResponse = await this.post('/users', { name: username });
      const user = userResponse.data;
      const simulationResponse = await this.post('/simulation/start', {
        user_id: user.id,
        language
      });
      const simulation = simulationResponse.data;
      const scenarios = simulation.scenarios.map(scenario => ({
        ...scenario,
        content: scenario.content || scenario.description,
        answers: scenario.answers || [
          { id: 1, text: scenario.question.option_a },
          { id: 2, text: scenario.question.option_b },
          { id: 3, text: scenario.question.option_c },
          { id: 4, text: scenario.question.option_d }
        ]
      }));
      return {
        session_id: simulation.attempt.id,
        user_id: user.id,
        scenarios,
        source: 'backend'
      };
    } catch (error) {
      console.error('Error starting simulation:', error);
      throw error;
    }
  }

  async submitAnswer(sessionId, scenarioId, answerId) {
    if (!sessionId) throw new Error('No active simulation session.');

    try {
      const response = await this.post('/simulation/answer', {
        attempt_id: Number(sessionId),
        scenario_id: scenarioId,
        selected_answer: String.fromCharCode(64 + answerId),
        language: (typeof i18n !== 'undefined' && i18n.getCurrentLanguage)
          ? i18n.getCurrentLanguage()
          : 'en'
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  async finishSimulation(sessionId, userId) {
    if (!sessionId || !userId) throw new Error('No active simulation session.');

    try {
      const response = await this.post('/simulation/finish', {
        attempt_id: Number(sessionId)
      });
      return response.data;
    } catch (error) {
      console.error('Error finishing simulation:', error);
      throw error;
    }
  }

  async getResults(userId) {
    try {
      const response = await this.get(`/results/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching results:', error);
      return { user_id: userId, results: [] };
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
