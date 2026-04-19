import { NextRequest } from "next/server";
import {
  describeWmoCode,
  fetchForecast,
  geocodeCity,
  localHourFromIso,
  timeOfDayFromHour,
  type WeatherResult,
} from "@/lib/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallback(): WeatherResult {
  const now = new Date();
  const localHour = now.getHours();
  return {
    condition: "overcast",
    description: "overcast (offline fallback)",
    temp: 22,
    severity: "mild",
    city: "Unknown",
    latitude: 0,
    longitude: 0,
    isDay: localHour >= 6 && localHour < 18,
    localHour,
    localTimeIso: now.toISOString(),
    utcOffsetSeconds: 0,
    timeOfDay: timeOfDayFromHour(localHour),
  };
}

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const latStr = sp.get("lat");
    const lonStr = sp.get("lon");
    const cityParam = sp.get("city")?.trim();

    let lat: number;
    let lon: number;
    let city: string;

    if (latStr && lonStr) {
      lat = parseFloat(latStr);
      lon = parseFloat(lonStr);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("invalid lat/lon");
      }
      city = cityParam || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    } else if (cityParam) {
      const geo = await geocodeCity(cityParam);
      if (!geo) throw new Error(`unknown city: ${cityParam}`);
      lat = geo.lat;
      lon = geo.lon;
      city = geo.label;
    } else {
      // No location info at all — return offline fallback so the flow doesn't
      // hard-fail. The client should normally pass lat/lon from the browser.
      return Response.json(fallback());
    }

    const forecast = await fetchForecast(lat, lon);
    if (!forecast) throw new Error("forecast unreachable");

    const desc = describeWmoCode(forecast.code);
    const localHour = localHourFromIso(forecast.localTimeIso);

    const result: WeatherResult = {
      condition: desc.condition,
      description: desc.description,
      temp: Math.round(forecast.temp),
      severity: desc.severity,
      city,
      latitude: lat,
      longitude: lon,
      isDay: forecast.isDay,
      localHour,
      localTimeIso: forecast.localTimeIso,
      utcOffsetSeconds: forecast.utcOffsetSeconds,
      timeOfDay: timeOfDayFromHour(localHour),
    };
    return Response.json(result);
  } catch (error) {
    console.error("Weather error:", error);
    return Response.json(fallback());
  }
}
