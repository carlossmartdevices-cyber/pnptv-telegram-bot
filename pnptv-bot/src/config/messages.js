const messages = {
  en: {
    welcome:
      "💎 **Welcome to PNPtv!** 💎\n\nA new social experience awaits you! Connect, share, and explore.",
    welcomeOnboarding:
      "Let's get you started! First, please select your language:",
    ageVerification:
      "🔞 **Age Verification**\n\nYou must be 18+ years old to use PNPtv.\n\nBy clicking 'I Confirm', you certify that you are of legal age.",
    ageConfirm: "I Confirm (18+)",
    ageDecline: "I'm Under 18",
    ageDeclined: "Sorry, you must be 18+ to use this service.",
    terms:
      "📜 **Terms & Conditions**\n\nPlease read and accept our terms to continue:",
    termsAccept: "I Accept",
    termsDecline: "I Decline",
    termsUrl: "https://pnp.tv/terms-en",
    privacy:
      "🔒 **Privacy Policy**\n\nPlease read and accept our privacy policy:",
    privacyAccept: "I Accept",
    privacyDecline: "I Decline",
    privacyUrl: "https://pnp.tv/privacy-en",
    selectInterests:
      "🎯 **Select Your Interests**\n\nChoose topics you're interested in (select at least 3):",
    interestsSelected: "interests selected",
    interestsContinue: "Continue",
    setupLocation:
      "📍 **Location Setup**\n\nShare your location to discover nearby users:",
    locationShare: "📍 Share Location",
    locationSkip: "Skip for Now",
    setupBio:
      "✍️ **Tell Us About You**\n\nWrite a short bio (max 200 characters):",
    bioPlaceholder: "Tell the community about yourself...",
    bioSet: "Bio Updated!",
    profileComplete:
      "🎉 **Profile Complete!**\n\nYou earned 50 XP!\n\nYou're all set! Start exploring PNPtv.",
    mainMenu: "What would you like to do?",
    profile: "👤 Profile",
    map: "🗺️ Discover",
    live: "🎥 Lives",
    feed: "📱 Feed",
    help: "❓ Help",
    settings: "⚙️ Settings",

    profileInfo: (data) => `
👤 **Profile Info**
🆔 ID: ${data.userId}
👤 Username: @${data.username || "Not set"}
🏆 Level: ${data.level || 1}
⭐ XP: ${data.xp || 0}
🔥 Login Streak: ${data.loginStreak || 0} days
🎖️ Badges: ${data.badges?.length || 0}
📌 Tier: ${data.tier || "Free"}
📍 Location: ${data.location || "Not set"}
📝 Bio: ${data.bio || "Not set"}

🎯 Complete Profile: ${data.profileComplete ? "✅" : "❌"}
`,

    editProfile: "✏️ Edit Profile",
    editBio: "📝 Edit Bio",
    editLocation: "📍 Edit Location",
    editInterests: "🎯 Edit Interests",
    upgradeTier: "⬆️ Upgrade Tier",

    tierInfo: (tier) => `
💎 **${tier.name} Tier**
💵 Price: $${tier.price}/month
⭐ Or: ${tier.starPrice} Telegram Stars

✨ **Features:**
${tier.features.map((f) => `• ${f}`).join("\n")}
`,

    subscribeButton: "💳 Subscribe Now",
    currentTier: "✅ Current Tier",

    mapDiscover:
      "🗺️ **Discover Nearby**\n\nFind users near you based on your interests!",
    mapNoUsers: "No users found nearby. Try expanding your search radius.",
    swipesRemaining: (count) => `💫 Swipes remaining today: ${count}`,
    swipesExhausted:
      "You've used all your daily swipes! Upgrade to Silver for 20 swipes or Golden for unlimited.",

    userCard: (user) => `
👤 ${user.username || "Anonymous"}
📍 ${user.distance ? `${user.distance}km away` : "Distance unknown"}
🏆 Level ${user.level || 1}
🎯 Interests: ${user.interests?.slice(0, 3).join(", ") || "None"}
📝 ${user.bio || "No bio yet"}
`,

    likeButton: "❤️ Like",
    superLikeButton: "⭐ Super Like (5 Stars)",
    skipButton: "➡️ Skip",

    matchFound:
      "🎉 **It's a Match!**\n\nYou and this user liked each other! Start chatting now.",
    startChat: "💬 Start Chat",

    dailyQuests: "🎯 **Daily Quests**\n\nComplete quests to earn XP and Stars!",
    questProgress: (quest) => `
${quest.completed ? "✅" : "⏳"} **${quest.name}**
${quest.description}
Progress: ${quest.progress}/${quest.target}
Reward: ${quest.reward.xp} XP + ${quest.reward.stars} Stars
`,

    questCompleted: (quest) => `
🎉 **Quest Completed!**

${quest.name}
+${quest.reward.xp} XP
+${quest.reward.stars} Stars
`,

    leaderboard: "🏆 **Leaderboard**\n\nTop users this month:",
    leaderboardUser: (rank, user) =>
      `${rank}. ${user.username} - ${user.xp} XP`,

    levelUp: (level, reward) => `
🎊 **LEVEL UP!**

You reached Level ${level}!
🎁 Reward: ${reward}
`,

    badgeEarned: (badge) => `
🏅 **New Badge Earned!**

${badge.emoji} ${badge.name}
${badge.description}
`,

    streakBonus: (streak, stars) => `
🔥 **Streak Bonus!**

${streak} days in a row!
+${stars} Stars earned!
`,

    livesList: "🎥 **Live Streams**\n\nJoin a live stream now:",
    noLives: "No live streams at the moment. Check back later!",
    liveCard: (live) => `
🎥 ${live.title}
👤 ${live.hostUsername}
👁️ ${live.viewers} watching
`,
    joinLive: "🎥 Join Live",

    giftSent: (gift, recipient) => `💎 You sent ${gift.name} to ${recipient}!`,
    giftReceived: (gift, sender) =>
      `🎁 You received ${gift.name} from ${sender}!`,

    postCreated: "✅ Post created successfully! +10 XP",
    createPost: "📝 Create Post",
    postContent: "What's on your mind?",

    adminPanel: `
🛠️ **Admin Panel**

Manage PNPtv:
• View users and statistics
• Send broadcasts
• Manage content
• Review reports
`,

    adminUsers: "/admin_users - User List",
    adminStats: "/admin_stats - Statistics",
    adminBroadcast: "/admin_broadcast - Send Broadcast",
    adminReports: "/admin_reports - View Reports",

    accessDenied: "❌ Access denied. Admin only.",
    error: "❌ An error occurred. Please try again.",

    helpText: `
❓ **Help & Commands**

**Main Commands:**
/start - Start or restart
/profile - View your profile
/map - Discover nearby users
/live - Browse live streams
/quests - View daily quests
/leaderboard - View rankings
/settings - Change settings

**Premium:**
/upgrade - Upgrade to Silver/Golden

**Need Support?**
Contact: @PNPtvSupport
`,

    settingsMenu: `
⚙️ **Settings**

Customize your experience:
`,
    changeLanguage: "🌐 Change Language",
    privacySettings: "🔒 Privacy Settings",
    notifications: "🔔 Notifications",
    blockedUsers: "🚫 Blocked Users",
    deleteAccount: "⚠️ Delete Account",

    languageChanged: "✅ Language changed successfully!",

    reportUser: "🚨 Report User",
    reportReason: "Please select a reason:",
    reportReasons: {
      spam: "Spam",
      harassment: "Harassment",
      inappropriate: "Inappropriate Content",
      fake: "Fake Profile",
      other: "Other",
    },
    reportSubmitted: "✅ Report submitted. Our team will review it.",

    paymentSuccess: "✅ Payment successful! Welcome to ${tier}!",
    paymentFailed: "❌ Payment failed. Please try again.",

    referralCode: (code) => `
🎁 **Your Referral Code**

Code: ${code}

Share with friends to earn rewards!
• 3 referrals = 3 days of Silver free
• Each referral gives both of you 25 XP
`,

    referralSuccess: "🎉 Referral applied! You both earned 25 XP!",

    welcomeBack: (streak) => `Welcome back! 🔥 ${streak} day streak!`,

    featureComingSoon: "🚧 This feature is coming soon!",
  },

  es: {
    welcome:
      "💎 **¡Bienvenido a PNPtv!** 💎\n\n¡Una nueva experiencia social te espera! Conecta, comparte y explora.",
    welcomeOnboarding: "¡Comencemos! Primero, selecciona tu idioma:",
    ageVerification:
      "🔞 **Verificación de Edad**\n\nDebes tener 18+ años para usar PNPtv.\n\nAl hacer clic en 'Confirmo', certificas que eres mayor de edad.",
    ageConfirm: "Confirmo (18+)",
    ageDecline: "Soy Menor de 18",
    ageDeclined: "Lo sentimos, debes tener 18+ años para usar este servicio.",
    terms:
      "📜 **Términos y Condiciones**\n\nPor favor lee y acepta nuestros términos para continuar:",
    termsAccept: "Acepto",
    termsDecline: "Rechazo",
    termsUrl: "https://pnp.tv/terms-es",
    privacy:
      "🔒 **Política de Privacidad**\n\nPor favor lee y acepta nuestra política de privacidad:",
    privacyAccept: "Acepto",
    privacyDecline: "Rechazo",
    privacyUrl: "https://pnp.tv/privacy-es",
    selectInterests:
      "🎯 **Selecciona tus Intereses**\n\nElige temas que te interesen (selecciona al menos 3):",
    interestsSelected: "intereses seleccionados",
    interestsContinue: "Continuar",
    setupLocation:
      "📍 **Configurar Ubicación**\n\nComparte tu ubicación para descubrir usuarios cercanos:",
    locationShare: "📍 Compartir Ubicación",
    locationSkip: "Omitir por Ahora",
    setupBio:
      "✍️ **Cuéntanos Sobre Ti**\n\nEscribe una biografía corta (máx 200 caracteres):",
    bioPlaceholder: "Cuéntale a la comunidad sobre ti...",
    bioSet: "¡Biografía Actualizada!",
    profileComplete:
      "🎉 **¡Perfil Completo!**\n\n¡Ganaste 50 XP!\n\n¡Todo listo! Comienza a explorar PNPtv.",
    mainMenu: "¿Qué te gustaría hacer?",
    profile: "👤 Perfil",
    map: "🗺️ Descubrir",
    live: "🎥 En Vivo",
    feed: "📱 Feed",
    help: "❓ Ayuda",
    settings: "⚙️ Ajustes",

    profileInfo: (data) => `
👤 **Información del Perfil**
🆔 ID: ${data.userId}
👤 Usuario: @${data.username || "No establecido"}
🏆 Nivel: ${data.level || 1}
⭐ XP: ${data.xp || 0}
🔥 Racha de Login: ${data.loginStreak || 0} días
🎖️ Insignias: ${data.badges?.length || 0}
📌 Tier: ${data.tier || "Free"}
📍 Ubicación: ${data.location || "No establecida"}
📝 Bio: ${data.bio || "No establecida"}

🎯 Perfil Completo: ${data.profileComplete ? "✅" : "❌"}
`,

    editProfile: "✏️ Editar Perfil",
    editBio: "📝 Editar Bio",
    editLocation: "📍 Editar Ubicación",
    editInterests: "🎯 Editar Intereses",
    upgradeTier: "⬆️ Mejorar Tier",

    tierInfo: (tier) => `
💎 **Tier ${tier.name}**
💵 Precio: ${tier.price}/mes
⭐ O: ${tier.starPrice} Telegram Stars

✨ **Características:**
${tier.features.map((f) => `• ${f}`).join("\n")}
`,

    subscribeButton: "💳 Suscribirse Ahora",
    currentTier: "✅ Tier Actual",

    mapDiscover:
      "🗺️ **Descubrir Cercanos**\n\n¡Encuentra usuarios cerca de ti según tus intereses!",
    mapNoUsers:
      "No se encontraron usuarios cercanos. Intenta ampliar tu radio de búsqueda.",
    swipesRemaining: (count) => `💫 Swipes restantes hoy: ${count}`,
    swipesExhausted:
      "¡Has usado todos tus swipes diarios! Mejora a Silver para 20 swipes o Golden para ilimitados.",

    userCard: (user) => `
👤 ${user.username || "Anónimo"}
📍 ${user.distance ? `A ${user.distance}km` : "Distancia desconocida"}
🏆 Nivel ${user.level || 1}
🎯 Intereses: ${user.interests?.slice(0, 3).join(", ") || "Ninguno"}
📝 ${user.bio || "Sin biografía aún"}
`,

    likeButton: "❤️ Me Gusta",
    superLikeButton: "⭐ Super Like (5 Stars)",
    skipButton: "➡️ Siguiente",

    matchFound:
      "🎉 **¡Es un Match!**\n\n¡Tú y este usuario se gustaron! Comienza a chatear ahora.",
    startChat: "💬 Iniciar Chat",

    dailyQuests:
      "🎯 **Misiones Diarias**\n\n¡Completa misiones para ganar XP y Stars!",
    questProgress: (quest) => `
${quest.completed ? "✅" : "⏳"} **${quest.name}**
${quest.description}
Progreso: ${quest.progress}/${quest.target}
Recompensa: ${quest.reward.xp} XP + ${quest.reward.stars} Stars
`,

    questCompleted: (quest) => `
🎉 **¡Misión Completada!**

${quest.name}
+${quest.reward.xp} XP
+${quest.reward.stars} Stars
`,

    leaderboard: "🏆 **Tabla de Clasificación**\n\nMejores usuarios este mes:",
    leaderboardUser: (rank, user) =>
      `${rank}. ${user.username} - ${user.xp} XP`,

    levelUp: (level, reward) => `
🎊 **¡SUBISTE DE NIVEL!**

¡Alcanzaste el Nivel ${level}!
🎁 Recompensa: ${reward}
`,

    badgeEarned: (badge) => `
🏅 **¡Nueva Insignia Ganada!**

${badge.emoji} ${badge.name}
${badge.description}
`,

    streakBonus: (streak, stars) => `
🔥 **¡Bonus de Racha!**

¡${streak} días seguidos!
+${stars} Stars ganadas!
`,

    livesList: "🎥 **Transmisiones en Vivo**\n\nÚnete a una transmisión ahora:",
    noLives: "No hay transmisiones en este momento. ¡Vuelve más tarde!",
    liveCard: (live) => `
🎥 ${live.title}
👤 ${live.hostUsername}
👁️ ${live.viewers} viendo
`,
    joinLive: "🎥 Unirse al Vivo",

    giftSent: (gift, recipient) => `💎 ¡Enviaste ${gift.name} a ${recipient}!`,
    giftReceived: (gift, sender) => `🎁 ¡Recibiste ${gift.name} de ${sender}!`,

    postCreated: "✅ ¡Publicación creada exitosamente! +10 XP",
    createPost: "📝 Crear Publicación",
    postContent: "¿Qué estás pensando?",

    adminPanel: `
🛠️ **Panel de Administración**

Gestionar PNPtv:
• Ver usuarios y estadísticas
• Enviar broadcasts
• Gestionar contenido
• Revisar reportes
`,

    adminUsers: "/admin_users - Lista de Usuarios",
    adminStats: "/admin_stats - Estadísticas",
    adminBroadcast: "/admin_broadcast - Enviar Broadcast",
    adminReports: "/admin_reports - Ver Reportes",

    accessDenied: "❌ Acceso denegado. Solo administradores.",
    error: "❌ Ocurrió un error. Por favor intenta de nuevo.",

    helpText: `
❓ **Ayuda y Comandos**

**Comandos Principales:**
/start - Iniciar o reiniciar
/profile - Ver tu perfil
/map - Descubrir usuarios cercanos
/live - Explorar transmisiones
/quests - Ver misiones diarias
/leaderboard - Ver clasificaciones
/settings - Cambiar ajustes

**Premium:**
/upgrade - Mejorar a Silver/Golden

**¿Necesitas Soporte?**
Contacto: @PNPtvSupport
`,

    settingsMenu: `
⚙️ **Ajustes**

Personaliza tu experiencia:
`,
    changeLanguage: "🌐 Cambiar Idioma",
    privacySettings: "🔒 Ajustes de Privacidad",
    notifications: "🔔 Notificaciones",
    blockedUsers: "🚫 Usuarios Bloqueados",
    deleteAccount: "⚠️ Eliminar Cuenta",

    languageChanged: "✅ ¡Idioma cambiado exitosamente!",

    reportUser: "🚨 Reportar Usuario",
    reportReason: "Por favor selecciona una razón:",
    reportReasons: {
      spam: "Spam",
      harassment: "Acoso",
      inappropriate: "Contenido Inapropiado",
      fake: "Perfil Falso",
      other: "Otro",
    },
    reportSubmitted: "✅ Reporte enviado. Nuestro equipo lo revisará.",

    paymentSuccess: "✅ ¡Pago exitoso! ¡Bienvenido a ${tier}!",
    paymentFailed: "❌ Pago fallido. Por favor intenta de nuevo.",

    referralCode: (code) => `
🎁 **Tu Código de Referido**

Código: ${code}

¡Comparte con amigos para ganar recompensas!
• 3 referidos = 3 días de Silver gratis
• Cada referido les da a ambos 25 XP
`,

    referralSuccess: "🎉 ¡Referido aplicado! ¡Ambos ganaron 25 XP!",

    welcomeBack: (streak) =>
      `¡Bienvenido de vuelta! 🔥 ¡${streak} días de racha!`,

    featureComingSoon: "🚧 ¡Esta función estará disponible pronto!",
  },
};

module.exports = messages;
