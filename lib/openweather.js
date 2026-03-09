const axios = require("axios");

const API_KEY = (process.env.OPENWEATHER_API_KEY || "").trim();

function hasApiKey() {
  return API_KEY.length > 0;
}

function normalizeResult(location, current, forecast = []) {
  const result = {
    location,
    current: current || null,
    forecast: Array.isArray(forecast) ? forecast : [],
  };
  return JSON.stringify(result, null, 2);
}

async function fetchFromOpenWeather(location) {
  if (!API_KEY) throw new Error("OPENWEATHER_API_KEY chưa cấu hình");
  const q = encodeURIComponent(String(location).trim());
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${API_KEY}&units=metric&lang=vi`;
  const { data } = await axios.get(url, { timeout: 10000 });

  if (data?.cod !== 200) {
    const msg = data?.message || "Không tìm thấy địa điểm";
    throw new Error(msg);
  }

  const main = data?.main ?? {};
  const weather = data?.weather?.[0];
  const wind = data?.wind ?? {};
  const name = data?.name || location;
  const country = data?.sys?.country || "";

  const degToDir = (deg) => {
    if (deg == null) return "N/A";
    const dirs = ["Bắc", "ĐBắc", "Đông", "ĐNam", "Nam", "Tây Nam", "Tây", "TBắc"];
    const i = Math.round((deg % 360) / 45) % 8;
    return dirs[i];
  };

  const current = {
    temp_C: String(Math.round(Number(main.temp) || 0)),
    FeelsLikeC: String(Math.round(Number(main.feels_like) || main.temp)),
    humidity: String(main.humidity ?? "N/A"),
    weatherDesc: weather?.description || "N/A",
    windspeedKmph: wind.speed ? String(Math.round(wind.speed * 3.6)) : "N/A",
    winddir16Point: degToDir(wind.deg),
    pressure: String(main.pressure ?? "N/A"),
  };

  const locStr = `${name}${country ? `, ${country}` : ""}`;
  return normalizeResult(locStr, current, []);
}

async function fetchFromWttr(location) {
  const encoded = encodeURIComponent(String(location).trim());
  const url = `https://wttr.in/${encoded}?format=j1&lang=vi`;
  const { data } = await axios.get(url, {
    timeout: 10000,
    headers: { "User-Agent": "curl/7.64.1" },
  });

  const current = data?.current_condition?.[0];
  const area = data?.nearest_area?.[0];
  const areaName = area?.areaName?.[0]?.value || area?.region?.[0]?.value || location;
  const country = area?.country?.[0]?.value || "";

  const locStr = `${areaName}${country ? `, ${country}` : ""}`;
  const currentNorm = current
    ? {
        temp_C: current.temp_C,
        FeelsLikeC: current.FeelsLikeC,
        humidity: current.humidity,
        weatherDesc: current.weatherDesc?.[0]?.value || "N/A",
        windspeedKmph: current.windspeedKmph,
        winddir16Point: current.winddir16Point,
        pressure: current.pressure,
      }
    : null;

  const forecast = (data?.weather ?? []).slice(0, 3).map((d) => ({
    date: d?.date,
    maxTempC: d?.maxtempC,
    minTempC: d?.mintempC,
    description:
      d?.hourly?.[6]?.weatherDesc?.[0]?.value || d?.hourly?.[12]?.weatherDesc?.[0]?.value || "N/A",
  }));

  return normalizeResult(locStr, currentNorm, forecast);
}

async function fetchWeather(location) {
  if (hasApiKey()) {
    try {
      return await fetchFromOpenWeather(location);
    } catch (err) {
      console.warn("OpenWeather fail, fallback wttr:", err?.message);
    }
  }
  return await fetchFromWttr(location);
}

module.exports = {
  fetchWeather,
  hasApiKey,
  fetchFromOpenWeather,
  fetchFromWttr,
};
