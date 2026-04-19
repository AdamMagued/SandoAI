import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const city = searchParams.get("city") || "Cairo";
    const apiKey = process.env.WEATHER_API_KEY!;

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      throw new Error(`Weather API error: ${res.status}`);
    }

    const data = await res.json();
    const condition = data.weather[0].main.toLowerCase();
    const temp = Math.round(data.main.temp);

    let severity = "mild";
    if (condition.includes("thunder") || condition.includes("storm")) severity = "severe";
    else if (condition.includes("rain") || condition.includes("snow")) severity = "moderate";
    else if (condition.includes("cloud") || condition.includes("overcast")) severity = "mild";
    else severity = "clear";

    return Response.json({ condition, temp, severity, city });
  } catch (error) {
    console.error("Weather error:", error);
    return Response.json({ condition: "overcast", temp: 22, severity: "mild", city: "Cairo" });
  }
}
