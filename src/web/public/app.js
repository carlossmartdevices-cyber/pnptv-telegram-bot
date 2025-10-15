/**
 * PNPtv Telegram Mini App
 * Client-side JavaScript
 */

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// State
let currentPage = "profile";
let currentRadius = 25;
let userLocation = null;
let userData = null;

// Get user ID from Telegram
const userId = tg.initDataUnsafe?.user?.id?.toString() || "demo";

// API Base URL
const API_BASE = window.location.origin + "/api";

/**
 * Initialize app
 */
async function initApp() {
  console.log("Initializing PNPtv Mini App...");

  // Set theme colors
  applyTheme();

  // Load user profile
  await loadProfile();

  // Setup navigation
  setupNavigation();

  // Setup event listeners
  setupEventListeners();

  // Hide loading, show app
  document.getElementById("loading").classList.remove("active");
  document.getElementById("main-nav").classList.remove("hidden");
  showPage("profile");

  console.log("App initialized");
}

/**
 * Apply Telegram theme
 */
function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty("--tg-theme-bg-color", tg.themeParams.bg_color || "#ffffff");
  root.style.setProperty("--tg-theme-text-color", tg.themeParams.text_color || "#000000");
  root.style.setProperty("--tg-theme-hint-color", tg.themeParams.hint_color || "#999999");
  root.style.setProperty("--tg-theme-link-color", tg.themeParams.link_color || "#2481cc");
  root.style.setProperty("--tg-theme-button-color", tg.themeParams.button_color || "#2481cc");
  root.style.setProperty("--tg-theme-button-text-color", tg.themeParams.button_text_color || "#ffffff");
  root.style.setProperty("--tg-theme-secondary-bg-color", tg.themeParams.secondary_bg_color || "#f4f4f5");
}

/**
 * Load user profile
 */
async function loadProfile() {
  try {
    const response = await fetch(`${API_BASE}/profile/${userId}`);
    const data = await response.json();

    if (data.success) {
      userData = data.user;
      updateProfileUI();
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    tg.showAlert("Failed to load profile");
  }
}

/**
 * Update profile UI
 */
function updateProfileUI() {
  if (!userData) return;

  // Username
  document.getElementById("profile-username").textContent = `@${userData.username}`;

  // Tier
  const tierEl = document.getElementById("profile-tier");
  tierEl.textContent = userData.tier || "Free";
  tierEl.className = `profile-tier ${(userData.tier || "free").toLowerCase()}`;

  // XP and Badges
  document.getElementById("profile-xp").textContent = userData.xp || 0;
  document.getElementById("profile-badges").textContent = userData.badges?.length || 0;

  // Bio
  document.getElementById("profile-bio-text").textContent = userData.bio || "No bio set";

  // Location
  if (userData.location) {
    const { latitude, longitude } = userData.location;
    document.getElementById("profile-location-text").textContent =
      `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    userLocation = userData.location;
  } else {
    document.getElementById("profile-location-text").textContent = "Not set";
  }

  // Photo (if available via Telegram file API)
  // Note: In production, you'd need to implement photo serving
}

/**
 * Setup navigation
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      showPage(page);

      // Update active state
      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

/**
 * Show page
 */
function showPage(pageName) {
  currentPage = pageName;

  // Hide all pages
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // Show selected page
  const pageEl = document.getElementById(`${pageName}-page`);
  if (pageEl) {
    pageEl.classList.add("active");
  }

  // Load page data
  switch (pageName) {
    case "map":
      loadMapData();
      break;
    case "premium":
      loadPremiumPlans();
      break;
    case "live":
      // Live streams - coming soon
      break;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Edit Bio
  document.getElementById("edit-bio-btn").addEventListener("click", showBioModal);
  document.getElementById("cancel-bio-btn").addEventListener("click", hideBioModal);
  document.getElementById("save-bio-btn").addEventListener("click", saveBio);

  // Share Location
  document.getElementById("share-location-btn").addEventListener("click", shareLocation);

  // Radius Selection
  document.querySelectorAll(".radius-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentRadius = parseInt(btn.dataset.radius);
      document.querySelectorAll(".radius-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadMapData();
    });
  });

  // Update Location
  document.getElementById("edit-location-btn").addEventListener("click", shareLocation);
}

/**
 * Show bio modal
 */
function showBioModal() {
  const modal = document.getElementById("bio-modal");
  const input = document.getElementById("bio-input");
  input.value = userData?.bio || "";
  modal.classList.remove("hidden");
}

/**
 * Hide bio modal
 */
function hideBioModal() {
  document.getElementById("bio-modal").classList.add("hidden");
}

/**
 * Save bio
 */
async function saveBio() {
  const bio = document.getElementById("bio-input").value.trim();

  try {
    const response = await fetch(`${API_BASE}/profile/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio }),
    });

    const data = await response.json();

    if (data.success) {
      userData.bio = bio;
      updateProfileUI();
      hideBioModal();
      tg.showAlert("Bio updated successfully!");
    }
  } catch (error) {
    console.error("Error saving bio:", error);
    tg.showAlert("Failed to save bio");
  }
}

/**
 * Share location
 */
function shareLocation() {
  tg.showAlert(
    "Please share your location through the Telegram bot using /map command."
  );
}

/**
 * Load map data
 */
async function loadMapData() {
  if (!userLocation) {
    document.getElementById("users-list").innerHTML =
      '<p class="empty-state">Share your location to see nearby users</p>';
    return;
  }

  const usersList = document.getElementById("users-list");
  usersList.innerHTML = '<p class="empty-state">Loading nearby users...</p>';

  try {
    const response = await fetch(`${API_BASE}/map/nearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: currentRadius,
      }),
    });

    const data = await response.json();

    if (data.success && data.users.length > 0) {
      displayNearbyUsers(data.users);
    } else {
      usersList.innerHTML = `<p class="empty-state">No users found within ${currentRadius}km</p>`;
    }
  } catch (error) {
    console.error("Error loading map data:", error);
    usersList.innerHTML = '<p class="empty-state">Failed to load nearby users</p>';
  }
}

/**
 * Display nearby users
 */
function displayNearbyUsers(users) {
  const usersList = document.getElementById("users-list");
  usersList.innerHTML = "";

  users.forEach((user) => {
    const userCard = document.createElement("div");
    userCard.className = "user-card";

    const tierBadge =
      user.tier === "Golden" ? "🥇" : user.tier === "Silver" ? "🥈" : "⚪";

    userCard.innerHTML = `
      <div class="user-photo">👤</div>
      <div class="user-info">
        <h3>
          @${user.username}
          <span class="tier-badge">${tierBadge}</span>
        </h3>
        <div class="distance">📍 ${user.distanceFormatted}</div>
        ${user.bio ? `<div class="bio">${user.bio.substring(0, 50)}...</div>` : ""}
      </div>
    `;

    usersList.appendChild(userCard);
  });
}

/**
 * Load premium plans
 */
async function loadPremiumPlans() {
  try {
    const response = await fetch(`${API_BASE}/plans`);
    const data = await response.json();

    if (data.success) {
      displayPremiumPlans(data.plans);
    }
  } catch (error) {
    console.error("Error loading plans:", error);
  }
}

/**
 * Display premium plans
 */
function displayPremiumPlans(plans) {
  const container = document.getElementById("plans-container");
  container.innerHTML = "";

  Object.entries(plans).forEach(([tier, plan]) => {
    const planCard = document.createElement("div");
    planCard.className = `plan-card ${tier === "Silver" ? "recommended" : ""}`;

    const features = plan.features
      .map((f) => `<li>${f}</li>`)
      .join("");

    planCard.innerHTML = `
      <div class="plan-header">
        <div class="plan-name">${tier}</div>
        <div class="plan-icon">${plan.icon}</div>
      </div>
      <div class="plan-price">$${plan.price}/month</div>
      <ul class="plan-features">
        ${features}
      </ul>
      <button class="btn ${tier === "Free" ? "btn-secondary" : "btn-premium"}"
              onclick="subscribeToPlan('${tier}')">
        ${tier === "Free" ? "Current Plan" : "Subscribe"}
      </button>
    `;

    container.appendChild(planCard);
  });
}

/**
 * Subscribe to plan
 */
function subscribeToPlan(tier) {
  if (tier === "Free") {
    tg.showAlert("You are already on the Free plan!");
    return;
  }

  tg.showConfirm(
    `Subscribe to ${tier} plan? This will open payment options in the bot.`,
    (confirmed) => {
      if (confirmed) {
        tg.close();
        // User will be redirected back to bot to complete payment
      }
    }
  );
}

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Handle Telegram back button
tg.BackButton.onClick(() => {
  if (currentPage !== "profile") {
    showPage("profile");
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === "profile");
    });
  } else {
    tg.close();
  }
});

// Show back button when not on profile page
tg.onEvent("viewportChanged", () => {
  if (currentPage !== "profile") {
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
});
