const { UPDATE_INTERVAL_MS, LOG_LIMIT } = require("./config");
const { simulatePhysicalSensors } = require("./modules/sensorModule");
const {
  deriveOccupancy,
  deriveComfortIndex,
  deriveRequiredBrightness,
  deriveEnergyConsumption,
} = require("./modules/virtualSensorModule");
const { buildActuatorState, applyActuatorCommand } = require("./modules/actuatorControl");
const { fetchWeatherSnapshot } = require("./modules/weatherService");
const { evaluateDecision } = require("./modules/decisionEngine");

class SmartClassroomSystem {
  constructor() {
    this.intervalHandle = null;
    this.motionHistory = [];
    this.logs = [];
    this.series = [];
    this.weatherCache = null;
    this.state = {
      cycle: 0,
      physical: {
        temperature: 25,
        humidity: 55,
        lightIntensity: 250,
        motion: false,
        inferredPeople: 0,
        timestamp: new Date().toISOString(),
      },
      virtual: {
        occupancy: { level: "LOW", confidence: 40, motionFrequency: 0 },
        comfortIndex: { value: 22, score: 92, status: "COMFORTABLE" },
        requiredBrightness: { targetPercent: 35, label: "LOW" },
        energy: { currentLoadWatts: 0, cycleWh: 0, totalWh: 0, totalKWh: 0 },
      },
      weather: {
        provider: "Open-Meteo",
        temperature: 28,
        humidity: 52,
        conditionText: "Initializing",
        fetchedAt: new Date().toISOString(),
      },
      actuators: buildActuatorState(),
      decision: {
        narrative: "System booting",
        reasons: ["Initial startup"],
        scores: { coolingDemand: 0, lightingDemand: 0, ecoAdjustment: 0 },
      },
      manualCommand: null,
    };
  }

  async init() {
    this.weatherCache = await fetchWeatherSnapshot();
    await this.runCycle();
    this.intervalHandle = setInterval(() => {
      this.runCycle().catch((error) => {
        this.appendLog({
          level: "error",
          message: `Cycle failed: ${error.message}`,
        });
      });
    }, UPDATE_INTERVAL_MS);
  }

  async getWeather() {
    const lastFetchTime = new Date(this.weatherCache?.fetchedAt || 0).getTime();
    const shouldRefresh = Date.now() - lastFetchTime > 60 * 1000;

    if (shouldRefresh || !this.weatherCache) {
      this.weatherCache = await fetchWeatherSnapshot();
    }

    return this.weatherCache;
  }

  buildVirtualState(physical, actuators) {
    const occupancy = deriveOccupancy(this.motionHistory);
    const comfortIndex = deriveComfortIndex(physical.temperature, physical.humidity);
    const requiredBrightness = deriveRequiredBrightness(physical.lightIntensity);
    const energy = deriveEnergyConsumption(
      actuators,
      UPDATE_INTERVAL_MS / 1000,
      this.state.virtual.energy,
    );

    return { occupancy, comfortIndex, requiredBrightness, energy };
  }

  appendLog(entry) {
    this.logs.unshift({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    this.logs = this.logs.slice(0, LOG_LIMIT);
  }

  appendSeriesSnapshot() {
    this.series.push({
      label: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      temperature: this.state.physical.temperature,
      energyWh: this.state.virtual.energy.totalWh,
    });
    this.series = this.series.slice(-16);
  }

  async runCycle() {
    const weather = await this.getWeather();
    const physical = simulatePhysicalSensors(this.state.physical, weather);

    this.motionHistory.push(physical.motion);
    if (this.motionHistory.length > 24) {
      this.motionHistory.shift();
    }

    const decisionSeed = this.buildVirtualState(physical, this.state.actuators);
    const manualOverride =
      this.state.actuators.mode === "MANUAL" && this.state.manualCommand
        ? { enabled: true, command: this.state.manualCommand }
        : null;

    const decisionResult = evaluateDecision({
      physical,
      virtual: decisionSeed,
      weather,
      previousActuators: this.state.actuators,
      manualOverride,
    });

    const actuators = applyActuatorCommand(this.state.actuators, decisionResult.command);
    const virtual = this.buildVirtualState(physical, actuators);

    this.state = {
      ...this.state,
      cycle: this.state.cycle + 1,
      physical,
      virtual,
      weather,
      actuators,
      decision: {
        narrative: decisionResult.narrative,
        reasons: decisionResult.reasons,
        scores: decisionResult.scores,
      },
    };

    this.appendLog({
      level: "info",
      message: decisionResult.narrative,
      physical,
      virtual,
      actuators,
    });
    this.appendSeriesSnapshot();

    return this.state;
  }

  getSnapshot() {
    const latestLog = this.logs[0] || null;
    const systemStatus =
      this.state.actuators.mode === "MANUAL"
        ? "MANUAL CONTROL"
        : this.state.virtual.occupancy.level === "LOW" && !this.state.physical.motion
          ? "ENERGY SAVING"
          : "ACTIVE";

    return {
      status: {
        label: systemStatus,
        mode: this.state.actuators.mode,
        cycle: this.state.cycle,
        updatedAt: this.state.physical.timestamp,
      },
      sensors: this.state.physical,
      virtualSensors: this.state.virtual,
      weather: this.state.weather,
      decisions: {
        current: this.state.decision,
        history: this.logs.map((entry) => ({
          timestamp: entry.timestamp,
          message: entry.message,
          level: entry.level,
        })),
      },
      actuators: this.state.actuators,
      charts: {
        labels: this.series.map((item) => item.label),
        temperature: this.series.map((item) => item.temperature),
        energy: this.series.map((item) => Number(item.energyWh.toFixed(2))),
      },
      latestLog,
      telemetry: {
        updateIntervalMs: UPDATE_INTERVAL_MS,
        motionWindow: this.motionHistory.length,
      },
    };
  }

  getLogs() {
    return this.logs;
  }

  setMode(mode) {
    this.state.actuators = {
      ...this.state.actuators,
      mode,
      lastUpdated: new Date().toISOString(),
    };
    if (mode === "AUTO") {
      this.state.manualCommand = null;
    }
    this.appendLog({
      level: "info",
      message: `Mode changed to ${mode}`,
    });
    return this.state.actuators;
  }

  applyManualCommand(command) {
    const sanitized = {
      fanState: command.fanState || "OFF",
      fanSpeed: command.fanState === "ON" ? command.fanSpeed || "LOW" : "OFF",
      lightState: command.lightState || "OFF",
      lightBrightness:
        command.lightState === "ON" ? Number(command.lightBrightness ?? 50) : 0,
    };
    this.state.manualCommand = sanitized;
    this.state.actuators = applyActuatorCommand(
      {
        ...this.state.actuators,
        mode: "MANUAL",
      },
      sanitized,
    );
    this.appendLog({
      level: "info",
      message: "Manual actuator command applied",
      actuators: this.state.actuators,
    });
    return this.state.actuators;
  }
}

module.exports = {
  SmartClassroomSystem,
};
