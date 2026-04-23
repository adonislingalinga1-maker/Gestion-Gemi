import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeEyeScan(imageBase64: string, scanType: 'OCT' | 'Fundus') {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    Tu es un assistant IA spécialisé en ophtalmologie. 
    Analyse l'image fournie (${scanType}).
    Dégage les points clés :
    - Signes pathologiques (ex: oedème, drusen, excavation papillaire)
    - Analyse de la couche nerveuse (si OCT)
    - Recommandations d'examens complémentaires.
    IMPORTANT : Rappelle toujours que ceci est un assistant à la décision et non un diagnostic final.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: systemInstruction },
            { 
              inlineData: { 
                mimeType: "image/jpeg", 
                data: imageBase64 
              } 
            }
          ]
        }
      ]
    });

    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Erreur d'analyse IA. Veuillez vérifier l'image et réessayer.";
  }
}

export async function predictRisk(patientData: any) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyse les risques ophtalmologiques pour ce patient :
    ${JSON.stringify(patientData, null, 2)}
    
    Retourne un score de risque (0-100) et une explication structurée en 3 points.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Risk prediction failed:", error);
    return null;
  }
}
