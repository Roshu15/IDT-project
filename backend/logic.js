function controlLogic(temp, students) {
  let lights = "OFF";
  let fans = "OFF";

  if (students > 0) lights = "ON";
  if (temp > 28) fans = "ON";

  if (students === 0) {
    lights = "OFF";
    fans = "OFF";
  }

  return { lights, fans };
}

module.exports = { controlLogic };