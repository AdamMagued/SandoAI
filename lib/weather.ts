// Open-Meteo client. Free, no API key.
// Docs: https://open-meteo.com/en/docs

export type WeatherSeverity = "clear" | "mild" | "moderate" | "severe";

export type TimeOfDay =
  | "early_morning" // 05:00 – 09:59
  | "midday"        // 10:00 – 13:59
  | "afternoon"     // 14:00 – 17:59
  | "evening"       // 18:00 – 20:59
  | "night";        // 21:00 – 04:59

export interface WeatherResult {
  condition: string;
  description: string;
  temp: number;
  severity: WeatherSeverity;
  city: string;
  latitude: number;
  longitude: number;
  isDay: boolean;
  localHour: number;
  localTimeIso: string;
  utcOffsetSeconds: number;
  timeOfDay: TimeOfDay;
}

interface GeocodeHit {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
}

export async function geocodeCity(name: string): Promise<{
  lat: number;
  lon: number;
  label: string;
} | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=1&format=json`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const data = (await r.json()) as { results?: GeocodeHit[] };
  const hit = data.results?.[0];
  if (!hit) return null;
  const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
  return { lat: hit.latitude, lon: hit.longitude, label };
}

interface ForecastPayload {
  current: {
    temperature_2m: number;
    weathercode: number;
    is_day: 0 | 1;
    time: string;
  };
  utc_offset_seconds: number;
}

export async function fetchForecast(
  lat: number,
  lon: number
): Promise<{
  temp: number;
  code: number;
  isDay: boolean;
  localTimeIso: string;
  utcOffsetSeconds: number;
} | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode,is_day&temperature_unit=celsius&timezone=auto`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const data = (await r.json()) as ForecastPayload;
  return {
    temp: data.current.temperature_2m,
    code: data.current.weathercode,
    isDay: data.current.is_day === 1,
    localTimeIso: data.current.time,
    utcOffsetSeconds: data.utc_offset_seconds,
  };
}

export interface WmoDescription {
  condition: string;
  description: string;
  severity: WeatherSeverity;
}

// WMO weather interpretation codes — https://open-meteo.com/en/docs (legend table)
export function describeWmoCode(code: number): WmoDescription {
  if (code === 0) return { condition: "clear", description: "clear sky", severity: "clear" };
  if (code === 1) return { condition: "mainly_clear", description: "mainly clear", severity: "clear" };
  if (code === 2) return { condition: "partly_cloudy", description: "partly cloudy", severity: "mild" };
  if (code === 3) return { condition: "overcast", description: "overcast", severity: "mild" };
  if (code === 45 || code === 48) return { condition: "fog", description: "fog", severity: "mild" };
  if (code >= 51 && code <= 57) return { condition: "drizzle", description: "drizzle", severity: "moderate" };
  if (code >= 61 && code <= 67) return { condition: "rain", description: "rain", severity: "moderate" };
  if (code >= 71 && code <= 77) return { condition: "snow", description: "snow", severity: "moderate" };
  if (code >= 80 && code <= 82) return { condition: "rain_showers", description: "rain showers", severity: "moderate" };
  if (code >= 85 && code <= 86) return { condition: "snow_showers", description: "snow showers", severity: "moderate" };
  if (code >= 95 && code <= 99) return { condition: "thunderstorm", description: "thunderstorm", severity: "severe" };
  return { condition: "unknown", description: "unknown weather", severity: "mild" };
}

export function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 10) return "early_morning";
  if (hour >= 10 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 21) return "evening";
  return "night";
}

export function localHourFromIso(localTimeIso: string): number {
  const m = /T(\d{2}):/.exec(localTimeIso);
  if (m) return parseInt(m[1]!, 10);
  const d = new Date(localTimeIso);
  return Number.isNaN(d.getTime()) ? 12 : d.getHours();
}
