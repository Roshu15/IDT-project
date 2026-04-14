const axios = require("axios");

setInterval(async () => {
  const temperature = Math.floor(Math.random() * 10) + 25;
  const students = Math.floor(Math.random() * 60);
  const systemType = "classroom"; // Default
  const hour = new Date().getHours();
  const timeOfDay =
    hour >= 6 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 18
        ? "afternoon"
        : "evening";
  const locationTemp = Math.floor(Math.random() * 10) + 20; // Mock location temp

  try {
    await axios.post("http://localhost:5000/sensor-data", {
      temperature,
      students,
      systemType,
      timeOfDay,
      locationTemp,
    });
    console.log("Sensor:", temperature, students);
  } catch (e) {
    console.log("Error sending");
  }
}, 10000);
