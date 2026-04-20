document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const timeBtns = document.querySelectorAll('.sim-btn:not(.live-btn)');
  const liveBtn = document.getElementById('liveWeatherBtn');
  const scenarioCards = document.querySelectorAll('.scenario-card');
  
  const tempSlider = document.getElementById('tempSlider');
  const lightSlider = document.getElementById('lightSlider');
  const motionSlider = document.getElementById('motionSlider');
  
  const tempValue = document.getElementById('tempValue');
  const lightValue = document.getElementById('lightValue');
  const motionValue = document.getElementById('motionValue');
  
  const devicesContainer = document.getElementById('devicesContainer');
  const activeDevicesEl = document.getElementById('headerActiveDevices');
  const headerTempValue = document.getElementById('headerTempValue');
  const kwhSavedEl = document.getElementById('kwhSavedValue');
  const simRuntimeEl = document.getElementById('simRuntimeValue');

  // State
  let runtimeSeconds = 0;
  let kwhSavedCounter = 0;
  let activeRelaysCount = 0;

  // Threshold update requested by user
  const thresholds = {
    light: 500, // turn on lights if below this lux
    temp: 30    // NEW THRESHOLD: turn on fans if above 30 C
  };

  // Device configuration (18 devices)
  const devices = [];
  
  // 8 Lights
  for (let i = 1; i <= 8; i++) {
    devices.push({ id: `l${i}`, name: `Light ${i}`, type: 'light', state: false, group: i <= 4 ? 'front' : 'rear' });
  }
  // 9 Fans
  for (let i = 1; i <= 9; i++) {
    devices.push({ id: `f${i}`, name: `Fan ${i}`, type: 'fan', state: false, group: i % 2 === 0 ? 'even' : 'odd' });
  }
  // 1 Smart Board
  devices.push({ id: 'tv1', name: 'Smart Board', type: 'tv', state: false, group: 'display' });

  // Icons SVG - Font-Awesome style minimalistic
  const icons = {
    light: `<svg class="icon-light" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7zm-4 17c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-1H8v1z"/></svg>`,
    fan: `<svg class="icon-fan" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-2c1.65 0 3-1.35 3-3s-1.35-3-3-3-3 1.35-3 3 1.35 3 3 3zm0 4c-3.31 0-6 2.69-6 6h12c0-3.31-2.69-6-6-6z" opacity="0.4"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`,
    tv: `<svg class="icon-tv" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2h-0.01zM21 17H3V5h18v12z"/></svg>`
  };

  // Render Setup
  function renderDevices() {
    if (!devicesContainer) return;
    devicesContainer.innerHTML = '';
    devices.forEach(device => {
      const card = document.createElement('div');
      card.className = `device-card off`;
      card.id = `card-${device.id}`;
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
      devicesContainer.appendChild(card);
    });
  }

  // Master Evaluator
  function evaluateRelays() {
    const temp = parseFloat(tempSlider.value);
    const light = parseInt(lightSlider.value, 10);
    const motion = parseInt(motionSlider.value, 10) === 1;
    const activeScenarioElement = document.querySelector('.scenario-card.active');
    const activeScenario = activeScenarioElement ? activeScenarioElement.dataset.scenario : "session";

    activeRelaysCount = 0;

    devices.forEach(device => {
      let isOn = false;

      if (motion) {
        if (device.type === 'light' && light < thresholds.light) isOn = true;
        if (device.type === 'fan' && temp > thresholds.temp) isOn = true;
        
        if (device.type === 'tv' && activeScenario === 'session') isOn = true;

        if (activeScenario === 'partial') {
          if (device.type === 'light' && device.group === 'rear') isOn = false;
          if (device.type === 'fan' && device.group === 'even') isOn = false;
        }
      }

      device.state = isOn;
      updateRelayUI(device);
      if (isOn) activeRelaysCount++;
    });

    if(activeDevicesEl) {
      activeDevicesEl.textContent = `${activeRelaysCount}/${devices.length}`;
    }
  }

  function updateRelayUI(device) {
    const card = document.getElementById(`card-${device.id}`);
    const stateLabel = document.getElementById(`state-${device.id}`);
    if (!card || !stateLabel) return;
    
    if (device.state) {
      card.classList.remove('off');
      card.classList.add('on');
      stateLabel.textContent = 'ON';
    } else {
      card.classList.remove('on');
      card.classList.add('off');
      stateLabel.textContent = 'OFF';
    }
  }

  // Value updaters
  function updateSliderValues() {
    const tVal = parseFloat(tempSlider.value).toFixed(1);
    tempValue.textContent = `${tVal} °C`;
    if(headerTempValue) headerTempValue.textContent = `${tVal} °C`;
    
    lightValue.textContent = `${lightSlider.value} lx`;
    motionValue.textContent = parseInt(motionSlider.value) === 1 ? 'Yes' : 'No';
    
    evaluateRelays();
    updateTrackFills();
  }

  function updateTrackFills() {
    const tempPercent = ((tempSlider.value - tempSlider.min) / (tempSlider.max - tempSlider.min)) * 100;
    tempSlider.style.background = `linear-gradient(to right, var(--sim-primary) 0%, var(--sim-primary) ${tempPercent}%, #e2e8f0 ${tempPercent}%, #e2e8f0 100%)`;

    const lightPercent = ((lightSlider.value - lightSlider.min) / (lightSlider.max - lightSlider.min)) * 100;
    lightSlider.style.background = `linear-gradient(to right, var(--sim-primary) 0%, var(--sim-primary) ${lightPercent}%, #e2e8f0 ${lightPercent}%, #e2e8f0 100%)`;

    const motionPercent = ((motionSlider.value - motionSlider.min) / (motionSlider.max - motionSlider.min)) * 100;
    motionSlider.style.background = `linear-gradient(to right, var(--sim-primary) 0%, var(--sim-primary) ${motionPercent}%, #e2e8f0 ${motionPercent}%, #e2e8f0 100%)`;
  }

  tempSlider.addEventListener('input', updateSliderValues);
  lightSlider.addEventListener('input', updateSliderValues);
  motionSlider.addEventListener('input', updateSliderValues);

  // Time of Day Logic
  const timePresets = {
    dawn: { light: 200, temp: 25 },
    morning: { light: 600, temp: 29 },
    noon: { light: 900, temp: 31 },
    afternoon: { light: 450, temp: 35 }, // tweaked to test new 30C threshold easily
    evening: { light: 120, temp: 28 },
    night: { light: 0, temp: 25 },
    live: { light: 600, temp: 25 }
  };

  function bindTimeButtons(collection) {
     collection.forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sim-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        
        const time = target.dataset.time;
        if (timePresets[time] !== undefined) {
          lightSlider.value = timePresets[time].light;
          tempSlider.value = timePresets[time].temp;
          updateSliderValues();
        }
      });
    });
  }
  
  bindTimeButtons(timeBtns);
  if(liveBtn) bindTimeButtons([liveBtn]);

  // Live Location
  const liveWeatherTemp = document.getElementById('liveWeatherTemp');
  if (liveBtn) {
    async function fetchWeather(lat = 51.5074, lon = -0.1278) {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day`);
        const data = await response.json();
        const temp = data.current.temperature_2m;
        const isDay = data.current.is_day;
        
        liveWeatherTemp.textContent = `${temp}°`;
        
        timePresets['live'] = {
          light: isDay === 1 ? 800 : 50,
          temp: temp
        };
      } catch (err) {
        liveWeatherTemp.textContent = "22°";
        timePresets['live'] = { light: 600, temp: 22 };
      }
      
      if (liveBtn.classList.contains('active')) {
        lightSlider.value = timePresets['live'].light;
        tempSlider.value = timePresets['live'].temp;
        updateSliderValues();
      }
    }

    const geoOptions = { timeout: 5000, maximumAge: 60000 };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        (err) => fetchWeather(),
        geoOptions
      );
    } else {
      fetchWeather();
    }
  }

  // Scenarios
  scenarioCards.forEach(card => {
    card.addEventListener('click', (e) => {
      scenarioCards.forEach(c => c.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      
      const scenario = target.dataset.scenario;
      if (scenario === 'empty') {
        motionSlider.value = 0;
      } else {
        motionSlider.value = 1;
        if (parseFloat(tempSlider.value) < 30) {
          // Bump temp up slightly on populated scenario, but don't force ON fans unless user wants
          // to push it past newly requested threshold 30.
          tempSlider.value = 31;
        }
      }
      updateSliderValues();
    });
  });

  // Chart Rendering
  function renderChart() {
    const ctx = document.getElementById('energyChart');
    if (!ctx || typeof Chart === 'undefined') return;

    // Last 8 days mock data (kWh)
    const labels = ["Day -7", "Day -6", "Day -5", "Day -4", "Day -3", "Day -2", "Yesterday", "Today"];
    const data = [12.4, 11.2, 14.5, 9.8, 10.5, 12.1, 13.0, 11.6];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Energy Saved (kWh)',
          data: data,
          borderColor: '#38a169',
          backgroundColor: 'rgba(56, 161, 105, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#38a169',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a202c',
            titleFont: { family: 'Inter', size: 13 },
            bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: { 
            grid: { display: false },
            ticks: { font: { family: 'Inter' } }
          },
          y: { 
            grid: { color: 'rgba(226, 232, 240, 0.5)' },
            ticks: { font: { family: 'Inter' } }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  // Main Simulation Loop
  setInterval(() => {
    runtimeSeconds++;
    
    const mm = String(Math.floor(runtimeSeconds / 60)).padStart(2, '0');
    const ss = String(runtimeSeconds % 60).padStart(2, '0');
    simRuntimeEl.textContent = `${mm}:${ss}`;

    const devicesOff = devices.length - activeRelaysCount;
    if (devicesOff > 0) {
      kwhSavedCounter += (devicesOff * 0.002);
    } else {
      kwhSavedCounter += 0.0001;
    }
    
    if (kwhSavedEl) kwhSavedEl.textContent = kwhSavedCounter.toFixed(2);
  }, 1000);

  // Initialize
  renderDevices();
  updateSliderValues();

  // Give DOM a sec for canvas, then render chart
  setTimeout(renderChart, 100);
});
