import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiVision = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export function getSandwichModel(systemInstruction: string) {
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
}
