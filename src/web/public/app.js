/**
 * PNPtv Telegram Mini App
 * Client-side JavaScript
 */

// Initialize Telegram WebApp (if available)
const tg = window.Telegram?.WebApp || null;
if (tg && typeof tg.expand === "function") {
  tg.expand();
}

const hasTelegramUser = Boolean(tg?.initDataUnsafe?.user?.id);
const isDemoMode = Boolean(window.DEMO_MODE);
let publicConfig = {
  telegramLoginBot: null,
  miniAppUrl: null,
};

// State
let currentPage = "profile";
let currentRadius = 25;
let userLocation = null;
let userData = null;
let membershipData = null;
let isUpdatingLocation = false;
let premiumPlansCache = [];
let postComposerInitialized = false;
let selectedPostFiles = [];
const MAX_POST_MEDIA_FILES = 4;
const POST_TEXT_LIMIT = 2000;
const POST_PAGE_SIZE = 6;
const POST_MEDIA_SIZE_LIMIT = 25 * 1024 * 1024; // 25MB per file
const createDefaultPostsState = () => ({
  items: [],
  lastPostId: null,
  hasMore: true,
  loading: false,
  error: null,
});
let userPostsState = createDefaultPostsState();

// Performance caches
const gradientCache = new Map();
const MAX_USERS_PER_PAGE = 20;
let currentUserPage = 0;
let allNearbyUsers = [];

// Get user ID from Telegram
const userId = tg?.initDataUnsafe?.user?.id?.toString() || "demo";

// API Base URL
const API_BASE = window.location.origin + "/api";

/**
 * UI helpers with graceful fallbacks outside Telegram
 */
function showAlert(message) {
  if (tg && typeof tg.showAlert === "function") {
    tg.showAlert(message);
  } else {
    window.alert(message);
  }
}

function showPopup(params) {
  if (tg && typeof tg.showPopup === "function") {
    return tg.showPopup(params);
  }

  if (params?.message) {
    window.alert(params.message);
  }

  return undefined;
}

function openLink(url) {
  if (tg && typeof tg.openLink === "function") {
    tg.openLink(url);
  } else if (url) {
    window.open(url, "_blank", "noopener");
  }
}

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Add Telegram initData for authentication
  if (tg?.initData) {
    headers['X-Telegram-Init-Data'] = tg.initData;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Initialize app
 */
async function initApp() {
  console.log("Initializing PNPtv Mini App...");

  hideLoginOverlay();

  // Set theme colors
  applyTheme();

  // Load user profile
  await loadProfile();

  // Setup navigation
  setupNavigation();

  // Setup event listeners
  setupEventListeners();
  initPostComposer();
  renderUserPosts();

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
  const theme = tg?.themeParams || {};
  root.style.setProperty("--tg-theme-bg-color", theme.bg_color || "#ffffff");
  root.style.setProperty("--tg-theme-text-color", theme.text_color || "#000000");
  root.style.setProperty("--tg-theme-hint-color", theme.hint_color || "#999999");
  root.style.setProperty("--tg-theme-link-color", theme.link_color || "#2481cc");
  root.style.setProperty("--tg-theme-button-color", theme.button_color || "#2481cc");
  root.style.setProperty("--tg-theme-button-text-color", theme.button_text_color || "#ffffff");
  root.style.setProperty("--tg-theme-secondary-bg-color", theme.secondary_bg_color || "#f4f4f5");
}

/**
 * Load user profile
 */
async function loadProfile() {
  try {
    console.log(`Loading profile for user: ${userId}`);

    const response = await apiRequest(`${API_BASE}/profile/${userId}`);

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

      if (userPostsState.items.length === 0) {
        loadUserPosts({ refresh: true });
      } else {
        renderUserPosts();
      }

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

  updateFabVisibility();
  updateMembershipUI();
}

function updatePostTextCounter() {
  const textInput = document.getElementById("post-text-input");
  const counterEl = document.getElementById("post-text-counter");
  if (!textInput || !counterEl) {
    return;
  }

  const length = textInput.value.length;
  counterEl.textContent = `${length} / ${POST_TEXT_LIMIT}`;
  counterEl.classList.toggle("over-limit", length > POST_TEXT_LIMIT);
}

function setPostsFeedback(message = "", variant = "info") {
  const feedbackEl = document.getElementById("posts-feedback");
  if (!feedbackEl) {
    return;
  }

  if (!message) {
    feedbackEl.textContent = "";
    feedbackEl.classList.add("hidden");
    feedbackEl.classList.remove("error");
    delete feedbackEl.dataset.variant;
    return;
  }

  feedbackEl.textContent = message;
  feedbackEl.classList.toggle("error", variant === "error");
  feedbackEl.classList.remove("hidden");
  feedbackEl.dataset.variant = variant;
}

function showPostsLoadingState() {
  const list = document.getElementById("user-posts-list");
  if (!list) {
    return;
  }

  list.innerHTML = '<div class="posts-loading">Loading posts…</div>';
}

function toggleLoadMoreButton() {
  const loadMoreBtn = document.getElementById("load-more-posts-btn");
  if (!loadMoreBtn) {
    return;
  }

  const shouldShow = userPostsState.hasMore && userPostsState.items.length > 0;
  loadMoreBtn.classList.toggle("hidden", !shouldShow);
  loadMoreBtn.disabled = userPostsState.loading;
  loadMoreBtn.textContent = userPostsState.loading ? "Loading..." : "Load More";
}

function renderUserPosts() {
  const list = document.getElementById("user-posts-list");
  if (!list) {
    return;
  }

  if (userPostsState.loading && userPostsState.items.length === 0) {
    showPostsLoadingState();
    return;
  }

  list.innerHTML = "";

  if (userPostsState.error) {
    setPostsFeedback(userPostsState.error, "error");
  } else {
    setPostsFeedback();
  }

  if (userPostsState.items.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "posts-empty";
    emptyState.textContent =
      "You haven't shared any posts yet. Tap the button below to create your first one.";
    list.appendChild(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();
  userPostsState.items.forEach((post) => {
    const card = createPostCard(post);
    fragment.appendChild(card);
  });
  list.appendChild(fragment);
}

function createPostCard(post) {
  const card = document.createElement("article");
  card.className = "post-card";

  const header = document.createElement("div");
  header.className = "post-card__header";

  const avatar = document.createElement("div");
  avatar.className = "post-card__avatar";
  avatar.textContent = (post.username || "user").charAt(0).toUpperCase();

  const meta = document.createElement("div");
  meta.className = "post-card__meta";

  const usernameEl = document.createElement("span");
  usernameEl.className = "post-card__username";
  usernameEl.textContent = `@${post.username || "anonymous"}`;

  const timestampEl = document.createElement("span");
  timestampEl.className = "post-card__timestamp";
  timestampEl.textContent = post.createdAt
    ? formatRelativeTime(post.createdAt, formatDate(post.createdAt) || "Just now")
    : "Just now";

  meta.append(usernameEl, timestampEl);
  header.append(avatar, meta);
  card.appendChild(header);

  if (post.content?.text) {
    const textEl = document.createElement("p");
    textEl.className = "post-card__text";
    textEl.textContent = post.content.text;
    card.appendChild(textEl);
  }

  if (Array.isArray(post.content?.media) && post.content.media.length > 0) {
    const mediaContainer = document.createElement("div");
    mediaContainer.className = "post-card__media";
    post.content.media.forEach((media) => {
      const element = createMediaElement(media);
      if (element) {
        mediaContainer.appendChild(element);
      }
    });
    card.appendChild(mediaContainer);
  }

  const footer = document.createElement("div");
  footer.className = "post-card__footer";
  const engagement = post.engagement || {};
  const stats = [
    { label: "Likes", value: engagement.likes },
    { label: "Comments", value: engagement.comments },
    { label: "Shares", value: engagement.shares },
    { label: "Views", value: engagement.views },
  ];

  stats.forEach(({ label, value }) => {
    const statEl = document.createElement("span");
    statEl.textContent = `${formatCount(value)} ${label}`;
    footer.appendChild(statEl);
  });
  card.appendChild(footer);

  return card;
}

function createMediaElement(media) {
  if (!media || !media.url) {
    return null;
  }

  if (media.type === "video") {
    const video = document.createElement("video");
    video.src = media.url;
    video.controls = true;
    video.playsInline = true;
    video.muted = true;
    return video;
  }

  const image = document.createElement("img");
  image.src = media.url;
  image.alt = media.fileName || "Post media";
  return image;
}

function normalizeApiPost(post) {
  if (!post) {
    return null;
  }

  const content = post.content || {};
  const engagement = post.engagement || {};
  return {
    ...post,
    createdAt: parseTimestamp(post.createdAt),
    updatedAt: parseTimestamp(post.updatedAt),
    content: {
      text: content.text || "",
      media: Array.isArray(content.media)
        ? content.media.map((item) => ({
            type: item?.type || (item?.mimeType && item.mimeType.startsWith('video/') ? 'video' : 'image'),
            url: item?.url,
            thumbnailUrl: item?.thumbnailUrl || null,
            fileName: item?.fileName || null,
            mimeType: item?.mimeType || null,
            size: item?.size || null,
          }))
        : [],
    },
    engagement: {
      likes: engagement.likes || 0,
      comments: engagement.comments || 0,
      shares: engagement.shares || 0,
      views: engagement.views || 0,
    },
  };
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatCount(value) {
  const count = Number(value) || 0;
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

async function loadUserPosts({ refresh = false } = {}) {
  if (!userData || userPostsState.loading) {
    return;
  }

  if (refresh) {
    userPostsState = createDefaultPostsState();
  }

  userPostsState.loading = true;
  toggleLoadMoreButton();

  if (userPostsState.items.length === 0) {
    showPostsLoadingState();
  }

  setPostsFeedback();

  try {
    const params = new URLSearchParams({
      limit: POST_PAGE_SIZE,
      userId: (userData && userData.userId) || userId,
    });

    if (!refresh && userPostsState.lastPostId) {
      params.append("lastPostId", userPostsState.lastPostId);
    }

    const response = await apiRequest(`${API_BASE}/posts/feed?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to load posts (${response.status})`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to load posts");
    }

    const posts = Array.isArray(data.posts)
      ? data.posts.map(normalizeApiPost).filter(Boolean)
      : [];

    if (refresh) {
      userPostsState.items = [];
    }

    if (posts.length > 0) {
      userPostsState.items = refresh ? posts : [...userPostsState.items, ...posts];
      userPostsState.lastPostId = posts[posts.length - 1].postId;

      const deduped = new Map();
      userPostsState.items.forEach((item) => {
        if (item && item.postId) {
          deduped.set(item.postId, item);
        }
      });
      userPostsState.items = Array.from(deduped.values());
    } else if (refresh) {
      userPostsState.lastPostId = null;
    }

    userPostsState.hasMore = Boolean(data.hasMore);
    userPostsState.error = null;
  } catch (error) {
    console.error('Failed to load posts:', error);
    userPostsState.error = error.message;
    setPostsFeedback(error.message, 'error');
  } finally {
    userPostsState.loading = false;
    renderUserPosts();
    toggleLoadMoreButton();
  }
}

function prependUserPost(post) {
  if (!post) {
    return;
  }

  userPostsState.items = [post, ...userPostsState.items.filter((item) => item.postId !== post.postId)];
  userPostsState.error = null;
  setPostsFeedback();
  renderUserPosts();
  toggleLoadMoreButton();
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
    default:
      break;
  }

  if (pageName === "profile" && userData) {
    if (!userPostsState.loading && userPostsState.items.length === 0 && !userPostsState.error) {
      loadUserPosts({ refresh: true });
    }
  }

  updateFabVisibility();
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

  const refreshPostsBtn = document.getElementById('refresh-posts-btn');
  if (refreshPostsBtn) {
    refreshPostsBtn.addEventListener('click', () => {
      if (!userPostsState.loading) {
        loadUserPosts({ refresh: true });
      }
    });
  }

  const loadMorePostsBtn = document.getElementById('load-more-posts-btn');
  if (loadMorePostsBtn) {
    loadMorePostsBtn.addEventListener('click', () => {
      if (!userPostsState.loading) {
        loadUserPosts();
      }
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

    const response = await apiRequest(`${API_BASE}/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ bio }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to update bio");
    }

    userData.bio = bio;
    updateProfileUI();
    hideBioModal();
    showAlert("Bio updated successfully!");

  } catch (error) {
    console.error("Error saving bio:", error);
    showAlert(`Failed to save bio: ${error.message}`);
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
    showAlert("Location sharing is not supported on this device. Please share your location through the bot using /map.");
    return;
  }

  const button = document.getElementById("share-location-btn");
  setButtonLoading(button, true, "Requesting location...");
  isUpdatingLocation = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await updateLocationOnServer(position.coords.latitude, position.coords.longitude);
        showAlert("Location updated!");
        await loadMapData();
      } catch (error) {
        console.error("Error updating location:", error);
        showAlert("Could not update location. Please try again later.");
      } finally {
        setButtonLoading(button, false);
        isUpdatingLocation = false;
      }
    },
    (error) => {
      console.error("Geolocation error:", error);
      const message = geolocationErrorMessage(error);
      showAlert(message);
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
 * Load map data (OPTIMIZED with caching and pagination)
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
    const response = await apiRequest(`${API_BASE}/map/nearby`, {
      method: "POST",
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
      allNearbyUsers = data.users;
      currentUserPage = 0;
      displayNearbyUsers();
    } else {
      allNearbyUsers = [];
      usersList.innerHTML = `<p class="empty-state">No users found within ${currentRadius} km</p>`;
    }
  } catch (error) {
    console.error("Error loading map data:", error);
    allNearbyUsers = [];
    usersList.innerHTML = '<p class="empty-state">Failed to load nearby users</p>';
  }
}


/**
 * Display nearby users (OPTIMIZED with pagination and DOM fragment)
 */
function displayNearbyUsers() {
  const usersList = document.getElementById("users-list");
  usersList.innerHTML = "";

  if (!Array.isArray(allNearbyUsers) || allNearbyUsers.length === 0) {
    usersList.innerHTML = `<p class="empty-state">No users found within ${currentRadius} km</p>`;
    return;
  }

  // Calculate pagination
  const startIndex = currentUserPage * MAX_USERS_PER_PAGE;
  const endIndex = startIndex + MAX_USERS_PER_PAGE;
  const usersToDisplay = allNearbyUsers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(allNearbyUsers.length / MAX_USERS_PER_PAGE);
  const hasMore = endIndex < allNearbyUsers.length;

  // Group users by distance category
  const groups = usersToDisplay.reduce((acc, user) => {
    const category = user.distanceCategory || "Nearby";
    if (!acc[category]) acc[category] = [];
    acc[category].push(user);
    return acc;
  }, {});

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  // Show summary
  const summary = document.createElement("div");
  summary.className = "user-list-summary";
  summary.innerHTML = `
    <p>Showing ${startIndex + 1}-${Math.min(endIndex, allNearbyUsers.length)} of ${allNearbyUsers.length} nearby ${allNearbyUsers.length === 1 ? 'user' : 'users'}</p>
  `;
  fragment.appendChild(summary);

  // Render groups
  Object.entries(groups).forEach(([category, list]) => {
    const groupEl = document.createElement("div");
    groupEl.className = "user-group";

    const header = document.createElement("div");
    header.className = "user-group-header";
    header.innerHTML = `<h3>${category}</h3><span>${list.length} ${list.length === 1 ? "person" : "people"}</span>`;
    groupEl.appendChild(header);

    list.forEach((user) => {
      const userCard = createUserCard(user);
      groupEl.appendChild(userCard);
    });

    fragment.appendChild(groupEl);
  });

  // Add pagination controls
  if (totalPages > 1) {
    const pagination = createPaginationControls(currentUserPage, totalPages);
    fragment.appendChild(pagination);
  }

  usersList.appendChild(fragment);
}

/**
 * Create user card element (optimized)
 */
function createUserCard(user) {
  const initial = (user.username || "U").charAt(0).toUpperCase();
  const gradient = generateGradientFromString(user.username || user.userId);
  const tierBadge = user.tier === "Golden" ? "??" : user.tier === "Silver" ? "??" : "??";
  const locationName = user.locationName || (user.location ? formatCoordinates(user.location) : "Unknown");
  const lastActiveLabel = formatRelativeTime(user.lastActive, "Recently active");
  const xpChip = typeof user.xp === "number" ? `<span>? ${user.xp} XP</span>` : "";

  const userCard = document.createElement("div");
  userCard.className = "user-card";
  userCard.innerHTML = `
    <div class="user-photo" style="background:${gradient};">
      <span class="photo-placeholder">${initial}</span>
    </div>
    <div class="user-info">
      <h3>
        @${sanitizeText(user.username)}
        <span class="tier-badge">${tierBadge}</span>
      </h3>
      <div class="distance">?? ${user.distanceFormatted}</div>
      <div class="user-meta">
        <span class="location-chip">?? ${sanitizeText(locationName)}</span>
        <span>?? ${lastActiveLabel}</span>
        ${xpChip}
      </div>
      ${user.bio ? `<div class="bio">${sanitizeText(user.bio)}</div>` : ""}
    </div>
  `;

  return userCard;
}

/**
 * Create pagination controls
 */
function createPaginationControls(currentPage, totalPages) {
  const paginationEl = document.createElement("div");
  paginationEl.className = "pagination-controls";

  const prevDisabled = currentPage === 0 ? 'disabled' : '';
  const nextDisabled = currentPage >= totalPages - 1 ? 'disabled' : '';

  paginationEl.innerHTML = `
    <button class="btn btn-secondary" id="prev-page-btn" ${prevDisabled}>? Previous</button>
    <span class="page-info">Page ${currentPage + 1} of ${totalPages}</span>
    <button class="btn btn-secondary" id="next-page-btn" ${nextDisabled}>Next ?</button>
  `;

  // Add event listeners
  const prevBtn = paginationEl.querySelector('#prev-page-btn');
  const nextBtn = paginationEl.querySelector('#next-page-btn');

  if (prevBtn && !prevDisabled) {
    prevBtn.addEventListener('click', () => {
      currentUserPage--;
      displayNearbyUsers();
      document.getElementById('users-list').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (nextBtn && !nextDisabled) {
    nextBtn.addEventListener('click', () => {
      currentUserPage++;
      displayNearbyUsers();
      document.getElementById('users-list').scrollIntoView({ behavior: 'smooth' });
    });
  }

  return paginationEl;
}

/**
 * Load premium plans
 */
async function loadPremiumPlans(force = false) {
  try {
    if (!force && premiumPlansCache.length > 0) {
      displayPremiumPlans(premiumPlansCache);
      return;
    }

    console.log("Loading premium plans...");

    const response = await fetch(`${API_BASE}/plans`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.plans)) {
      premiumPlansCache = data.plans;
      console.log("Premium plans loaded:", premiumPlansCache.map((plan) => plan.name));
      displayPremiumPlans(premiumPlansCache);
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
function displayPremiumPlans(plans = []) {
  const container = document.getElementById("plans-container");
  container.innerHTML = "";

  if (!plans || plans.length === 0) {
    container.innerHTML = `<p class="empty-state">No plans available right now.</p>`;
    return;
  }

  plans.forEach((plan) => {
    const planTier = (plan.tier || plan.name || "").toLowerCase();
    const userTier = (userData?.tier || "Free").toLowerCase();
    const isCurrentTier = planTier && planTier === userTier;

    const planCard = document.createElement("div");
    planCard.className = `plan-card ${plan.recommended ? "recommended" : ""}`;

    const featuresList = Array.isArray(plan.features) && plan.features.length > 0
      ? plan.features.map((feature) => `<li>${sanitizeText(feature)}</li>`).join("")
      : `<li>Premium access</li><li>Exclusive benefits</li>`;

    const priceDisplay = formatCurrency(plan.priceInCOP, plan.currency || "COP");
    const buttonLabel = isCurrentTier ? "Current Plan" : `Subscribe - ${priceDisplay}`;
    const buttonClass = isCurrentTier ? "btn-secondary" : "btn-premium";
    const disabledAttr = isCurrentTier ? "disabled" : "";

    planCard.innerHTML = `
      <div class="plan-header">
        <div class="plan-name">${sanitizeText(plan.displayName || plan.name)}</div>
        <div class="plan-icon">${sanitizeText(plan.icon || "?")}</div>
      </div>
      <div class="plan-price">${priceDisplay}/month</div>
      <div class="plan-description">${sanitizeText(plan.description || "")}</div>
      <ul class="plan-features">
        ${featuresList}
      </ul>
      <button class="btn ${buttonClass}" ${disabledAttr} data-plan-id="${plan.id}"
              onclick="subscribeToPlan(&#39;${plan.id}&#39;)">
        ${buttonLabel}
      </button>
    `;

    container.appendChild(planCard);
  });
}


/**
 * Subscribe to plan
 */
async function subscribeToPlan(planId) {
  const currentTierName = (userData?.tier || "Free").toLowerCase();

  const plan = (premiumPlansCache || []).find((item) => {
    const tierMatch = (item.tier || item.name || "").toLowerCase();
    return (
      item.id === planId ||
      item.slug === planId ||
      tierMatch === planId.toLowerCase()
    );
  });

  if (!plan) {
    showAlert("Plan not found. Please try again.");
    return;
  }

  const planTierName = (plan.tier || plan.name || "").toLowerCase();
  if (planTierName && planTierName === currentTierName) {
    showAlert(`You are already on the ${userData?.tier || "Free"} plan!`);
    return;
  }

  const button = event?.target;
  if (button) {
    setButtonLoading(button, true, "Creating payment...");
  }

  try {
    const response = await apiRequest(`${API_BASE}/payment/create`, {
      method: "POST",
      body: JSON.stringify({
        userId,
        planId: plan.id,
      }),
    });

    const data = await response.json();

    if (button) {
      setButtonLoading(button, false);
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || "Failed to create payment link");
    }

    openLink(data.paymentUrl);

    const priceDisplay = formatCurrency(plan.priceInCOP, plan.currency || "COP");
    showPopup({
      title: "Payment Link Created",
      message: `Your payment link for ${plan.name} (${priceDisplay}) has been created. Complete the payment in the opened browser window.`,
      buttons: [
        { id: "close", type: "close", text: "OK" }
      ]
    });
  } catch (error) {
    console.error("Error creating payment:", error);

    if (button) {
      setButtonLoading(button, false);
    }

    showAlert(`Failed to create payment link: ${error.message}`);
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

/**
 * Generate gradient from string (OPTIMIZED with caching)
 */
function generateGradientFromString(value) {
  const str = value || "user";

  // Check cache first
  if (gradientCache.has(str)) {
    return gradientCache.get(str);
  }

  // Generate gradient
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const secondaryHue = (hue + 40) % 360;
  const gradient = `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${secondaryHue}, 65%, 45%))`;

  // Cache the gradient (limit cache size)
  if (gradientCache.size < 100) {
    gradientCache.set(str, gradient);
  }

  return gradient;
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
    const original = button.dataset.originalText || "?? Share My Location";
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
  const response = await apiRequest(`${API_BASE}/profile/${userId}`, {
    method: "PUT",
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
  showAlert(message);
}

async function registerTelegramLogin(authData) {
  try {
    setLoginFeedback("Connecting with PNPtv...", "info");

    const response = await fetch(`${API_BASE}/auth/telegram-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Login failed");
    }

    setLoginFeedback(
      "Login successful! Open PNPtv in Telegram to finish onboarding.",
      "success"
    );
    ensureOpenInTelegramButton();
  } catch (error) {
    console.error("Telegram login failed:", error);
    setLoginFeedback(`Login failed: ${error.message}`, "error");
  }
}

function initTelegramLoginWidget() {
  const placeholder = document.getElementById("telegram-login-placeholder");
  if (!placeholder || placeholder.dataset.loaded === "true") {
    return;
  }

  const botUsername = publicConfig.telegramLoginBot;

  if (!botUsername) {
    placeholder.textContent =
      "Telegram login is not configured. Ask the administrator to set TELEGRAM_LOGIN_BOT.";
    return;
  }

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.async = true;
  script.setAttribute("data-telegram-login", botUsername);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-onauth", "onTelegramAuth");
  script.setAttribute("data-request-access", "write");
  script.id = "telegram-login-widget";
  placeholder.appendChild(script);
  placeholder.dataset.loaded = "true";
}

function setLoginFeedback(message, variant = "info") {
  const feedback = document.getElementById("login-feedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.dataset.variant = variant;
  feedback.classList.remove("hidden");
}

function ensureOpenInTelegramButton() {
  const button = document.getElementById("open-in-telegram-btn");
  if (!button) {
    return;
  }

  const botUsername = publicConfig.telegramLoginBot;
  const deepLink =
    publicConfig.miniAppUrl ||
    (botUsername ? `https://t.me/${botUsername}` : null);

  if (!deepLink) {
    button.classList.add("hidden");
    return;
  }

  button.classList.remove("hidden");

  if (button.dataset.bound === "true") {
    return;
  }

  button.addEventListener("click", () => {
    openLink(deepLink);
  });

  button.dataset.bound = "true";
}

function hideLoginOverlay() {
  const overlay = document.getElementById("login-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.classList.remove("active");
  }

  updateFabVisibility();
}

function showLoginOverlay() {
  const overlay = document.getElementById("login-overlay");
  if (!overlay) {
    return;
  }

  const loadingScreen = document.getElementById("loading");
  if (loadingScreen) {
    loadingScreen.classList.remove("active");
    loadingScreen.classList.add("hidden");
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("active");

  const feedback = document.getElementById("login-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.classList.add("hidden");
    delete feedback.dataset.variant;
  }

  const button = document.getElementById("open-in-telegram-btn");
  if (button) {
    button.classList.add("hidden");
  }

  initTelegramLoginWidget();
  ensureOpenInTelegramButton();
  updateFabVisibility();
}

function showWelcomeOverlay() {
  console.log('Showing welcome overlay'); // Debug log
  const overlay = document.getElementById('welcome-overlay');
  if (!overlay) {
    console.error('Welcome overlay element not found');
    return;
  }
  overlay.classList.remove('hidden');
  initTelegramLoginWidget('welcome-telegram-login');
}

/**
 * Load public configuration from server
 */
async function loadPublicConfig() {
  try {
    const response = await fetch(`${API_BASE}/config/public`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        publicConfig = data;
      }
    }
  } catch (error) {
    console.warn('Failed to load public config:', error);
  }
}

// Modify bootstrap function to always check if we're in Telegram
async function bootstrap() {
  console.log('Starting bootstrap process...');
  console.log('Telegram WebApp available:', !!tg);
  console.log('Has Telegram user:', hasTelegramUser);
  console.log('Is Demo Mode:', isDemoMode);

  const loadingScreen = document.getElementById('loading');

  try {
    await loadPublicConfig();
    console.log('Public config loaded:', publicConfig);

    if (isDemoMode) {
      console.log('Running in demo mode');
      await initApp();
      registerTelegramBackButtonHandlers();
      return;
    }

    if (tg && hasTelegramUser) {
      console.log('Running in Telegram with user');
      await initApp();
      registerTelegramBackButtonHandlers();
    } else {
      console.log('Running outside Telegram, showing welcome');
      hideLoadingScreen();
      showWelcomeOverlay();
    }
  } catch (error) {
    console.error('Bootstrap error:', error);
    showError('Failed to initialize app. Please refresh the page.');
    hideLoadingScreen();
  } finally {
    if (loadingScreen) {
      loadingScreen.classList.remove('active');
      loadingScreen.classList.add('hidden');
    }
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading');
  if (loadingScreen) {
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('hidden');
  }
}

// Ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting app...');
  bootstrap().catch(error => {
    console.error('Critical error:', error);
    showError('Failed to start app. Please refresh the page.');
  });
});

function initPostComposer() {
  if (postComposerInitialized) {
    return;
  }

  const openBtn = document.getElementById('new-post-btn');
  const modal = document.getElementById('new-post-modal');
  const cancelBtn = document.getElementById('cancel-post-btn');
  const form = document.getElementById('new-post-form');
  const mediaInput = document.getElementById('post-media-input');
  const textInput = document.getElementById('post-text-input');

  if (!openBtn || !modal || !cancelBtn || !form || !mediaInput || !textInput) {
    return;
  }

  openBtn.addEventListener('click', showPostModal);
  cancelBtn.addEventListener('click', hidePostModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      hidePostModal();
    }
  });
  form.addEventListener('submit', handlePostSubmit);
  mediaInput.addEventListener('change', handleMediaChange);
  textInput.addEventListener('input', updatePostTextCounter);

  updatePostTextCounter();
  renderMediaPreview();

  postComposerInitialized = true;
  updateFabVisibility();
}

function showPostModal() {
  const modal = document.getElementById('new-post-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  updatePostTextCounter();

  const textarea = document.getElementById('post-text-input');
  if (textarea) {
    textarea.focus();
  }
}

function hidePostModal() {
  const modal = document.getElementById('new-post-modal');
  if (!modal) return;

  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  clearPostComposer();
}

async function handlePostSubmit(event) {
  event.preventDefault();

  if (!userData) {
    showAlert('Profile not loaded yet. Please try again in a moment.');
    return;
  }

  const submitBtn = document.getElementById('submit-post-btn');
  const textInput = document.getElementById('post-text-input');

  setPostsFeedback();
  const postTextRaw = textInput ? textInput.value : '';
  const postText = postTextRaw.trim();

  if (!postText && selectedPostFiles.length === 0) {
    showAlert('Add text or media before publishing.');
    return;
  }

  if (postText.length > POST_TEXT_LIMIT) {
    showAlert(`Post text cannot exceed ${POST_TEXT_LIMIT} characters.`);
    return;
  }

  if (selectedPostFiles.length > MAX_POST_MEDIA_FILES) {
    showAlert(`You can attach up to ${MAX_POST_MEDIA_FILES} files.`);
    return;
  }

  if (submitBtn && !submitBtn.dataset.originalText) {
    submitBtn.dataset.originalText = submitBtn.textContent;
  }

  if (submitBtn) {
    setButtonLoading(submitBtn, true, 'Publishing...');
    submitBtn.disabled = true;
  }

  const formData = new FormData();
  formData.append('userId', userData.userId || userId);
  formData.append('username', userData.username || 'anonymous');
  if (userData.photoFileId) {
    formData.append('userPhotoFileId', userData.photoFileId);
  }
  if (postText) {
    formData.append('text', postText);
  }
  formData.append('visibility', 'public');
  formData.append('tags', JSON.stringify([]));
  if (userLocation) {
    formData.append('location', JSON.stringify(userLocation));
  }

  selectedPostFiles.forEach((file) => {
    formData.append('media', file);
  });

  try {
    const response = await apiRequest(`${API_BASE}/posts`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to publish post');
    }

    const normalizedPost = normalizeApiPost(data.post);
    if (normalizedPost) {
      prependUserPost(normalizedPost);
    }

    showAlert('Post published!');
    hidePostModal();
  } catch (error) {
    console.error('Error creating post:', error);
    showAlert(`Failed to publish post: ${error.message}`);
  } finally {
    if (submitBtn) {
      setButtonLoading(submitBtn, false);
      submitBtn.disabled = false;
    }
  }
}

function handleMediaChange(event) {
  const input = event.target;
  if (!input || !input.files) {
    return;
  }

  const warnings = [];
  const acceptedFiles = [];
  const incomingFiles = Array.from(input.files);

  incomingFiles.forEach((file) => {
    if (acceptedFiles.length >= MAX_POST_MEDIA_FILES) {
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      warnings.push(`File "${file.name}" is not a supported image or video.`);
      return;
    }

    if (file.size > POST_MEDIA_SIZE_LIMIT) {
      warnings.push(`File "${file.name}" is larger than 25MB and was skipped.`);
      return;
    }

    acceptedFiles.push(file);
  });

  if (incomingFiles.length > MAX_POST_MEDIA_FILES) {
    warnings.push(`Only the first ${MAX_POST_MEDIA_FILES} files were added.`);
  }

  if (typeof DataTransfer !== 'undefined') {
    const dataTransfer = new DataTransfer();
    acceptedFiles.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  } else if (acceptedFiles.length !== incomingFiles.length) {
    input.value = "";
  }

  selectedPostFiles = acceptedFiles;
  renderMediaPreview();

  if (warnings.length > 0) {
    showAlert(warnings.join('\n'));
  }
}

function renderMediaPreview() {
  const list = document.getElementById('media-preview-list');
  if (!list) return;

  list.innerHTML = '';

  if (selectedPostFiles.length === 0) {
    list.classList.add('hidden');
    return;
  }

  list.classList.remove('hidden');
  const fragment = document.createDocumentFragment();

  selectedPostFiles.forEach((file) => {
    const item = document.createElement('li');
    item.className = 'media-preview-item';
    const typeIcon = file.type.startsWith('video/') ? '🎬' : '🖼️';
    item.textContent = `${typeIcon} ${file.name} • ${formatFileSize(file.size)}`;
    fragment.appendChild(item);
  });

  list.appendChild(fragment);
}

function clearPostComposer() {
  const textInput = document.getElementById('post-text-input');
  const mediaInput = document.getElementById('post-media-input');

  selectedPostFiles = [];
  if (textInput) {
    textInput.value = '';
  }
  if (mediaInput) {
    mediaInput.value = '';
  }

  updatePostTextCounter();
  renderMediaPreview();
}

function updateFabVisibility() {
  const fab = document.getElementById('new-post-btn');
  if (!fab) return;

  const shouldShow =
    currentPage === 'profile' &&
    !!userData &&
    postComposerInitialized &&
    !userPostsState.loading &&
    !isLoginOverlayActive();

  fab.classList.toggle('hidden', !shouldShow);
}

function isLoginOverlayActive() {
  const overlay = document.getElementById('login-overlay');
  return overlay ? !overlay.classList.contains('hidden') : false;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return '';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}


