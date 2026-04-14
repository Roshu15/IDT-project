const axios = require("axios");
const { OPENWEATHER_API_KEY, WEATHER_LOCATION } = require("../config");

function weatherCodeToText(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Stormy";
  return "Unknown";
}

async function fetchFromOpenWeather() {
  const url = "https://api.openweathermap.org/data/2.5/weather";
  const response = await axios.get(url, {
    params: {
      lat: WEATHER_LOCATION.latitude,
      lon: WEATHER_LOCATION.longitude,
      appid: OPENWEATHER_API_KEY,
      units: "metric",
    },
    timeout: 4000,
  });

  return {
    provider: "OpenWeatherMap",
    temperature: Number(response.data.main.temp),
    humidity: Number(response.data.main.humidity),
    conditionText: response.data.weather?.[0]?.description || "Unknown",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFromOpenMeteo() {
  const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: WEATHER_LOCATION.latitude,
      longitude: WEATHER_LOCATION.longitude,
      current: "temperature_2m,relative_humidity_2m,weather_code",
    },
    timeout: 4000,
  });
  const current = response.data.current || {};
  return {
    provider: "Open-Meteo",
    temperature: Number(current.temperature_2m ?? 28),
    humidity: Number(current.relative_humidity_2m ?? 50),
    conditionText: weatherCodeToText(Number(current.weather_code ?? 0)),
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchWeatherSnapshot() {
  try {
    if (OPENWEATHER_API_KEY) {
      return await fetchFromOpenWeather();
    }

    return await fetchFromOpenMeteo();
  } catch (error) {
    return {
      provider: OPENWEATHER_API_KEY ? "OpenWeatherMap" : "Open-Meteo",
      temperature: 28,
      humidity: 52,
      conditionText: "Weather unavailable",
      fetchedAt: new Date().toISOString(),
      fallback: true,
      error: error.message,
    };
  }
}

module.exports = {
  fetchWeatherSnapshot,
};
