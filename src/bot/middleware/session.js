const LocalSession = require("telegraf-session-local");

// Configure session with persistence
const session = new LocalSession({
  database: "sessions.json",
  property: "session",
  storage: LocalSession.storageFileAsync,
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2),
    deserialize: (str) => JSON.parse(str),
  },
  state: {
    language: "en",
    onboardingStep: "start",
    xp: 0,
    badges: [],
    ageVerified: false,
    termsAccepted: false,
    privacyAccepted: false,
  },
});

module.exports = session;
