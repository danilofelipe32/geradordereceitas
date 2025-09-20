import { GoogleGenAI, Type } from '@google/genai';
import { Recipe } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * This prevents the app from crashing on load if the API key is not available,
 * allowing the UI to render and show a graceful error on interaction.
 */
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


const recipeSchema = {
    type: Type.OBJECT,
    properties: {
      recipeName: {
        type: Type.STRING,
        description: 'O nome da receita em Português.',
      },
      description: {
        type: Type.STRING,
        description: 'Uma breve descrição da receita em Português.',
      },
      servings: {
        type: Type.STRING,
        description: "O número de porções que a receita rende, ex: '4 pessoas'.",
      },
      prepTime: {
        type: Type.STRING,
        description: "O tempo de preparo, ex: '15 minutos'.",
      },
      cookTime: {
        type: Type.STRING,
        description: "O tempo de cozimento, ex: '30 minutos'.",
      },
      ingredients: {
        type: Type.ARRAY,
        description: 'Uma lista de ingredientes com quantidades, ex: "1 xícara de farinha".',
        items: {
          type: Type.STRING,
        },
      },
      instructions: {
        type: Type.ARRAY,
        description: 'Uma lista de instruções passo a passo para a receita.',
        items: {
          type: Type.STRING,
        },
      },
      nutrition: {
        type: Type.OBJECT,
        description: 'Informações nutricionais por porção.',
        properties: {
          calories: { type: Type.STRING, description: "Calorias, ex: '350 kcal'." },
          protein: { type: Type.STRING, description: "Proteína, ex: '15g'." },
          carbs: { type: Type.STRING, description: "Carboidratos, ex: '40g'." },
          fat: { type: Type.STRING, description: "Gordura, ex: '12g'." },
        },
      },
    },
  };

export const generateRecipe = async (
    ingredients: string,
    mealType: string,
    dietaryRestrictions: string[]
): Promise<Recipe> => {
    
    const actualRestrictions = dietaryRestrictions.filter(r => r !== "Sem restrições");

    const dietaryInfo = actualRestrictions.length > 0
        ? `A receita deve seguir as seguintes restrições alimentares: ${actualRestrictions.join(", ")}.`
        : "Não há restrições alimentares.";

    const prompt = `
        Você é um assistente culinário especialista.
        Gere uma receita criativa e atraente em português com base nos seguintes detalhes:
        - Tipo de refeição: "${mealType}"
        - Ingredientes principais: ${ingredients}
        - Restrições alimentares: ${dietaryInfo}
    `;

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: recipeSchema,
            },
        });
        
        const jsonText = response.text.trim();
        
        // Defensively strip markdown in case the model wraps the JSON
        const cleanedJsonText = jsonText.replace(/^```json\s*|```\s*$/g, '');

        const recipeData = JSON.parse(cleanedJsonText);
        return recipeData as Recipe;

    } catch (error) {
        console.error("Erro ao gerar receita com Gemini API:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Falha ao processar a resposta da receita. A API pode ter retornado um formato JSON inválido.");
        }
        if (error instanceof Error) {
            if (error.message.includes('API key not valid')) {
                 throw new Error("A chave da API não é válida. Verifique sua configuração.");
            }
             if (error.message.includes('quota')) {
                 throw new Error("A cota da API foi excedida. Por favor, tente novamente mais tarde.");
            }
            throw new Error("Falha ao gerar a receita. A API do Gemini pode estar temporariamente indisponível ou ocorreu um erro de configuração.");
        }
        throw new Error("Ocorreu um erro inesperado durante a geração da receita.");
    }
};