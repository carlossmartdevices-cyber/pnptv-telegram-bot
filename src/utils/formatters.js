module.exports = {
  formatMessage: (title, content, language = "en") => {
    const headers = {
      en: "**PNPtv! Telegram Bot**\n",
      es: "**PNPtv! Bot de Telegram**\n",
    };
    const footers = {
      en: "\n*Please press /help for assistance*",
      es: "\n*Por favor, presiona /help para ayuda*",
    };
    return `${headers[language]}${content}${footers[language]}`;
  },
};
