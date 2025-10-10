const messages = require('../config/messages');

class Formatters {
  static formatMessage(title, content, language = "en") {
    const headers = {
      en: "💎 **PNPtv! Telegram Bot** 💎\n",
      es: "💎 **PNPtv! Bot de Telegram** 💎\n"
    };

    const footers = {
      en: "\n*Use /help for assistance*",
      es: "\n*Usa /help para ayuda*"
    };

    return `${headers[language]}${content}${footers[language]}`;
  }
  
  static formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  
  static formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
  
  static formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
  
  static formatXPProgress(currentXP, level) {
    const levels = [
      { level: 1, xpRequired: 0 },
      { level: 2, xpRequired: 100 },
      { level: 3, xpRequired: 250 },
      { level: 5, xpRequired: 500 },
      { level: 10, xpRequired: 1500 },
      { level: 15, xpRequired: 3000 },
      { level: 20, xpRequired: 5000 },
      { level: 25, xpRequired: 8000 },
      { level: 30, xpRequired: 12000 }
    ];
    
    const currentLevel = levels.find(l => l.level === level);
    const nextLevel = levels.find(l => l.level === level + 1);
    
    if (!nextLevel) {
      return '✨ Max Level!';
    }
    
    const xpInLevel = currentXP - currentLevel.xpRequired;
    const xpNeeded = nextLevel.xpRequired - currentLevel.xpRequired;
    const progress = Math.floor((xpInLevel / xpNeeded) * 100);
    
    const barLength = 10;
    const filledBars = Math.floor((progress / 100) * barLength);
    const emptyBars = barLength - filledBars;
    
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    
    return `${progressBar} ${progress}% (${xpInLevel}/${xpNeeded} XP)`;
  }
  
  static formatPrice(amount, currency = 'USD') {
    const symbols = {
      USD: ',
      EUR: '€',
      GBP: '£',
      USDT: '₮'
    };
    
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
  
  static truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
  
  static formatUserMention(userId, username) {
    return username ? `@${username}` : `User ${userId}`;
  }
  
  static escapeMarkdown(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
  
  static formatBadge(badge) {
    return `${badge.emoji} ${badge.name}`;
  }
  
  static formatTierBadge(tier) {
    const badges = {
      free: '🆓',
      silver: '🥈',
      golden: '👑'
    };
    return badges[tier] || '🆓';
  }
  
  static createProgressBar(current, max, length = 10) {
    const percentage = Math.min(100, Math.max(0, (current / max) * 100));
    const filled = Math.floor((percentage / 100) * length);
    const empty = length - filled;
    
    return '▰'.repeat(filled) + '▱'.repeat(empty) + ` ${Math.floor(percentage)}%`;
  }
  
  static formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }
  
  static formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'just now';
  }
}

module.exports = Formatters;