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
    },
  },
  getText: function (language, key) {
    return this.locales[language][key] || this.locales.en[key];
  },
};

module.exports = i18n;
