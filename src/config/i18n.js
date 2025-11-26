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
      aiChatWelcome: "🤖 **Hello! Welcome to PNPtv Support**\n\nI'm your AI customer support assistant, here to help you with everything PNPtv!\n\nI can assist you with:\n• Membership plans & subscriptions\n• Technical support & account access\n• Privacy, security & legal information\n• Community guidelines & wellness\n• Any questions about your PNPtv experience\n\nFeel free to ask me anything. I'm here for you 24/7! ✨\n\nType /endchat when you're ready to return to the main menu.",
      aiChatEnded: "✅ Chat ended. Returning to main menu...",
      aiChatRateLimit: "💫 Easy, love — let's take a breath. Give me just a moment before your next message.",
      aiChatThinking: "💭 Thinking...",
      aiChatError: "❌ Sorry, something went wrong. Let's try again, or type /endchat to exit.",
      aiChatNoAPI: "🤖 AI support is currently unavailable. Please reach out to support@pnptv.app for assistance.",
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
      aiChatWelcome: "🤖 **¡Hola! Bienvenido al Soporte de PNPtv**\n\nSoy tu asistente de IA de soporte al cliente, ¡aquí para ayudarte con todo lo relacionado con PNPtv!\n\nPuedo asistirte con:\n• Planes de membresía y suscripciones\n• Soporte técnico y acceso a tu cuenta\n• Privacidad, seguridad e información legal\n• Normas de la comunidad y bienestar\n• Cualquier pregunta sobre tu experiencia en PNPtv\n\nSiente la libertad de preguntarme lo que necesites. ¡Estoy aquí para ti 24/7! ✨\n\nEscribe /endchat cuando quieras volver al menú principal.",
      aiChatEnded: "✅ Chat finalizado. Volviendo al menú principal...",
      aiChatRateLimit: "💫 Tranquilo, amor — respiremos un momento. Dame solo un instante antes de tu próximo mensaje.",
      aiChatThinking: "💭 Pensando...",
      aiChatError: "❌ Lo siento, algo salió mal. Intentemos de nuevo, o escribe /endchat para salir.",
      aiChatNoAPI: "🤖 El soporte de IA no está disponible en este momento. Por favor escribe a support@pnptv.app para asistencia.",
    },
  },
  getText: function (language, key) {
    return this.locales[language][key] || this.locales.en[key];
  },
  // Alias for compatibility
  t: function (language, key) {
    return this.getText(language, key);
  },
};

module.exports = i18n;
