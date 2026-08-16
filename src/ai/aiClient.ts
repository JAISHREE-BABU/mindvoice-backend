// eslint-disable-next-line @typescript-eslint/no-explicit-any
let genAIInstance: any = null;

export async function getGenAI(): Promise<any> {
  if (!genAIInstance) {
    const { GoogleGenAI } = await import('@google/genai');
    genAIInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIInstance;
}

export const AI_MODEL = process.env.AI_CHAT_MODEL || 'gemini-2.5-flash-lite';