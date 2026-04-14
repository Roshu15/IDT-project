function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function selectFanSpeed(coolingDemand) {
  if (coolingDemand >= 75) return "HIGH";
  if (coolingDemand >= 45) return "MEDIUM";
  if (coolingDemand >= 20) return "LOW";
  return "OFF";
}

function evaluateDecision({ physical, virtual, weather, previousActuators, manualOverride }) {
  if (manualOverride?.enabled) {
    return {
      command: manualOverride.command,
      narrative:
        "Manual override is active, so the room is following the operator's latest command instead of automatic optimization.",
      reasons: ["Manual mode is enabled", "Automatic adjustments are temporarily paused"],
      scores: {
        coolingDemand: 0,
        lightingDemand: 0,
        ecoAdjustment: 0,
      },
    };
  }

  const occupancyWeight =
    virtual.occupancy.level === "HIGH"
      ? 30
      : virtual.occupancy.level === "MEDIUM"
        ? 18
        : 4;
  const tempPressure = clamp((physical.temperature - 24) * 12, 0, 50);
  const humidityPressure = clamp((physical.humidity - 55) * 0.7, 0, 12);
  const comfortPenalty = clamp((62 - virtual.comfortIndex.score) * 0.7, 0, 25);
  const outsideCoolBonus = weather.temperature <= 24 ? -18 : 0;
  const outsideHotPenalty = weather.temperature >= 32 ? 8 : 0;
  const ecoAdjustment =
    virtual.occupancy.level === "LOW" && !physical.motion
      ? -28
      : weather.conditionText.toLowerCase().includes("rain")
        ? -6
        : 0;

  const coolingDemand = clamp(
    occupancyWeight +
      tempPressure +
      humidityPressure +
      comfortPenalty +
      outsideCoolBonus +
      outsideHotPenalty +
      ecoAdjustment,
    0,
    100,
  );

  const rawLightingDemand =
    virtual.requiredBrightness.targetPercent +
    (virtual.occupancy.level === "HIGH" ? 18 : virtual.occupancy.level === "MEDIUM" ? 8 : -18) +
    (physical.motion ? 10 : -14);
  const lightingDemand = clamp(rawLightingDemand, 0, 100);

  const fanSpeed = selectFanSpeed(coolingDemand);
  const fanState = fanSpeed === "OFF" ? "OFF" : "ON";
  const lightState = lightingDemand >= 22 ? "ON" : "OFF";
  const lightBrightness = lightState === "ON" ? Math.max(18, Math.round(lightingDemand)) : 0;

  const reasons = [];
  if (virtual.occupancy.level === "LOW") reasons.push("Low occupancy reduces baseline power demand");
  if (virtual.occupancy.level !== "LOW") reasons.push(`Occupancy ${virtual.occupancy.level} increases comfort demand`);
  if (virtual.comfortIndex.status === "HOT" || virtual.comfortIndex.status === "WARM") {
    reasons.push(`Comfort index is ${virtual.comfortIndex.status.toLowerCase()}, so airflow is increased`);
  }
  if (weather.temperature <= 24) reasons.push("Cool outside weather lets the agent trim fan usage");
  if (physical.lightIntensity < 180) reasons.push("Low indoor lux triggers higher artificial lighting");
  if (!physical.motion && virtual.occupancy.level === "LOW") reasons.push("No recent activity keeps devices near standby");

  const previousFanSpeed = previousActuators?.fanSpeed || "OFF";
  const previousLightState = previousActuators?.lightState || "OFF";

  let narrative = `Room conditions are stable, so the system is keeping the fan ${fanState} and lights ${lightState}.`;

  if (virtual.occupancy.level === "LOW" && !physical.motion) {
    narrative = "Room is empty, so the system is saving energy by keeping unnecessary devices off.";
  } else if (fanState === "ON" && lightState === "ON") {
    narrative = `Fan turned ${fanSpeed} and lights adjusted to ${lightBrightness}% because the room is ${virtual.occupancy.level.toLowerCase()} occupancy, ${physical.temperature} C, and only ${physical.lightIntensity} lux.`;
  } else if (fanState === "ON") {
    narrative = `Fan turned ${fanSpeed} because temperature is ${physical.temperature} C, humidity is ${physical.humidity}%, and comfort is ${virtual.comfortIndex.status.toLowerCase()}.`;
  } else if (lightState === "ON") {
    narrative = `Lights turned on at ${lightBrightness}% because daylight is not sufficient at ${physical.lightIntensity} lux.`;
  } else if (weather.temperature <= 24 && previousFanSpeed !== "OFF") {
    narrative = `Outside air is cooler at ${weather.temperature} C, so the system reduced fan usage to avoid wasting energy.`;
  } else if (previousLightState === "ON" && lightState === "OFF") {
    narrative = "Lights were turned off because the room already has enough daylight.";
  }

  return {
    command: {
      fanState,
      fanSpeed,
      lightState,
      lightBrightness,
    },
    narrative,
    reasons,
    scores: {
      coolingDemand,
      lightingDemand,
      ecoAdjustment,
    },
  };
}

module.exports = {
  evaluateDecision,
};
