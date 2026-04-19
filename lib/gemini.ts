import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Default: Gemini 2.5 Flash. Override with GEMINI_MODEL if needed.
const FLASH_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const geminiVision = genAI.getGenerativeModel({ model: FLASH_MODEL });

export function getSandwichModel(systemInstruction: string) {
  return genAI.getGenerativeModel({ model: FLASH_MODEL, systemInstruction });
}
