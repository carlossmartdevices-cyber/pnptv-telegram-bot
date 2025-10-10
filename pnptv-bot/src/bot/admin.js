const { collections } = require("../config/firebase");
const menus = require("../config/menus");
const { Markup } = require("telegraf");
const ADMIN_IDS = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(",").map((id) => parseInt(id.trim(), 10))
  : [6636269];

class AdminFunctions {
  static isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
  }

  /**
   * Show admin panel
   */
  static async showAdminPanel(ctx) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied. Admin only.");
    }
    const language = ctx.userData?.language || "en";
    const message =
      menus.messages.adminWelcome[language] || menus.messages.adminWelcome.en;
    return ctx.reply(message, menus.getAdminKeyboard(language));
  }

  /**
   * List users
   */
  static async listUsers(ctx) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied.");
    }
    try {
      const usersSnapshot = await collections.users
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      let message = "👥 **Users List** (Last 20)\n\n";
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        message += `🆔 ID: ${userData.userId}\n`;
        message += `👤 Username: @${userData.username || "N/A"}\n`;
        message += `📌 Tier: ${userData.tier || "free"}\n`;
        message += `🏆 Level: ${userData.level || 1} (${
          userData.xp || 0
        } XP)\n`;
        message += `🔥 Streak: ${userData.loginStreak || 0} days\n`;
        message += `📅 Joined: ${
          userData.createdAt
            ? new Date(userData.createdAt).toLocaleDateString()
            : "N/A"
        }\n`;
        message += "---\n";
      });

      // Split message if too long
      if (message.length > 4000) {
        const chunks = this.splitMessage(message, 4000);
        for (const chunk of chunks) {
          await ctx.reply(chunk, { parse_mode: "Markdown" });
        }
      } else {
        await ctx.reply(message, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error("Error listing users:", error);
      await ctx.reply("❌ Error fetching users: " + error.message);
    }
  }

  /**
   * Split long messages into chunks
   */
  static splitMessage(message, chunkSize) {
    const chunks = [];
    for (let i = 0; i < message.length; i += chunkSize) {
      chunks.push(message.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Show statistics
   */
  static async showStats(ctx) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied.");
    }
    try {
      const usersSnapshot = await collections.users.get();
      const postsSnapshot = await collections.posts.get();
      const livesSnapshot = await collections.lives.get();

      const stats = {
        totalUsers: usersSnapshot.size,
        freeUsers: 0,
        silverUsers: 0,
        goldenUsers: 0,
        totalPosts: postsSnapshot.size,
        totalLives: livesSnapshot.size,
        activeToday: 0,
      };

      const today = new Date().toISOString().split("T")[0];

      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        if (user.tier === "free") stats.freeUsers++;
        if (user.tier === "silver") stats.silverUsers++;
        if (user.tier === "golden") stats.goldenUsers++;
        if (user.lastLogin === today) stats.activeToday++;
      });

      // Calculate revenue
      const monthlyRevenue = stats.silverUsers * 15 + stats.goldenUsers * 25;
      const conversionRate =
        stats.totalUsers > 0
          ? (
              ((stats.silverUsers + stats.goldenUsers) / stats.totalUsers) *
              100
            ).toFixed(2)
          : 0;

      const message = `
📊 **Platform Statistics**
👥 **Users:**
• Total: ${stats.totalUsers}
• Free: ${stats.freeUsers}
• Silver: ${stats.silverUsers}
• Golden: ${stats.goldenUsers}
• Active Today: ${stats.activeToday}
📝 **Content:**
• Total Posts: ${stats.totalPosts}
• Total Lives: ${stats.totalLives}
💰 **Revenue:**
• Monthly (approx): $${monthlyRevenue}
• Silver MRR: $${stats.silverUsers * 15}
• Golden MRR: $${stats.goldenUsers * 25}
📈 **Conversion Rate:**
• Paid Users: ${conversionRate}%
⚙️ **Feature Status:**
${Object.entries(menus.features || {})
  .map(([key, val]) => `• ${key}: ${val ? "✅" : "❌"}`)
  .join("\n")}
      `;
      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Error fetching stats:", error);
      await ctx.reply("❌ Error fetching stats: " + error.message);
    }
  }

  /**
   * Broadcast message
   */
  static async broadcastMessage(ctx, messageText) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied.");
    }
    try {
      const usersSnapshot = await collections.users.get();
      let successCount = 0;
      let failCount = 0;
      await ctx.reply(`📡 Broadcasting to ${usersSnapshot.size} users...`);
      for (const doc of usersSnapshot.docs) {
        try {
          const userData = doc.data();
          await ctx.telegram.sendMessage(userData.userId, messageText, {
            parse_mode: "Markdown",
          });
          successCount++;
          // Rate limiting - wait 50ms between messages
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          console.error(
            `Error sending to ${doc.data().userId}:`,
            error.message
          );
          failCount++;
        }
      }
      await ctx.reply(
        `✅ Broadcast complete!\n\n` +
          `✓ Sent: ${successCount}\n` +
          `✗ Failed: ${failCount}`
      );
    } catch (error) {
      console.error("Error broadcasting message:", error);
      await ctx.reply("❌ Error broadcasting message: " + error.message);
    }
  }

  /**
   * Get user details
   */
  static async getUserDetails(ctx, userId) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied.");
    }
    try {
      const userDoc = await collections.users.doc(userId.toString()).get();
      if (!userDoc.exists) {
        return ctx.reply("User not found.");
      }

      const userData = userDoc.data();

      const message = `
👤 **User Details**
🆔 **ID:** ${userData.userId}
👤 **Username:** @${userData.username || "N/A"}
📌 **Tier:** ${userData.tier || "free"}
🏆 **Level:** ${userData.level || 1}
⭐ **XP:** ${userData.xp || 0}
🔥 **Login Streak:** ${userData.loginStreak || 0} days
💎 **Stars Balance:** ${userData.starsBalance || 0}
📊 **Statistics:**
• Total Posts: ${userData.totalPosts || 0}
• Total Gifts Received: ${userData.totalGiftsReceived || 0}
• Total Stars Received: ${userData.totalStarsReceived || 0}
• Total Stars Gifted: ${userData.totalStarsGifted || 0}
🎯 **Interests:**
${userData.interests?.join(", ") || "None"}
🎖️ **Badges:**
${userData.badges?.map((b) => `${b.emoji} ${b.name}`).join("\n") || "None"}
📍 **Location:**
${userData.locationEnabled ? "✅ Enabled" : "❌ Disabled"}
📅 **Dates:**
• Created: ${
        userData.createdAt
          ? new Date(userData.createdAt).toLocaleString()
          : "N/A"
      }
• Last Active: ${
        userData.lastActive
          ? new Date(userData.lastActive).toLocaleString()
          : "N/A"
      }
      `;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("🚫 Ban User", `admin_ban_${userId}`),
            Markup.button.callback("⬆️ Grant Tier", `admin_grant_${userId}`),
          ],
        ]),
      });
    } catch (error) {
      console.error("Error getting user details:", error);
      await ctx.reply("❌ Error fetching user details: " + error.message);
    }
  }

  /**
   * Ban user
   */
  static async banUser(ctx, userId, reason) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied.");
    }
    try {
      await collections.users.doc(userId.toString()).update({
        banned: true,
        banReason: reason,
        bannedAt: new Date().toISOString(),
        bannedBy: ctx.from.id.toString(),
      });

      await ctx.reply(`✅ User ${userId} has been banned.\nReason: ${reason}`);

      // Notify user
      try {
        await ctx.telegram.sendMessage(
          userId,
          `⚠️ Your account has been banned.\nReason: ${reason}\n\nContact support: @PNPtvSupport`
        );
      } catch (error) {
        console.error("Could not notify user:", error);
      }
    } catch (error) {
      console.error("Error banning user:", error);
      await ctx.reply("❌ Error banning user: " + error.message);
    }
  }

  /**
   * Unban user
   */
  static async unbanUser(ctx, userId) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied.");
    }
    try {
      await collections.users.doc(userId.toString()).update({
        banned: false,
        banReason: null,
        bannedAt: null,
        bannedBy: null,
        unbannedAt: new Date().toISOString(),
        unbannedBy: ctx.from.id.toString(),
      });

      await ctx.reply(`✅ User ${userId} has been unbanned.`);

      // Notify user
      try {
        await ctx.telegram.sendMessage(
          userId,
          `✅ Your account has been unbanned. Welcome back to PNPtv!`
        );
      } catch (error) {
        console.error("Could not notify user:", error);
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
      await ctx.reply("❌ Error unbanning user: " + error.message);
    }
  }

  /**
   * Grant tier to user
   */
  static async grantTier(ctx, userId, tier, duration = 30) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply("❌ Access denied.");
    }
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);

      await collections.users.doc(userId.toString()).update({
        tier,
        tierExpiresAt: expiresAt.toISOString(),
        lastPayment: {
          method: "admin_grant",
          amount: 0,
          date: new Date().toISOString(),
          grantedBy: ctx.from.id.toString(),
        },
      });

      await ctx.reply(
        `✅ User ${userId} has been granted ${tier} tier for ${duration} days.`
      );
    } catch (error) {
      console.error("Error granting tier:", error);
      await ctx.reply("❌ Error granting tier: " + error.message);
    }
  }
}

module.exports = AdminFunctions;
