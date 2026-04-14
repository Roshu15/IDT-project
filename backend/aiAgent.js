function aiDecision(
  s,
  systemType = "classroom",
  timeOfDay = "morning",
  locationTemp = 25,
) {
  let lights = "OFF",
    fans = "OFF",
    fanSpeed = "LOW";

  // Adjust based on system type
  let occupancyThreshold =
    systemType === "home" ? 1 : systemType === "office" ? 5 : 10;

  // Time-based lighting
  if (timeOfDay === "morning" || timeOfDay === "afternoon") {
    lights = "ON";
  } else if (timeOfDay === "evening" && s.students > 0) {
    lights = "ON";
  }

  // Automatic fan control based on current temperature (real-time detection)
  if (s.temperature > 28) {
    fans = "ON";
    fanSpeed = "HIGH";
  } else if (s.temperature > 26) {
    fans = "ON";
    fanSpeed = "MEDIUM";
  } else if (s.temperature > 24) {
    fans = "ON";
    fanSpeed = "LOW";
  } else {
    fans = "OFF";
    fanSpeed = "LOW";
  }

  // Occupancy-based adjustments
  if (
    s.students > occupancyThreshold ||
    (systemType === "home" && s.students > 0)
  ) {
    // Increase lighting and fan for occupied spaces
    lights = "ON";
    if (s.temperature > 25) {
      fans = "ON";
      fanSpeed = fanSpeed === "LOW" ? "MEDIUM" : fanSpeed;
    }
  }

  // Turn off lights when no students and not home system
  if (s.students === 0 && systemType !== "home") {
    lights = "OFF";
  }

  return { lights, fans, fanSpeed };
}

module.exports = { aiDecision };
