const { db } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Moderation Service
 * Handles blacklist management, automatic punishments, and user violations
 */

class ModerationService {
  constructor() {
    this.moderationCollection = db.collection('moderation');
    this.blacklistDoc = 'blacklist';
    this.violationsCollection = db.collection('user_violations');
  }

  /**
   * Get the current blacklist
   */
  async getBlacklist() {
    try {
      const doc = await this.moderationCollection.doc(this.blacklistDoc).get();

      if (!doc.exists) {
        // Initialize with default blacklist
        const defaultBlacklist = {
          words: [],
          links: [],
          patterns: [],
          updatedAt: new Date(),
          updatedBy: 'system'
        };
        await this.moderationCollection.doc(this.blacklistDoc).set(defaultBlacklist);
        return defaultBlacklist;
      }

      return doc.data();
    } catch (error) {
      logger.error('Error getting blacklist:', error);
      throw error;
    }
  }

  /**
   * Add word(s) to blacklist
   */
  async addBlacklistWords(words, adminId) {
    try {
      const blacklist = await this.getBlacklist();
      const wordsArray = Array.isArray(words) ? words : [words];

      // Normalize words to lowercase and remove duplicates
      const normalizedWords = wordsArray.map(w => w.toLowerCase().trim());
      const uniqueWords = [...new Set([...blacklist.words, ...normalizedWords])];

      await this.moderationCollection.doc(this.blacklistDoc).update({
        words: uniqueWords,
        updatedAt: new Date(),
        updatedBy: adminId
      });

      logger.info(`Admin ${adminId} added ${normalizedWords.length} words to blacklist`);
      return { success: true, addedWords: normalizedWords, totalWords: uniqueWords.length };
    } catch (error) {
      logger.error('Error adding words to blacklist:', error);
      throw error;
    }
  }

  /**
   * Remove word(s) from blacklist
   */
  async removeBlacklistWords(words, adminId) {
    try {
      const blacklist = await this.getBlacklist();
      const wordsArray = Array.isArray(words) ? words : [words];
      const normalizedWords = wordsArray.map(w => w.toLowerCase().trim());

      const updatedWords = blacklist.words.filter(w => !normalizedWords.includes(w));

      await this.moderationCollection.doc(this.blacklistDoc).update({
        words: updatedWords,
        updatedAt: new Date(),
        updatedBy: adminId
      });

      logger.info(`Admin ${adminId} removed ${normalizedWords.length} words from blacklist`);
      return { success: true, removedWords: normalizedWords, totalWords: updatedWords.length };
    } catch (error) {
      logger.error('Error removing words from blacklist:', error);
      throw error;
    }
  }

  /**
   * Add link pattern(s) to blacklist
   */
  async addBlacklistLinks(links, adminId) {
    try {
      const blacklist = await this.getBlacklist();
      const linksArray = Array.isArray(links) ? links : [links];

      // Normalize links and remove duplicates
      const normalizedLinks = linksArray.map(l => l.toLowerCase().trim());
      const uniqueLinks = [...new Set([...blacklist.links, ...normalizedLinks])];

      await this.moderationCollection.doc(this.blacklistDoc).update({
        links: uniqueLinks,
        updatedAt: new Date(),
        updatedBy: adminId
      });

      logger.info(`Admin ${adminId} added ${normalizedLinks.length} links to blacklist`);
      return { success: true, addedLinks: normalizedLinks, totalLinks: uniqueLinks.length };
    } catch (error) {
      logger.error('Error adding links to blacklist:', error);
      throw error;
    }
  }

  /**
   * Remove link pattern(s) from blacklist
   */
  async removeBlacklistLinks(links, adminId) {
    try {
      const blacklist = await this.getBlacklist();
      const linksArray = Array.isArray(links) ? links : [links];
      const normalizedLinks = linksArray.map(l => l.toLowerCase().trim());

      const updatedLinks = blacklist.links.filter(l => !normalizedLinks.includes(l));

      await this.moderationCollection.doc(this.blacklistDoc).update({
        links: updatedLinks,
        updatedAt: new Date(),
        updatedBy: adminId
      });

      logger.info(`Admin ${adminId} removed ${normalizedLinks.length} links from blacklist`);
      return { success: true, removedLinks: normalizedLinks, totalLinks: updatedLinks.length };
    } catch (error) {
      logger.error('Error removing links from blacklist:', error);
      throw error;
    }
  }

  /**
   * Check if message contains blacklisted content
   */
  async checkMessage(message, entities = []) {
    try {
      const blacklist = await this.getBlacklist();
      const violations = [];

      if (!message) return { hasViolation: false, violations: [] };

      const normalizedMessage = message.toLowerCase();

      // Check for blacklisted words
      for (const word of blacklist.words) {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(normalizedMessage)) {
          violations.push({
            type: 'blacklisted_word',
            content: word,
            severity: 'medium'
          });
        }
      }

      // Check for blacklisted links in message text
      for (const linkPattern of blacklist.links) {
        if (normalizedMessage.includes(linkPattern.toLowerCase())) {
          violations.push({
            type: 'blacklisted_link',
            content: linkPattern,
            severity: 'high'
          });
        }
      }

      // Check URLs in message entities
      if (entities && entities.length > 0) {
        for (const entity of entities) {
          if (entity.type === 'url' || entity.type === 'text_link') {
            const url = entity.url || message.substring(entity.offset, entity.offset + entity.length);
            const normalizedUrl = url.toLowerCase();

            for (const linkPattern of blacklist.links) {
              if (normalizedUrl.includes(linkPattern.toLowerCase())) {
                violations.push({
                  type: 'blacklisted_link',
                  content: linkPattern,
                  severity: 'high',
                  url: url
                });
              }
            }
          }
        }
      }

      // Check for spam patterns (repeated characters, excessive caps)
      const spamPatterns = [
        { pattern: /(.)\1{9,}/, type: 'repeated_characters', severity: 'low' },
        { pattern: /[A-Z\s]{50,}/, type: 'excessive_caps', severity: 'medium' },
        { pattern: /(https?:\/\/[^\s]+\s*){5,}/, type: 'link_spam', severity: 'high' }
      ];

      for (const spam of spamPatterns) {
        if (spam.pattern.test(message)) {
          violations.push({
            type: spam.type,
            content: 'spam pattern detected',
            severity: spam.severity
          });
        }
      }

      return {
        hasViolation: violations.length > 0,
        violations,
        highestSeverity: this.getHighestSeverity(violations)
      };
    } catch (error) {
      logger.error('Error checking message:', error);
      return { hasViolation: false, violations: [], error: error.message };
    }
  }

  /**
   * Get highest severity from violations
   */
  getHighestSeverity(violations) {
    const severityLevels = { low: 1, medium: 2, high: 3 };
    let highest = 'low';

    for (const v of violations) {
      if (severityLevels[v.severity] > severityLevels[highest]) {
        highest = v.severity;
      }
    }

    return highest;
  }

  /**
   * Record a violation
   */
  async recordViolation(userId, chatId, violationData) {
    try {
      const userViolationsRef = this.violationsCollection.doc(userId.toString());
      const doc = await userViolationsRef.get();

      const violation = {
        chatId: chatId.toString(),
        timestamp: new Date(),
        ...violationData
      };

      if (!doc.exists) {
        await userViolationsRef.set({
          userId: userId.toString(),
          violations: [violation],
          totalViolations: 1,
          firstViolation: new Date(),
          lastViolation: new Date()
        });
      } else {
        const data = doc.data();
        await userViolationsRef.update({
          violations: [...(data.violations || []), violation],
          totalViolations: (data.totalViolations || 0) + 1,
          lastViolation: new Date()
        });
      }

      logger.info(`Recorded violation for user ${userId} in chat ${chatId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error recording violation:', error);
      throw error;
    }
  }

  /**
   * Get user violations
   */
  async getUserViolations(userId) {
    try {
      const doc = await this.violationsCollection.doc(userId.toString()).get();

      if (!doc.exists) {
        return { totalViolations: 0, violations: [] };
      }

      return doc.data();
    } catch (error) {
      logger.error('Error getting user violations:', error);
      throw error;
    }
  }

  /**
   * Apply punishment based on violation count and severity
   */
  async determinePunishment(userId, severity) {
    try {
      const userViolations = await this.getUserViolations(userId);
      const count = userViolations.totalViolations || 0;

      // Punishment levels based on violation count and severity
      const punishments = {
        low: {
          1: { action: 'warn', duration: 0 },
          2: { action: 'warn', duration: 0 },
          3: { action: 'mute', duration: 5 * 60 * 1000 }, // 5 minutes
          4: { action: 'mute', duration: 30 * 60 * 1000 }, // 30 minutes
          5: { action: 'kick', duration: 0 }
        },
        medium: {
          1: { action: 'warn', duration: 0 },
          2: { action: 'mute', duration: 10 * 60 * 1000 }, // 10 minutes
          3: { action: 'mute', duration: 60 * 60 * 1000 }, // 1 hour
          4: { action: 'kick', duration: 0 },
          5: { action: 'ban', duration: 24 * 60 * 60 * 1000 } // 24 hours
        },
        high: {
          1: { action: 'mute', duration: 30 * 60 * 1000 }, // 30 minutes
          2: { action: 'kick', duration: 0 },
          3: { action: 'ban', duration: 24 * 60 * 60 * 1000 }, // 24 hours
          4: { action: 'ban', duration: 7 * 24 * 60 * 60 * 1000 }, // 7 days
          5: { action: 'ban', duration: 0 } // Permanent
        }
      };

      const severityPunishments = punishments[severity] || punishments.medium;
      const punishment = severityPunishments[Math.min(count, 5)] || severityPunishments[5];

      return {
        action: punishment.action,
        duration: punishment.duration,
        violationCount: count,
        severity
      };
    } catch (error) {
      logger.error('Error determining punishment:', error);
      throw error;
    }
  }

  /**
   * Clear user violations
   */
  async clearUserViolations(userId, adminId) {
    try {
      await this.violationsCollection.doc(userId.toString()).delete();
      logger.info(`Admin ${adminId} cleared violations for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error clearing user violations:', error);
      throw error;
    }
  }

  /**
   * Get moderation statistics
   */
  async getStats() {
    try {
      const blacklist = await this.getBlacklist();
      const violationsSnapshot = await this.violationsCollection.get();

      let totalViolations = 0;
      let totalUsers = violationsSnapshot.size;

      violationsSnapshot.forEach(doc => {
        const data = doc.data();
        totalViolations += data.totalViolations || 0;
      });

      return {
        blacklistedWords: blacklist.words.length,
        blacklistedLinks: blacklist.links.length,
        totalUsers: totalUsers,
        totalViolations: totalViolations,
        lastUpdated: blacklist.updatedAt
      };
    } catch (error) {
      logger.error('Error getting moderation stats:', error);
      throw error;
    }
  }
}

module.exports = new ModerationService();
