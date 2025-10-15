const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getMenu } = require("../../config/menus");

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id.toString();
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    // Check if user already completed onboarding
    if (doc.exists && doc.data().onboardingComplete) {
      const userData = doc.data();
      const lang = userData.language || ctx.session.language || "en";

      // Update session
      ctx.session.language = lang;
      ctx.session.onboardingComplete = true;
      ctx.session.xp = userData.xp || 0;
      ctx.session.badges = userData.badges || [];
      ctx.session.tier = userData.tier || "Free";

      // Update last active
      await userRef.update({
        lastActive: new Date(),
      });

      logger.info(`Returning user ${userId} started bot`);

      // Show main menu
      const mainMenu = getMenu("main", lang);
      await ctx.reply(t("mainMenuIntro", lang), {
        reply_markup: mainMenu,
        parse_mode: "Markdown",
      });

      // Send Mini App button only if HTTPS URL is configured
      const webAppUrl = process.env.WEB_APP_URL;

      if (webAppUrl && webAppUrl.startsWith("https://")) {
        // HTTPS URL configured - show Mini App button
        return ctx.reply(
          lang === "es"
            ? "🌐 Abre nuestra Mini App para una experiencia completa!"
            : "🌐 Open our Mini App for the full experience!",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: lang === "es" ? "🚀 Abrir Mini App" : "🚀 Open Mini App",
                    web_app: { url: webAppUrl },
                  },
                ],
              ],
            },
          }
        );
      } else {
        // No HTTPS URL - show instructions
        return ctx.reply(
          lang === "es"
            ? "💡 *Mini App Disponible!*\n\n🌐 Pruébala en tu navegador:\n`http://localhost:3000/demo.html`\n\n📱 Para usarla en Telegram, el administrador necesita configurar HTTPS"
            : "💡 *Mini App Available!*\n\n🌐 Try it in your browser:\n`http://localhost:3000/demo.html`\n\n📱 To use in Telegram, admin needs to setup HTTPS",
          { parse_mode: "Markdown" }
        );
      }
    }

    // Start onboarding for new user
    logger.info(`New user ${userId} started onboarding`);

    // Initialize session
    ctx.session.onboardingStep = "language";
    ctx.session.onboardingComplete = false;
    ctx.session.language = "en";
    ctx.session.ageVerified = false;
    ctx.session.termsAccepted = false;
    ctx.session.privacyAccepted = false;

    // Show language selection
    await ctx.reply(t("welcome", "en"), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("languageEnglish", "en"), callback_data: "language_en" },
            { text: t("languageSpanish", "es"), callback_data: "language_es" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in start handler:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
};
