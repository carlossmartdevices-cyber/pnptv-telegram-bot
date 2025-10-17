/**
 * Nearby Users Mini App - PNPtv
 * Shows nearby users with freemium chat (3 free, rest requires subscription)
 */

// Configuration
const API_BASE = window.location.origin;
const FREE_CHAT_LIMIT = 3;

// State
let state = {
  currentUser: null,
  userLocation: null,
  nearbyUsers: [],
  selectedRadius: 10,
  unlockedChats: [],
  freeChatsUsed: 0,
  hasPremium: false,
  isLoading: false,
};

// Telegram WebApp
const tg = window.Telegram?.WebApp;

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  console.log("Nearby Users Mini App initialized");

  // Initialize Telegram WebApp
  if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    console.log("Telegram WebApp ready");
  }

  // Get user ID from Telegram
  const telegramUser = tg?.initDataUnsafe?.user;
  if (telegramUser) {
    state.currentUser = {
      userId: telegramUser.id.toString(),
      username: telegramUser.username || telegramUser.first_name,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    };
    console.log("Current user:", state.currentUser);
  }

  // Initialize event listeners
  initializeEventListeners();

  // Start the app
  if (state.currentUser) {
    initializeApp();
  } else {
    showError("Unable to identify Telegram user. Please open from Telegram.");
  }
});

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Radius buttons
  document.querySelectorAll(".radius-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const radius = parseInt(btn.dataset.radius);
      selectRadius(radius);
    });
  });

  // Refresh button
  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    loadNearbyUsers();
  });

  // Retry button
  document.getElementById("retry-btn")?.addEventListener("click", () => {
    hideError();
    initializeApp();
  });

  // Upgrade buttons
  document.getElementById("upgrade-btn")?.addEventListener("click", () => {
    openUpgradeMenu();
  });

  document.getElementById("modal-upgrade-btn")?.addEventListener("click", () => {
    openUpgradeMenu();
  });

  // Modal close
  document.getElementById("close-modal-btn")?.addEventListener("click", () => {
    closeUserModal();
  });

  document.querySelector(".modal-overlay")?.addEventListener("click", () => {
    closeUserModal();
  });

  // Chat button
  document.getElementById("chat-btn")?.addEventListener("click", () => {
    const selectedUserId = document.getElementById("chat-btn").dataset.userId;
    if (selectedUserId) {
      startChat(selectedUserId);
    }
  });
}

/**
 * Initialize the app
 */
async function initializeApp() {
  try {
    showLoading();

    // Load user profile and membership
    await loadUserProfile();

    // Get user location
    await getUserLocation();

    // Load nearby users
    await loadNearbyUsers();

    hideLoading();
    showMainContent();
  } catch (error) {
    console.error("App initialization failed:", error);
    showError(error.message || "Failed to initialize app");
  }
}

/**
 * Load user profile and membership status
 */
async function loadUserProfile() {
  try {
    const response = await fetch(`${API_BASE}/api/profile/${state.currentUser.userId}`, {
      headers: {
        "X-Telegram-Init-Data": tg?.initData || "",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load profile");
    }

    const data = await response.json();
    const user = data.user;

    // Update user location if available
    if (user.location) {
      state.userLocation = user.location;
    }

    // Check membership status
    state.hasPremium = user.membership?.status === "active" &&
                       user.membership?.tier !== "Free";

    // Load unlocked chats from localStorage
    const storedChats = localStorage.getItem(`unlockedChats_${state.currentUser.userId}`);
    if (storedChats) {
      state.unlockedChats = JSON.parse(storedChats);
      state.freeChatsUsed = state.unlockedChats.length;
    }

    console.log("Profile loaded:", { hasPremium: state.hasPremium, freeChatsUsed: state.freeChatsUsed });
  } catch (error) {
    console.error("Failed to load profile:", error);
    // Continue without profile data
  }
}

/**
 * Get user location
 */
async function getUserLocation() {
  return new Promise((resolve, reject) => {
    // Try to get from Telegram Location API first
    if (tg?.requestLocation) {
      console.log("Requesting location from Telegram...");
      // Telegram will call the callback when location is available
      // For now, we'll use browser geolocation as fallback
    }

    // Use existing location or browser geolocation
    if (state.userLocation) {
      updateLocationDisplay();
      resolve();
      return;
    }

    // Browser geolocation fallback
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          state.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          updateLocationDisplay();
          resolve();
        },
        (error) => {
          console.error("Geolocation error:", error);
          reject(new Error("Location permission denied. Please enable location access."));
        }
      );
    } else {
      reject(new Error("Geolocation not supported by your browser"));
    }
  });
}

/**
 * Update location display
 */
function updateLocationDisplay() {
  const locationEl = document.getElementById("user-location");
  if (locationEl && state.userLocation) {
    locationEl.textContent = `${state.userLocation.latitude.toFixed(4)}, ${state.userLocation.longitude.toFixed(4)}`;
  }
}

/**
 * Load nearby users
 */
async function loadNearbyUsers() {
  if (!state.userLocation) {
    showError("Location not available");
    return;
  }

  try {
    state.isLoading = true;

    const response = await fetch(`${API_BASE}/api/map/nearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": tg?.initData || "",
      },
      body: JSON.stringify({
        userId: state.currentUser.userId,
        latitude: state.userLocation.latitude,
        longitude: state.userLocation.longitude,
        radius: state.selectedRadius,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to load nearby users");
    }

    const data = await response.json();
    state.nearbyUsers = data.users || [];

    console.log(`Loaded ${state.nearbyUsers.length} nearby users`);
    renderUsersList();
    updateStats();

    state.isLoading = false;
  } catch (error) {
    console.error("Failed to load nearby users:", error);
    state.isLoading = false;
    showError(error.message);
  }
}

/**
 * Render users list
 */
function renderUsersList() {
  const container = document.getElementById("users-list");
  const emptyState = document.getElementById("empty-state");

  if (!container) return;

  container.innerHTML = "";

  if (state.nearbyUsers.length === 0) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  state.nearbyUsers.forEach((user, index) => {
    const isLocked = !canChatWithUser(user.userId);
    const userCard = createUserCard(user, index, isLocked);
    container.appendChild(userCard);
  });
}

/**
 * Create user card element
 */
function createUserCard(user, index, isLocked) {
  const card = document.createElement("div");
  card.className = "user-card" + (isLocked ? " locked" : "");
  card.dataset.userId = user.userId;

  // Determine if this is within the first 3 users
  const isFreeSlot = index < FREE_CHAT_LIMIT;

  card.innerHTML = `
    <div class="user-card-header">
      <div class="user-photo">
        <span class="photo-placeholder">👤</span>
      </div>
      <div class="user-info">
        <h3 class="user-name">${escapeHtml(user.username || "Anonymous")}</h3>
        <div class="user-tier-badge ${user.tier?.toLowerCase() || "free"}">${user.tier || "Free"}</div>
      </div>
      ${isLocked ? '<span class="lock-icon material-icons">lock</span>' : ""}
    </div>

    <div class="user-card-body">
      <div class="user-distance">
        <span class="material-icons">location_on</span>
        <span>${user.distanceFormatted || user.distance + " km"}</span>
      </div>

      <div class="user-xp">
        <span class="material-icons">stars</span>
        <span>${user.xp || 0} XP</span>
      </div>
    </div>

    ${user.bio ? `<p class="user-bio-preview">${escapeHtml(user.bio.substring(0, 80))}${user.bio.length > 80 ? "..." : ""}</p>` : ""}

    <div class="user-card-footer">
      ${
        isLocked
          ? `
        <div class="locked-badge">
          <span class="material-icons">lock</span>
          <span>${isFreeSlot ? "Click to unlock (Free)" : "Subscribe to unlock"}</span>
        </div>
      `
          : `
        <span class="unlocked-badge">
          <span class="material-icons">check_circle</span>
          <span>Available</span>
        </span>
      `
      }
    </div>
  `;

  card.addEventListener("click", () => {
    openUserModal(user, isLocked);
  });

  return card;
}

/**
 * Check if user can chat with another user
 */
function canChatWithUser(userId) {
  // Premium users can chat with everyone
  if (state.hasPremium) {
    return true;
  }

  // Check if already unlocked
  if (state.unlockedChats.includes(userId)) {
    return true;
  }

  // Can unlock if free chats available
  return state.freeChatsUsed < FREE_CHAT_LIMIT;
}

/**
 * Open user modal
 */
function openUserModal(user, isLocked) {
  const modal = document.getElementById("user-modal");
  if (!modal) return;

  // Populate modal with user data
  document.getElementById("modal-username").textContent = user.username || "Anonymous";
  document.getElementById("modal-user-tier").textContent = user.tier || "Free";
  document.getElementById("modal-user-tier").className = `user-tier-badge ${(user.tier || "free").toLowerCase()}`;
  document.getElementById("modal-distance").textContent = user.distanceFormatted || `${user.distance} km away`;
  document.getElementById("modal-xp").textContent = `${user.xp || 0} XP`;
  document.getElementById("modal-bio").textContent = user.bio || "No bio available";
  document.getElementById("modal-location").textContent = user.locationName || "Unknown";
  document.getElementById("modal-last-active").textContent = user.lastActive
    ? `Last seen: ${formatDate(user.lastActive)}`
    : "Last seen: Unknown";

  // Configure chat button
  const chatBtn = document.getElementById("chat-btn");
  const lockedNotice = document.getElementById("chat-locked-notice");

  chatBtn.dataset.userId = user.userId;

  if (!isLocked) {
    // Can chat
    chatBtn.classList.remove("hidden");
    lockedNotice.classList.add("hidden");
  } else if (state.freeChatsUsed < FREE_CHAT_LIMIT && !state.hasPremium) {
    // Can unlock with free slot
    chatBtn.classList.remove("hidden");
    lockedNotice.classList.add("hidden");
    chatBtn.innerHTML = `
      <span class="material-icons">lock_open</span>
      Unlock Chat (${FREE_CHAT_LIMIT - state.freeChatsUsed} free left)
    `;
  } else {
    // Locked - requires subscription
    chatBtn.classList.add("hidden");
    lockedNotice.classList.remove("hidden");
  }

  modal.classList.remove("hidden");
}

/**
 * Close user modal
 */
function closeUserModal() {
  const modal = document.getElementById("user-modal");
  modal?.classList.add("hidden");
}

/**
 * Start chat with user
 */
function startChat(userId) {
  // Check if can chat
  if (!canChatWithUser(userId)) {
    openUpgradeMenu();
    return;
  }

  // Unlock the chat if not already unlocked
  if (!state.unlockedChats.includes(userId)) {
    state.unlockedChats.push(userId);
    state.freeChatsUsed = state.unlockedChats.length;

    // Save to localStorage
    localStorage.setItem(
      `unlockedChats_${state.currentUser.userId}`,
      JSON.stringify(state.unlockedChats)
    );

    // Update UI
    updateStats();
    renderUsersList();
  }

  // Close modal
  closeUserModal();

  // Open chat in Telegram
  if (tg) {
    const user = state.nearbyUsers.find((u) => u.userId === userId);
    const username = user?.username;

    if (username) {
      tg.openTelegramLink(`https://t.me/${username}`);
    } else {
      // Open with user ID
      tg.openTelegramLink(`tg://user?id=${userId}`);
    }
  }

  console.log("Starting chat with user:", userId);
}

/**
 * Select radius
 */
function selectRadius(radius) {
  state.selectedRadius = radius;

  // Update active button
  document.querySelectorAll(".radius-btn").forEach((btn) => {
    if (parseInt(btn.dataset.radius) === radius) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Reload nearby users
  loadNearbyUsers();
}

/**
 * Update stats display
 */
function updateStats() {
  document.getElementById("total-users").textContent = state.nearbyUsers.length;

  if (state.hasPremium) {
    document.getElementById("unlocked-chats").textContent = "Unlimited";
  } else {
    document.getElementById("unlocked-chats").textContent =
      `${state.freeChatsUsed}/${FREE_CHAT_LIMIT}`;
  }

  // Show upgrade banner if at limit and not premium
  const upgradeBanner = document.getElementById("upgrade-banner");
  if (!state.hasPremium && state.freeChatsUsed >= FREE_CHAT_LIMIT) {
    upgradeBanner?.classList.remove("hidden");
  } else {
    upgradeBanner?.classList.add("hidden");
  }
}

/**
 * Open upgrade/plans menu
 */
function openUpgradeMenu() {
  if (tg) {
    // Open the main mini app to premium page
    const mainAppUrl = `${API_BASE}/?page=premium`;
    tg.openLink(mainAppUrl);
  }
}

/**
 * UI Helper functions
 */
function showLoading() {
  document.getElementById("loading")?.classList.remove("hidden");
  document.getElementById("loading")?.classList.add("active");
}

function hideLoading() {
  document.getElementById("loading")?.classList.add("hidden");
  document.getElementById("loading")?.classList.remove("active");
}

function showMainContent() {
  document.getElementById("main-content")?.classList.remove("hidden");
}

function showError(message) {
  hideLoading();
  const errorScreen = document.getElementById("error-screen");
  const errorMessage = document.getElementById("error-message");

  if (errorMessage) {
    errorMessage.textContent = message;
  }

  errorScreen?.classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-screen")?.classList.add("hidden");
}

/**
 * Utility functions
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
