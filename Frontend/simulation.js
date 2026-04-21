document.addEventListener("DOMContentLoaded", () => {
  const byId = (id) => document.getElementById(id);
  const queryAll = (selector) => document.querySelectorAll(selector);

  const timeButtons = queryAll(".sim-btn:not(.live-btn)");
  const liveButton = byId("liveWeatherBtn");
  const locationStatus = byId("locationStatus");
  const scenarioCards = queryAll(".scenario-card");
  const autoModeBtn = byId("autoModeBtn");
  const manualModeBtn = byId("manualModeBtn");
  const controlModeStatus = byId("controlModeStatus");

  const tempSlider = byId("tempSlider");
  const lightSlider = byId("lightSlider");
  const motionSlider = byId("motionSlider");

  const tempValue = byId("tempValue");
  const lightValue = byId("lightValue");
  const motionValue = byId("motionValue");
  const statusTempValue = byId("statusTempValue");
  const statusLightValue = byId("statusLightValue");
  const statusMotionValue = byId("statusMotionValue");
  const headerTempValue = byId("headerTempValue");
  const headerActiveDevices = byId("headerActiveDevices");
  const energyActiveDevices = byId("energyActiveDevices");
  const simRuntimeValue = byId("simRuntimeValue");
  const kwhSavedValue = byId("kwhSavedValue");
  const liveWeatherTemp = byId("liveWeatherTemp");
  const devicesContainer = byId("devicesContainer");
  const sidebarUserName = byId("sidebarUserName");
  const headerUserName = byId("headerUserName");
  const logoutLink = byId("logoutLink");
  const DEFAULT_WEATHER_COORDS = { lat: 22.5726, lon: 88.3639 };

  let runtimeSeconds = 0;
  let kwhSavedCounter = 0;
  let activeRelaysCount = 0;
  let chartInstance = null;
  let controlMode = "auto";

  const thresholds = {
    light: 500,
    temp: 27
  };

  const devices = [];
  for (let i = 1; i <= 8; i += 1) {
    devices.push({ id: `l${i}`, name: `Light ${i}`, type: "light", state: false, group: i <= 4 ? "front" : "rear" });
  }
  for (let i = 1; i <= 9; i += 1) {
    devices.push({ id: `f${i}`, name: `Fan ${i}`, type: "fan", state: false, group: i % 2 === 0 ? "even" : "odd" });
  }
  devices.push({ id: "tv1", name: "Smart Board", type: "tv", state: false, group: "display" });

  const icons = {
    light: '<svg class="icon-light" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Zm-4 17c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-1H8v1Z"/></svg>',
    fan: '<svg class="icon-fan" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm-.3-9.9c1.95 0 3.53 1.58 3.53 3.53 0 1.1-.5 2.11-1.29 2.77 1.95-.34 4.12.16 5.5 1.54 1.62 1.62 1.92 4.06.91 5.98-1.92-1-4.37-.7-5.99.91-1.38 1.38-1.88 3.55-1.54 5.5-.66-.79-1.67-1.29-2.77-1.29-1.95 0-3.53-1.58-3.53-3.53 0-1.1.5-2.11 1.29-2.77-1.95.34-4.12-.16-5.5-1.54-1.62-1.62-1.92-4.06-.91-5.98 1.92 1 4.37.7 5.99-.91 1.38-1.38 1.88-3.55 1.54-5.5.66.79 1.67 1.29 2.77 1.29Z"/></svg>',
    tv: '<svg class="icon-tv" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l1.5 2h-7L10 18H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v9h16V7H4Z"/></svg>'
  };

  const timePresets = {
    dawn: { light: 200, temp: 25 },
    morning: { light: 600, temp: 29 },
    noon: { light: 900, temp: 31 },
    afternoon: { light: 520, temp: 35 },
    evening: { light: 120, temp: 28 },
    night: { light: 0, temp: 25 },
    live: { light: 600, temp: 25 }
  };

  function getStoredUserName() {
    return localStorage.getItem("smartClassroomUserName") || "Demo User";
  }

  function setUserContext() {
    const userName = getStoredUserName();
    if (sidebarUserName) sidebarUserName.textContent = userName;
    if (headerUserName) headerUserName.textContent = userName;
  }

  function bindLogout() {
    if (!logoutLink) return;
    logoutLink.addEventListener("click", () => {
      localStorage.removeItem("smartClassroomUser");
      localStorage.removeItem("smartClassroomUserName");
    });
  }

  function animateNumber(element, nextValue, decimals = 0, suffix = "") {
    if (!element) return;
    const previousValue = Number(element.dataset.value || 0);
    const targetValue = Number(nextValue);
    const startTime = performance.now();
    const duration = 320;

    function step(currentTime) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = previousValue + (targetValue - previousValue) * eased;
      element.textContent = `${value.toFixed(decimals)}${suffix}`;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.dataset.value = String(targetValue);
        element.textContent = `${targetValue.toFixed(decimals)}${suffix}`;
      }
    }

    window.requestAnimationFrame(step);
  }

  function formatTemp(value) {
    return `${Number(value).toFixed(1)} deg C`;
  }

  function renderDevices() {
    if (!devicesContainer) return;
    devicesContainer.innerHTML = "";

    devices.forEach((device) => {
      const card = document.createElement("div");
      card.className = "device-card";
      card.id = `card-${device.id}`;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.innerHTML = `
        <div class="device-icon">
          ${icons[device.type]}
        </div>
        <div class="device-text">
          <strong>${device.name}</strong>
          <span>${device.type}</span>
        </div>
        <div class="device-state" id="state-${device.id}">OFF</div>
      `;
      card.addEventListener("click", () => {
        handleManualDeviceToggle(device.id);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleManualDeviceToggle(device.id);
        }
      });
      devicesContainer.appendChild(card);
    });

    syncManualInteractivity();
  }

  function updateRelayUI(device) {
    const card = byId(`card-${device.id}`);
    const stateLabel = byId(`state-${device.id}`);
    if (!card || !stateLabel) return;

    card.classList.toggle("on", device.state);
    stateLabel.textContent = device.state ? "ON" : "OFF";
  }

  function refreshActiveDeviceCounters() {
    activeRelaysCount = devices.filter((device) => device.state).length;
    if (headerActiveDevices) headerActiveDevices.textContent = `${activeRelaysCount}/${devices.length}`;
    animateNumber(energyActiveDevices, activeRelaysCount, 0);
  }

  function syncManualInteractivity() {
    devices.forEach((device) => {
      const card = byId(`card-${device.id}`);
      if (!card) return;
      const isManual = controlMode === "manual";
      card.classList.toggle("manual-ready", isManual);
      card.setAttribute("aria-disabled", isManual ? "false" : "true");
      card.title = isManual ? "Click to toggle device" : "Switch to Manual mode to control devices";
    });
  }

  function handleManualDeviceToggle(deviceId) {
    if (controlMode !== "manual") return;
    const target = devices.find((device) => device.id === deviceId);
    if (!target) return;
    target.state = !target.state;
    updateRelayUI(target);
    refreshActiveDeviceCounters();
  }

  function setControlMode(mode) {
    if (mode !== "auto" && mode !== "manual") return;
    controlMode = mode;

    if (autoModeBtn) autoModeBtn.classList.toggle("active", mode === "auto");
    if (manualModeBtn) manualModeBtn.classList.toggle("active", mode === "manual");

    if (controlModeStatus) {
      controlModeStatus.textContent =
        mode === "manual"
          ? "Manual mode: click any device card to switch ON/OFF."
          : "Auto mode: devices follow sensor rules.";
    }

    syncManualInteractivity();
    if (mode === "auto") {
      evaluateRelays();
    } else {
      refreshActiveDeviceCounters();
    }
  }

  function bindControlMode() {
    if (autoModeBtn) autoModeBtn.addEventListener("click", () => setControlMode("auto"));
    if (manualModeBtn) manualModeBtn.addEventListener("click", () => setControlMode("manual"));
  }

  function evaluateRelays() {
    const temp = parseFloat(tempSlider.value);
    const light = parseInt(lightSlider.value, 10);
    const motion = parseInt(motionSlider.value, 10) === 1;
    const activeScenario = document.querySelector(".scenario-card.active")?.dataset.scenario || "session";

    activeRelaysCount = 0;

    devices.forEach((device) => {
      let isOn = false;

      if (motion) {
        if (device.type === "light" && light < thresholds.light) isOn = true;
        if (device.type === "fan" && temp > thresholds.temp) isOn = true;
        if (device.type === "tv" && activeScenario === "session") isOn = true;

        if (activeScenario === "partial") {
          if (device.type === "light" && device.group === "rear") isOn = false;
          if (device.type === "fan" && device.group === "even") isOn = false;
        }

        if (activeScenario === "exam") {
          if (device.type === "tv") isOn = false;
          if (device.type === "light" && device.group === "rear") isOn = light < 350;
        }
      }

      device.state = isOn;
      updateRelayUI(device);
    });

    refreshActiveDeviceCounters();
  }

  function updateTrackFill(slider) {
    const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, #4f46e5 0%, #2563eb ${percent}%, #dbe5f2 ${percent}%, #dbe5f2 100%)`;
  }

  function updateSliderValues() {
    const temperature = parseFloat(tempSlider.value);
    const light = parseInt(lightSlider.value, 10);
    const motionDetected = parseInt(motionSlider.value, 10) === 1;

    const temperatureText = formatTemp(temperature);
    tempValue.textContent = temperatureText;
    statusTempValue.textContent = temperatureText;
    headerTempValue.textContent = temperatureText;

    lightValue.textContent = `${light} lx`;
    statusLightValue.textContent = `${light} lx`;

    const motionText = motionDetected ? "Yes" : "No";
    motionValue.textContent = motionText;
    statusMotionValue.textContent = motionDetected ? "Detected" : "No Motion";

    updateTrackFill(tempSlider);
    updateTrackFill(lightSlider);
    updateTrackFill(motionSlider);
    if (controlMode === "auto") {
      evaluateRelays();
    } else {
      refreshActiveDeviceCounters();
    }
  }

  function setActiveButton(target, selector) {
    queryAll(selector).forEach((button) => button.classList.remove("active"));
    target.classList.add("active");
  }

  function bindTimeButtons() {
    [...timeButtons, liveButton].filter(Boolean).forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = event.currentTarget;
        setActiveButton(target, ".sim-btn");
        const time = target.dataset.time;
        if (time === "live") {
          refreshLiveWeatherByCurrentLocation();
          return;
        }
        const preset = timePresets[time];
        if (!preset) return;

        lightSlider.value = preset.light;
        tempSlider.value = preset.temp;
        updateSliderValues();
      });
    });
  }

  function bindScenarioButtons() {
    scenarioCards.forEach((card) => {
      card.addEventListener("click", (event) => {
        const target = event.currentTarget;
        setActiveButton(target, ".scenario-card");

        const scenario = target.dataset.scenario;
        if (scenario === "empty") {
          motionSlider.value = 0;
        } else {
          motionSlider.value = 1;
          if (parseFloat(tempSlider.value) < 28 && scenario !== "exam") {
            tempSlider.value = 29;
          }
        }

        if (scenario === "exam") {
          lightSlider.value = Math.max(Number(lightSlider.value), 320);
        }

        updateSliderValues();
      });
    });
  }

  function setLocationStatus(message) {
    if (locationStatus) locationStatus.textContent = message;
  }

  function applyLiveWeather(temperature, isDay) {
    timePresets.live = {
      light: isDay ? 780 : 80,
      temp: temperature
    };

    if (liveWeatherTemp) liveWeatherTemp.textContent = `${Math.round(temperature)}deg`;

    if (liveButton?.classList.contains("active")) {
      lightSlider.value = timePresets.live.light;
      tempSlider.value = timePresets.live.temp;
      updateSliderValues();
    }
  }

  function parseCurrentWeather(payload) {
    const currentTemp = Number(payload?.current?.temperature_2m);
    const currentIsDay = Number(payload?.current?.is_day);
    if (Number.isFinite(currentTemp)) {
      return {
        temperature: currentTemp,
        isDay: currentIsDay === 1
      };
    }

    const legacyTemp = Number(payload?.current_weather?.temperature);
    const legacyIsDay = Number(payload?.current_weather?.is_day);
    if (Number.isFinite(legacyTemp)) {
      return {
        temperature: legacyTemp,
        isDay: legacyIsDay === 1
      };
    }

    return null;
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Weather API request failed (${response.status})`);
      }
      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function fetchWeather(lat, lon, sourceLabel = "your location") {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
      return false;
    }
    const primaryUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day&timezone=auto`;
    const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;

    try {
      const primaryPayload = await fetchJsonWithTimeout(primaryUrl);
      const primaryResult = parseCurrentWeather(primaryPayload);
      if (primaryResult && primaryResult.temperature >= -50 && primaryResult.temperature <= 60) {
        applyLiveWeather(primaryResult.temperature, primaryResult.isDay);
        setLocationStatus(`Live weather from ${sourceLabel}.`);
        return true;
      }

      const fallbackPayload = await fetchJsonWithTimeout(fallbackUrl);
      const fallbackResult = parseCurrentWeather(fallbackPayload);
      if (fallbackResult && fallbackResult.temperature >= -50 && fallbackResult.temperature <= 60) {
        applyLiveWeather(fallbackResult.temperature, fallbackResult.isDay);
        setLocationStatus(`Live weather from ${sourceLabel}.`);
        return true;
      }

      throw new Error("Weather data missing expected temperature fields");
    } catch (error) {
      // Keep the simulator usable even if live weather fails.
      if (liveWeatherTemp) liveWeatherTemp.textContent = "N/A";
      setLocationStatus("Live weather unavailable for your location.");
      if (liveButton?.classList.contains("active")) {
        lightSlider.value = timePresets.live.light;
        tempSlider.value = timePresets.live.temp;
        updateSliderValues();
      }
      return false;
    }
  }

  function getCurrentPositionAsync(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not available"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function getGeolocationPermissionState() {
    if (!navigator.permissions || !navigator.permissions.query) return "unknown";
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state || "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  async function fetchCoordsFromIP() {
    try {
      const ipApiPayload = await fetchJsonWithTimeout("https://ipapi.co/json/", 7000);
      const lat = Number(ipApiPayload?.latitude);
      const lon = Number(ipApiPayload?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon, source: "IP fallback location" };
      }
    } catch (error) {
      // Try backup IP service below.
    }

    const ipWhoPayload = await fetchJsonWithTimeout("https://ipwho.is/", 7000);
    const lat = Number(ipWhoPayload?.latitude);
    const lon = Number(ipWhoPayload?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon, source: "IP fallback location" };
    }

    throw new Error("IP location lookup failed");
  }

  async function resolveCurrentCoordinates() {
    const permissionState = await getGeolocationPermissionState();
    if (permissionState === "denied") {
      return {
        lat: DEFAULT_WEATHER_COORDS.lat,
        lon: DEFAULT_WEATHER_COORDS.lon,
        source: "default location"
      };
    }

    if (navigator.geolocation) {
      try {
        const position = await getCurrentPositionAsync({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
        const lat = Number(position.coords.latitude);
        const lon = Number(position.coords.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          return { lat, lon, source: "your current location" };
        }
      } catch (error) {
        if (error && error.code === 1) {
          // Permission denied: use default location as requested.
          return {
            lat: DEFAULT_WEATHER_COORDS.lat,
            lon: DEFAULT_WEATHER_COORDS.lon,
            source: "default location"
          };
        }
        // For other errors, fall back to IP-based lookup below.
      }
    }

    try {
      return await fetchCoordsFromIP();
    } catch (error) {
      return {
        lat: DEFAULT_WEATHER_COORDS.lat,
        lon: DEFAULT_WEATHER_COORDS.lon,
        source: "default location"
      };
    }
  }

  async function refreshLiveWeatherByCurrentLocation() {
    setLocationStatus("Requesting live location access...");

    const coords = await resolveCurrentCoordinates();
    await fetchWeather(coords.lat, coords.lon, coords.source);
  }

  function initLiveWeather() {
    if (!liveButton) return;
    setLocationStatus("Click Live to use current location weather.");
  }

  function renderChart() {
    const canvas = byId("energyChart");
    if (!canvas || typeof Chart === "undefined") return;

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels: ["Apr 13", "Apr 14", "Apr 15", "Apr 16", "Apr 17", "Apr 18", "Apr 19", "Apr 20"],
        datasets: [
          {
            label: "Energy Saved",
            data: [8.4, 9.1, 10.8, 11.6, 10.9, 12.7, 13.4, 14.2],
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            fill: true,
            tension: 0.38,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: "#16a34a"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            padding: 12,
            backgroundColor: "#0f172a",
            bodyFont: { family: "Poppins", weight: "600" },
            titleFont: { family: "Poppins", weight: "600" },
            callbacks: {
              label(context) {
                return `${context.parsed.y} kWh saved`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#64748b", font: { family: "Poppins" } }
          },
          y: {
            beginAtZero: false,
            grid: { color: "rgba(148, 163, 184, 0.16)" },
            ticks: {
              color: "#64748b",
              font: { family: "Poppins" },
              callback(value) {
                return `${value} kWh`;
              }
            }
          }
        },
        animation: {
          duration: 900,
          easing: "easeOutQuart"
        }
      }
    });
  }

  function startSimulationLoop() {
    window.setInterval(() => {
      runtimeSeconds += 1;
      const minutes = String(Math.floor(runtimeSeconds / 60)).padStart(2, "0");
      const seconds = String(runtimeSeconds % 60).padStart(2, "0");
      if (simRuntimeValue) simRuntimeValue.textContent = `${minutes}:${seconds}`;

      const devicesOff = devices.length - activeRelaysCount;
      kwhSavedCounter += devicesOff > 0 ? devicesOff * 0.002 : 0.0001;
      animateNumber(kwhSavedValue, kwhSavedCounter, 2);
    }, 1000);
  }

  function bindSliderEvents() {
    [tempSlider, lightSlider, motionSlider].forEach((slider) => {
      slider.addEventListener("input", updateSliderValues);
    });
  }

  setUserContext();
  bindLogout();
  renderDevices();
  bindControlMode();
  bindTimeButtons();
  bindScenarioButtons();
  bindSliderEvents();
  setControlMode("auto");
  initLiveWeather();
  updateSliderValues();
  renderChart();
  startSimulationLoop();
});
