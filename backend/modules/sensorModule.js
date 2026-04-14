function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickModeProfile(hour) {
  if (hour >= 8 && hour < 10) {
    return {
      occupancyBase: 0.82,
      motionBias: 0.88,
      tempDrift: 0.55,
      humidityBase: 58,
      luxBase: 340,
    };
  }

  if (hour >= 10 && hour < 13) {
    return {
      occupancyBase: 0.94,
      motionBias: 0.93,
      tempDrift: 0.9,
      humidityBase: 61,
      luxBase: 390,
    };
  }

  if (hour >= 13 && hour < 16) {
    return {
      occupancyBase: 0.62,
      motionBias: 0.66,
      tempDrift: 0.35,
      humidityBase: 56,
      luxBase: 430,
    };
  }

  if (hour >= 16 && hour < 19) {
    return {
      occupancyBase: 0.36,
      motionBias: 0.45,
      tempDrift: 0.1,
      humidityBase: 52,
      luxBase: 210,
    };
  }

  return {
    occupancyBase: 0.08,
    motionBias: 0.12,
    tempDrift: -0.35,
    humidityBase: 48,
    luxBase: 95,
  };
}

function simulatePhysicalSensors(previousState = {}, weatherSnapshot = null) {
  const now = new Date();
  const hour = now.getHours();
  const profile = pickModeProfile(hour);
  const outdoorTemp = weatherSnapshot?.temperature ?? 28;
  const outdoorHumidity = weatherSnapshot?.humidity ?? 54;
  const conditionText = weatherSnapshot?.conditionText?.toLowerCase() || "";
  const weatherCloudiness =
    conditionText.includes("cloud") || conditionText.includes("rain") ? 0.8 : 0.2;

  const previousTemp = previousState.temperature ?? 25.5;
  const previousHumidity = previousState.humidity ?? 55;
  const previousLight = previousState.lightIntensity ?? 260;

  const occupancyNoise = randomBetween(-0.18, 0.16);
  const inferredPeople = clamp(
    Math.round(profile.occupancyBase * 42 + occupancyNoise * 18),
    0,
    46,
  );

  const motionProbability = clamp(
    profile.motionBias + (inferredPeople > 0 ? 0.08 : -0.2) + randomBetween(-0.18, 0.12),
    0.02,
    0.98,
  );
  const motion = Math.random() < motionProbability;

  const temperature = clamp(
    previousTemp * 0.64 +
      (21 + profile.tempDrift + inferredPeople * 0.11 + outdoorTemp * 0.18) * 0.36 +
      randomBetween(-0.4, 0.45),
    19,
    37,
  );

  const humidity = clamp(
    previousHumidity * 0.5 +
      (profile.humidityBase + outdoorHumidity * 0.22 + inferredPeople * 0.18) * 0.5 +
      randomBetween(-2.5, 2.2),
    32,
    82,
  );

  const daylightFactor = hour >= 7 && hour <= 17 ? Math.sin(((hour - 7) / 10) * Math.PI) : 0.06;
  const lightIntensity = clamp(
    previousLight * 0.4 +
      (profile.luxBase * (0.7 + daylightFactor) * (1 - weatherCloudiness * 0.25)) * 0.6 +
      randomBetween(-24, 26),
    20,
    900,
  );

  return {
    timestamp: now.toISOString(),
    temperature: Number(temperature.toFixed(1)),
    humidity: Number(humidity.toFixed(1)),
    lightIntensity: Math.round(lightIntensity),
    motion,
    inferredPeople,
  };
}

module.exports = {
  simulatePhysicalSensors,
};
