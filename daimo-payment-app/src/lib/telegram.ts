export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  
  if (!token || !chatId) {
    throw new Error('Telegram configuration missing');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send Telegram message');
  }

  return response.json();
}

export async function addUserToChannel(userId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  
  if (!token || !chatId) {
    throw new Error('Telegram configuration missing');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/inviteUsersToChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        user_ids: [userId],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add user to channel');
    }

    return response.json();
  } catch (error) {
    console.error('Error adding user to channel:', error);
    throw error;
  }
}