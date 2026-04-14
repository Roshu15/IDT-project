const POLL_INTERVAL_MS = 5000;
const state = {
  temperatureChart: null,
  energyChart: null,
  apiBase: '',
};

function byId(id) {
  return document.getElementById(id);
}

function buildCandidateBases() {
  const candidates = [];
  const origin = window.location.origin;

  if (origin && origin !== 'null') {
    candidates.push(origin);
  }

  ['http://localhost:5000', 'http://localhost:5001', 'http://localhost:5002'].forEach((base) => {
    if (!candidates.includes(base)) {
      candidates.push(base);
    }
  });

  return candidates;
}

async function fetchJson(path, options = {}) {
  const attemptBases = state.apiBase ? [state.apiBase] : buildCandidateBases();
  let lastError = null;

  for (const base of attemptBases) {
    try {
      const response = await fetch(`${base}${path}`, options);
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      state.apiBase = base;
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Backend unavailable');
}

async function getStatus() {
  return fetchJson('/api/status');
}

function pageName() {
  return document.body?.dataset?.page || '';
}

function setText(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent = value;
  }
}

function setStatusChip(text, variant) {
  const chip = byId('systemStatus') || byId('controlStatusChip');
  if (!chip) return;
  chip.textContent = text;
  chip.dataset.variant = variant;
}

function renderReasonList(reasons) {
  const list = byId('decisionReasons');
  if (!list) return;
  list.innerHTML = '';
  reasons.forEach((reason) => {
    const item = document.createElement('li');
    item.textContent = reason;
    list.appendChild(item);
  });
}

function renderDecisionHistory(items, targetId = 'decisionHistory') {
  const list = byId(targetId);
  if (!list) return;
  list.innerHTML = '';
  items.slice(0, targetId === 'fullLogList' ? items.length : 6).forEach((entry) => {
    const item = document.createElement('li');
    const time = new Date(entry.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    item.innerHTML = `<span class="history-time">${time}</span><p>${entry.message}</p>`;
    list.appendChild(item);
  });
}

function buildLineChart(chartId, label, labels, data, color) {
  const canvas = byId(chartId);
  if (!canvas || typeof Chart === 'undefined') return null;
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: `${color}22`,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(151, 176, 195, 0.16)',
          },
          ticks: {
            color: '#5a7082',
          },
        },
        y: {
          grid: {
            color: 'rgba(151, 176, 195, 0.16)',
          },
          ticks: {
            color: '#5a7082',
          },
        },
      },
    },
  });
}

function updateChart(chart, labels, data) {
  if (!chart) return;
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

function ensureCharts(snapshot) {
  if (typeof Chart === 'undefined') return;
  if (!state.temperatureChart && byId('temperatureChart')) {
    state.temperatureChart = buildLineChart(
      'temperatureChart',
      'Temperature',
      snapshot.charts.labels,
      snapshot.charts.temperature,
      '#4a86a8',
    );
  }
  if (!state.energyChart && byId('energyChart')) {
    state.energyChart = buildLineChart(
      'energyChart',
      'Energy',
      snapshot.charts.labels,
      snapshot.charts.energy,
      '#5ea58f',
    );
  }

  updateChart(state.temperatureChart, snapshot.charts.labels, snapshot.charts.temperature);
  updateChart(state.energyChart, snapshot.charts.labels, snapshot.charts.energy);
}

function renderDashboard(snapshot) {
  const { status, sensors, virtualSensors, weather, decisions, actuators } = snapshot;

  setStatusChip(status.label, status.label.toLowerCase().replace(/\s+/g, '-'));
  setText('statusMode', status.mode);
  setText('statusCycle', `#${status.cycle}`);
  setText('statusEnergy', `${virtualSensors.energy.totalKWh} kWh`);

  setText('sensorTemperature', `${sensors.temperature} C`);
  setText('sensorHumidity', `${sensors.humidity}%`);
  setText('sensorLight', `${sensors.lightIntensity} lux`);
  setText('sensorMotion', sensors.motion ? 'Detected' : 'Idle');

  setText('virtualOccupancy', `${virtualSensors.occupancy.level} (${Math.round(virtualSensors.occupancy.confidence)}%)`);
  setText('virtualComfort', `${virtualSensors.comfortIndex.value} / ${virtualSensors.comfortIndex.status}`);
  setText('virtualBrightness', `${virtualSensors.requiredBrightness.targetPercent}% / ${virtualSensors.requiredBrightness.label}`);
  setText('virtualEnergy', `${virtualSensors.energy.totalWh.toFixed(1)} Wh total`);

  setText('weatherProvider', weather.provider);
  setText('weatherTemperature', `${weather.temperature} C`);
  setText('weatherHumidity', `${weather.humidity}%`);
  setText('weatherCondition', weather.conditionText);

  setText('fanState', actuators.fanState);
  setText('fanSpeed', actuators.fanSpeed);
  setText('lightState', actuators.lightState);
  setText('lightBrightness', `${actuators.lightBrightness}%`);

  setText('decisionNarrative', decisions.current.narrative);
  setText('scoreCooling', `${decisions.current.scores.coolingDemand}/100`);
  setText('scoreLighting', `${decisions.current.scores.lightingDemand}/100`);
  setText('scoreEco', `${decisions.current.scores.ecoAdjustment}`);

  renderReasonList(decisions.current.reasons || []);
  renderDecisionHistory(decisions.history || [], 'decisionHistory');
  ensureCharts(snapshot);
}

function renderControls(snapshot) {
  const { status, actuators } = snapshot;
  const message =
    status.mode === 'AUTO'
      ? 'Auto mode is active. The AI agent is adjusting the room using live classroom and weather conditions.'
      : 'Manual mode is active. Your selected actuator settings will remain in place until auto mode is restored.';

  setStatusChip(`${status.label} | ${status.mode}`, status.label.toLowerCase().replace(/\s+/g, '-'));
  setText('controlModeMessage', message);
  setText('manualBrightnessValue', `${byId('manualBrightness')?.value || 60}%`);

  const fanState = byId('manualFanState');
  const fanSpeed = byId('manualFanSpeed');
  const lightState = byId('manualLightState');
  const brightness = byId('manualBrightness');
  if (fanState) fanState.value = actuators.fanState;
  if (fanSpeed) fanSpeed.value = actuators.fanSpeed === 'OFF' ? 'LOW' : actuators.fanSpeed;
  if (lightState) lightState.value = actuators.lightState;
  if (brightness) brightness.value = actuators.lightBrightness;
  setText('manualBrightnessValue', `${actuators.lightBrightness}%`);
}

function renderLogs(snapshot) {
  renderDecisionHistory(snapshot.decisions.history || [], 'fullLogList');
}

function bindLoginForm() {
  const form = byId('loginForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = byId('email')?.value.trim() || '';
    const password = byId('password')?.value || '';
    const feedback = byId('loginFeedback');

    if (!email.includes('@')) {
      if (feedback) feedback.textContent = 'Please enter a valid email address.';
      return;
    }

    if (password.length < 6) {
      if (feedback) feedback.textContent = 'Password must be at least 6 characters.';
      return;
    }

    localStorage.setItem('smartClassroomUser', email);
    if (feedback) feedback.textContent = 'Login successful. Redirecting to dashboard...';
    window.setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  });
}

function bindContactForm() {
  const form = byId('contactForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = byId('contactName')?.value.trim() || '';
    const email = byId('contactEmail')?.value.trim() || '';
    const message = byId('contactMessage')?.value.trim() || '';
    const feedback = byId('contactFeedback');

    if (!name || !email || !message) {
      if (feedback) feedback.textContent = 'Please fill in all fields before sending your message.';
      return;
    }

    if (!email.includes('@')) {
      if (feedback) feedback.textContent = 'Please enter a valid email address.';
      return;
    }

    if (feedback) feedback.textContent = 'Message received. We will get back to you soon.';
    form.reset();
  });
}

async function setMode(mode) {
  await fetchJson('/api/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  await refresh();
}

async function applyManualOverride(event) {
  event.preventDefault();
  await fetchJson('/api/manual-control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fanState: byId('manualFanState')?.value || 'OFF',
      fanSpeed: byId('manualFanSpeed')?.value || 'LOW',
      lightState: byId('manualLightState')?.value || 'OFF',
      lightBrightness: Number(byId('manualBrightness')?.value || 0),
    }),
  });
  await refresh();
}

function bindControls() {
  const autoButton = byId('autoModeButton');
  const manualButton = byId('manualModeButton');
  const form = byId('manualControlForm');
  const brightness = byId('manualBrightness');

  if (autoButton) autoButton.addEventListener('click', () => setMode('AUTO'));
  if (manualButton) manualButton.addEventListener('click', () => setMode('MANUAL'));
  if (form) form.addEventListener('submit', applyManualOverride);
  if (brightness) {
    brightness.addEventListener('input', () => {
      setText('manualBrightnessValue', `${brightness.value}%`);
    });
  }
}

async function refresh() {
  try {
    const snapshot = await getStatus();
    renderDashboard(snapshot);
    renderControls(snapshot);
    renderLogs(snapshot);
  } catch (error) {
    setStatusChip('Backend unavailable', 'idle');
    setText('decisionNarrative', 'The dashboard could not reach the smart classroom server. Start the Node backend and open the page from localhost, or keep the server running on port 5000/5001.');
    setText('controlModeMessage', 'Unable to reach the backend right now.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  bindControls();
  bindLoginForm();
  bindContactForm();

  if (['dashboard', 'controls', 'logs'].includes(pageName())) {
    await refresh();
    setInterval(refresh, POLL_INTERVAL_MS);
  }
});
