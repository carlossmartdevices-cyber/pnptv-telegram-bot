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
let membershipData = null;
const isDemoMode = Boolean(window.DEMO_MODE);
let isUpdatingLocation = false;
let premiumPlansCache = null;

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

  // Prefetch premium plans so data is ready when user opens the tab
  loadPremiumPlans().catch((error) =>
    console.warn("Failed to preload premium plans:", error)
  );

  // Update map radius label on load
  updateRadiusSummary();

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
    console.log(`Loading profile for user: ${userId}`);

    const response = await fetch(`${API_BASE}/profile/${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Profile not found for ${userId}`);
        showError("Profile not found. Please start the bot first!");
        return;
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      userData = data.user;
      membershipData = data.user.membership || null;
      userLocation = data.user.location || null;

      console.log("Profile loaded successfully:", {
        username: userData.username,
        tier: userData.tier,
        hasMembership: !!membershipData,
      });

      updateProfileUI();
      updateRadiusSummary();

      if (currentPage === "map") {
        loadMapData();
      }
    } else {
      throw new Error(data.error || "Failed to load profile data");
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    showError(`Failed to load profile: ${error.message}`);
  }
}

/**
 * Update profile UI
 */
function updateProfileUI() {
  if (!userData) return;

  // Username
  const username = userData.username || "anonymous";
  document.getElementById("profile-username").textContent = `@${username}`;
  renderProfilePhoto(username);

  // Tier
  const tier = userData.tier || "Free";
  const tierEl = document.getElementById("profile-tier");
  tierEl.textContent = tier;
  tierEl.className = `profile-tier ${tier.toLowerCase()}`;

  // XP and Badges
  document.getElementById("profile-xp").textContent = userData.xp ?? 0;
  document.getElementById("profile-badges").textContent =
    userData.badges?.length ?? 0;

  // Bio
  document.getElementById("profile-bio-text").textContent =
    (userData.bio && userData.bio.trim()) || "No bio set";

  // Location
  const locationTextEl = document.getElementById("profile-location-text");
  const coordinatesEl = document.getElementById("profile-coordinates-text");
  if (userData.location) {
    const formattedLocation =
      userData.locationName || formatCoordinates(userData.location);
    locationTextEl.textContent = formattedLocation;
    coordinatesEl.textContent = formatCoordinates(userData.location);
    coordinatesEl.classList.remove("hidden");
    userLocation = userData.location;
  } else {
    locationTextEl.textContent = "Not set";
    coordinatesEl.classList.add("hidden");
  }

  document.getElementById("profile-joined-text").textContent =
    formatDate(userData.createdAt) || "—";
  document.getElementById("profile-last-active-text").textContent =
    formatRelativeTime(userData.lastActive, "Recently active");

  updateMembershipUI();
}

/**
 * Setup navigation
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      showPage(page);
    });
  });
}

function setActiveNav(pageName) {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });
}

/**
 * Show page
 */
function showPage(pageName) {
  currentPage = pageName;
  setActiveNav(pageName);

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
      updateRadiusSummary();
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
  document.getElementById('edit-bio-btn').addEventListener('click', showBioModal);
  document.getElementById('cancel-bio-btn').addEventListener('click', hideBioModal);
  document.getElementById('save-bio-btn').addEventListener('click', saveBio);

  // Location buttons
  const shareButton = document.getElementById('share-location-btn');
  if (shareButton) {
    shareButton.addEventListener('click', shareLocation);
  }
  document.getElementById('edit-location-btn').addEventListener('click', shareLocation);

  // Radius Selection
  document.querySelectorAll('.radius-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentRadius = parseInt(btn.dataset.radius, 10);
      document.querySelectorAll('.radius-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updateRadiusSummary();
      loadMapData();
    });
  });

  // Membership CTA
  const openSubscribeBtn = document.getElementById('open-subscribe-btn');
  if (openSubscribeBtn) {
    openSubscribeBtn.addEventListener('click', () => {
      showPage('premium');
      setActiveNav('premium');
    });
  }
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
  const saveBtn = document.getElementById("save-bio-btn");

  try {
    setButtonLoading(saveBtn, true, "Saving...");

    const response = await fetch(`${API_BASE}/profile/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to update bio");
    }

    userData.bio = bio;
    updateProfileUI();
    hideBioModal();
    tg.showAlert("Bio updated successfully!");

  } catch (error) {
    console.error("Error saving bio:", error);
    tg.showAlert(`Failed to save bio: ${error.message}`);
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

/**
 * Share location
 */
function shareLocation() {
  if (isDemoMode && typeof window.requestDemoLocation === "function") {
    window.requestDemoLocation(async (coords) => {
      try {
        await updateLocationOnServer(coords.latitude, coords.longitude);
        loadMapData();
      } catch (error) {
        console.error("Demo location update failed:", error);
      }
    });
    return;
  }

  if (isUpdatingLocation) {
    return;
  }

  if (!navigator.geolocation) {
    tg.showAlert("Location sharing is not supported on this device. Please share your location through the bot using /map.");
    return;
  }

  const button = document.getElementById("share-location-btn");
  setButtonLoading(button, true, "Requesting location...");
  isUpdatingLocation = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await updateLocationOnServer(position.coords.latitude, position.coords.longitude);
        tg.showAlert("Location updated!");
        await loadMapData();
      } catch (error) {
        console.error("Error updating location:", error);
        tg.showAlert("Could not update location. Please try again later.");
      } finally {
        setButtonLoading(button, false);
        isUpdatingLocation = false;
      }
    },
    (error) => {
      console.error("Geolocation error:", error);
      const message = geolocationErrorMessage(error);
      tg.showAlert(message);
      setButtonLoading(button, false);
      isUpdatingLocation = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
}

/**
 * Load map data
 */
async function loadMapData() {
  const usersList = document.getElementById("users-list");

  if (!userLocation) {
    updateRadiusSummary();
    usersList.innerHTML = '<p class="empty-state">Share your location to see nearby users</p>';
    return;
  }

  updateRadiusSummary();
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

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.users) && data.users.length > 0) {
      displayNearbyUsers(data.users);
    } else {
      usersList.innerHTML = `<p class="empty-state">No users found within ${currentRadius} km</p>`;
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

  if (!Array.isArray(users) || users.length === 0) {
    usersList.innerHTML = `<p class="empty-state">No users found within ${currentRadius} km</p>`;
    return;
  }

  const groups = users.reduce((acc, user) => {
    const category = user.distanceCategory || "Nearby";
    if (!acc[category]) acc[category] = [];
    acc[category].push(user);
    return acc;
  }, {});

  Object.entries(groups).forEach(([category, list]) => {
    const groupEl = document.createElement("div");
    groupEl.className = "user-group";

    const header = document.createElement("div");
    header.className = "user-group-header";
    header.innerHTML = `<h3>${category}</h3><span>${list.length} ${list.length === 1 ? "person" : "people"}</span>`;
    groupEl.appendChild(header);

    list.forEach((user) => {
      const initial = (user.username || "U").charAt(0).toUpperCase();
      const gradient = generateGradientFromString(user.username || user.userId);
      const tierBadge = user.tier === "Golden" ? "💎" : user.tier === "Silver" ? "🥈" : "🙂";
      const locationName = user.locationName || (user.location ? formatCoordinates(user.location) : "Unknown");
      const lastActiveLabel = formatRelativeTime(user.lastActive, "Recently active");
      const xpChip = typeof user.xp === "number" ? `<span>⭐ ${user.xp} XP</span>` : "";

      const userCard = document.createElement("div");
      userCard.className = "user-card";
      userCard.innerHTML = `
        <div class="user-photo" style="background:${gradient};">
          <span class="photo-placeholder">${initial}</span>
        </div>
        <div class="user-info">
          <h3>
            @${user.username}
            <span class="tier-badge">${tierBadge}</span>
          </h3>
          <div class="distance">📏 ${user.distanceFormatted}</div>
          <div class="user-meta">
            <span class="location-chip">📌 ${locationName}</span>
            <span>🕒 ${lastActiveLabel}</span>
            ${xpChip}
          </div>
          ${user.bio ? `<div class="bio">${sanitizeText(user.bio)}</div>` : ""}
        </div>
      `;

      groupEl.appendChild(userCard);
    });

    usersList.appendChild(groupEl);
  });
}

/**
 * Load premium plans
 */
async function loadPremiumPlans(force = false) {
  try {
    // Use cached data if available and not forcing refresh
    if (!force && premiumPlansCache) {
      displayPremiumPlans(premiumPlansCache);
      return;
    }

    console.log("Loading premium plans...");

    const response = await fetch(`${API_BASE}/plans`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.plans) {
      premiumPlansCache = data.plans;
      console.log("Premium plans loaded:", Object.keys(data.plans));
      displayPremiumPlans(data.plans);
    } else {
      throw new Error(data.error || "No plans data received");
    }
  } catch (error) {
    console.error("Error loading plans:", error);
    const container = document.getElementById("plans-container");
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <p>Failed to load premium plans</p>
          <button class="btn btn-secondary" onclick="loadPremiumPlans(true)">Retry</button>
        </div>
      `;
    }
  }
}

/**
 * Display premium plans
 */
function displayPremiumPlans(plans) {
  const container = document.getElementById("plans-container");
  container.innerHTML = "";

  if (!plans) {
    container.innerHTML = '<p class="empty-state">No plans available right now.</p>';
    return;
  }

  // Filter out lowercase duplicates and only show Silver and Golden
  const validPlans = {};
  Object.entries(plans).forEach(([tier, plan]) => {
    const tierKey = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
    if (tierKey === "Silver" || tierKey === "Golden") {
      validPlans[tierKey] = plan;
    }
  });

  Object.entries(validPlans).forEach(([tier, plan]) => {
    const isCurrentTier = (userData?.tier || "Free") === tier;
    const planCard = document.createElement("div");
    planCard.className = `plan-card ${tier === "Silver" ? "recommended" : ""}`;

    const features = plan.features
      .map((f) => `<li>${sanitizeText(f)}</li>`)
      .join("");

    const priceDisplay = formatCurrency(plan.priceInCOP, plan.currency);
    const buttonLabel = isCurrentTier ? "Current Plan" : `Subscribe - ${priceDisplay}`;
    const buttonClass = isCurrentTier ? "btn-secondary" : "btn-premium";
    const disabledAttr = isCurrentTier ? "disabled" : "";

    planCard.innerHTML = `
      <div class="plan-header">
        <div class="plan-name">${tier}</div>
        <div class="plan-icon">${plan.icon || (tier === "Golden" ? "💎" : "🥈")}</div>
      </div>
      <div class="plan-price">${priceDisplay}/month</div>
      <div class="plan-description">${sanitizeText(plan.description || "")}</div>
      <ul class="plan-features">
        ${features}
      </ul>
      <button class="btn ${buttonClass}" ${disabledAttr} data-tier="${tier}"
              onclick="subscribeToPlan('${tier}')">
        ${buttonLabel}
      </button>
    `;

    container.appendChild(planCard);
  });
}

/**
 * Subscribe to plan
 */
async function subscribeToPlan(tier) {
  const currentTier = userData?.tier || "Free";

  if (tier === "Free" || tier === currentTier) {
    tg.showAlert(`You are already on the ${currentTier} plan!`);
    return;
  }

  // Get the plan details
  const plan = premiumPlansCache?.[tier];
  if (!plan) {
    tg.showAlert("Plan not found. Please try again.");
    return;
  }

  // Show loading state
  const button = event?.target;
  if (button) {
    setButtonLoading(button, true, "Creating payment...");
  }

  try {
    // Create payment link via API
    const response = await fetch(`${API_BASE}/payment/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId,
        planType: tier.toLowerCase(),
      }),
    });

    const data = await response.json();

    if (button) {
      setButtonLoading(button, false);
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || "Failed to create payment link");
    }

    // Open payment link in external browser
    tg.openLink(data.paymentUrl);

    // Optionally show confirmation
    tg.showPopup({
      title: "Payment Link Created",
      message: `Your payment link for ${plan.name} (${plan.price}) has been created. Complete the payment in the opened browser window.`,
      buttons: [
        { id: "close", type: "close", text: "OK" }
      ]
    });

  } catch (error) {
    console.error("Error creating payment:", error);

    if (button) {
      setButtonLoading(button, false);
    }

    tg.showAlert(`Failed to create payment link: ${error.message}`);
  }
}

function updateMembershipUI() {
  const statusEl = document.getElementById("membership-status");
  const tierValueEl = document.getElementById("membership-tier-value");
  const expiresEl = document.getElementById("membership-expires-value");
  const remainingEl = document.getElementById("membership-days-remaining");

  if (!statusEl || !tierValueEl || !expiresEl || !remainingEl) return;

  const tier = membershipData?.tier || userData?.tier || "Free";
  const status = membershipData?.status || (tier === "Free" ? "free" : "active");

  tierValueEl.textContent = tier;
  statusEl.textContent = formatMembershipStatus(status);
  statusEl.className = `membership-status ${status}`;

  if (membershipData?.expiresAt) {
    expiresEl.textContent = formatDate(membershipData.expiresAt) || "—";
    remainingEl.textContent = formatRemainingDays(membershipData.daysRemaining);
  } else if (tier === "Free") {
    expiresEl.textContent = "Unlimited";
    remainingEl.textContent = "Upgrade to unlock premium features";
  } else {
    expiresEl.textContent = "No expiry";
    remainingEl.textContent = "Lifetime access";
  }
}

function formatMembershipStatus(status) {
  switch (status) {
    case "free":
      return "Free";
    case "active":
      return "Active";
    case "expiring_soon":
      return "Expiring soon";
    case "expired":
      return "Expired";
    case "lifetime":
      return "Lifetime";
    default:
      return status || "Unknown";
  }
}

function formatRemainingDays(days) {
  if (typeof days !== "number") {
    return "—";
  }

  if (days <= 0) {
    return "Expired";
  }

  if (days === 1) {
    return "1 day remaining";
  }

  return `${days} days remaining`;
}

function renderProfilePhoto(username) {
  const photoEl = document.getElementById("profile-photo");
  if (!photoEl) return;

  const placeholder = photoEl.querySelector(".photo-placeholder");
  const initial = (username || "U").charAt(0).toUpperCase();
  if (placeholder) {
    placeholder.textContent = initial;
  }

  photoEl.style.background = generateGradientFromString(username || "user");
}

function generateGradientFromString(value) {
  const str = value || "user";
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const secondaryHue = (hue + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${secondaryHue}, 65%, 45%))`;
}

function formatCoordinates(location) {
  if (!location) return "";
  const { latitude, longitude } = location;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return "";
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function formatDate(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeTime(dateLike, fallback = "—") {
  if (!dateLike) return fallback;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return fallback;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return formatDate(date) || fallback;
}

function sanitizeText(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

function updateRadiusSummary() {
  const summaryEl = document.getElementById("map-summary");
  if (!summaryEl) return;

  const radiusLabel = document.getElementById("map-radius-label");
  const locationLabel = document.getElementById("map-location-label");

  if (radiusLabel) {
    radiusLabel.textContent = `${currentRadius} km`;
  }

  if (!userLocation) {
    summaryEl.classList.add("hidden");
    if (locationLabel) {
      locationLabel.textContent = "Location not set";
    }
    return;
  }

  summaryEl.classList.remove("hidden");
  if (locationLabel) {
    locationLabel.textContent =
      userData?.locationName || formatCoordinates(userLocation) || "Location saved";
  }
}

function setButtonLoading(button, isLoading, loadingLabel = "Loading...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingLabel;
    button.disabled = true;
    button.classList.add("is-loading");
  } else {
    const original = button.dataset.originalText || "📍 Share My Location";
    button.textContent = original;
    button.disabled = false;
    button.classList.remove("is-loading");
  }
}

function geolocationErrorMessage(error) {
  if (!error) return "Unable to access your location.";

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Please enable location access for Telegram.";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable right now.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "Unable to access your location.";
  }
}

async function updateLocationOnServer(latitude, longitude) {
  const response = await fetch(`${API_BASE}/profile/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: { latitude, longitude },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update location (status ${response.status})`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to update location");
  }

  userData = data.user;
  membershipData = data.user.membership || membershipData;
  userLocation = data.user.location;
  updateProfileUI();
  updateRadiusSummary();
}

/**
 * Show error message to user
 */
function showError(message) {
  console.error("Error:", message);
  if (tg.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount, currency = "COP") {
  if (currency === "COP") {
    return `$${amount.toLocaleString()} COP`;
  }
  return `$${amount}`;
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
