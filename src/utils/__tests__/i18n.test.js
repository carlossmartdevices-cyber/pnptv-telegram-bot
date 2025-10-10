const { t, getSupportedLanguages, isLanguageSupported } = require("../i18n");

describe("i18n Utils", () => {
  describe("t()", () => {
    it("should return English translation by default", () => {
      const result = t("welcome");
      expect(result).toContain("Welcome");
    });

    it("should return Spanish translation when specified", () => {
      const result = t("welcome", "es");
      expect(result).toContain("Bienvenido");
    });

    it("should interpolate parameters", () => {
      const result = t("profileInfo", "en", {
        userId: "123",
        username: "testuser",
        xp: "100",
        badges: "None",
        tier: "Free",
        location: "NYC",
        bio: "Test bio",
      });

      expect(result).toContain("123");
      expect(result).toContain("testuser");
      expect(result).toContain("100");
    });

    it("should fallback to English for unknown keys", () => {
      const result = t("unknownKey", "es");
      expect(result).toBeTruthy();
    });
  });

  describe("getSupportedLanguages()", () => {
    it("should return array of languages", () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain("en");
      expect(languages).toContain("es");
    });
  });

  describe("isLanguageSupported()", () => {
    it("should return true for supported languages", () => {
      expect(isLanguageSupported("en")).toBe(true);
      expect(isLanguageSupported("es")).toBe(true);
    });

    it("should return false for unsupported languages", () => {
      expect(isLanguageSupported("fr")).toBe(false);
      expect(isLanguageSupported("de")).toBe(false);
    });
  });
});
