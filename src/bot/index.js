require("../config/env");
const { Telegraf } = require('telegraf');
const { db } = require("../config/firebase");
const { t } = require("../utils/i18n");
const logger = require("../utils/logger");
const { ensureOnboarding } = require("../utils/guards");
const { isAdmin, adminMiddleware } = require("../config/admin");
const { prepareTextLocationUpdate } = require("../services/profileService");
const { captureException, setUser } = require("../config/sentry");

// Note: Sentry is initialized in instrument.js at the application entry point

const {
  showPlanDashboard,
  handlePlanCallback,
  handlePlanTextResponse,
} = require('./handlers/admin/planManager');
// Middleware
// MIGRATED TO FIRESTORE: Using scalable Firestore sessions instead of local JSON
const { createFirestoreSession } = require("./middleware/firestoreSession");
const session = createFirestoreSession({
  collectionName: "bot_sessions",
  ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
});
const rateLimitMiddleware = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");
const privateResponseMiddleware = require("./middleware/privateResponseMiddleware");
const autoDeleteMiddleware = require("./middleware/autoDeleteMiddleware");
const deleteUserCommandsMiddleware = require("./middleware/deleteUserCommandsMiddleware");
const moderationMiddleware = require("./middleware/moderationMiddleware");

// Start session cleanup service
const { sessionCleanup } = require("../utils/sessionCleanup");
sessionCleanup.start();

// Helpers
const onboardingHelpers = require("./helpers/onboardingHelpers");
const subscriptionHelpers = require("./helpers/subscriptionHelpers");

// Handlers
const startHandler = require("./handlers/start");
const helpHandler = require("./handlers/help");
const mapHandler = require("./handlers/map");
const nearbyHandler = require("./handlers/nearby");
const liveHandler = require("./handlers/live");
const appHandler = require("./handlers/app");
const {
  viewProfile,
  handleEditPhoto,
  handlePhotoMessage,
  showSettings,
  toggleAdsOptOut,
  showLanguageSelection,
  setLanguage,
  showPersonalitySelection,
  handlePersonalitySelection,
} = require("./handlers/profile");
const subscribeHandler = require("./handlers/subscribe");

// Community Features
const {
  handleNearby,
  handleLibrary,
  handleTopTracks,
  handleScheduleCall,
  handleScheduleStream,
  handleUpcoming,
  handlePlaylist,
  handleAddTrack,
  handleDeleteTrack,
  handleDeleteEvent,
  handlePlayTrack,
  handleBackToLibrary,
  handleSetTimezone,
  handleTimezoneCallback
} = require("./handlers/community");
const { handleNewMember, handleMediaMessage } = require("./helpers/groupManagement");
// Daimo Pay temporarily disabled - service module removed
// const {
//   showDaimoPlans,
//   handleDaimoPlanSelection,
//   handleDaimoHelp,
// } = require("./handlers/daimoPayHandler");
const {
  sendPromoAnnouncement,
  executePromoSend,
  handlePaymentVerification,
  handleAdminConfirmation,
  handleAdminRejection,
  handlePromoCancel
} = require("./handlers/promoHandler");
const {
  showCopCardPlans,
  handleCopCardPlanSelection,
  handleCopCardPaymentConfirmed,
  handleCopCardStatus,
  handleCopCardHelp,
} = require("./handlers/copCardHandler");
const {
  adminPanel,
  handleAdminCallback,
  sendBroadcast,
  executeSearch,
  executeSendMessage,
  processActivationUserId,
  processUpdateMemberUserId,
  processExtendUserId,
  executeCustomExtension,
  executeModifyExpiration,
  executePlanEdit,
  sendReactivationBroadcast,
} = require("./handlers/admin");
const { handleMapCallback, handleLocation } = require("./handlers/map");
const { handleNearbyCallback } = require("./handlers/nearby");
const { handleLiveCallback } = require("./handlers/live");
const { startAIChat, endAIChat, handleChatMessage, handleAIChatCallback } = require("./handlers/aiChat");
const { 
  showSupportTickets,
  handleSupportCallback,
  handleWaitingMessage
} = require("./handlers/admin/supportTickets");
const {
  showReactivationIntro,
  handleReactivationCallback,
  handleReactivationProofUpload,
} = require("./handlers/reactivation");
const {
  handleShowBlacklist,
  handleAddWord,
  handleRemoveWord,
  handleAddLink,
  handleRemoveLink,
  handleCheckViolations,
  handleClearViolations
} = require("./handlers/moderation");
const {
  handleRules,
  handleGroupRules,
  handleMapRules,
  handleZoomRules,
  handleLibraryRules,
  handleBackToRulesMenu,
  handleCloseRules
} = require("./handlers/rules");
const { handleZoomStatus } = require("./handlers/zoomStatus");
const { handleBroadcastPrime, handleBroadcastConfirmation } = require("./handlers/broadcastPrimeAdmin");
const { initializePrimeScheduler } = require("../services/primeDeadlineScheduler");

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Add session middleware
bot.use(session); // Firestore session middleware

// Apply middleware
bot.use(rateLimitMiddleware());
bot.use(moderationMiddleware); // Check messages for blacklisted content (before other middleware)
bot.use(deleteUserCommandsMiddleware()); // Delete user command messages from groups after 10 seconds
bot.use(autoDeleteMiddleware()); // Auto-delete bot messages in groups after 5 minutes
bot.use(privateResponseMiddleware()); // Redirect group responses to private chat

// Middleware to set Sentry user context
bot.use(async (ctx, next) => {
  if (ctx.from) {
    setUser({
      id: ctx.from.id,
      username: ctx.from.username,
    });
  }
  return next();
});

// Error handling with Sentry integration
bot.catch((error, ctx) => {
  // Capture error in Sentry with context
  captureException(error, {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat?.id,
    updateType: ctx.updateType,
    command: ctx.message?.text || ctx.callbackQuery?.data,
  });

  // Call original error handler
  return errorHandler(error, ctx);
});

// ===== COMMANDS =====
bot.start(startHandler);
bot.command("help", helpHandler);
bot.command("map", mapHandler);
bot.command("nearby", handleNearby);
bot.command("live", liveHandler);
bot.command("app", appHandler);
bot.command("profile", async (ctx) => {
  const userId = ctx.from.id.toString();
  logger.info(`COMMAND DEBUG: /profile invoked by user ${userId}`);
  await viewProfile(ctx);
});
bot.command("subscribe", subscribeHandler);
bot.command("admin", adminMiddleware(), adminPanel);
bot.command("sendpromo", adminMiddleware(), sendPromoAnnouncement);
bot.command("reactivateprime", adminMiddleware(), sendReactivationBroadcast);
bot.command("plans", adminMiddleware(), async (ctx) => {
  await showPlanDashboard(ctx);
});
bot.command("support_tickets", adminMiddleware(), showSupportTickets);
bot.command("aichat", startAIChat);
bot.command("endchat", endAIChat);
bot.command("reactivate", showReactivationIntro);

// ===== HIDDEN ADMIN COMMANDS =====
bot.command("sendpaymentbutton", adminMiddleware(), async (ctx) => {
  const { sendPaymentButton } = require("./handlers/admin");
  await sendPaymentButton(ctx);
});

// ===== OPT-OUT COMMANDS =====
bot.command("optout", async (ctx) => {
  const { handleOptOut } = require("./handlers/admin");
  await handleOptOut(ctx);
});

bot.command("optin", async (ctx) => {
  const { handleOptIn } = require("./handlers/admin");
  await handleOptIn(ctx);
});

// ===== COMMUNITY FEATURES =====
bot.command("menu", async (ctx) => {
  const { showGroupMenu } = require("./handlers/groupMenu");
  await showGroupMenu(ctx);
});
bot.command("rules", handleRules);
bot.command("library", handleLibrary);
bot.command("toptracks", handleTopTracks);
bot.command("schedulecall", handleScheduleCall);
bot.command("schedulestream", handleScheduleStream);
bot.command("upcoming", handleUpcoming);
bot.command("playlist", handlePlaylist);
bot.command("addtrack", handleAddTrack);
bot.command("deletetrack", handleDeleteTrack);
bot.command("deleteevent", handleDeleteEvent);
bot.command("settimezone", handleSetTimezone);
bot.command("zoomstatus", handleZoomStatus);

// ===== PRIME MIGRATION COMMANDS (Admin Only) =====
bot.command("broadcastprime", adminMiddleware(), handleBroadcastPrime);

// ===== MODERATION COMMANDS (Admin Only) =====
bot.command("blacklist", handleShowBlacklist);
bot.command("addword", handleAddWord);
bot.command("removeword", handleRemoveWord);
bot.command("addlink", handleAddLink);
bot.command("removelink", handleRemoveLink);
bot.command("violations", handleCheckViolations);
bot.command("clearviolations", handleClearViolations);

// ===== ONBOARDING FLOW =====
// Handle both language callback formats: lang_xx and language_xx
// FIXED: Exclude bcast_lang_xx by checking callback data manually
bot.action(/lang_(.+)/, async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  // Skip if this is a broadcast language selection
  if (callbackData.startsWith('bcast_')) {
    await ctx.answerCbQuery();
    return;
  }
  return onboardingHelpers.handleLanguageSelection(ctx);
});

bot.action(/language_(.+)/, (ctx) => {
  return onboardingHelpers.handleLanguageSelection(ctx);
});
bot.action("confirm_age", onboardingHelpers.handleAgeConfirmation);
bot.action("accept_terms", onboardingHelpers.handleTermsAcceptance);
bot.action("decline_terms", onboardingHelpers.handleTermsDecline);
bot.action("accept_privacy", onboardingHelpers.handlePrivacyAcceptance);
bot.action("decline_privacy", onboardingHelpers.handlePrivacyDecline);

// Handle email collection during onboarding
bot.on("message", async (ctx, next) => {
  try {
    if (ctx.session?.awaitingEmail) {
      await onboardingHelpers.handleEmailSubmission(ctx);
      return; // Don't call next() after handling email
    }
    return next(); // Only call next() if not handling email
  } catch (error) {
    logger.error("Error in message handler:", error);
    return next(); // Call next() on error
  }
});

// ===== SUBSCRIPTION HANDLERS =====
bot.action(/^plan_select_(.+)$/, async (ctx) => {
  const planId = ctx.match[1];
  await subscriptionHelpers.handleSubscription(ctx, planId);
});

// Back to subscription plans handler
bot.action("show_subscription_plans", async (ctx) => {
  await subscribeHandler(ctx);
});

// ===== DAIMO PAY HANDLERS ===== (Temporarily disabled)
// bot.action("daimo_show_plans", async (ctx) => {
//   await showDaimoPlans(ctx);
// });

// bot.action(/^daimo_plan_(.+)$/, async (ctx) => {
//   await handleDaimoPlanSelection(ctx);
// });

// bot.action("daimo_help", async (ctx) => {
//   await handleDaimoHelp(ctx);
// });

// ===== COP CARD PAYMENT HANDLERS =====
bot.action("cop_card_show_plans", async (ctx) => {
  await showCopCardPlans(ctx);
});

bot.action(/^cop_card_plan_(.+)$/, async (ctx) => {
  await handleCopCardPlanSelection(ctx);
});

bot.action(/^cop_card_confirmed_(.+)$/, async (ctx) => {
  await handleCopCardPaymentConfirmed(ctx);
});

bot.action(/^cop_card_status_(.+)$/, async (ctx) => {
  await handleCopCardStatus(ctx);
});

bot.action("cop_card_help", async (ctx) => {
  await handleCopCardHelp(ctx);
});

// ===== KYRREX CRYPTO PAYMENT HANDLERS =====
bot.action("kyrrex_show_plans", async (ctx) => {
  await showKyrrexPlans(ctx);
});

bot.action(/^kyrrex_plan_(.+)$/, async (ctx) => {
  await handleKyrrexPlanSelection(ctx);
});

bot.action(/^kyrrex_crypto_(.+)$/, async (ctx) => {
  await handleKyrrexCryptoSelection(ctx);
});

bot.action(/^kyrrex_check_(.+)$/, async (ctx) => {
  await handleKyrrexPaymentCheck(ctx);
});

bot.action(/^kyrrex_copy_(.+)$/, async (ctx) => {
  await handleKyrrexCopyAddress(ctx);
});

bot.action("kyrrex_help", async (ctx) => {
  await handleKyrrexHelp(ctx);
});

// Main menu item handlers
bot.action("show_my_profile", async (ctx) => {
  await viewProfile(ctx);
});

bot.action("show_nearby", async (ctx) => {
  await nearbyHandler(ctx);
});

bot.action("show_help", async (ctx) => {
  await helpHandler(ctx);
});

// AI Chat callback handler
bot.action("start_ai_chat", handleAIChatCallback);
bot.action("request_human_support", handleAIChatCallback);
bot.action("continue_ai_chat", handleAIChatCallback);

// Support ticket callbacks
bot.action(/^(view_ticket_|claim_ticket_|respond_ticket_|resolve_ticket_|close_ticket_|priority_ticket_|set_priority_).+/, handleSupportCallback);
bot.action(/(refresh_tickets|back_to_tickets|all_tickets|my_tickets)/, handleSupportCallback);
bot.action(/^(reactivate_.+|approve_reactivation_.+|deny_reactivation_.+)$/, handleReactivationCallback);

// Payment method selection handlers removed (Daimo & ePayco)

bot.action("upgrade_tier", (ctx) => subscribeHandler(ctx));
bot.action("subscribe_prime", (ctx) => subscribeHandler(ctx));

// ===== PROFILE EDIT HANDLERS =====

bot.action("edit_bio", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.waitingFor = "bio";

    await ctx.answerCbQuery();
    await ctx.reply(t("enterBio", lang), { parse_mode: "Markdown" });

    logger.info(`User ${ctx.from.id} started editing bio`);
  } catch (error) {
    logger.error("Error in edit bio:", error);
  }
});

bot.action("edit_location", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.waitingFor = "location_text";

    await ctx.answerCbQuery();
    await ctx.reply(t("enterLocation", lang), {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          [
            {
              text: t("shareLocation", lang),
              request_location: true,
            },
          ],
        ],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });

    logger.info(`User ${ctx.from.id} started editing location`);
  } catch (error) {
    logger.error("Error in edit location:", error);
  }
});

// Edit photo
bot.action("edit_photo", handleEditPhoto);

// Profile settings
bot.action("profile_settings", showSettings);
bot.action("settings_toggle_ads", toggleAdsOptOut);
bot.action("settings_change_language", showLanguageSelection);
bot.action("settings_set_lang_en", (ctx) => setLanguage(ctx, "en"));
bot.action("settings_set_lang_es", (ctx) => setLanguage(ctx, "es"));
bot.action("settings_choose_personality", showPersonalitySelection);
bot.action(/^personality_select_(.+)$/, (ctx) => {
  const personalityName = ctx.match[1];
  return handlePersonalitySelection(ctx, personalityName);
});
bot.action("settings_back", viewProfile);

// ===== MUSIC LIBRARY CALLBACKS =====
bot.action(/^play_track:/, handlePlayTrack);
bot.action("back_to_library", handleBackToLibrary);

// ===== TIMEZONE CALLBACKS =====
bot.action(/^set_tz:/, handleTimezoneCallback);

// ===== RULES CALLBACKS =====
bot.action("rules_group", handleGroupRules);
bot.action("rules_map", handleMapRules);
bot.action("rules_zoom", handleZoomRules);
bot.action("rules_library", handleLibraryRules);
bot.action("rules_menu", handleBackToRulesMenu);
bot.action("close_rules", handleCloseRules);

// ===== GROUP MENU CALLBACKS =====
bot.action("group_menu_library", async (ctx) => {
  const { handleLibraryCallback } = require("./handlers/groupMenu");
  await handleLibraryCallback(ctx);
});

bot.action("group_menu_openroom", async (ctx) => {
  const { handleOpenRoomCallback } = require("./handlers/groupMenu");
  await handleOpenRoomCallback(ctx);
});

bot.action("group_menu_rules", async (ctx) => {
  const { handleRulesCallback } = require("./handlers/groupMenu");
  await handleRulesCallback(ctx);
});

bot.action("group_menu_help", async (ctx) => {
  const { handleHelpCallback } = require("./handlers/groupMenu");
  await handleHelpCallback(ctx);
});

bot.action("group_menu_subscribe", async (ctx) => {
  const { handleSubscribeCallback } = require("./handlers/groupMenu");
  await handleSubscribeCallback(ctx);
});

bot.action("group_menu_back", async (ctx) => {
  const { handleBackToMenu } = require("./handlers/groupMenu");
  await handleBackToMenu(ctx);
});

bot.action("group_menu_close", async (ctx) => {
  const { handleCloseMenu } = require("./handlers/groupMenu");
  await handleCloseMenu(ctx);
});

// ===== ADMIN CALLBACKS =====

bot.action(/^plan:/, handlePlanCallback);
bot.action(/^admin_/, handleAdminCallback);
// Broadcast handlers
bot.action("simple_broadcast_confirm", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_add_media", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_text_only", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

// New broadcast language callbacks (route to admin handler)
bot.action("broadcast_multi_language", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_single_message", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_multi_text_only", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_formatting_help", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

// ===== PROMO CALLBACKS =====
bot.action(/^promo_send_(en|es|both)$/, async (ctx) => {
  const lang = ctx.match[1];
  await executePromoSend(ctx, lang);
});

bot.action("promo_verify_payment", async (ctx) => {
  await handlePaymentVerification(ctx);
});

bot.action(/^promo_confirm_(.+)$/, async (ctx) => {
  const userId = ctx.match[1];
  await handleAdminConfirmation(ctx, userId);
});

bot.action(/^promo_reject_(.+)$/, async (ctx) => {
  const userId = ctx.match[1];
  await handleAdminRejection(ctx, userId);
});

bot.action("promo_cancel", async (ctx) => {
  await handlePromoCancel(ctx);
});

// ===== PAYMENT CONFIRMATION CALLBACKS =====
bot.action("payment_confirmation_start", async (ctx) => {
  await ctx.answerCbQuery();
  const { handlePaymentConfirmationStart } = require("./handlers/admin");
  await handlePaymentConfirmationStart(ctx);
});

bot.action(/^payment_confirm_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const planId = ctx.match[1];
  const { handlePaymentPlanSelection } = require("./handlers/admin");
  await handlePaymentPlanSelection(ctx, planId);
});

bot.action("show_all_plans", async (ctx) => {
  await ctx.answerCbQuery();
  const { showAllPlansForPayment } = require("./handlers/admin");
  await showAllPlansForPayment(ctx);
});

bot.action("broadcast_opt_out", async (ctx) => {
  await ctx.answerCbQuery();
  const { handleOptOutCallback } = require("./handlers/admin");
  await handleOptOutCallback(ctx);
});

// ===== MEMBERSHIP UPDATE CALLBACK =====

bot.action("request_membership_update", async (ctx) => {
  const { handleMembershipUpdateRequest } = require("./handlers/membershipUpdateHandler");
  await handleMembershipUpdateRequest(ctx);
});

// ===== BROADCAST SEGMENTATION CALLBACKS =====

bot.action("broadcast_select_segment", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_all_users", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_segment_more", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action("broadcast_back_to_start", async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

bot.action(/^broadcast_segment_/, async (ctx) => {
  await ctx.answerCbQuery();
  await handleAdminCallback(ctx);
});

// ===== PRIME MIGRATION CALLBACKS =====
bot.action("confirm_prime_broadcast", handleBroadcastConfirmation);
bot.action("cancel_prime_broadcast", handleBroadcastConfirmation);

// ===== MAP CALLBACKS =====

bot.action(
  /^(share_location|search_nearby(_[0-9]+)?|profile_view_map)$/,
  handleMapCallback
);

// ===== NEARBY CALLBACKS =====

bot.action(/^open_nearby_app$/, handleNearbyCallback);

// ===== LIVE CALLBACKS =====

bot.action(/^(start_live|view_lives)$/, handleLiveCallback);

// ===== BACK NAVIGATION =====

bot.action("back_to_main", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";

    // Answer callback query with error handling for expired queries
    await ctx.answerCbQuery().catch((err) => {
      // Silently ignore "query too old" errors - they're harmless
      if (!err.message.includes('query is too old')) {
        logger.error('Error answering callback query:', err);
      }
    });

    // Edit the message to show main menu with inline keyboard
    try {
      await ctx.editMessageText(t("mainMenuIntro", lang), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "💎 Suscríbete al Canal PRIME" : "💎 Subscribe to PRIME Channel",
                callback_data: "show_subscription_plans",
              },
            ],
            [
              {
                text: lang === "es" ? "👤 Mi Perfil" : "👤 My Profile",
                callback_data: "show_my_profile",
              },
            ],
            [
              {
                text: lang === "es" ? "🌍 ¿Quién está cerca?" : "🌍 Who is nearby?",
                callback_data: "show_nearby",
              },
            ],
            [
              {
                text: lang === "es" ? "🤖 PNPtv! Soporte" : "🤖 PNPtv! Support",
                callback_data: "show_help",
              },
            ],
          ],
        },
        parse_mode: "Markdown",
      });
    } catch (editError) {
      // If edit fails, delete old and send new message
      try {
        await ctx.deleteMessage();
      } catch (deleteError) {
        // Ignore delete errors
      }
      await ctx.reply(t("mainMenuIntro", lang), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "💎 Suscríbete al Canal PRIME" : "💎 Subscribe to PRIME Channel",
                callback_data: "show_subscription_plans",
              },
            ],
            [
              {
                text: lang === "es" ? "👤 Mi Perfil" : "👤 My Profile",
                callback_data: "show_my_profile",
              },
            ],
            [
              {
                text: lang === "es" ? "🌍 ¿Quién está cerca?" : "🌍 Who is nearby?",
                callback_data: "show_nearby",
              },
            ],
            [
              {
                text: lang === "es" ? "🤖 PNPtv! Soporte" : "🤖 PNPtv! Support",
                callback_data: "show_help",
              },
            ],
          ],
        },
        parse_mode: "Markdown",
      });
    }
  } catch (error) {
    logger.error("Error in back navigation:", error);
  }
});

// ===== TEXT MESSAGE HANDLERS =====

// ===== MEDIA MESSAGE HANDLERS =====
bot.on("photo", async (ctx, next) => {
  // Check if admin is uploading broadcast media
  if ((ctx.session.waitingFor === "broadcast_media" || ctx.session.waitingFor === "broadcast_text") && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "photo");
  } else if (ctx.session.waitingForPaymentProof) {
    // Handle payment receipt upload
    const { handlePaymentProofUpload } = require("./handlers/admin");
    await handlePaymentProofUpload(ctx, "photo");
  } else if (ctx.session.waitingFor === "reactivation_proof") {
    const photos = ctx.message.photo || [];
    const highestRes = photos[photos.length - 1];
    if (highestRes) {
      const handled = await handleReactivationProofUpload(ctx, {
        type: "photo",
        fileId: highestRes.file_id,
        fileUniqueId: highestRes.file_unique_id,
      });
      if (handled) {
        return;
      }
    }
  } else {
    await handlePhotoMessage(ctx);
  }
});

bot.on("video", async (ctx) => {
  // Check if admin is uploading broadcast media
  if ((ctx.session.waitingFor === "broadcast_media" || ctx.session.waitingFor === "broadcast_text") && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "video");
  }
});

bot.on("document", async (ctx) => {
  // Check if admin is uploading broadcast media
  if ((ctx.session.waitingFor === "broadcast_media" || ctx.session.waitingFor === "broadcast_text") && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "document");
  } else if (ctx.session.waitingForPaymentProof) {
    // Handle payment receipt upload
    const { handlePaymentProofUpload } = require("./handlers/admin");
    await handlePaymentProofUpload(ctx, "document");
  } else if (ctx.session.waitingFor === "reactivation_proof") {
    const document = ctx.message.document;
    if (document) {
      const handled = await handleReactivationProofUpload(ctx, {
        type: "document",
        fileId: document.file_id,
        fileUniqueId: document.file_unique_id,
      });
      if (handled) {
        return;
      }
    }
  }
});

bot.on("audio", async (ctx) => {
  // Check if admin is uploading broadcast media
  if ((ctx.session.waitingFor === "broadcast_media" || ctx.session.waitingFor === "broadcast_text") && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "audio");
  }
});

bot.on("voice", async (ctx) => {
  // Check if admin is uploading broadcast media
  if ((ctx.session.waitingFor === "broadcast_media" || ctx.session.waitingFor === "broadcast_text") && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "voice");
  }
});

bot.on("animation", async (ctx) => {
  // Check if admin is uploading broadcast media
  if ((ctx.session.waitingFor === "broadcast_media" || ctx.session.waitingFor === "broadcast_text") && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "animation");
  }
});
bot.on("text", async (ctx) => {
  try {
    if (await handlePlanTextResponse(ctx)) {
      return;
    }
    // Check onboarding
    if (!ctx.session?.onboardingComplete) {
      const lang = ctx.session?.language || "en";
      await ctx.reply(t("pleaseCompleteOnboarding", lang));
      return;
    }

    const userId = ctx.from.id.toString();
    const lang = ctx.session.language || "en";
    const {
      sanitizeInput,
      isValidBio,
      isValidLocation,
    } = require("../utils/validation");

    // Handle different waiting states
    if (ctx.session.waitingFor === "bio") {
      const bio = sanitizeInput(ctx.message.text);

      if (!isValidBio(bio)) {
        await ctx.reply(t("invalidInput", lang));
        return;
      }

      await db.collection("users").doc(userId).update({ bio });
      ctx.session.waitingFor = null;

      await ctx.reply(t("bioUpdated", lang), { parse_mode: "Markdown" });

      logger.info(`User ${userId} updated bio`);
    } else if (ctx.session.waitingFor === "location_text") {
      const location = sanitizeInput(ctx.message.text);

      if (!isValidLocation(location)) {
        await ctx.reply(t("invalidInput", lang));
        return;
      }

      const locationUpdate = prepareTextLocationUpdate(location);

      await db
        .collection("users")
        .doc(userId)
        .update({
          ...locationUpdate,
          lastActive: new Date(),
        });
      ctx.session.waitingFor = null;

      await ctx.reply(t("locationUpdated", lang), { parse_mode: "Markdown" });

      logger.info(`User ${userId} updated location (text)`);
    } else if (ctx.session.waitingFor === "broadcast_message") {
      // Admin broadcast message - step 4 text
      if (isAdmin(ctx.from.id)) {
        await sendBroadcast(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "broadcast_message_en") {
      // Admin broadcast message - English text for multi-language
      if (isAdmin(ctx.from.id)) {
        const { handleBroadcastEnglishMessage } = require("./handlers/admin");
        await handleBroadcastEnglishMessage(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "broadcast_message_es") {
      // Admin broadcast message - Spanish text for multi-language
      if (isAdmin(ctx.from.id)) {
        const { handleBroadcastSpanishMessage } = require("./handlers/admin");
        await handleBroadcastSpanishMessage(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "broadcast_text") {
      // Admin broadcast message - step 4 text (new wizard)
      if (isAdmin(ctx.from.id)) {
        if (ctx.session.broadcastWizard) {
          // Wizard mode - handle step 4
          const { handleBroadcastWizardText } = require("./handlers/admin");
          await handleBroadcastWizardText(ctx, ctx.message.text);
        } else {
          // Legacy mode
          await sendBroadcast(ctx, ctx.message.text);
        }
      }
    } else if (ctx.session.waitingFor === "broadcast_buttons") {
      // Admin broadcast buttons - step 5
      if (isAdmin(ctx.from.id)) {
        const { handleBroadcastButtons } = require("./handlers/admin");
        await handleBroadcastButtons(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "broadcast_schedule_date") {
      // Admin schedule broadcast - date input
      if (isAdmin(ctx.from.id)) {
        const { handleScheduleBroadcastDate } = require("./handlers/admin");
        await handleScheduleBroadcastDate(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_search") {
      // Admin user search
      if (isAdmin(ctx.from.id)) {
        await executeSearch(ctx, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_message_")
    ) {
      // Admin send message to user
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace("admin_message_", "");
        await executeSendMessage(ctx, userId, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_activate_userid") {
      // Admin manual membership activation - user ID input
      if (isAdmin(ctx.from.id)) {
        await processActivationUserId(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_update_member_userid") {
      // Admin update member - user ID input
      if (isAdmin(ctx.from.id)) {
        await processUpdateMemberUserId(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_extend_userid") {
      // Admin extend membership - user ID input
      if (isAdmin(ctx.from.id)) {
        await processExtendUserId(ctx, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_extend_custom_days_")
    ) {
      // Admin custom extension - days input
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace(
          "admin_extend_custom_days_",
          ""
        );
        await executeCustomExtension(ctx, userId, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_modify_expiration_")
    ) {
      // Admin modify expiration - date input
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace(
          "admin_modify_expiration_",
          ""
        );
        await executeModifyExpiration(ctx, userId, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_plan_edit_")
    ) {
      // Admin plan edit - field input
      if (isAdmin(ctx.from.id)) {
        // Extract field and plan name from waitingFor
        // Format: admin_plan_edit_<field>_<planName>
        const parts = ctx.session.waitingFor
          .replace("admin_plan_edit_", "")
          .split("_");
        const field = parts[0];
        const planName = parts[1];
        await executePlanEdit(ctx, planName, field, ctx.message.text);
      }
    } else if (await handleWaitingMessage(ctx)) {
      // Support ticket response handled
      return;
    } else if (ctx.session.aiChatActive) {
      // Handle AI chat messages when in chat mode
      await handleChatMessage(ctx);
    } else {
      // Handle keyboard button texts
      const text = ctx.message.text.toLowerCase();

      if (text.includes("profile") || text.includes("perfil")) {
        await viewProfile(ctx);
      } else if (text.includes("map") || text.includes("mapa")) {
        await mapHandler(ctx);
      } else if (text.includes("nearby") || text.includes("cercano") || text.includes("cerca") || text.includes("miembro")) {
        await nearbyHandler(ctx);
      } else if (text.includes("live") || text.includes("vivo")) {
        await liveHandler(ctx);
      } else if (text.includes("subscri") || text.includes("suscri") || text.includes("plan")) {
        await subscribeHandler(ctx);
      } else if (text.includes("help") || text.includes("ayuda")) {
        await helpHandler(ctx);
      } else if (text.includes("cristina") || text.includes("crystal") || text.includes("ai chat") || text.includes("chat ia")) {
        // Handle Cristina Crystal / AI Chat keyboard button
        await startAIChat(ctx);
      } else if (text.includes("pnptv app") || text.includes("app pnptv") || text.includes("mini app") || text.includes("abrir mini")) {
        // Handle PNPTv App / Mini App keyboard button
        await appHandler(ctx);
      } else if (
        text.includes("payment") || text.includes("paid") || text.includes("activate") || 
        text.includes("membership") || text.includes("subscription") || text.includes("pago") || 
        text.includes("pagué") || text.includes("activar") || text.includes("membresía") || 
        text.includes("suscripción") || text.includes("made a payment") || text.includes("hice un pago") ||
        text.includes("sent payment") || text.includes("envié pago") || text.includes("transferred") || 
        text.includes("transferí") || text.includes("crypto") || text.includes("usdc") ||
        text.includes("coinbase") || text.includes("binance") || text.includes("zelle") ||
        text.includes("cash app") || text.includes("venmo") || text.includes("revolut") || text.includes("wise")
      ) {
        // Handle payment/activation requests
        await ctx.reply(t("paymentContactAdmin", lang, { userId: ctx.from.id }), { parse_mode: "Markdown" });
      }
    }
  } catch (error) {
    logger.error("Error handling text message:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
});

// ===== LOCATION MESSAGE HANDLER =====

bot.on("location", handleLocation);

// ===== GROUP MANAGEMENT =====
// Handle new members joining groups
bot.on('new_chat_members', handleNewMember);

// Handle media messages for permission enforcement
bot.on(['photo', 'video', 'document', 'audio', 'voice', 'video_note', 'sticker', 'animation'], async (ctx, next) => {
  // Only apply group restrictions in group chats
  if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    await handleMediaMessage(ctx);
  } else {
    // In private chats, continue with normal handling
    return next();
  }
});

// Add action handlers
bot.action("cancel_delete", (ctx) =>
  ctx.editMessageText("Operation cancelled")
);

bot.action("show_map", async (ctx) => {
  try {
    await ctx.reply("Select your preferred distance:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "5km", callback_data: "map_distance_5" },
            { text: "10km", callback_data: "map_distance_10" },
            { text: "25km", callback_data: "map_distance_25" },
          ],
          [{ text: "🔙 Back", callback_data: "back_to_main" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error showing map:", error);
    await ctx.reply("Error showing map options. Please try again.");
  }
});

module.exports = bot;
