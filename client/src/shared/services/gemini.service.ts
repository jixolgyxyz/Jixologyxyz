import { GoogleGenAI } from '@google/genai';
import { env } from '@/core/config/env';

export async function callGemini(prompt: string, attempt = 1): Promise<string> {
  if (!env.geminiApiKey) throw new Error('VITE_GEMINI_API_KEY is not set in your .env file.');

  console.log('[Gemini] using key:', env.geminiApiKey.slice(0, 8) + '…');

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    if (!response.text) throw new Error('Gemini returned an empty response.');
    return response.text;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('too many requests');

    if (isRateLimit && attempt < 3) {
      await new Promise(r => setTimeout(r, attempt * 8000));
      return callGemini(prompt, attempt + 1);
    }

    if (isRateLimit) {
      throw new Error('La API de Gemini está recibiendo demasiadas solicitudes. Espera un momento e intenta de nuevo.');
    }

    throw err;
  }
}
