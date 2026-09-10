// ============================================
// Social Engineering Simulator - Main Application
// ============================================

class SimulationApp {
  constructor() {
    this.currentScenario = null;
    this.currentScenarioNumber = 1;
    this.userScore = 0;
    this.totalScenarios = 5;
    this.pointsPerScenario = 1;
    this.userName = '';
    this.userAnswers = [];
    this.isAnswered = false;
    this.sessionId = null;
    this.userId = null;
    this.scenarioData = [];
    
    this.init();
  }
  
  /**
   * Initialize the application
   */
  init() {
    this.setupEventListeners();
    this.loadCurrentPage();
  }
  
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Language toggle
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => i18n.toggleLanguage());
    }
    
    // Navigation links
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', (e) => this.handleNavigation(e));
    });
    
    // Listen for language changes
    window.addEventListener('languageChanged', () => {
      this.updatePageLayout();
      this.loadHomeAlerts();
      this.loadAlertsPage();
    });
  }
  
  /**
   * Load current page based on URL or hash
   */
  loadCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    // Initialize page-specific functionality
    if (page === 'index.html' || page === '') {
      this.initHomePage();
    } else if (page === 'simulation.html') {
      this.initSimulationPage();
    } else if (page === 'scenario.html') {
      this.initScenarioPage();
    } else if (page === 'feedback.html') {
      this.initFeedbackPage();
    } else if (page === 'result.html') {
      this.initResultPage();
    } else if (page === 'alerts.html') {
      this.initAlertsPage();
    } else if (page === 'about.html') {
      this.initAboutPage();
    }
  }
  
  /**
   * Initialize Home Page
   */
  initHomePage() {
    const startBtn = document.getElementById('startSimulationBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        window.location.href = './pages/simulation.html';
      });
    }
    this.loadHomeLeaderboard();
    this.loadHomeAlerts();
  }

  async loadHomeLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    try {
      const entries = await API.getLeaderboard();
      if (!entries.length) {
        container.innerHTML = '<p class="muted-text">No completed simulations yet.</p>';
        return;
      }
      container.innerHTML = entries.slice(0, 5).map((entry, index) => `
        <div class="leaderboard-item">
          <div class="item-left"><div class="item-number">${index + 1}</div>
          <div class="item-details"><div class="item-name">${entry.user_name || 'User'}</div>
          <div class="item-meta">${entry.awareness_level}</div></div></div>
          <div class="item-score"><span class="score-value">${entry.score}</span><span class="score-unit">/5</span></div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }

  async loadHomeAlerts() {
    const container = document.getElementById('homeAlertsGrid');
    if (!container) return;
    try {
      const alerts = await API.getAlerts();
      container.innerHTML = alerts.slice(0, 3).map((alert, index) => `
        <div class="card text-left alert-card alert-${['pink', 'orange', 'blue'][index % 3]}">
          <h4>${alert.title}</h4><p>${alert.description}</p>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading home alerts:', error);
    }
  }
  
  /**
   * Initialize Simulation (Name Input) Page
   */
  initSimulationPage() {
    const nameInput = document.getElementById('nameInput');
    const startBtn = document.getElementById('startBtn');
    
    const updateStartButton = () => {
      if (!nameInput || !startBtn) return;
      const value = nameInput.value.trim();
      const isValid = value.length >= 2;
      startBtn.disabled = !isValid;
    };

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startSimulation(nameInput).catch(err => {
          console.error('Error starting simulation:', err);
          this.showAlert('error.serverError', 'danger');
          startBtn.disabled = false;
        });
      });
    }
    
    if (nameInput) {
      nameInput.addEventListener('input', updateStartButton);
      nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !startBtn.disabled) {
          this.startSimulation(nameInput).catch(err => {
            console.error('Error starting simulation:', err);
            this.hideLoading();
            this.showAlert('error.serverError', 'danger');
            startBtn.disabled = false;
          });
        }
      });
      nameInput.focus();
      updateStartButton();
    }
  }
  
  /**
   * Start the simulation
   */
  async startSimulation(nameInput) {
    const name = nameInput.value.trim();
    
    // Validation
    if (!name) {
      this.showAlert('validation.nameRequired', 'danger');
      return;
    }
    
    if (name.length < 2) {
      this.showAlert('validation.nameTooShort', 'danger');
      return;
    }
    
    if (name.length > 50) {
      this.showAlert('validation.nameTooLong', 'danger');
      return;
    }

    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.disabled = true;
    this.showLoading();

    // Ask the backend for a fresh session + 5 random scenarios
    // (correct answers are never included in this response).
    const response = await API.startSimulation(name);

    this.hideLoading();

    // API owns the simulation session, user ID, language, and scenario pool.
    this.userName = name;
    this.userScore = 0;
    this.currentScenarioNumber = 1;
    this.userAnswers = [];
    this.totalScenarios = response.scenarios.length || this.totalScenarios;

    sessionStorage.setItem('userName', name);
    sessionStorage.setItem('userAnswers', JSON.stringify([]));
    sessionStorage.setItem('userScore', '0');
    
    // Redirect to scenario page
    window.location.href = './scenario.html';
  }
  
  /**
   * Initialize Scenario Page
   */
  initScenarioPage() {
    // Retrieve user data from session
    this.userName = sessionStorage.getItem('userName') || 'User';
    this.userScore = parseInt(sessionStorage.getItem('userScore')) || 0;
    this.userAnswers = JSON.parse(sessionStorage.getItem('userAnswers') || '[]');
    this.currentScenarioNumber = API.getCurrentScenarioNumber();
    this.sessionId = API.getSessionId();
    this.userId = API.getUserId();

    if (!this.ensureScenarioPool()) {
      // No valid scenario set for this session - send the user back to start.
      window.location.href = './simulation.html';
      return;
    }

    this.totalScenarios = this.scenarioData.length;
    this.preventBackNavigation();
    this.restrictNavToHome();
    this.loadScenario();
    this.setupScenarioEvents();
  }

  /**
   * Initialize feedback page after scenario answer
   */
  initFeedbackPage() {
    this.userName = sessionStorage.getItem('userName') || 'User';
    this.userScore = parseInt(sessionStorage.getItem('userScore')) || 0;
    this.userAnswers = JSON.parse(sessionStorage.getItem('userAnswers') || '[]');
    this.currentScenarioNumber = API.getCurrentScenarioNumber();
    this.sessionId = API.getSessionId();
    this.userId = API.getUserId();
    const scenarioPool = API.getScenarioPool();
    if (scenarioPool.length) this.totalScenarios = scenarioPool.length;

    this.preventBackNavigation();
    this.restrictNavToHome();
    this.renderFeedbackPage();
  }

  /**
   * Render feedback page content
   */
  renderFeedbackPage() {
    const feedbackContainer = document.getElementById('feedbackContainer');
    if (!feedbackContainer) return;

    const feedbackData = JSON.parse(sessionStorage.getItem('feedbackData') || '{}');
    if (!feedbackData || typeof feedbackData.isCorrect !== 'boolean') {
      window.location.href = './scenario.html';
      return;
    }

    const headerClass = feedbackData.isCorrect ? 'correct' : 'incorrect';
    const titleText = feedbackData.isCorrect
      ? i18n.t('feedback.greatJob')
      : i18n.t('feedback.notQuiteRight');
    const subtitleText = feedbackData.isCorrect
      ? i18n.t('feedback.correctThreat')
      : i18n.t('feedback.learnScenario');
    const currentLanguage = i18n.getCurrentLanguage();
    const categoryText =
      (currentLanguage === 'ar'
        ? feedbackData.category_ar
        : feedbackData.category_en)
      || feedbackData.category
      || i18n.t('feedback.generalScam');

    const shouldKnowText =
      (currentLanguage === 'ar'
        ? feedbackData.explanation_ar
        : feedbackData.explanation_en)
      || feedbackData.shouldKnow
      || feedbackData.explanation
      || '';

    const redFlags =
      currentLanguage === 'ar'
        ? (Array.isArray(feedbackData.red_flags_ar) ? feedbackData.red_flags_ar : [])
        : (Array.isArray(feedbackData.red_flags_en) ? feedbackData.red_flags_en : []);
    const iconChar = feedbackData.isCorrect ? '✓' : '✕';
    const iconClass = feedbackData.isCorrect ? 'correct' : 'incorrect';

    const redFlagsHtml = redFlags.length
      ? `<ul class="feedback-list">${redFlags.map(flag => `<li>${flag}</li>`).join('')}</ul>`
      : `<p>${i18n.t('feedback.noRedFlags')}</p>`;

    const isLastScenario = this.currentScenarioNumber >= this.totalScenarios;
    const nextButtonLabel = isLastScenario
      ? i18n.t('feedback.viewFinalResults')
      : i18n.t('feedback.nextScenario');

    feedbackContainer.innerHTML = `
      <div class="feedback-hero ${headerClass}">
        <div class="feedback-icon ${iconClass}">
          <span class="feedback-icon-outer">
            <span class="feedback-icon-inner">${iconChar}</span>
          </span>
        </div>
        <div class="feedback-hero-copy">
          <h1>${titleText}</h1>
          <p>${subtitleText}</p>
        </div>
      </div>
      <div class="feedback-board">
        <div class="feedback-note">
          <h4>${i18n.t('feedback.whatYouShouldKnow')}</h4>
          <p>${shouldKnowText}</p>
        </div>
        <div class="feedback-section feedback-flags">
          <h4>${i18n.t('feedback.redFlagsDetected')}</h4>
          ${redFlagsHtml}
        </div>
        <p class="feedback-category">${i18n.t('feedback.category')}: ${categoryText}</p>
        <div class="feedback-actions">
          <button class="btn btn-primary btn-full" id="nextScenarioBtn">${nextButtonLabel}</button>
        </div>
      </div>
    `;

    document.getElementById('nextScenarioBtn').addEventListener('click', () => {
      if (isLastScenario) {
        this.goToResults();
      } else {
        const nextNumber = this.currentScenarioNumber + 1;
        API.setCurrentScenario(nextNumber);
        window.location.href = './scenario.html';
      }
    });
  }
  
  /**
   * Load the current scenario from the set fetched at /simulation/start.
   * No network call needed here - all 5 scenarios (without answers)
   * were already returned up front.
   */
  async loadScenario() {
    try {
      this.showLoading();
      this.currentScenario = API.getScenario(this.currentScenarioNumber - 1);

      if (!this.currentScenario) {
        throw new Error('Scenario was not found in the active simulation.');
      }

      this.renderScenario();
      this.hideLoading();
    } catch (error) {
      console.error('Error loading scenario:', error);
      this.showAlert('error.loadingError', 'danger');
    }
  }

  /**
   * Ensure a scenario set exists for the current session.
   * Returns true if a valid set was found, false otherwise.
   */
  ensureScenarioPool() {
    const scenarios = API.getScenarioPool();

    if (!Array.isArray(scenarios) || scenarios.length === 0 || !API.getSessionId()) {
      return false;
    }

    this.scenarioData = scenarios;
    return true;
  }
  
  /**
   * Convert backend scenario categories to the UI presentation types.
   * The database uses categories such as "Phishing Email" and
   * "Fake Login Page", while the UI uses email/website/etc.
   */
  getScenarioPresentationType(type) {
    const value = String(type || '').toLowerCase();

    if (value.includes('phishing') || value.includes('email')) {
      return 'email';
    }

    if (value.includes('login') || value.includes('website')) {
      return 'website';
    }

    if (value.includes('sms') || value.includes('text')) {
      return 'sms';
    }

    if (value.includes('giveaway') || value.includes('prize') || value.includes('congrat')) {
      return 'congrats';
    }

    if (
      value.includes('social') ||
      value.includes('whatsapp') ||
      value.includes('telegram') ||
      value.includes('manager') ||
      value.includes('support') ||
      value.includes('linkedin')
    ) {
      return value.includes('linkedin') ? 'linkedin' : 'social_media';
    }

    // Keep the existing generic card for categories without a
    // dedicated presentation.
    return 'email';
  }

  /**
   * Render scenario on the page
   */
  renderScenario() {
    // Update scenario title
    const titleEl = document.getElementById('scenarioTitle');
    if (titleEl) {
      titleEl.textContent = i18n.t('scenario.title', {
        number: this.currentScenarioNumber
      });
    }
    
    // Update score
    const scoreEl = document.getElementById('scenarioScore');
    if (scoreEl) {
      scoreEl.textContent = i18n.t('scenario.score', {
        current: this.userScore,
        total: this.totalScenarios * this.pointsPerScenario
      });
    }
    
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
      const progress = (this.currentScenarioNumber / this.totalScenarios) * 100;
      progressFill.style.width = progress + '%';
    }
    
    // Render scenario content
    const contentEl = document.getElementById('scenarioContent');
    if (contentEl && this.currentScenario) {
      const typeIcons = {
        email: '📧',
        sms: '📱',
        social_media: '💬',
        linkedin: '💼',
        website: '🌐',
        congrats: '🎁'
      };
      const presentationType = this.getScenarioPresentationType(this.currentScenario.type);
      const scenarioIcon = typeIcons[presentationType] || '💡';
      const scenarioTypeLabel =
        i18n.t(`scenario.${presentationType}`) || this.currentScenario.type;

      const isCongratsCard =
        presentationType === 'congrats' || this.currentScenario.layout === 'congrats';
      const isSocialCard = presentationType === 'social_media';
      const isWebsiteCard = presentationType === 'website';
      const isEmailCard = presentationType === 'email';
      const headerLabel = isCongratsCard
        ? 'Congratulations!'
        : isEmailCard
          ? 'Inbox'
          : this.currentScenario.sender || scenarioTypeLabel;

      contentEl.innerHTML = `
        ${isCongratsCard ? `
          <div class="scenario-congrats-card card mb-lg">
            <div class="congrats-hero">
              <div class="congrats-icon">🎁</div>
              <h2>CONGRATULATIONS! ✨</h2>
            </div>
            <div class="congrats-body">
              <p>${this.currentScenario.content}</p>
              <div class="congrats-timer">
                <span>05:00</span>
                <small>Time remaining to claim</small>
              </div>
              <div class="congrats-form">
                <input type="text" placeholder="Enter your name" readonly />
                <input type="email" placeholder="Enter your email" readonly />
                <input type="tel" placeholder="Enter your phone number" readonly />
              </div>
              <button class="btn btn-primary btn-full congrats-cta" disabled>CLAIM YOUR PRIZE NOW!</button>
              <p class="congrats-note">* By claiming you agree to receive promotional emails and calls.</p>
            </div>
          </div>
        ` : isWebsiteCard ? `
          <div class="scenario-website-card card mb-lg">
            <div class="website-bar">
              <div class="website-bar-left">
                <span class="website-dot"></span>
                <span class="website-dot"></span>
                <span class="website-dot"></span>
              </div>
              <div class="website-address">Not Secure  ${this.currentScenario.sender}</div>
            </div>
            <div class="website-content">
              <div class="website-icon">🔒</div>
              <h3>Welcome to Bank of America Online Banking</h3>
              <form class="website-form">
                <label>Username or Email</label>
                <input type="text" placeholder="Enter your username" readonly />
                <label>Password</label>
                <input type="password" placeholder="Enter your password" readonly />
                <button class="website-submit" disabled>Sign In</button>
              </form>
              <p class="website-footnote">By signing in, you agree to our Terms of Service</p>
            </div>
          </div>
        ` : presentationType === 'sms' ? `
          <div class="scenario-card card mb-lg sms-card">
            <div class="scenario-card-top">
              <div class="scenario-card-label">
                <span class="icon-circle primary small">${scenarioIcon}</span>
                <span>${headerLabel}</span>
              </div>
              <button type="button" class="icon-btn" aria-label="More">•••</button>
            </div>
            <div class="scenario-message sms-message">
              <div class="sms-header">
                <span class="sms-icon">📩</span>
                <div>
                  <strong>${this.currentScenario.title}</strong>
                  <p class="text-gray small">SMS · Just now</p>
                </div>
              </div>
              <div class="sms-bubble">
                <p style="white-space: pre-wrap; margin: 0;">${this.currentScenario.content}</p>
              </div>
            </div>
          </div>
        ` : presentationType === 'linkedin' ? `
          <div class="scenario-card card mb-lg linkedin-card">
            <div class="scenario-card-top">
              <div class="scenario-card-label">
                <span class="icon-circle primary small">${scenarioIcon}</span>
                <span>${headerLabel}</span>
              </div>
              <button type="button" class="icon-btn" aria-label="More">•••</button>
            </div>
            <div class="scenario-message linkedin-message">
              <div class="linkedin-header">
                <div>
                  <strong>${this.currentScenario.title}</strong>
                  <p class="text-gray small">${this.currentScenario.sender || 'LinkedIn'} · Invitation</p>
                </div>
              </div>
              <div class="linkedin-bubble">
                <p style="white-space: pre-wrap; margin: 0;">${this.currentScenario.content}</p>
              </div>
            </div>
          </div>
        ` : isSocialCard ? `
          <div class="scenario-card social_media card mb-lg">
            <div class="scenario-card-top">
              <div class="scenario-card-label">
                <span class="icon-circle primary small">${scenarioIcon}</span>
                <span>${headerLabel}</span>
              </div>
              <button type="button" class="icon-btn" aria-label="More">•••</button>
            </div>
            <div class="scenario-message social-media-message">
              <div class="social-message-header">
                <div class="social-avatar">${scenarioIcon}</div>
                <div>
                  <strong>${this.currentScenario.title}</strong>
                  <p class="text-gray small">Sent you a message · Just now</p>
                </div>
              </div>
              <div class="social-bubble">
                <p style="white-space: pre-wrap; margin: 0;">${this.currentScenario.content}</p>
              </div>
              <div class="social-actions">
                <button type="button" class="social-action">Like</button>
                <button type="button" class="social-action">Reply</button>
                <button type="button" class="social-action">Share</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="scenario-card card mb-lg email-card">
            <div class="scenario-card-top">
              <div class="scenario-card-label">
                <span class="icon-circle primary small">${scenarioIcon}</span>
                <span>${headerLabel}</span>
              </div>
              <div class="scenario-card-actions">
                <button type="button" class="icon-btn" aria-label="Archive">📥</button>
                <button type="button" class="icon-btn" aria-label="Delete">🗑️</button>
              </div>
            </div>
            <div class="scenario-message email-message">
              <div class="email-header">
                <div class="email-icon">${scenarioIcon}</div>
                <div>
                  <h4>${this.currentScenario.title}</h4>
                  <p class="text-gray small">From: ${this.currentScenario.sender || 'Unknown'} · Just now</p>
                </div>
                <button class="icon-btn" type="button" aria-label="Star">★</button>
              </div>
              <div class="email-body">
                <p style="white-space: pre-wrap; margin: 0;">${this.currentScenario.content}</p>
              </div>
            </div>
          </div>
        `}
        
        <div class="options-section mb-lg">
          <h5>${i18n.t('scenario.whatWould')}</h5>
          <div class="options-container" id="optionsContainer"></div>
        </div>
        
        <div id="feedbackSection" class="hidden"></div>
      `;
      
      // Render answer options
      this.renderAnswerOptions();
    }
  }
  
  /**
   * Render answer options
   */
  renderAnswerOptions() {
    const container = document.getElementById('optionsContainer');
    if (!container || !this.currentScenario) return;
    
    container.innerHTML = '';
    
    const optionCount = this.currentScenario.answers.length;
    this.currentScenario.answers.forEach((answer, index) => {
      const btn = document.createElement('button');
      const optionStyle = this.getOptionStyle(index, optionCount);
      btn.className = `option-btn ${optionStyle}`;
      btn.innerHTML = `
        <span class="option-number">${index + 1}.</span>
        <span>${answer.text}</span>
      `;
      btn.addEventListener('click', () => this.handleAnswerSelect(answer, btn));
      container.appendChild(btn);
    });
  }

  /**
   * Choose the answer button style for each option
   */
  getOptionStyle(index, totalOptions) {
    if (totalOptions === 2) {
      return index === 1 ? 'option-style-black' : 'option-style-white';
    }

    const palette = [
      'option-style-white',
      'option-style-black',
      'option-style-yellow'
    ];

    return palette[index % palette.length];
  }
  
  /**
   * Handle answer selection
   */
  async handleAnswerSelect(answer, btnElement) {
    if (this.isAnswered) return;
    
    this.isAnswered = true;
    
    // Mark all buttons as disabled
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
      btn.classList.add('disabled');
    });
    
    // Mark selected button
    btnElement.classList.add('selected');
    
    try {
      // Submit answer to backend - the backend (not the frontend) is
      // the source of truth for whether this was correct.
      const feedback = await API.submitAnswer(this.currentScenario.id, answer.id);

      const isCorrect = !!feedback.is_correct;
      
      // Update score
      if (isCorrect) {
        // Keep the temporary display aligned with the backend: 1 point per correct answer.
        this.userScore += 1;
        btnElement.classList.add('correct');
      } else {
        btnElement.classList.add('incorrect');
      }
      
      // Save answer
      this.userAnswers.push({
        scenario: this.currentScenarioNumber,
        answer: answer.text,
        correct: isCorrect,
        points: isCorrect ? this.pointsPerScenario : 0
      });
      
      // Save score to session
      sessionStorage.setItem('userScore', this.userScore);
      sessionStorage.setItem('userAnswers', JSON.stringify(this.userAnswers));

      // Save feedback preview and go to separate feedback page
      const feedbackData = {
        scenarioNumber: this.currentScenarioNumber,
        scenarioId: this.currentScenario.id,
        isCorrect,
        title: isCorrect ? 'Great Job!' : 'Not Quite Right',
        subtitle: isCorrect ? 'You correctly identified the threat' : "Let's learn from this scenario",
        explanation: feedback.explanation,
        explanation_ar: feedback.explanation_ar,
        explanation_en: feedback.explanation_en,
        shouldKnow: feedback.explanation,
        redFlags: feedback.red_flags || [],
        red_flags_ar: feedback.red_flags_ar || [],
        red_flags_en: feedback.red_flags_en || [],
        category: feedback.category || this.currentScenario.type,
        category_ar: feedback.category_ar,
        category_en: feedback.category_en,
        selectedAnswer: answer.text
      };
      sessionStorage.setItem('feedbackData', JSON.stringify(feedbackData));
      window.location.href = './feedback.html';
    } catch (error) {
      console.error('Error submitting answer:', error);
      this.showAlert('error.serverError', 'danger');
    }
  }
  
  /**
   * Show feedback after answer
   */
  showFeedback(isCorrect, feedback) {
    const feedbackSection = document.getElementById('feedbackSection');
    if (!feedbackSection) return;
    
    feedbackSection.classList.remove('hidden');
    
    const feedbackClass = isCorrect ? 'success' : 'danger';
    const feedbackTitle = isCorrect ? i18n.t('feedback.correct') : i18n.t('feedback.incorrect');
    
    feedbackSection.innerHTML = `
      <div class="alert alert-${feedbackClass} mb-lg">
        <h5>${feedbackTitle}</h5>
      </div>
      
      <div class="card mb-lg">
        <h6>${i18n.t('feedback.explanation')}</h6>
        <p>${this.currentScenario.explanation}</p>
        
        ${this.currentScenario.redFlags ? `
          <h6 class="mt-lg">${i18n.t('feedback.tips')}</h6>
          <ul style="margin-left: 20px; color: var(--text-gray);">
            ${this.currentScenario.redFlags.map(flag => `<li>${flag}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
      
      <div id="nextSection"></div>
    `;
    
    // Add next/result button
    this.addNavigationButton();
  }
  
  /**
   * Add navigation button after feedback
   */
  addNavigationButton() {
    const nextSection = document.getElementById('nextSection');
    if (!nextSection) return;
    
    if (this.currentScenarioNumber < this.totalScenarios) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-full';
      btn.textContent = i18n.t('scenario.next');
      btn.addEventListener('click', () => this.nextScenario());
      nextSection.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn btn-success btn-full';
      btn.textContent = 'View Results';
      btn.addEventListener('click', () => this.goToResults());
      nextSection.appendChild(btn);
    }
  }
  
  /**
   * Go to next scenario
   */
  nextScenario() {
    if (this.currentScenarioNumber < this.totalScenarios) {
      this.currentScenarioNumber++;
      API.setCurrentScenario(this.currentScenarioNumber);
      this.isAnswered = false;
      this.loadScenario();
    }
  }
  
  /**
   * Go to results page
   */
  async goToResults() {
    if (!API.getSessionId()) {
      this.showAlert('error.loadingError', 'danger');
      return;
    }

    try {
      this.showLoading();

      // Backend calculates and persists the final score.
      const finalResult = await API.finishSimulation();

      if (!finalResult) {
        throw new Error('The server returned no final result.');
      }

      sessionStorage.setItem('backendResult', JSON.stringify(finalResult));
      sessionStorage.setItem('simulationComplete', 'true');

      this.hideLoading();
      window.location.href = './result.html';
    } catch (error) {
      console.error('Error finishing simulation:', error);
      this.hideLoading();
      this.showAlert('error.serverError', 'danger');
    }
  }
  
  /**
   * Initialize Result Page
   */
  initResultPage() {
    this.userName = sessionStorage.getItem('userName') || 'User';
    this.userAnswers = JSON.parse(sessionStorage.getItem('userAnswers') || '[]');
    this.backendResult = JSON.parse(sessionStorage.getItem('backendResult') || 'null');

    if (!this.backendResult) {
      window.location.href = './simulation.html';
      return;
    }

    // The backend is the source of truth for the final result.
    this.userScore = Number(this.backendResult.score || 0);
    this.totalScenarios = Number(
      this.backendResult.total_questions || this.totalScenarios
    );

    this.renderResults();
  }
  /**
   * Render results
   */
  renderResults() {
    const totalQuestions = Number(
      this.backendResult?.total_questions || this.totalScenarios
    );
    const correctCount = Number(
      this.backendResult?.correct_answers ?? this.userScore
    );
    const accuracy = Number(
      this.backendResult?.percentage ?? (
        totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
      )
    );
    const awarenessLevel = this.getAwarenessLevel(accuracy);
    const awarenessClass = this.getAwarenessLevelClass(accuracy);
    const scorePercentage = Number.isFinite(accuracy) ? accuracy.toFixed(0) : '0';
    
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
      <div class="results-hero text-center mb-2xl">
        <div class="results-icon results-icon-emoji">
          <span class="emoji-silver" aria-hidden="true">🏆</span>
        </div>
        <h1>${i18n.t('result.wellDone', { name: this.userName })}</h1>
        <p class="results-subtitle">${i18n.t('result.completed')}</p>
      </div>
      
      <div class="results-card card mb-2xl">
        <div class="results-score-circle">
          <span class="score-main">${correctCount}</span>
          <span class="score-unit">/${totalQuestions}</span>
        </div>
        <h3>${i18n.t('result.title')}</h3>
        <p>${i18n.t('result.correctlyIdentified', { count: correctCount, total: totalQuestions })}</p>
        <div class="grid grid-3 mt-2xl">
          <div class="stat-card score-box accuracy-box text-center">
            <span class="stat-value">${scorePercentage}%</span>
            <p>${i18n.t('result.accuracy')}</p>
          </div>
          <div class="stat-card score-box awareness-box text-center">
            <span class="awareness-pill ${awarenessClass}">${awarenessLevel}</span>
            <p>${i18n.t('result.awareness')}</p>
          </div>
          <div class="stat-card score-box scenarios-box text-center">
            <span class="stat-value">${totalQuestions}</span>
            <p>${i18n.t('result.scenarios')}</p>
          </div>
        </div>
      </div>
      
      <div class="grid grid-2 mb-2xl gap-xl">
        <div class="card result-summary-card">
          <div class="summary-title">
            <span class="summary-icon summary-icon-strengths">✓</span>
            ${i18n.t('result.strengths')}
          </div>
          <ul id="strengthsList" class="summary-list summary-list-strengths"></ul>
        </div>
        <div class="card result-summary-card">
          <div class="summary-title">
            <span class="summary-icon summary-icon-improve">↗</span>
            ${i18n.t('result.improve')}
          </div>
          <ul id="improvementAreas" class="summary-list summary-list-improve"></ul>
        </div>
      </div>
      
      <div class="card recommendations-card mb-2xl">
        <div class="recommendations-title">
          <span class="icon-circle warning">!</span>
          <h4>${i18n.t('result.securityRecommendations')}</h4>
        </div>
        <ol class="recommendations-list">
          <li>${i18n.t('result.recommendation1')}</li>
          <li>${i18n.t('result.recommendation2')}</li>
          <li>${i18n.t('result.recommendation3')}</li>
          <li>${i18n.t('result.recommendation4')}</li>
          <li>${i18n.t('result.recommendation5')}</li>
        </ol>
      </div>
      
      <div class="flex gap-md result-actions">
        <button class="btn btn-dark" id="restartSimulationBtn">
          ${i18n.t('result.restart')}
        </button>
        <button class="btn btn-light" id="backHomeBtn">
          <span class="home-icon"></span>
          ${i18n.t('result.back')}
        </button>
      </div>
    `;
    
    this.renderResultLists();
  }
  
  /**
   * Get awareness level based on accuracy
   */
  getAwarenessLevel(accuracy) {
    const backendLevel = this.backendResult?.awareness_level;

    if (backendLevel === 'Expert') return i18n.t('result.expert');
    if (backendLevel === 'Advanced') return i18n.t('result.advanced');
    if (backendLevel === 'Intermediate') return i18n.t('result.intermediate');
    if (backendLevel === 'Needs Improvement') return i18n.t('result.developing');

    // Fallback for older/local result data.
    if (accuracy >= 90) return i18n.t('result.expert');
    if (accuracy >= 70) return i18n.t('result.advanced');
    if (accuracy >= 50) return i18n.t('result.intermediate');
    return i18n.t('result.developing');
  }

  getAwarenessLevelClass(accuracy) {
    const backendLevel = this.backendResult?.awareness_level;

    if (backendLevel === 'Expert') return 'expert';
    if (backendLevel === 'Advanced') return 'advanced';
    if (backendLevel === 'Intermediate') return 'intermediate';
    if (backendLevel === 'Needs Improvement') return 'developing';

    if (accuracy >= 90) return 'expert';
    if (accuracy >= 70) return 'advanced';
    if (accuracy >= 50) return 'intermediate';
    return 'developing';
  }
  
  /**
   * Render improvement areas
   */
  renderResultLists() {
    const correctAnswers = this.userAnswers.filter(a => a.correct);
    const incorrectAnswers = this.userAnswers.filter(a => !a.correct);
    const strengthsList = document.getElementById('strengthsList');
    const improvementList = document.getElementById('improvementAreas');

    if (strengthsList) {
      strengthsList.innerHTML = correctAnswers.length
        ? correctAnswers.map(answer => `<li>${answer.answer}</li>`).join('')
        : `<li>${i18n.t('result.reviewScenario')}</li>`;
    }

    if (improvementList) {
      improvementList.innerHTML = incorrectAnswers.length
        ? incorrectAnswers.map(answer => `<li>${answer.answer}</li>`).join('')
        : `<li>${i18n.t('result.greatJobNoImprovement')}</li>`;
    }
  }
  
  /**
   * Initialize Alerts Page
   */
  initAlertsPage() {
    this.loadAlertsPage();
  }

  async loadAlertsPage() {
    const container = document.getElementById('alertsGrid');
    if (!container) return;
    try {
      const alerts = await API.getAlerts();
      container.innerHTML = alerts.map((alert, index) => `
        <div class="card alert-card alert-${['pink', 'orange', 'blue'][index % 3]}" style="--alert-index: ${index};">
          <h4>${alert.title}</h4>
          <p>${alert.description}</p>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }
  
  /**
   * Initialize About Page
   */
  initAboutPage() {
    // About page doesn't need special initialization
  }
  
  /**
   * Setup scenario events
   */
  setupScenarioEvents() {
    // Any additional event setup for scenario page
  }

  /**
   * Clear simulation progress when leaving mid-session
   */
  clearSimulationProgress() {
    API.clearSimulation();

    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userScore');
    sessionStorage.removeItem('userAnswers');
    sessionStorage.removeItem('feedbackData');
    sessionStorage.removeItem('backendResult');
  }

  /**
   * Return true when a simulation session is in progress
   */
  isSimulationActive() {
    const pool = API.getScenarioPool();
    const complete = sessionStorage.getItem('simulationComplete') === 'true';
    return Boolean(API.getSessionId() && pool.length && !complete);
  }

  /**
   * Prevent back navigation during scenario/feedback flow
   */
  preventBackNavigation() {
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', () => {
      window.history.pushState(null, null, window.location.href);
    });
  }

  /**
   * Show only home link in navigation during active simulation
   */
  restrictNavToHome() {
    document.querySelectorAll('.nav-links li').forEach((item, index) => {
      if (index === 0) {
        item.style.display = 'list-item';
      } else {
        item.style.display = 'none';
      }
    });
  }

  /**
   * Handle navigation
   */
  handleNavigation(e) {
    const href = e.currentTarget.getAttribute('href');
    if (!href || href === '#') {
      e.preventDefault();
      return;
    }

    if (this.isSimulationActive() && href.includes('index.html')) {
      e.preventDefault();
      this.clearSimulationProgress();
      window.location.href = href;
      return;
    }

    if (this.isSimulationActive() && !href.includes('result.html')) {
      e.preventDefault();
      this.clearSimulationProgress();
      window.location.href = href;
      return;
    }

    e.preventDefault();
    window.location.href = href;
  }
  
  /**
   * Update page layout after language change
   */
  updatePageLayout() {
    // Re-render current page content if needed
    const path = window.location.pathname;
    
    if (path.includes('scenario.html')) {
      this.renderScenario();
    } else if (path.includes('result.html')) {
      this.renderResults();
    }
  }
  
  /**
   * Show alert message
   */
  showAlert(messageKey, type = 'info') {
    const message = i18n.t(messageKey);
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Find or create alerts container
    let alertContainer = document.getElementById('alertsContainer');
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.id = 'alertsContainer';
      alertContainer.style.position = 'fixed';
      alertContainer.style.top = '100px';
      alertContainer.style.right = '20px';
      alertContainer.style.zIndex = '1000';
      alertContainer.style.maxWidth = '300px';
      document.body.appendChild(alertContainer);
    }
    
    alertContainer.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }
  
  /**
   * Show loading spinner
   */
  showLoading() {
    let loader = document.getElementById('loadingSpinner');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'loadingSpinner';
      loader.className = 'spinner';
      loader.style.position = 'fixed';
      loader.style.top = '50%';
      loader.style.left = '50%';
      loader.style.transform = 'translate(-50%, -50%)';
      loader.style.zIndex = '9999';
      document.body.appendChild(loader);
    }
    loader.classList.remove('hidden');
  }
  
  /**
   * Hide loading spinner
   */
  hideLoading() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) {
      loader.classList.add('hidden');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SimulationApp();
});
