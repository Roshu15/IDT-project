function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deriveOccupancy(motionHistory = []) {
  const recent = motionHistory.slice(-12);
  const motionEvents = recent.filter(Boolean).length;
  const activityRatio = recent.length ? motionEvents / recent.length : 0;

  let level = "LOW";
  if (activityRatio >= 0.7) level = "HIGH";
  else if (activityRatio >= 0.35) level = "MEDIUM";

  const confidence = clamp(40 + activityRatio * 60, 0, 100);
  return {
    level,
    confidence: Number(confidence.toFixed(1)),
    motionFrequency: Number(activityRatio.toFixed(2)),
  };
}

function deriveComfortIndex(temperature, humidity) {
  const discomfortIndex =
    temperature - (0.55 - 0.0055 * humidity) * (temperature - 14.5);
  const comfortScore = clamp(100 - Math.abs(discomfortIndex - 22) * 8.5, 0, 100);

  let status = "COMFORTABLE";
  if (discomfortIndex >= 28) status = "HOT";
  else if (discomfortIndex >= 25) status = "WARM";
  else if (discomfortIndex <= 18) status = "COOL";

  return {
    value: Number(discomfortIndex.toFixed(1)),
    score: Number(comfortScore.toFixed(1)),
    status,
  };
}

function deriveRequiredBrightness(lightIntensity) {
  let target = 85;
  let label = "VERY_HIGH";

  if (lightIntensity >= 500) {
    target = 15;
    label = "MINIMAL";
  } else if (lightIntensity >= 350) {
    target = 30;
    label = "LOW";
  } else if (lightIntensity >= 220) {
    target = 52;
    label = "MEDIUM";
  } else if (lightIntensity >= 120) {
    target = 72;
    label = "HIGH";
  }

  return {
    targetPercent: target,
    label,
  };
}

function deriveEnergyConsumption(actuators, cycleSeconds, totals = {}) {
  const fanSpeedMultiplier = {
    OFF: 0,
    LOW: 0.45,
    MEDIUM: 0.72,
    HIGH: 1,
  };
  const fanPowerW = 75 * (fanSpeedMultiplier[actuators.fanSpeed] || 0);
  const lightPowerW = actuators.lightState === "ON" ? 40 * (actuators.lightBrightness / 100) : 0;
  const cycleHours = cycleSeconds / 3600;
  const cycleWh = (fanPowerW + lightPowerW) * cycleHours;
  const totalWh = (totals.totalWh || 0) + cycleWh;

  return {
    currentLoadWatts: Number((fanPowerW + lightPowerW).toFixed(1)),
    cycleWh: Number(cycleWh.toFixed(3)),
    totalWh: Number(totalWh.toFixed(3)),
    totalKWh: Number((totalWh / 1000).toFixed(3)),
  };
}

module.exports = {
  deriveOccupancy,
  deriveComfortIndex,
  deriveRequiredBrightness,
  deriveEnergyConsumption,
};
