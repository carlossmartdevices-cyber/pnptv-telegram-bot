const { collections, FieldValue } = require("./firebase");

const XP_ACTIONS = {
  POST_CONTENT: 10,
  RECEIVE_LIKE: 2,
  ATTEND_LIVE: 5,
  COMPLETE_DAILY_QUEST: 15,
  COMMENT: 3,
  SHARE: 5,
  PROFILE_COMPLETE: 50,
  FIRST_POST: 20,
  INVITE_FRIEND: 25,
  LIVE_STREAM: 30,
  RECEIVE_GIFT: 8,
};

const LEVELS = [
  { level: 1, xpRequired: 0, reward: "Welcome Badge" },
  { level: 2, xpRequired: 100, reward: "Novice Badge" },
  { level: 3, xpRequired: 250, reward: "Custom Emoji Unlock" },
  { level: 5, xpRequired: 500, reward: "Exclusive Emojis" },
  { level: 10, xpRequired: 1500, reward: "Early Access to Features" },
  { level: 15, xpRequired: 3000, reward: "VIP Shoutout in Channel" },
  { level: 20, xpRequired: 5000, reward: "Golden Frame for Profile" },
  { level: 25, xpRequired: 8000, reward: "Custom Badge Creator" },
  { level: 30, xpRequired: 12000, reward: "Legendary Status" },
];

const BADGES = {
  WELCOME: {
    id: "welcome",
    name: "Welcome",
    emoji: "👋",
    description: "Joined PNPtv",
  },
  NOVICE: {
    id: "novice",
    name: "Novice",
    emoji: "🌱",
    description: "Reached level 2",
  },
  SOCIAL_BUTTERFLY: {
    id: "social",
    name: "Social Butterfly",
    emoji: "🦋",
    description: "100 connections made",
  },
  CONTENT_CREATOR: {
    id: "creator",
    name: "Content Creator",
    emoji: "🎨",
    description: "50 posts published",
  },
  LIVE_STAR: {
    id: "livestar",
    name: "Live Star",
    emoji: "⭐",
    description: "10 live streams completed",
  },
  GENEROUS: {
    id: "generous",
    name: "Generous Soul",
    emoji: "💎",
    description: "Sent 100 Stars in gifts",
  },
  EARLY_BIRD: {
    id: "earlybird",
    name: "Early Bird",
    emoji: "🐦",
    description: "Early adopter",
  },
  VERIFIED: {
    id: "verified",
    name: "Verified",
    emoji: "✅",
    description: "Identity verified",
  },
  GOLDEN: {
    id: "golden",
    name: "Golden Member",
    emoji: "👑",
    description: "Golden tier subscriber",
  },
  SILVER: {
    id: "silver",
    name: "Silver Member",
    emoji: "🥈",
    description: "Silver tier subscriber",
  },
  STREAK_7: {
    id: "streak7",
    name: "7 Day Streak",
    emoji: "🔥",
    description: "7 consecutive days active",
  },
  STREAK_30: {
    id: "streak30",
    name: "30 Day Streak",
    emoji: "🔥🔥",
    description: "30 consecutive days active",
  },
  TOP_CONTRIBUTOR: {
    id: "topcontrib",
    name: "Top Contributor",
    emoji: "🏆",
    description: "Top 10 in monthly leaderboard",
  },
};

const DAILY_QUESTS = [
  {
    id: "post_with_hashtag",
    name: "Hashtag Hero",
    description: "Post with #PNPtvLove",
    reward: { xp: 15, stars: 2 },
    type: "post",
    target: 1,
    condition: (data) => data.hashtag === "#PNPtvLove",
  },
  {
    id: "comment_5_posts",
    name: "Social Commentator",
    description: "Comment on 5 posts",
    reward: { xp: 20, stars: 3 },
    type: "comment",
    target: 5,
  },
  {
    id: "attend_live",
    name: "Live Enthusiast",
    description: "Attend a live stream",
    reward: { xp: 10, stars: 1 },
    type: "live",
    target: 1,
  },
  {
    id: "make_connections",
    name: "Connector",
    description: "Connect with 3 new users",
    reward: { xp: 25, stars: 5 },
    type: "connection",
    target: 3,
  },
  {
    id: "profile_update",
    name: "Profile Perfectionist",
    description: "Update your profile bio",
    reward: { xp: 10, stars: 2 },
    type: "profile",
    target: 1,
  },
];

class GamificationManager {
  static async addXP(userId, action, amount = null) {
    const xpToAdd = amount || XP_ACTIONS[action] || 0;
    const userRef = collections.users.doc(userId);

    try {
      const doc = await userRef.get();
      if (!doc.exists) {
        console.error(`User ${userId} not found for XP addition`);
        return { success: false, error: "User not found" };
      }

      const userData = doc.data();
      const currentXP = userData.xp || 0;
      const currentLevel = userData.level || 1;
      const newXP = currentXP + xpToAdd;

      const newLevel = this.calculateLevel(newXP);
      const leveledUp = newLevel > currentLevel;

      const updates = {
        xp: newXP,
        level: newLevel,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (leveledUp) {
        const levelReward = LEVELS.find((l) => l.level === newLevel);
        updates.levelUpNotification = {
          level: newLevel,
          reward: levelReward?.reward || "Level Up!",
        };
      }

      await userRef.update(updates);

      return {
        success: true,
        xpAdded: xpToAdd,
        totalXP: newXP,
        level: newLevel,
        leveledUp,
        reward: leveledUp ? updates.levelUpNotification.reward : null,
      };
    } catch (error) {
      console.error("Error adding XP:", error);
      return { success: false, error: error.message };
    }
  }

  static calculateLevel(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xpRequired) {
        return LEVELS[i].level;
      }
    }
    return 1;
  }

  static async awardBadge(userId, badgeId) {
    const userRef = collections.users.doc(userId);
    const badge = BADGES[badgeId.toUpperCase()];

    if (!badge) {
      console.error(`Badge ${badgeId} not found`);
      return { success: false, error: "Badge not found" };
    }

    try {
      const doc = await userRef.get();
      if (!doc.exists) {
        console.error(`User ${userId} not found for badge award`);
        return { success: false, error: "User not found" };
      }

      const userData = doc.data();
      const currentBadges = userData.badges || [];

      if (currentBadges.some((b) => b.id === badge.id)) {
        return { success: false, error: "Badge already awarded" };
      }

      await userRef.update({
        badges: FieldValue.arrayUnion({
          ...badge,
          awardedAt: new Date().toISOString(),
        }),
      });

      return { success: true, badge };
    } catch (error) {
      console.error("Error awarding badge:", error);
      return { success: false, error: error.message };
    }
  }

  static async getDailyQuests(userId) {
    const today = new Date().toISOString().split("T")[0];
    const questRef = collections.dailyQuests.doc(`${userId}_${today}`);

    try {
      const doc = await questRef.get();

      if (doc.exists) {
        return doc.data().quests;
      }

      const userQuests = DAILY_QUESTS.map((quest) => ({
        ...quest,
        progress: 0,
        completed: false,
      }));

      await questRef.set({
        userId,
        date: today,
        quests: userQuests,
        createdAt: FieldValue.serverTimestamp(),
      });

      return userQuests;
    } catch (error) {
      console.error("Error getting daily quests:", error);
      return [];
    }
  }

  static async updateQuestProgress(userId, questType, data = {}) {
    const today = new Date().toISOString().split("T")[0];
    const questRef = collections.dailyQuests.doc(`${userId}_${today}`);

    try {
      const doc = await questRef.get();
      if (!doc.exists) return { success: false };

      const questData = doc.data();
      const quests = questData.quests.map((quest) => {
        if (quest.type === questType && !quest.completed) {
          const meetsCondition = !quest.condition || quest.condition(data);
          if (meetsCondition) {
            quest.progress += 1;
            if (quest.progress >= quest.target) {
              quest.completed = true;
              this.addXP(userId, "COMPLETE_DAILY_QUEST", quest.reward.xp);
              return { ...quest, completedJustNow: true };
            }
          }
        }
        return quest;
      });

      await questRef.update({ quests });

      const completedQuest = quests.find((q) => q.completedJustNow);
      return {
        success: true,
        completed: !!completedQuest,
        quest: completedQuest,
      };
    } catch (error) {
      console.error("Error updating quest progress:", error);
      return { success: false };
    }
  }

  static async updateStreak(userId) {
    const userRef = collections.users.doc(userId);

    try {
      const doc = await userRef.get();
      if (!doc.exists) {
        return { success: false, error: "User not found" };
      }

      const userData = doc.data();
      const lastLogin = userData.lastLogin;
      const currentStreak = userData.loginStreak || 0;
      const today = new Date().toISOString().split("T")[0];

      if (lastLogin === today) {
        return { streak: currentStreak, continued: false };
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = currentStreak;
      if (lastLogin === yesterdayStr) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }

      await userRef.update({
        loginStreak: newStreak,
        lastLogin: today,
      });

      if (newStreak === 7) {
        await this.awardBadge(userId, "STREAK_7");
      } else if (newStreak === 30) {
        await this.awardBadge(userId, "STREAK_30");
      }

      const reward = this.getStreakReward(newStreak);

      return {
        streak: newStreak,
        continued: true,
        reward,
      };
    } catch (error) {
      console.error("Error updating streak:", error);
      return { streak: 0, continued: false };
    }
  }

  static getStreakReward(streak) {
    if (streak === 7) return { stars: 5, message: "7 day streak bonus!" };
    if (streak === 30) return { stars: 50, message: "30 day streak bonus!" };
    if (streak % 7 === 0) return { stars: 3, message: `${streak} day streak!` };
    return null;
  }

  static async getLeaderboard(type = "xp", limit = 10) {
    try {
      let query = collections.users;

      switch (type) {
        case "xp":
          query = query.orderBy("xp", "desc");
          break;
        case "posts":
          query = query.orderBy("totalPosts", "desc");
          break;
        case "gifts":
          query = query.orderBy("totalGiftsReceived", "desc");
          break;
      }

      const snapshot = await query.limit(limit).get();
      return snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        userId: doc.id,
        username: doc.data().username || "Anonymous",
        xp: doc.data().xp || 0,
        totalPosts: doc.data().totalPosts || 0,
        totalGiftsReceived: doc.data().totalGiftsReceived || 0,
      }));
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  }
}

module.exports = {
  XP_ACTIONS,
  LEVELS,
  BADGES,
  DAILY_QUESTS,
  GamificationManager,
};
