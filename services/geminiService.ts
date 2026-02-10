import { GoogleGenAI, Type } from "@google/genai";

const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const GeminiService = {
  /**
   * Helps a customer draft a better job description and suggests a price.
   */
  enhanceOrderDetails: async (rawInput: string) => {
    if (!apiKey || !ai) return null;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze this user request for a labor job: "${rawInput}". 
        Extract a professional title, a detailed description, a suitable category (e.g., Santexnika, Elektr, Tozalash, Yuk tashish, Qurilish), and an estimated price range in UZS (Uzbek Soums).
        CRITICAL: The output Title, Description and Category MUST be in Uzbek language.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              estimatedPrice: { type: Type.NUMBER, description: "Estimated price in UZS" },
            },
            required: ["title", "description", "category", "estimatedPrice"]
          }
        }
      });
      
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return null;
    }
  },

  /**
   * Admin tool to analyze market trends based on orders.
   */
  analyzeMarketTrends: async (orders: any[]) => {
    if (!apiKey || !ai) return "AI tahlili uchun API kalit talab qilinadi.";

    try {
      const orderSummary = orders.map(o => `${o.category}: ${o.price}`).join(', ');

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Mana bu so'nggi buyurtmalar ro'yxati: ${orderSummary}. 
        Platforma admini uchun qaysi kategoriyalar talab yuqori ekanligi va narx tendentsiyalari haqida qisqacha strategik xulosa yozing. 
        Javob o'zbek tilida bo'lsin.`,
      });
      
      return response.text;
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "Tahlil yaratib bo'lmadi.";
    }
  }
};