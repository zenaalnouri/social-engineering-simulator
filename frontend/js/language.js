// ============================================
// Social Engineering Simulator - Language Manager
// ============================================

class LanguageManager {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'en';
    this.translations = {
      en: {
        // Navigation
        'nav.simulator': 'Social Engineering Simulator',
        'nav.home': 'Home',
        'nav.alerts': 'Alerts',
        'nav.leaderboard': 'Leaderboard',
        'nav.about': 'About Us',
        'nav.language': 'عربي',
        
        // Home Page
        'home.title': 'Train Yourself Against Social Engineering Attacks',
        'home.subtitle': 'Experience interactive cybersecurity simulations designed to protect you from phishing, scams, and manipulation attacks.',
        'home.start': 'Start Simulation',
        'home.heroBtnTooltip': "You'll face 5 random scenarios designed to test your awareness",
        
        // Alerts Page
        'alerts.title': 'Latest Scam Alerts',
        'alerts.subtitle': 'Stay informed about the newest threats',
        'alerts.phishing': 'Fake Bank Verification Email',
        'alerts.phishing.desc': 'Phishing emails claiming urgent account verification',
        'alerts.sms': 'Fake Delivery SMS',
        'alerts.sms.desc': 'Scammers impersonating delivery services',
        'alerts.instagram': 'Instagram Account Scam',
        'alerts.instagram.desc': 'Fake messages threatening account deletion',
        'alerts.website': 'Fake Website',
        'alerts.website.desc': 'Fraudulent websites impersonating legitimate companies',
        
        // Begin Simulation Page
        'simulation.title': 'Begin Your Journey',
        'simulation.subtitle': 'Enter your name to start the cybersecurity awareness simulation',
        'simulation.name': 'Your Name',
        'simulation.namePlaceholder': 'Enter your name',
        'simulation.startBtn': 'Start Simulation',
        'simulation.hint': "You'll face 5 random scenarios designed to test your awareness",
        'simulation.back': '← Back to home',
        
        // Simulation Page
        'scenario.title': 'Scenario {{number}} of 5',
        'scenario.score': 'Score: {{current}}/{{total}}',
        'scenario.sender': 'Sender',
        'scenario.inbox': 'Inbox',
        'scenario.email': 'Email',
        'scenario.sms': 'SMS Message',
        'scenario.social_media': 'Social Media',
        'scenario.linkedin': 'LinkedIn',
        'scenario.website': 'Website',
        'scenario.message': 'Message',
        'scenario.whatWould': 'What would you do?',
        'scenario.openLink': 'Open Link / Attachment',
        'scenario.verifyOfficial': 'Verify Through Official Channel',
        'scenario.deleteReport': 'Delete & Report as Spam',
        'scenario.reportScam': 'Report as Scam',
        'scenario.ignore': 'Ignore and Delete',
        'scenario.next': 'Next Scenario',
        'scenario.submit': 'Submit Answer',
        
        // Feedback
        'feedback.correct': 'Correct! 🎉',
        'feedback.incorrect': 'Incorrect. Try again.',
        'feedback.explanation': 'Explanation',
        'feedback.tips': 'Protection Tips',
        
        // Results Page
        'result.title': 'Your Score',
        'result.accuracy': 'Accuracy',
        'result.awareness': 'Awareness Level',
        'result.scenarios': 'Scenarios Completed',
        'result.points': 'Points',
        'result.strengths': 'Strengths',
        'result.improve': 'Areas to Improve',
        'result.beginner': 'Beginner',
        'result.developing': 'Developing',
        'result.intermediate': 'Intermediate',
        'result.advanced': 'Advanced',
        'result.expert': 'Expert',
        'result.restart': 'Restart Simulation',
        'result.back': '← Back to home',
        
        // About Page
        'about.title': 'About This Project',
        'about.content': '<strong>Social Engineering Simulator</strong> is an educational platform designed to help individuals recognize and defend against social engineering attacks through realistic simulations and interactive learning.',
        'about.madeBy': 'Created by a team of passionate students and developers committed to building a safer digital world.',
        'about.copyright': '© 2026 Social Engineering Simulator',
        'nav.start': 'Start Simulation',
        
        // Alerts Page Details
        'alert1.title': 'Mandatory Password Update Required',
        'alert1.type': 'Phishing Email',
        'alert1.content': 'Our IT department requires all employees to update their passwords due to a security breach. Please click this link and enter your current password followed by your new password:\n\nhttp://company-portal-login.net/reset\n\nThis must be completed by end of day.',
        'alert1.sender': 'From: it.support@company-internal.com',
        
        'alert2.title': 'FedEx Delivery Attempt',
        'alert2.type': 'SMS Scam',
        'alert2.content': 'FedEx: We attempted delivery but no one was home. Reschedule at: fedex-resch.com Your package will return to sender in 24hrs.',
        
        'alert3.title': 'Instagram Account Warning',
        'alert3.type': 'Social Media Scam',
        'alert3.content': 'Instagram: Your account has suspicious activity. Verify your identity now or your account will be deleted.',
        
        // Red Flags & Tips
        'redFlags': 'Red Flags',
        'redFlagsContent': [
          'Urgent action requested',
          'Suspicious sender email',
          'Links that don\'t match official domains',
          'Requests for personal information',
          'Grammar and spelling errors'
        ],
        'protectionTips': 'How to Protect Yourself',
        'protectionTipsContent': [
          'Verify through official channels before clicking links',
          'Check sender email addresses carefully',
          'Enable two-factor authentication',
          'Keep software updated',
          'Report suspicious messages'
        ],
        
        // Validation Messages
        'validation.nameRequired': 'Please enter your name',
        'validation.nameTooShort': 'Name must be at least 2 characters',
        'validation.nameTooLong': 'Name must be less than 50 characters',
        
        // Loading States
        'loading.loadingScenario': 'Loading scenario...',
        'loading.submitting': 'Submitting answer...',
        'loading.loading': 'Loading...',
        
        // Leaderboard
        'leaderboard.title': 'Leaderboard',
        'leaderboard.rank': 'Rank',
        'leaderboard.name': 'Name',
        'leaderboard.score': 'Score',
        'leaderboard.level': 'Level',
        
        // Errors
        'error.serverError': 'Server error. Please try again.',
        'error.networkError': 'Network error. Please check your connection.',
        'error.loadingError': 'Error loading scenario. Please try again.',
      },
      ar: {
        // Navigation
        'nav.simulator': 'محاكي الهندسة الاجتماعية',
        'nav.home': 'الرئيسية',
        'nav.alerts': 'التنبيهات',
        'nav.leaderboard': 'لوحة المتصدرين',
        'nav.about': 'عن المشروع',
        'nav.language': 'English',
        
        // Home Page
        'home.title': 'تدرب على دفاع نفسك ضد هجمات الهندسة الاجتماعية',
        'home.subtitle': 'جرب محاكاة تفاعلية للأمن السيبراني مصممة لحمايتك من التصيد والغش والهجمات التلاعبية.',
        'home.start': 'بدء المحاكاة',
        'home.heroBtnTooltip': 'ستواجه 5 سيناريوهات عشوائية مصممة لاختبار وعيك',
        
        // Alerts Page
        'alerts.title': 'آخر تنبيهات الاحتيال',
        'alerts.subtitle': 'ابق مطلعاً على أحدث التهديدات',
        'alerts.phishing': 'بريد تحقق مزيف من البنك',
        'alerts.phishing.desc': 'رسائل تصيد الاحتيال تدعي تحقق حساب عاجل',
        'alerts.sms': 'رسالة نصية توصيل مزيفة',
        'alerts.sms.desc': 'محتالون يتنكرون كخدمات توصيل',
        'alerts.instagram': 'غش حساب إنستجرام',
        'alerts.instagram.desc': 'رسائل مزيفة تهدد بحذف الحساب',
        'alerts.website': 'موقع ويب مزيف',
        'alerts.website.desc': 'مواقع احتيالية تحاكي الشركات الشرعية',
        
        // Begin Simulation Page
        'simulation.title': 'ابدأ رحلتك',
        'simulation.subtitle': 'أدخل اسمك لبدء محاكاة التوعية الأمنية السيبرانية',
        'simulation.name': 'اسمك',
        'simulation.namePlaceholder': 'أدخل اسمك',
        'simulation.startBtn': 'بدء المحاكاة',
        'simulation.hint': 'ستواجه 5 سيناريوهات عشوائية مصممة لاختبار وعيك',
        'simulation.back': '← العودة إلى الرئيسية',
        
        // Simulation Page
        'scenario.title': 'السيناريو {{number}} من 5',
        'scenario.score': 'النقاط: {{current}}/{{total}}',
        'scenario.sender': 'المرسل',
        'scenario.inbox': 'صندوق الوارد',
        'scenario.email': 'بريد إلكتروني',
        'scenario.sms': 'رسالة نصية',
        'scenario.social_media': 'وسائل التواصل الاجتماعي',
        'scenario.linkedin': 'لينكدإن',
        'scenario.website': 'موقع ويب',
        'scenario.message': 'الرسالة',
        'scenario.whatWould': 'ماذا ستفعل؟',
        'scenario.openLink': 'فتح الرابط / المرفق',
        'scenario.verifyOfficial': 'التحقق من القناة الرسمية',
        'scenario.deleteReport': 'حذف والإبلاغ كرسالة غير مرغوب',
        'scenario.reportScam': 'الإبلاغ كاحتيال',
        'scenario.ignore': 'تجاهل وحذف',
        'scenario.next': 'السيناريو التالي',
        'scenario.submit': 'إرسال الإجابة',
        
        // Feedback
        'feedback.correct': 'صحيح! 🎉',
        'feedback.incorrect': 'غير صحيح. حاول مرة أخرى.',
        'feedback.explanation': 'الشرح',
        'feedback.tips': 'نصائح الحماية',
        
        // Results Page
        'result.title': 'نتيجتك',
        'result.accuracy': 'الدقة',
        'result.awareness': 'مستوى الوعي',
        'result.scenarios': 'السيناريوهات المكتملة',
        'result.points': 'النقاط',
        'result.strengths': 'نقاط القوة',
        'result.improve': 'مجالات التحسين',
        'result.beginner': 'مبتدئ',
        'result.developing': 'نامٍ',
        'result.intermediate': 'متوسط',
        'result.advanced': 'متقدم',
        'result.expert': 'خبير',
        'result.restart': 'إعادة تشغيل المحاكاة',
        'result.back': '← العودة إلى الرئيسية',
        
        // About Page
        'about.title': 'عن المشروع',
        'about.content': '<strong>محاكي الهندسة الاجتماعية</strong> هو منصة تعليمية تهدف إلى مساعدة الأفراد على التعرّف على هجمات الهندسة الاجتماعية وفهم كيفية الحماية منها، من خلال محاكاة واقعية وتجارب تعليمية تفاعلية.',
        'about.madeBy': 'تم تطوير المنصة من قِبل فريق من الطلاب والمبرمجين الشغوفين، والملتزمين بالمساهمة في بناء عالم رقمي أكثر أمانًا.',
        'about.copyright': '© 2026 محاكي الهندسة الاجتماعية',
        
        // Leaderboard
        'leaderboard.title': 'لوحة المتصدرين',
        'leaderboard.rank': 'الترتيب',
        'leaderboard.name': 'الاسم',
        'leaderboard.score': 'النقاط',
        'leaderboard.level': 'المستوى',
      }
    };
    
    this.init();
  }
  
  /**
   * Initialize language settings
   */
  init() {
    this.setLanguage(this.currentLanguage);
  }
  
  /**
   * Set the current language
   * @param {string} lang - Language code ('en' or 'ar')
   */
  setLanguage(lang) {
    if (!this.translations[lang]) {
      console.warn(`Language '${lang}' not found. Using English.`);
      lang = 'en';
    }
    
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
    
    // Update document direction and language attribute
    const htmlElement = document.documentElement;
    htmlElement.lang = lang;
    htmlElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update body class
    document.body.classList.remove('ar', 'en');
    document.body.classList.add(lang);
    
    // Update all translations on the page
    this.updatePageTranslations();
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }
  
  /**
   * Get translation for a key
   * @param {string} key - Translation key
   * @param {object} replacements - Key-value pairs for replacement
   * @returns {string} Translated text
   */
  t(key, replacements = {}) {
    let text = this.translations[this.currentLanguage][key] || key;
    
    // Replace placeholders
    Object.keys(replacements).forEach(placeholder => {
      text = text.replace(`{{${placeholder}}}`, replacements[placeholder]);
    });
    
    return text;
  }
  
  /**
   * Update all translations on the page
   */
  updatePageTranslations() {
    // Update data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const replacements = {};
      
      // Check for replacements in data attributes
      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-i18n-')) {
          const placeholder = attr.name.replace('data-i18n-', '');
          replacements[placeholder] = attr.value;
        }
      });
      
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = this.t(key, replacements);
      } else if (element.tagName === 'INPUT' && element.type === 'button') {
        element.value = this.t(key, replacements);
      } else {
        element.textContent = this.t(key, replacements);
      }
    });
    
    // Update data-i18n-html for HTML content
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      const replacements = {};
      
      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-i18n-')) {
          const placeholder = attr.name.replace('data-i18n-', '');
          replacements[placeholder] = attr.value;
        }
      });
      
      element.innerHTML = this.t(key, replacements);
    });
  }
  
  /**
   * Toggle between English and Arabic
   */
  toggleLanguage() {
    const newLang = this.currentLanguage === 'en' ? 'ar' : 'en';
    this.setLanguage(newLang);
  }
  
  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }
}

// Create global instance
const i18n = new LanguageManager();
