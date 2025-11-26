const { isAdmin } = require("../../../config/admin");
const logger = require("../../../utils/logger");
const supportTicketService = require("../../../services/supportTicketService");
const { TICKET_PRIORITIES } = supportTicketService;

/**
 * Admin Support Ticket Management Handler
 */

/**
 * Show support tickets dashboard
 */
async function showSupportTickets(ctx, filter = "all") {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.reply("⛔ This command is for administrators only.");
    return;
  }

  const normalizedFilter = filter === "mine" || filter === "my" ? "mine" : "all";
  ctx.session.supportTicketFilter = normalizedFilter;

  const isCallback = Boolean(ctx.callbackQuery);
  if (isCallback) {
    await ctx.answerCbQuery().catch(() => {});
  }

  try {
    const [openTickets, stats] = await Promise.all([
      normalizedFilter === "mine"
        ? supportTicketService.getOpenTickets(userId)
        : supportTicketService.getOpenTickets(),
      supportTicketService.getTicketStats()
    ]);

    const filterLabel = normalizedFilter === "mine" ? "👤 My Tickets" : "📊 All Tickets";

    const header = `🎫 **Support Tickets Dashboard**

🔍 **View:** ${filterLabel}

📊 **Statistics:**
• 🟢 Open: ${stats.open}
• 🟡 In Progress: ${stats.inProgress}  
• ✅ Resolved: ${stats.resolved}
• 📈 Total: ${stats.total}

${openTickets.length === 0 ? '✨ No open tickets!' : `🎯 **Open Tickets (${openTickets.length}):**`}`;

    let message = header;
    const buttons = [];

    // Show up to 10 recent open tickets
    for (const ticket of openTickets.slice(0, 10)) {
      const createdAtDate = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date();
      const timeAgo = getTimeAgo(createdAtDate);
      const priority = ticket.priority === 'urgent' ? '🔴' : 
                      ticket.priority === 'high' ? '🟡' : '🟢';
      const assignedTag = ticket.assignedTo
        ? (ticket.assignedTo === userId.toString() ? '👤 Assigned to you' : `👤 Assigned to ${ticket.assignedTo}`)
        : '';
      const preview = ticket.message ? ticket.message.slice(0, 60) : '';
      const suffix = ticket.message && ticket.message.length > 60 ? '...' : '';
      
      const usernameDisplay = ticket.username ? `@${ticket.username}` : `ID ${ticket.userId}`;

      message += `\n\n${priority} **#${ticket.id.slice(-6)}**`;
      message += `\n👤 ${usernameDisplay}`;
      message += `\n⏰ ${timeAgo}`;
      if (assignedTag) {
        message += `\n${assignedTag}`;
      }
      if (preview) {
        message += `\n📝 ${preview}${suffix}`;
      }
      
      buttons.push([{
        text: `📋 Ticket #${ticket.id.slice(-6)} ${ticket.assignedTo ? '👤' : ''}`,
        callback_data: `view_ticket_${ticket.id}`
      }]);
    }

    // Add management buttons
    buttons.push([
      {
        text: normalizedFilter === "all" ? "📊 All Tickets ✅" : "📊 All Tickets",
        callback_data: "all_tickets"
      },
      {
        text: normalizedFilter === "mine" ? "👤 My Tickets ✅" : "👤 My Tickets",
        callback_data: "my_tickets"
      }
    ]);

    buttons.push([
      { text: "🔄 Refresh", callback_data: "refresh_tickets" }
    ]);

    const keyboard = { inline_keyboard: buttons };

    if (isCallback) {
      try {
        await ctx.editMessageText(message, {
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error) {
        if (error.message && error.message.includes("message is not modified")) {
          return;
        }
        logger.warn("Support ticket dashboard edit failed, sending new message.", error);
        await ctx.reply(message, {
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      }
    } else {
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
    }

  } catch (error) {
    logger.error("Error showing support tickets:", error);
    if (isCallback) {
      await ctx.answerCbQuery("❌ Error loading tickets", { show_alert: true }).catch(() => {});
    } else {
      await ctx.reply("❌ Error loading tickets. Please try again.");
    }
  }
}

/**
 * View specific ticket details
 */
async function viewTicket(ctx, ticketId) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery("⛔ Admin only");
    return;
  }

  try {
    const ticket = await supportTicketService.getTicket(ticketId);
    
    if (!ticket) {
      await ctx.answerCbQuery("❌ Ticket not found");
      return;
    }

    const priority = ticket.priority === 'urgent' ? '🔴 URGENT' : 
                    ticket.priority === 'high' ? '🟡 HIGH' : 
                    ticket.priority === 'medium' ? '🟠 MEDIUM' : '🟢 LOW';

    const status = ticket.status === 'open' ? '🟢 OPEN' :
                  ticket.status === 'in_progress' ? '🟡 IN PROGRESS' :
                  ticket.status === 'resolved' ? '✅ RESOLVED' : '⚫ CLOSED';

    let message = `🎫 **Ticket #${ticket.id.slice(-6)}**

**Status:** ${status}
**Priority:** ${priority}
**User:** @${ticket.username} (ID: ${ticket.userId})
**Created:** ${ticket.createdAt.toDate().toLocaleString()}
**Assigned:** ${ticket.assignedTo ? `Admin ${ticket.assignedTo}` : 'Unassigned'}

**Message:**
${ticket.message}`;

    // Add user context if available
    if (ticket.context?.userContext) {
      const userCtx = ticket.context.userContext;
      message += `\n\n**User Info:**`;
      message += `\n• Tier: ${userCtx.tier}`;
      message += `\n• Membership: ${userCtx.membershipStatus}`;
      if (userCtx.recentPayments?.length > 0) {
        message += `\n• Recent Payments: ${userCtx.recentPayments.length}`;
      }
    }

    // Add responses if any
    if (ticket.responses && ticket.responses.length > 0) {
      message += `\n\n**Responses:**`;
      for (const response of ticket.responses.slice(-3)) {
        const responseTime = response.timestamp.toDate().toLocaleString();
        message += `\n\n📝 *Admin ${response.adminId}* (${responseTime}):`;
        message += `\n${response.message}`;
        if (response.isResolution) {
          message += ` ✅`;
        }
      }
    }

    const buttons = [];

    // Action buttons based on status
    if (ticket.status === 'open') {
      buttons.push([
        { text: "🎯 Claim Ticket", callback_data: `claim_ticket_${ticketId}` }
      ]);
    }

    if (ticket.status === 'in_progress' && ticket.assignedTo === userId.toString()) {
      buttons.push([
        { text: "💬 Respond", callback_data: `respond_ticket_${ticketId}` },
        { text: "✅ Resolve", callback_data: `resolve_ticket_${ticketId}` }
      ]);
    }

    // Priority and close buttons
    buttons.push([
      { text: "⚡ Priority", callback_data: `priority_ticket_${ticketId}` },
      { text: "❌ Close", callback_data: `close_ticket_${ticketId}` }
    ]);

    buttons.push([
      { text: "🔙 Back to Dashboard", callback_data: "back_to_tickets" }
    ]);

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });

  } catch (error) {
    logger.error("Error viewing ticket:", error);
    await ctx.answerCbQuery("❌ Error loading ticket");
  }
}

/**
 * Claim a ticket
 */
async function claimTicket(ctx, ticketId) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery("⛔ Admin only");
    return;
  }

  try {
    await supportTicketService.assignTicket(ticketId, userId);
    await ctx.answerCbQuery("✅ Ticket claimed!");
    
    // Refresh ticket view
    await viewTicket(ctx, ticketId);
    
  } catch (error) {
    logger.error("Error claiming ticket:", error);
    await ctx.answerCbQuery("❌ Error claiming ticket");
  }
}

/**
 * Start responding to a ticket
 */
async function startTicketResponse(ctx, ticketId) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery("⛔ Admin only");
    return;
  }

  try {
    const ticket = await supportTicketService.getTicket(ticketId);
    
    if (!ticket) {
      await ctx.answerCbQuery("❌ Ticket not found");
      return;
    }

    if (ticket.assignedTo !== userId.toString()) {
      await ctx.answerCbQuery("❌ You must claim this ticket first");
      return;
    }

    // Set waiting state for response
    ctx.session.waitingFor = `ticket_response_${ticketId}`;
    ctx.session.ticketId = ticketId;

    await ctx.answerCbQuery();
    await ctx.reply("💬 **Respond to Ticket**\n\nType your response message (it will be sent to the user):\n\n_Type /cancel to abort_", {
      parse_mode: "Markdown"
    });

  } catch (error) {
    logger.error("Error starting ticket response:", error);
    await ctx.answerCbQuery("❌ Error");
  }
}

/**
 * Handle ticket response message
 */
async function handleTicketResponse(ctx, ticketId, responseMessage) {
  const userId = ctx.from.id;

  try {
    const ticket = await supportTicketService.getTicket(ticketId);
    
    if (!ticket) {
      await ctx.reply("❌ Ticket not found");
      return;
    }

    // Add response to ticket
    await supportTicketService.addResponse(ticketId, userId, responseMessage, false);

    // Send response to user
    const userMessage = `💬 **Support Response - Ticket #${ticket.id.slice(-6)}**\n\n${responseMessage}\n\n_Reply to this message to continue the conversation._`;
    
    try {
      await ctx.telegram.sendMessage(ticket.userId, userMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💬 Reply to Support", callback_data: `reply_ticket_${ticketId}` }]
          ]
        }
      });
      
      await ctx.reply("✅ Response sent to user!");
      
    } catch (error) {
      await ctx.reply("✅ Response saved, but couldn't send to user (they may have blocked the bot)");
    }

    // Clear waiting state
    ctx.session.waitingFor = null;
    ctx.session.ticketId = null;

    // Show updated ticket
    await viewTicket(ctx, ticketId);

  } catch (error) {
    logger.error("Error handling ticket response:", error);
    await ctx.reply("❌ Error sending response");
  }
}

/**
 * Resolve a ticket
 */
async function resolveTicket(ctx, ticketId) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery("⛔ Admin only");
    return;
  }

  try {
    // Set waiting state for resolution message
    ctx.session.waitingFor = `ticket_resolve_${ticketId}`;
    ctx.session.ticketId = ticketId;

    await ctx.answerCbQuery();
    await ctx.reply("✅ **Resolve Ticket**\n\nType your resolution message (this will mark the ticket as resolved):\n\n_Type /cancel to abort_", {
      parse_mode: "Markdown"
    });

  } catch (error) {
    logger.error("Error starting ticket resolution:", error);
    await ctx.answerCbQuery("❌ Error");
  }
}

/**
 * Handle ticket resolution
 */
async function handleTicketResolution(ctx, ticketId, resolutionMessage) {
  const userId = ctx.from.id;

  try {
    const ticket = await supportTicketService.getTicket(ticketId);
    
    if (!ticket) {
      await ctx.reply("❌ Ticket not found");
      return;
    }

    // Add resolution response
    await supportTicketService.addResponse(ticketId, userId, resolutionMessage, true);

    // Send resolution to user
    const userMessage = `✅ **Ticket Resolved - #${ticket.id.slice(-6)}**\n\n${resolutionMessage}\n\n_Your issue has been resolved. If you need further assistance, use /aichat command._`;
    
    try {
      await ctx.telegram.sendMessage(ticket.userId, userMessage, {
        parse_mode: "Markdown"
      });
      
      await ctx.reply("✅ Ticket resolved and user notified!");
      
    } catch (error) {
      await ctx.reply("✅ Ticket resolved, but couldn't notify user");
    }

    // Clear waiting state
    ctx.session.waitingFor = null;
    ctx.session.ticketId = null;

    // Show updated ticket
    await viewTicket(ctx, ticketId);

  } catch (error) {
    logger.error("Error resolving ticket:", error);
    await ctx.reply("❌ Error resolving ticket");
  }
}

/**
 * Close a ticket
 */
async function closeTicket(ctx, ticketId) {
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery("⛔ Admin only");
    return;
  }

  try {
    await supportTicketService.closeTicket(ticketId, userId);
    await ctx.answerCbQuery("✅ Ticket closed!");
    
    // Back to dashboard
    const filter = ctx.session.supportTicketFilter || "all";
    await showSupportTickets(ctx, filter);
    
  } catch (error) {
    logger.error("Error closing ticket:", error);
    await ctx.answerCbQuery("❌ Error closing ticket");
  }
}

/**
 * Handle support ticket callbacks
 */
async function handleSupportCallback(ctx) {
  const data = ctx.callbackQuery.data;

  if (data === "refresh_tickets" || data === "back_to_tickets") {
    const filter = ctx.session.supportTicketFilter || "all";
    await showSupportTickets(ctx, filter);
  } else if (data === "all_tickets") {
    await showSupportTickets(ctx, "all");
  } else if (data === "my_tickets") {
    await showSupportTickets(ctx, "mine");
  } else if (data.startsWith("view_ticket_")) {
    const ticketId = data.replace("view_ticket_", "");
    await ctx.answerCbQuery();
    await viewTicket(ctx, ticketId);
  } else if (data.startsWith("claim_ticket_")) {
    const ticketId = data.replace("claim_ticket_", "");
    await claimTicket(ctx, ticketId);
  } else if (data.startsWith("respond_ticket_")) {
    const ticketId = data.replace("respond_ticket_", "");
    await startTicketResponse(ctx, ticketId);
  } else if (data.startsWith("resolve_ticket_")) {
    const ticketId = data.replace("resolve_ticket_", "");
    await resolveTicket(ctx, ticketId);
  } else if (data.startsWith("close_ticket_")) {
    const ticketId = data.replace("close_ticket_", "");
    await closeTicket(ctx, ticketId);
  } else if (data.startsWith("priority_ticket_")) {
    const ticketId = data.replace("priority_ticket_", "");
    await showPriorityMenu(ctx, ticketId);
  } else if (data.startsWith("set_priority_")) {
    const [, , ticketId, priority] = data.split("_");
    await updateTicketPriority(ctx, ticketId, priority);
  }
}

/**
 * Handle waiting for ticket responses
 */
async function handleWaitingMessage(ctx) {
  const waitingFor = ctx.session.waitingFor;
  const message = ctx.message?.text;

  if (!waitingFor || !message) return false;

  if (message === "/cancel") {
    ctx.session.waitingFor = null;
    ctx.session.ticketId = null;
    await ctx.reply("❌ Cancelled");
    return true;
  }

  if (waitingFor.startsWith("ticket_response_")) {
    const ticketId = ctx.session.ticketId;
    await handleTicketResponse(ctx, ticketId, message);
    return true;
  }

  if (waitingFor.startsWith("ticket_resolve_")) {
    const ticketId = ctx.session.ticketId;
    await handleTicketResolution(ctx, ticketId, message);
    return true;
  }

  return false;
}

/**
 * Utility: Get time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / (24 * 3600000));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Show priority selection for a ticket
 */
async function showPriorityMenu(ctx, ticketId) {
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery("⛔ Admin only");
    return;
  }

  try {
    const ticket = await supportTicketService.getTicket(ticketId);
    if (!ticket) {
      await ctx.answerCbQuery("❌ Ticket not found", { show_alert: true }).catch(() => {});
      return;
    }

    const priorityOptions = [
      { label: "🟢 Low", value: TICKET_PRIORITIES.LOW },
      { label: "🟠 Medium", value: TICKET_PRIORITIES.MEDIUM },
      { label: "🟡 High", value: TICKET_PRIORITIES.HIGH },
      { label: "🔴 Urgent", value: TICKET_PRIORITIES.URGENT }
    ];

    const keyboard = {
      inline_keyboard: priorityOptions.map((option) => ([{
        text: `${option.label}${ticket.priority === option.value ? " ✅" : ""}`,
        callback_data: `set_priority_${ticketId}_${option.value}`
      }])).concat([
        [{ text: "🔙 Back", callback_data: `view_ticket_${ticketId}` }]
      ])
    };

    await ctx.answerCbQuery("Select new priority").catch(() => {});
    await ctx.editMessageReplyMarkup(keyboard).catch(async () => {
      await ctx.editMessageText(`🎯 Select a priority for ticket #${ticket.id.slice(-6)}`, {
        reply_markup: keyboard
      }).catch(async () => {
        await ctx.reply(`🎯 Select a priority for ticket #${ticket.id.slice(-6)}`, {
          reply_markup: keyboard
        });
      });
    });

  } catch (error) {
    logger.error("Error showing priority menu:", error);
    await ctx.answerCbQuery("❌ Error", { show_alert: true }).catch(() => {});
  }
}

/**
 * Update ticket priority and refresh ticket view
 */
async function updateTicketPriority(ctx, ticketId, priority) {
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery("⛔ Admin only");
    return;
  }

  try {
    const validPriorities = Object.values(TICKET_PRIORITIES);
    if (!validPriorities.includes(priority)) {
      await ctx.answerCbQuery("❌ Invalid priority", { show_alert: true }).catch(() => {});
      return;
    }

    await supportTicketService.updatePriority(ticketId, priority, userId);
    await ctx.answerCbQuery("✅ Priority updated").catch(() => {});
    await viewTicket(ctx, ticketId);

  } catch (error) {
    logger.error("Error updating ticket priority:", error);
    await ctx.answerCbQuery("❌ Error updating priority", { show_alert: true }).catch(() => {});
  }
}

module.exports = {
  showSupportTickets,
  viewTicket,
  handleSupportCallback,
  handleWaitingMessage
};