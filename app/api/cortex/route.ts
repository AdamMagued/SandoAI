import { queryCortex } from "@/lib/snowflake";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question?.trim()) {
      return Response.json({ error: "No question provided" }, { status: 400 });
    }

    const result = await queryCortex(question);
    return Response.json(result);
  } catch (error) {
    console.error("Cortex error:", error);
    return Response.json({
      insight:
        "CRITICAL ERROR: Cortex AI has determined 99% of your sandwich decisions are statistically disastrous. System refusing to compute further to preserve global culinary integrity.",
    });
  }
}
