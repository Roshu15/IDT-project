document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const timeBtns = document.querySelectorAll('.sim-btn');
  const scenarioCards = document.querySelectorAll('.scenario-card');
  
  const tempSlider = document.getElementById('tempSlider');
  const lightSlider = document.getElementById('lightSlider');
  const motionSlider = document.getElementById('motionSlider');
  
  const tempValue = document.getElementById('tempValue');
  const lightValue = document.getElementById('lightValue');
  const motionValue = document.getElementById('motionValue');
  
  const relayItems = {
    l1: document.getElementById('state-l1').parentElement,
    l2: document.getElementById('state-l2').parentElement,
    f1: document.getElementById('state-f1').parentElement,
    f2: document.getElementById('state-f2').parentElement,
  };
  
  const relayStates = {
    l1: document.getElementById('state-l1'),
    l2: document.getElementById('state-l2'),
    f1: document.getElementById('state-f1'),
    f2: document.getElementById('state-f2'),
  };

  const activeDevicesEl = document.getElementById('activeDevicesValue');
  const kwhSavedEl = document.getElementById('kwhSavedValue');
  const simRuntimeEl = document.getElementById('simRuntimeValue');

  // State
  let runtimeSeconds = 10;
  let kwhSavedCounter = 0;
  let activeRelaysCount = 4;

  const thresholds = {
    light: 500, // turn on lights if below this lux
    temp: 26    // turn on fans if above this C
  };

  // Logic to calculate device states based on inputs
  function evaluateRelays() {
    const temp = parseFloat(tempSlider.value);
    const light = parseInt(lightSlider.value, 10);
    const motion = parseInt(motionSlider.value, 10) === 1;

    let l1On = false, l2On = false, f1On = false, f2On = false;

    if (motion) {
      if (light < thresholds.light) {
        l1On = true;
        l2On = true;
      }
      if (temp > thresholds.temp) {
        f1On = true;
        f2On = true;
      }
      
      // Simulate "Partially full" by turning on only half the devices
      const activeScenario = document.querySelector('.scenario-card.active').dataset.scenario;
      if (activeScenario === 'partial') {
        l2On = false;
        f2On = false;
      }
    }

    updateRelayUI('l1', l1On);
    updateRelayUI('l2', l2On);
    updateRelayUI('f1', f1On);
    updateRelayUI('f2', f2On);

    activeRelaysCount = [l1On, l2On, f1On, f2On].filter(Boolean).length;
    activeDevicesEl.textContent = `${activeRelaysCount}/4`;
  }

  function updateRelayUI(id, isOn) {
    const item = relayItems[id];
    const stateLabel = relayStates[id];
    
    if (isOn) {
      item.classList.remove('off');
      item.classList.add('on');
      stateLabel.textContent = 'ON';
    } else {
      item.classList.remove('on');
      item.classList.add('off');
      stateLabel.textContent = 'OFF';
    }
  }

  // Value updaters
  function updateSliderValues() {
    tempValue.textContent = `${parseFloat(tempSlider.value).toFixed(1)} °C`;
    lightValue.textContent = `${lightSlider.value} lx`;
    motionValue.textContent = parseInt(motionSlider.value) === 1 ? 'Yes' : 'No';
    evaluateRelays();
    updateTrackFills();
  }

  function updateTrackFills() {
    // Quick pseudo-fill for webkit sliders purely using backgrounds is hard, 
    // we use a linear gradient dynamically.
    const tempPercent = ((tempSlider.value - tempSlider.min) / (tempSlider.max - tempSlider.min)) * 100;
    tempSlider.style.background = `linear-gradient(to right, var(--sim-primary) 0%, var(--sim-primary) ${tempPercent}%, #d1d1d6 ${tempPercent}%, #d1d1d6 100%)`;

    const lightPercent = ((lightSlider.value - lightSlider.min) / (lightSlider.max - lightSlider.min)) * 100;
    lightSlider.style.background = `linear-gradient(to right, var(--sim-primary) 0%, var(--sim-primary) ${lightPercent}%, #d1d1d6 ${lightPercent}%, #d1d1d6 100%)`;

    const motionPercent = ((motionSlider.value - motionSlider.min) / (motionSlider.max - motionSlider.min)) * 100;
    motionSlider.style.background = `linear-gradient(to right, var(--sim-primary) 0%, var(--sim-primary) ${motionPercent}%, #d1d1d6 ${motionPercent}%, #d1d1d6 100%)`;
  }

  // Event Listeners for Sliders
  tempSlider.addEventListener('input', updateSliderValues);
  lightSlider.addEventListener('input', updateSliderValues);
  motionSlider.addEventListener('input', updateSliderValues);

  // Time of Day Logic
  const timePresets = {
    dawn: { light: 200, temp: 18 },
    morning: { light: 600, temp: 22 },
    noon: { light: 900, temp: 28 },
    afternoon: { light: 450, temp: 26 },
    evening: { light: 120, temp: 23 },
    night: { light: 0, temp: 19 },
    live: { light: 600, temp: 22 }
  };

  timeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      timeBtns.forEach(b => b.classList.remove('active'));
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

  // Live Weather Logic
  const liveWeatherBtn = document.getElementById('liveWeatherBtn');
  const liveWeatherTemp = document.getElementById('liveWeatherTemp');
  
  if (liveWeatherBtn) {
    async function fetchWeather(lat = 51.5074, lon = -0.1278) { // Default London
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day`);
        const data = await response.json();
        const temp = data.current.temperature_2m;
        const isDay = data.current.is_day;
        
        liveWeatherTemp.textContent = `${temp} °C`;
        
        // Register the live setting so the timeBtn logic works automatically
        timePresets['live'] = {
          light: isDay === 1 ? 800 : 50,
          temp: temp
        };
      } catch (err) {
        liveWeatherTemp.textContent = "22 °C"; // Fallback gracefully instead of Error
        timePresets['live'] = { light: 600, temp: 22 };
        console.error("Weather fetch failed:", err);
      }
      
      if (liveWeatherBtn.classList.contains('active')) {
        lightSlider.value = timePresets['live'].light;
        tempSlider.value = timePresets['live'].temp;
        updateSliderValues();
      }
    }

    const geoOptions = { timeout: 5000, maximumAge: 60000 };
    
    // Try to get actual location, fallback to default if blocked or unavailable
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        (err) => fetchWeather(), // user denied/error
        geoOptions
      );
    } else {
      fetchWeather();
    }
  }

  // Scenario Logic
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
        // Bump temperature slightly if there are people
        if (parseFloat(tempSlider.value) < 28) {
          tempSlider.value = 28;
        }
      }
      updateSliderValues();
    });
  });

  // Main Loop
  setInterval(() => {
    runtimeSeconds++;
    
    const mm = String(Math.floor(runtimeSeconds / 60)).padStart(2, '0');
    const ss = String(runtimeSeconds % 60).padStart(2, '0');
    simRuntimeEl.textContent = `${mm}:${ss}`;

    // kWh savings tick: 
    // Let's assume every simulated second = 1 hour in reality for savings estimation
    // If a device is OFF, we save ~0.02 kWh per tick.
    const devicesOff = 4 - activeRelaysCount;
    if (devicesOff > 0) {
      kwhSavedCounter += (devicesOff * 0.005);
    } else {
      // Just to show tiny micro-activity even if nothing is fully off but it's "running"
      // we can add a microscopic random float so it doesn't look purely "broken" or stuck.
      kwhSavedCounter += 0.0001;
    }
    
    if (kwhSavedEl) kwhSavedEl.textContent = kwhSavedCounter.toFixed(2);
    

  }, 1000);

  // Initial Run
  updateSliderValues();
});
