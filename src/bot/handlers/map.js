const { t } = require("../../utils/i18n");
const { formatMessage } = require("../../utils/formatters");
const logger = require("../../utils/logger");

module.exports = async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    const mapText = t("mapInfo", lang);
    const message = formatMessage("Map", mapText, lang);

    await ctx.reply(message, { parse_mode: "Markdown" });
    logger.info(`User ${ctx.from.id} viewed map`);
  } catch (error) {
    logger.error("Error in map handler:", error);
    const lang = ctx.session.language || "en";
    await ctx.reply(t("error", lang));
  }
};
