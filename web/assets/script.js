// Global variables
let fighters = [];
let allFighters = [];
const API_BASE_URL = "http://localhost:3000/api";
let searchTimeout = null;

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");

  if (theme === "dark") {
    icon.innerHTML =
      '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
    text.textContent = "Light";
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    text.textContent = "Dark";
  }
}

// Utility functions
function cmToFeetInches(cm) {
  if (!cm) return "N/A";
  const totalInches = cm * 0.393701;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

function kgToLbs(kg) {
  if (!kg) return "N/A";
  return `${Math.round(kg * 2.20462)} lbs`;
}

// Animated counter
function animateCounter(element, target, duration = 1000) {
  const start = parseInt(element.textContent) || 0;
  const increment = (target - start) / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (
      (increment > 0 && current >= target) ||
      (increment < 0 && current <= target)
    ) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.round(current);
    }
  }, 16);
}

// API functions
async function fetchFighters() {
  try {
    showLoading(true);
    hideError();

    const response = await fetch(`${API_BASE_URL}/fighters`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data) {
      fighters = data.data.map((fighter) => ({
        ...fighter,
        name:
          fighter.name ||
          `${fighter.first_name || ""} ${fighter.last_name || ""}`.trim(),
        image: fighter.image_url || fighter.image,
        height: fighter.height || cmToFeetInches(fighter.height_cm),
        weight: fighter.weight || kgToLbs(fighter.weight_kg),
        wins: fighter.wins || 0,
        losses: fighter.losses || 0,
        draws: fighter.draws || 0,
      }));

      allFighters = [...fighters];
      updateStats();
      return fighters;
    } else {
      throw new Error(data.message || "Failed to fetch fighters");
    }
  } catch (error) {
    console.error("Error fetching fighters:", error);

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      showError(
        "Unable to connect to the server. Please ensure your API server is running on http://localhost:3000"
      );
    } else {
      showError(`Failed to load fighters: ${error.message}`);
    }

    loadDemoData();
    return [];
  } finally {
    showLoading(false);
  }
}

function loadDemoData() {
  fighters = [
    {
      name: "Jon Jones",
      height: "6'4\"",
      weight: "205 lbs",
      wins: 26,
      losses: 1,
      draws: 0,
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Jon_Jones_-_Supporting_Brain_Health_Study.jpg/250px-Jon_Jones_-_Supporting_Brain_Health_Study.jpg",
    },
    {
      name: "Daniel Cormier",
      height: "5'11\"",
      weight: "205 lbs",
      wins: 22,
      losses: 3,
      draws: 0,
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Daniel_Cormier_taking_a_picture_with_a_fan..jpg/250px-Daniel_Cormier_taking_a_picture_with_a_fan..jpg",
    },
    {
      name: "Khamzat Chimaev",
      height: "6'2\"",
      weight: "186 lbs",
      wins: 15,
      losses: 0,
      draws: 0,
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Khamzat_Chimaev_2022_%28cropped%29.png/250px-Khamzat_Chimaev_2022_%28cropped%29.png",
    },
    {
      name: "Khabib Nurmagomedov",
      height: "5'10\"",
      weight: "155 lbs",
      wins: 29,
      losses: 0,
      draws: 0,
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Khabib_nurmagomedov.jpg/250px-Khabib_nurmagomedov.jpg",
    },
  ];
  allFighters = [...fighters];
  updateStats();
  console.log("Loaded demo data as fallback");
}

async function searchFighters(query) {
  if (!query.trim()) {
    fighters = [...allFighters];
    renderFighters();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/fighters/search/${encodeURIComponent(query)}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        fighters = data.data.map((fighter) => ({
          ...fighter,
          name:
            fighter.name ||
            `${fighter.first_name || ""} ${fighter.last_name || ""}`.trim(),
          image: fighter.image_url || fighter.image,
          height: fighter.height || cmToFeetInches(fighter.height_cm),
          weight: fighter.weight || kgToLbs(fighter.weight_kg),
        }));
        renderFighters();
        return;
      }
    }
  } catch (error) {
    console.log("API search failed, using local search:", error.message);
  }

  const searchTerm = query.toLowerCase();
  fighters = allFighters.filter((fighter) => {
    const name = fighter.name?.toLowerCase() || "";
    const firstName = fighter.first_name?.toLowerCase() || "";
    const lastName = fighter.last_name?.toLowerCase() || "";

    return (
      name.includes(searchTerm) ||
      firstName.includes(searchTerm) ||
      lastName.includes(searchTerm)
    );
  });

  renderFighters();
}

function createFighterCard(fighter) {
  const imageContent = fighter.image
    ? `<img src="${fighter.image}" alt="${fighter.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                 <div class="fighter-placeholder" style="display: none;">👤</div>`
    : `<div class="fighter-placeholder">👤</div>`;

  return `
                <div class="fighter-card">
                    <div class="fighter-image">
                        ${imageContent}
                        <div class="ufc-logo">UFC</div>
                    </div>
                    <div class="fighter-info">
                        <div class="fighter-name">${fighter.name}</div>
                        <div class="fighter-stats">${fighter.height} • ${fighter.weight}</div>
                        <div class="fighter-record">
                            <div class="record-item wins">
                                <div class="record-value">${fighter.wins}</div>
                                <div class="record-label">WINS</div>
                            </div>
                            <div class="record-item losses">
                                <div class="record-value">${fighter.losses}</div>
                                <div class="record-label">LOSSES</div>
                            </div>
                            <div class="record-item draws">
                                <div class="record-value">${fighter.draws}</div>
                                <div class="record-label">DRAWS</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
}

function renderFighters() {
  const grid = document.getElementById("fightersGrid");
  const noResults = document.getElementById("noResults");

  if (fighters.length === 0) {
    grid.innerHTML = "";
    noResults.style.display = "block";
  } else {
    grid.innerHTML = fighters
      .map((fighter, index) => {
        const card = createFighterCard(fighter);
        return card.replace(
          '<div class="fighter-card">',
          `<div class="fighter-card" style="animation-delay: ${index * 0.1}s">`
        );
      })
      .join("");
    noResults.style.display = "none";
  }
}

function updateStats() {
  const totalFighters = allFighters.length;
  const totalWins = allFighters.reduce(
    (sum, fighter) => sum + (fighter.wins || 0),
    0
  );
  const avgAge =
    allFighters.length > 0
      ? Math.round(
          allFighters.reduce((sum, fighter) => sum + (fighter.age || 30), 0) /
            allFighters.length
        )
      : 30;

  // Animate counters
  setTimeout(() => {
    animateCounter(document.getElementById("totalFighters"), totalFighters);
    animateCounter(document.getElementById("totalWins"), totalWins);
    animateCounter(document.getElementById("avgAge"), avgAge);
  }, 500);
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearButton = document.getElementById("clearSearch");

  searchInput.addEventListener("input", function (e) {
    const query = e.target.value;

    // Show/hide clear button
    if (query.length > 0) {
      clearButton.classList.add("visible");
    } else {
      clearButton.classList.remove("visible");
    }

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search
    searchTimeout = setTimeout(() => {
      searchFighters(query);
    }, 300);
  });

  // Clear search functionality
  clearButton.addEventListener("click", function () {
    searchInput.value = "";
    clearButton.classList.remove("visible");
    fighters = [...allFighters];
    renderFighters();
    searchInput.focus();
  });

  // Enter key handling
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      searchInput.value = "";
      clearButton.classList.remove("visible");
      fighters = [...allFighters];
      renderFighters();
      searchInput.blur();
    }
  });
}

function showLoading(show = true) {
  const loading = document.getElementById("loading");
  loading.style.display = show ? "block" : "none";

  if (show) {
    loading.style.animation = "fadeInUp 0.5s ease-out";
  }
}

function showError(message) {
  const errorDiv = document.getElementById("error");
  errorDiv.innerHTML = `
                <h3>⚠️ Connection Error</h3>
                <p>${message}</p>
                <small>Displaying demo data instead</small>
            `;
  errorDiv.style.display = "block";
  errorDiv.style.animation = "shake 0.5s ease-in-out";
}

function hideError() {
  document.getElementById("error").style.display = "none";
}

// Add intersection observer for animations
function observeElements() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = "running";
      }
    });
  });

  document.querySelectorAll(".fighter-card").forEach((card) => {
    observer.observe(card);
  });
}

// Initialize the application
async function init() {
  console.log("Initializing Enhanced UFC Stats App...");

  // Initialize theme
  initTheme();

  // Setup theme toggle
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  try {
    await fetchFighters();
    renderFighters();
    setupSearch();
    observeElements();

    console.log(`Loaded ${fighters.length} fighters`);
  } catch (error) {
    console.error("Initialization failed:", error);
    showError("Failed to initialize application");
  }
}

// Start the application
document.addEventListener("DOMContentLoaded", init);

// Handle window focus to refresh data
window.addEventListener("focus", () => {
  if (allFighters.length === 0) {
    init();
  }
});

// Add smooth scrolling
document.documentElement.style.scrollBehavior = "smooth";

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + K for search focus
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    document.getElementById("searchInput").focus();
  }

  // Ctrl/Cmd + Shift + L for theme toggle
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "L") {
    e.preventDefault();
    toggleTheme();
  }
});

// Add loading states for better UX
function addLoadingStates() {
  const cards = document.querySelectorAll(".fighter-card");
  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";

    setTimeout(() => {
      card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 100);
  });
}

// Enhanced error handling with retry functionality
function createRetryButton() {
  const retryBtn = document.createElement("button");
  retryBtn.innerHTML = "🔄 Retry Connection";
  retryBtn.style.cssText = `
                margin-top: 15px;
                padding: 10px 20px;
                background: var(--accent-gradient);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            `;

  retryBtn.addEventListener("click", () => {
    hideError();
    init();
  });

  retryBtn.addEventListener("mouseenter", () => {
    retryBtn.style.transform = "scale(1.05)";
    retryBtn.style.boxShadow = "0 5px 15px var(--glow)";
  });

  retryBtn.addEventListener("mouseleave", () => {
    retryBtn.style.transform = "scale(1)";
    retryBtn.style.boxShadow = "none";
  });

  return retryBtn;
}

// Update error display to include retry button
function enhancedShowError(message) {
  const errorDiv = document.getElementById("error");
  errorDiv.innerHTML = `
                <h3>⚠️ Connection Error</h3>
                <p>${message}</p>
                <small>Displaying demo data instead</small>
            `;

  const retryBtn = createRetryButton();
  errorDiv.appendChild(retryBtn);

  errorDiv.style.display = "block";
  errorDiv.style.animation = "shake 0.5s ease-in-out";
}

// Replace the original showError function
showError = enhancedShowError;
