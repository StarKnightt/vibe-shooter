import { GoogleGenAI, Type } from "@google/genai";
import { AnomalyEvent } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAnomaly = async (level: number, currentScrap: number): Promise<AnomalyEvent> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      You are the AI Game Master for a sci-fi space shooter. The player has discovered a mysterious cosmic anomaly.
      Current Level: ${level}.
      Current Scrap (Currency): ${currentScrap}.
      
      Generate a unique, mysterious, or dangerous short encounter description.
      Provide 2 distinct choices for the player to interact with it.
      One choice should be risky but rewarding, the other safe or strategic.
      
      The 'effect' field must be one of: 'HEAL', 'DAMAGE', 'SCRAP', 'WEAPON', 'NOTHING'.
      The 'value' field should be a number representing the magnitude (e.g., 20 health, 50 scrap).
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The text shown on the button" },
                  outcomeDescription: { type: Type.STRING, description: "Short flavor text of what happens after clicking" },
                  effect: { type: Type.STRING, enum: ['HEAL', 'DAMAGE', 'SCRAP', 'WEAPON', 'NOTHING'] },
                  value: { type: Type.NUMBER }
                },
                required: ["text", "outcomeDescription", "effect", "value"]
              }
            }
          },
          required: ["title", "description", "options"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini");
    }
    
    return JSON.parse(text) as AnomalyEvent;

  } catch (error) {
    console.error("Gemini generation failed:", error);
    // Fallback event if API fails
    return {
      title: "Static Interference",
      description: "The ship's sensors are picking up ghost signals, but the AI cannot decode them due to network failure.",
      options: [
        {
          text: "Reboot Systems (Heal)",
          outcomeDescription: "You spend time fixing the hull.",
          effect: "HEAL",
          value: 20
        },
        {
          text: "Scavenge Debris",
          outcomeDescription: "You find some loose scrap floating nearby.",
          effect: "SCRAP",
          value: 50
        }
      ]
    };
  }
};
