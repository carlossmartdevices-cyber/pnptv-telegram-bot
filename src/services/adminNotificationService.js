const { db } = require("../config/firebase");
const logger = require("../utils/logger");

const MANAGEMENT_CHAT_ID = process.env.ADMIN_MANAGEMENT_CHAT_ID || "5079624062";
const TOPICS_COLLECTION = "adminTopics";
const MAX_TOPIC_NAME_LENGTH = 64;

function sanitizeTopicName(input) {
  if (!input) {
    return "User";
  }

  let name = String(input).trim();
  if (name.length === 0) {
    name = "User";
  }

  if (name.length > MAX_TOPIC_NAME_LENGTH) {
    name = name.slice(0, MAX_TOPIC_NAME_LENGTH);
  }

  return name;
}

async function ensureTopic(telegram, userId, username = "User") {
  if (!telegram) {
    throw new Error("Telegram instance is required");
  }

  if (!MANAGEMENT_CHAT_ID) {
    throw new Error("ADMIN_MANAGEMENT_CHAT_ID is not configured");
  }

  const docRef = db.collection(TOPICS_COLLECTION).doc(userId.toString());
  const doc = await docRef.get();
  if (doc.exists) {
    const data = doc.data();
    if (data.threadId) {
      return data.threadId;
    }
  }

  try {
    const topicName = sanitizeTopicName(username || `User ${userId}`);
    const topic = await telegram.createForumTopic(MANAGEMENT_CHAT_ID, {
      name: topicName,
    });

    await docRef.set({
      threadId: topic.message_thread_id,
      chatId: MANAGEMENT_CHAT_ID,
      createdAt: new Date(),
      username: username || null,
    }, { merge: true });

    return topic.message_thread_id;
  } catch (error) {
    logger.warn("Could not create forum topic for user", {
      userId,
      error: error.message,
    });
    return null;
  }
}

async function sendAdminNotification({
  telegram,
  userId,
  username,
  message,
  parseMode = "Markdown",
  replyMarkup = null,
  attachments = [],
}) {
  if (!telegram) {
    throw new Error("Telegram instance is required");
  }

  if (!MANAGEMENT_CHAT_ID) {
    logger.warn("ADMIN_MANAGEMENT_CHAT_ID is not configured. Skipping admin notification.");
    return null;
  }

  const userIdString = userId ? userId.toString() : "general";
  let threadId = null;

  if (userId) {
    try {
      threadId = await ensureTopic(telegram, userIdString, username);
    } catch (error) {
      logger.warn("Failed to ensure admin topic", {
        userId,
        error: error.message,
      });
    }
  }

  const sendOptions = {
    parse_mode: parseMode,
  };

  if (replyMarkup) {
    sendOptions.reply_markup = replyMarkup;
  }

  if (threadId) {
    sendOptions.message_thread_id = threadId;
  }

  let sentMessage = null;

  try {
    sentMessage = await telegram.sendMessage(MANAGEMENT_CHAT_ID, message, sendOptions);
  } catch (error) {
    logger.error("Failed to send admin notification", {
      userId,
      error: error.message,
    });
    return null;
  }

  // Send attachments after main message
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const attachment of attachments) {
      try {
        const attachmentOptions = {
          caption: attachment.caption || undefined,
          parse_mode: parseMode,
        };

        if (threadId) {
          attachmentOptions.message_thread_id = threadId;
        }

        switch (attachment.type) {
          case "photo":
            await telegram.sendPhoto(
              MANAGEMENT_CHAT_ID,
              attachment.fileId,
              attachmentOptions
            );
            break;
          case "document":
            await telegram.sendDocument(
              MANAGEMENT_CHAT_ID,
              attachment.fileId,
              attachmentOptions
            );
            break;
          default:
            logger.warn("Unsupported attachment type", attachment.type);
        }
      } catch (error) {
        logger.error("Failed to send admin attachment", {
          userId,
          type: attachment.type,
          error: error.message,
        });
      }
    }
  }

  return {
    message: sentMessage,
    threadId,
  };
}

module.exports = {
  sendAdminNotification,
  ensureTopic,
};
