function buildActuatorState(overrides = {}) {
  return {
    fanState: overrides.fanState || "OFF",
    fanSpeed: overrides.fanSpeed || "OFF",
    lightState: overrides.lightState || "OFF",
    lightBrightness: overrides.lightBrightness ?? 0,
    mode: overrides.mode || "AUTO",
    lastUpdated: overrides.lastUpdated || new Date().toISOString(),
  };
}

function applyActuatorCommand(currentState, command) {
  const nextState = {
    ...currentState,
    ...command,
    lastUpdated: new Date().toISOString(),
  };

  if (nextState.fanState === "OFF") {
    nextState.fanSpeed = "OFF";
  }

  if (nextState.lightState === "OFF") {
    nextState.lightBrightness = 0;
  }

  return nextState;
}

module.exports = {
  buildActuatorState,
  applyActuatorCommand,
};
