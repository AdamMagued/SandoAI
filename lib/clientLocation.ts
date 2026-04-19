export interface ClientCoords {
  latitude: number;
  longitude: number;
}

/**
 * Browser geolocation with a hard timeout. Returns null if the user denies,
 * the browser doesn't support it, or it takes too long.
 */
export function getBrowserCoords(timeoutMs = 5000): Promise<ClientCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const done = (value: ClientCoords | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = window.setTimeout(() => done(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        done({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        window.clearTimeout(timer);
        done(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
    );
  });
}

export function buildWeatherQuery(coords: ClientCoords | null, fallbackCity = ""): string {
  if (coords) {
    return `lat=${coords.latitude}&lon=${coords.longitude}`;
  }
  if (fallbackCity) {
    return `city=${encodeURIComponent(fallbackCity)}`;
  }
  return "";
}
