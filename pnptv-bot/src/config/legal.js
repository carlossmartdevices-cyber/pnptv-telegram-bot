/**
 * Legal & Compliance Configuration
 * Terms, Privacy Policy, Age Verification, and Content Guidelines
 */

module.exports = {
  // Terms and Conditions URLs
  termsAndConditions: {
    en: "https://pnp.tv/terms-en",
    es: "https://pnp.tv/terms-es",
  },

  // Privacy Policy URLs
  privacyPolicy: {
    en: "https://pnp.tv/privacy-en",
    es: "https://pnp.tv/privacy-es",
  },

  // Age Verification Text
  ageVerificationText: {
    en: "By using this service, you confirm you are 18 years or older.",
    es: "Al usar este servicio, confirmas que tienes 18 años o más.",
  },

  // Minimum age requirement
  minimumAge: 18,

  // Community Guidelines
  communityGuidelines: {
    en: {
      title: "Community Guidelines",
      url: "https://pnp.tv/guidelines-en",
      rules: [
        "Be respectful to all users",
        "No harassment, bullying, or hate speech",
        "No spam or misleading content",
        "No illegal activities or content",
        "Respect privacy and consent",
        "No impersonation or fake profiles",
        "No sharing of personal information without consent",
        "Report inappropriate content immediately",
      ],
    },
    es: {
      title: "Normas de la Comunidad",
      url: "https://pnp.tv/guidelines-es",
      rules: [
        "Sé respetuoso con todos los usuarios",
        "No acoso, bullying o discurso de odio",
        "No spam o contenido engañoso",
        "No actividades o contenido ilegal",
        "Respeta la privacidad y el consentimiento",
        "No suplantación de identidad o perfiles falsos",
        "No compartir información personal sin consentimiento",
        "Reporta contenido inapropiado inmediatamente",
      ],
    },
  },

  // Content Guidelines
  contentGuidelines: {
    prohibited: [
      "Child sexual abuse material (CSAM)",
      "Non-consensual intimate imagery",
      "Violence or threats of violence",
      "Terrorism or extremist content",
      "Hate speech or discrimination",
      "Self-harm or suicide promotion",
      "Sale of illegal goods or services",
      "Fraud or financial scams",
      "Malware or phishing",
      "Copyright infringement",
    ],

    restricted: [
      "Adult content (18+ only, properly labeled)",
      "Graphic violence (with warnings)",
      "Sensitive topics (with content warnings)",
      "Political content (verified sources)",
      "Medical advice (disclaimer required)",
    ],

    allowed: [
      "Original creative content",
      "Educational material",
      "Entertainment content",
      "Social networking",
      "Business promotion (within limits)",
      "Community discussions",
      "Art and photography",
      "Music and performances",
    ],
  },

  // Data Protection & GDPR Compliance
  dataProtection: {
    dataRetention: {
      activeUsers: "Indefinite (while account is active)",
      deletedAccounts: "30 days grace period, then permanently deleted",
      inactiveAccounts: "2 years of inactivity before deletion notification",
    },

    userRights: {
      en: [
        "Right to access your data",
        "Right to rectification of incorrect data",
        "Right to erasure (right to be forgotten)",
        "Right to restrict processing",
        "Right to data portability",
        "Right to object to processing",
        "Right to withdraw consent",
      ],
      es: [
        "Derecho de acceso a tus datos",
        "Derecho de rectificación de datos incorrectos",
        "Derecho al olvido (eliminación de datos)",
        "Derecho a restringir el procesamiento",
        "Derecho a la portabilidad de datos",
        "Derecho a oponerse al procesamiento",
        "Derecho a retirar el consentimiento",
      ],
    },

    dataCollected: [
      "Telegram user ID and username",
      "Profile information (bio, interests)",
      "Location data (if provided)",
      "Usage statistics and activity logs",
      "Payment information (encrypted)",
      "Content posted (text, images, videos)",
      "Interaction data (likes, comments, matches)",
    ],

    dataSharing: {
      withThirdParties: false,
      forMarketing: false,
      forAnalytics: true,
      withLawEnforcement: "Only when legally required",
    },
  },

  // Cookie Policy
  cookiePolicy: {
    en: "https://pnp.tv/cookies-en",
    es: "https://pnp.tv/cookies-es",
  },

  // Refund Policy
  refundPolicy: {
    en: {
      title: "Refund Policy",
      terms: [
        "Refunds available within 7 days of purchase",
        "No refunds for partially used subscription periods",
        "Refunds processed within 5-10 business days",
        "Contact support@pnp.tv for refund requests",
        "Violations of terms forfeit refund eligibility",
      ],
    },
    es: {
      title: "Política de Reembolso",
      terms: [
        "Reembolsos disponibles dentro de 7 días de la compra",
        "No hay reembolsos por períodos de suscripción parcialmente usados",
        "Reembolsos procesados en 5-10 días hábiles",
        "Contacta support@pnp.tv para solicitudes de reembolso",
        "Violaciones de términos invalidan elegibilidad de reembolso",
      ],
    },
  },

  // Acceptable Use Policy
  acceptableUse: {
    prohibited: [
      "Automated bot usage without permission",
      "Scraping or data mining",
      "Attempting to bypass security measures",
      "Creating multiple accounts for abuse",
      "Reverse engineering the platform",
      "Interfering with service operation",
      "Using the service for illegal purposes",
    ],
  },

  // DMCA & Copyright
  dmca: {
    noticeEmail: "dmca@pnp.tv",
    counterNoticeEmail: "dmca-counter@pnp.tv",
    policy: {
      en: "https://pnp.tv/dmca-en",
      es: "https://pnp.tv/dmca-es",
    },
    responseTime: "72 hours",
  },

  // Report Categories
  reportCategories: {
    spam: {
      en: "Spam or misleading content",
      es: "Spam o contenido engañoso",
    },
    harassment: {
      en: "Harassment or bullying",
      es: "Acoso o bullying",
    },
    inappropriate: {
      en: "Inappropriate content",
      es: "Contenido inapropiado",
    },
    fake: {
      en: "Fake profile or impersonation",
      es: "Perfil falso o suplantación",
    },
    violence: {
      en: "Violence or dangerous content",
      es: "Violencia o contenido peligroso",
    },
    illegal: {
      en: "Illegal activities",
      es: "Actividades ilegales",
    },
    copyright: {
      en: "Copyright infringement",
      es: "Infracción de derechos de autor",
    },
    other: {
      en: "Other",
      es: "Otro",
    },
  },

  // Moderation Actions
  moderationActions: {
    warning: "User warned about policy violation",
    contentRemoval: "Content removed for policy violation",
    temporaryBan: "Temporary suspension (1-30 days)",
    permanentBan: "Permanent account termination",
    shadowBan: "Limited visibility for repeated violations",
  },

  // Strike System
  strikeSystem: {
    strikes: [
      {
        count: 1,
        action: "warning",
        duration: null,
        message: "First warning: Please review our community guidelines",
      },
      {
        count: 2,
        action: "temporaryBan",
        duration: "7 days",
        message: "Second violation: 7-day suspension",
      },
      {
        count: 3,
        action: "permanentBan",
        duration: "permanent",
        message: "Third violation: Permanent account termination",
      },
    ],
    strikeExpiration: "90 days", // Strikes expire after 90 days
  },

  // Support Contact
  support: {
    email: "support@pnp.tv",
    telegram: "@PNPtvSupport",
    hours: "24/7",
    responseTime: "24-48 hours",
    emergencyContact: "urgent@pnp.tv",
  },

  // Legal Entity
  legalEntity: {
    companyName: "PNPtv Inc.",
    jurisdiction: "Colombia",
    registrationNumber: "XXX-XXX-XXX", // Update with real number
    address: "Bucaramanga, Santander, Colombia",
    vatNumber: "XXX-XXX-XXX", // Update with real VAT
  },

  // Version and Last Updated
  version: "1.0.0",
  lastUpdated: "2025-01-10",
  effectiveDate: "2025-01-01",
};

// Helper function to get legal text
module.exports.getLegalText = function (type, language = "en") {
  const texts = {
    terms: this.termsAndConditions[language],
    privacy: this.privacyPolicy[language],
    guidelines: this.communityGuidelines[language],
    cookies: this.cookiePolicy[language],
    refund: this.refundPolicy[language],
  };

  return texts[type] || null;
};

// Helper function to check if content is prohibited
module.exports.isProhibitedContent = function (contentType) {
  return this.contentGuidelines.prohibited.some((prohibited) =>
    contentType.toLowerCase().includes(prohibited.toLowerCase())
  );
};

// Helper function to check if user can report
module.exports.canReport = function (userId, targetUserId) {
  // Users can't report themselves
  if (userId === targetUserId) return false;

  // Add more complex logic here if needed
  return true;
};

// Helper function to get strike action
module.exports.getStrikeAction = function (strikeCount) {
  const strike =
    this.strikeSystem.strikes.find((s) => s.count === strikeCount) ||
    this.strikeSystem.strikes[this.strikeSystem.strikes.length - 1];

  return strike;
};
