const {
  sanitizeInput,
  isValidEmail,
  isValidBio,
  isValidLocation,
  isValidUsername,
  isValidAge,
} = require("../validation");

describe("Validation Utils", () => {
  describe("sanitizeInput", () => {
    it("should trim whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
    });

    it("should remove HTML tags", () => {
      expect(sanitizeInput("<script>alert('xss')</script>")).toBe(
        "scriptalert('xss')/script"
      );
    });

    it("should limit length to 500 characters", () => {
      const longString = "a".repeat(600);
      expect(sanitizeInput(longString)).toHaveLength(500);
    });

    it("should return empty string for non-string input", () => {
      expect(sanitizeInput(null)).toBe("");
      expect(sanitizeInput(undefined)).toBe("");
      expect(sanitizeInput(123)).toBe("");
    });
  });

  describe("isValidEmail", () => {
    it("should validate correct email formats", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
    });

    it("should reject invalid email formats", () => {
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
    });
  });

  describe("isValidBio", () => {
    it("should accept valid bios", () => {
      expect(isValidBio("This is a valid bio")).toBe(true);
      expect(isValidBio("a".repeat(500))).toBe(true);
    });

    it("should reject invalid bios", () => {
      expect(isValidBio("")).toBe(false);
      expect(isValidBio("   ")).toBe(false);
      expect(isValidBio("a".repeat(501))).toBe(false);
      expect(isValidBio(123)).toBe(false);
    });
  });

  describe("isValidLocation", () => {
    it("should accept valid locations", () => {
      expect(isValidLocation("New York, USA")).toBe(true);
      expect(isValidLocation("a".repeat(100))).toBe(true);
    });

    it("should reject invalid locations", () => {
      expect(isValidLocation("")).toBe(false);
      expect(isValidLocation("   ")).toBe(false);
      expect(isValidLocation("a".repeat(101))).toBe(false);
    });
  });

  describe("isValidUsername", () => {
    it("should accept valid usernames", () => {
      expect(isValidUsername("user_name")).toBe(true);
      expect(isValidUsername("User123")).toBe(true);
    });

    it("should reject invalid usernames", () => {
      expect(isValidUsername("usr")).toBe(false); // too short
      expect(isValidUsername("user@name")).toBe(false); // invalid chars
      expect(isValidUsername("")).toBe(false);
    });
  });

  describe("isValidAge", () => {
    it("should accept valid ages", () => {
      expect(isValidAge(18)).toBe(true);
      expect(isValidAge(25)).toBe(true);
      expect(isValidAge(120)).toBe(true);
    });

    it("should reject invalid ages", () => {
      expect(isValidAge(17)).toBe(false);
      expect(isValidAge(121)).toBe(false);
      expect(isValidAge("18")).toBe(false);
    });
  });
});
