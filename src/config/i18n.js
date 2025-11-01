const i18n = {
  locales: {
    en: {
      welcome: "Welcome to PNPtv!",
      chooseLanguage: "Please choose your language:",
      start: "Welcome to PNPtv! Your language has been set to English.",
      help: "Available Commands:\n\n/start - Start the bot\n/profile - View your profile\n/editprofile - Edit your profile\n/map - View the map\n/help - Show this help message",
      profile:
        "Your profile has been created. Use /editprofile to update your details.",
      editProfile: "What would you like to update?",
      updateBio: "Update Bio",
      updateLocation: "Update Location",
      // AI Chat strings
      aiChatWelcome: "🤖 Welcome to PNPtv Support!\n\nI'm here to help with:\n• Subscription and payment questions\n• Technical support\n• Account issues\n• General inquiries\n\nHow can I assist you today?",
      aiChatEnded: "Chat session ended. Returning to main menu...",
      aiChatRateLimit: "⏳ Please wait a moment before sending another message.",
      aiChatThinking: "🤔 Thinking...",
      aiChatError: "❌ Sorry, I encountered an error. Please try again.",
      aiChatNoAPI: "❌ AI Chat is currently unavailable. Please try again later.",
    },
    es: {
      welcome: "¡Bienvenido a PNPtv!",
      chooseLanguage: "Por favor, elige tu idioma:",
      start: "¡Bienvenido a PNPtv! Tu idioma ha sido configurado a Español.",
      help: "Comandos Disponibles:\n\n/start - Iniciar el bot\n/profile - Ver tu perfil\n/editprofile - Editar tu perfil\n/map - Ver el mapa\n/help - Mostrar este mensaje de ayuda",
      profile:
        "Tu perfil ha sido creado. Usa /editprofile para actualizar tus detalles.",
      editProfile: "¿Qué te gustaría actualizar?",
      updateBio: "Actualizar Bio",
      updateLocation: "Actualizar Ubicación",
      // AI Chat strings
      aiChatWelcome: "🤖 ¡Bienvenido al Soporte de PNPtv!\n\nEstoy aquí para ayudarte con:\n• Preguntas sobre suscripción y pago\n• Soporte técnico\n• Problemas de cuenta\n• Consultas generales\n\n¿Cómo puedo ayudarte hoy?",
      aiChatEnded: "Sesión de chat finalizada. Volviendo al menú principal...",
      aiChatRateLimit: "⏳ Por favor, espera un momento antes de enviar otro mensaje.",
      aiChatThinking: "🤔 Pensando...",
      aiChatError: "❌ Lo siento, encontré un error. Por favor, inténtalo de nuevo.",
      aiChatNoAPI: "❌ El chat de IA no está disponible en este momento. Por favor, intenta más tarde.",
    },
  },
  getText: function (language, key) {
    return this.locales[language][key] || this.locales.en[key];
  },
};

module.exports = i18n;
