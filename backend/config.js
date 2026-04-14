const path = require("path");

const WEATHER_LOCATION = {
  latitude: Number(process.env.CLASSROOM_LATITUDE || 28.6139),
  longitude: Number(process.env.CLASSROOM_LONGITUDE || 77.209),
  name: process.env.CLASSROOM_LOCATION_NAME || "Smart Classroom Campus",
};

module.exports = {
  PORT: Number(process.env.PORT || 5000),
  UPDATE_INTERVAL_MS: Number(process.env.UPDATE_INTERVAL_MS || 5000),
  LOG_LIMIT: Number(process.env.LOG_LIMIT || 40),
  STATIC_DIR: path.join(__dirname, "..", "Frontend"),
  WEATHER_LOCATION,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || "",
};
