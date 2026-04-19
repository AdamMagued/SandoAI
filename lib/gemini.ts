import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Google retired `gemini-1.5-flash` from the v1beta endpoint. `gemini-flash-latest`
// transparently tracks the current Flash GA model.
const FLASH_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

export const geminiVision = genAI.getGenerativeModel({ model: FLASH_MODEL });

export function getSandwichModel(systemInstruction: string) {
  return genAI.getGenerativeModel({ model: FLASH_MODEL, systemInstruction });
}
