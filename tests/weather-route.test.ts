import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/weather/route";

function asNextRequest(input: Request): NextRequest {
  return input as unknown as NextRequest;
}

interface ResponseLike {
  ok: boolean;
  json: () => Promise<unknown>;
}

function mockFetch(handler: (url: string) => ResponseLike): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      return handler(url) as unknown as Response;
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/weather", () => {
  it("returns Open-Meteo data when given lat/lon", async () => {
    mockFetch((url) => {
      if (url.includes("api.open-meteo.com")) {
        return {
          ok: true,
          json: async () => ({
            current: {
              temperature_2m: 19.4,
              weathercode: 61,
              is_day: 1,
              time: "2026-04-19T13:00",
            },
            utc_offset_seconds: 0,
          }),
        };
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const res = await GET(
      asNextRequest(new Request("http://localhost/api/weather?lat=51.5&lon=-0.1"))
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.condition).toBe("rain");
    expect(body.severity).toBe("moderate");
    expect(body.temp).toBe(19);
    expect(body.timeOfDay).toBe("midday");
    expect(body.localHour).toBe(13);
    expect(body.latitude).toBe(51.5);
    expect(body.longitude).toBe(-0.1);
  });

  it("geocodes city names when lat/lon are absent", async () => {
    mockFetch((url) => {
      if (url.includes("geocoding-api.open-meteo.com")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                name: "Tokyo",
                country: "Japan",
                latitude: 35.6762,
                longitude: 139.6503,
              },
            ],
          }),
        };
      }
      if (url.includes("api.open-meteo.com")) {
        return {
          ok: true,
          json: async () => ({
            current: {
              temperature_2m: 24.0,
              weathercode: 0,
              is_day: 0,
              time: "2026-04-19T22:00",
            },
            utc_offset_seconds: 9 * 3600,
          }),
        };
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const res = await GET(
      asNextRequest(new Request("http://localhost/api/weather?city=Tokyo"))
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.condition).toBe("clear");
    expect(body.city).toContain("Tokyo");
    expect(body.timeOfDay).toBe("night");
    expect(body.isDay).toBe(false);
  });

  it("returns the offline fallback when no params are supplied", async () => {
    mockFetch(() => {
      throw new Error("fetch should not be called for the offline fallback");
    });
    const res = await GET(asNextRequest(new Request("http://localhost/api/weather")));
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.condition).toBe("overcast");
    expect(typeof body.timeOfDay).toBe("string");
  });

  it("returns the offline fallback if Open-Meteo is unreachable", async () => {
    mockFetch(() => ({ ok: false, json: async () => ({}) }));
    const res = await GET(
      asNextRequest(new Request("http://localhost/api/weather?lat=10&lon=10"))
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.condition).toBe("overcast");
    expect(body.severity).toBe("mild");
  });
});
