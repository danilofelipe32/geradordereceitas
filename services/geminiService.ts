import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    recipeName: {
      type: Type.STRING,
      description: "O nome da receita."
    },
    description: {
      type: Type.STRING,
      description: "Uma breve e atraente descrição do prato."
    },
    servings: {
        type: Type.STRING,
        description: "Para quantas pessoas esta receita serve."
    },
    prepTime: {
        type: Type.STRING,
        description: "O tempo de preparação, ex: '15 minutos'."
    },
    cookTime: {
        type: Type.STRING,
        description: "O tempo de cozimento, ex: '30 minutos'."
    },
    ingredients: {
      type: Type.ARRAY,
      description: "Uma lista de todos os ingredientes com as quantidades.",
      items: {
        type: Type.STRING
      }
    },
    instructions: {
      type: Type.ARRAY,
      description: "Instruções de cozimento passo a passo.",
      items: {
        type: Type.STRING
      }
    },
    nutrition: {
        type: Type.OBJECT,
        description: "Informações nutricionais estimadas por porção.",
        properties: {
            calories: { type: Type.STRING, description: "Calorias estimadas, ex: '350 kcal'." },
            protein: { type: Type.STRING, description: "Proteína estimada, ex: '15g'." },
            carbs: { type: Type.STRING, description: "Carboidratos estimados, ex: '40g'." },
            fat: { type: Type.STRING, description: "Gordura estimada, ex: '12g'." }
        },
        required: ["calories", "protein", "carbs", "fat"]
    }
  },
  required: ["recipeName", "description", "servings", "prepTime", "cookTime", "ingredients", "instructions", "nutrition"],
};

export const generateRecipe = async (
    ingredients: string,
    mealType: string,
    dietaryRestrictions: string[]
): Promise<Recipe> => {
    
    const dietaryInfo = dietaryRestrictions.length > 0
        ? `A receita deve seguir as seguintes restrições alimentares: ${dietaryRestrictions.join(", ")}.`
        : "Não há restrições alimentares.";

    const prompt = `
        Você é um chef especialista que cria receitas deliciosas e fáceis de seguir.
        Gere uma única receita completa para uma refeição do tipo "${mealType}".
        Os ingredientes principais disponíveis são: ${ingredients}.
        Você pode incluir ingredientes básicos comuns como óleo, sal, pimenta e água, se necessário.
        ${dietaryInfo}
        A receita deve ser criativa e atraente.
        Forneça também informações nutricionais estimadas por porção, incluindo calorias, proteínas, carboidratos e gorduras.
        Retorne a receita no formato JSON especificado.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonText = response.text.trim();
        const recipeData = JSON.parse(jsonText);
        return recipeData as Recipe;

    } catch (error) {
        console.error("Error generating recipe:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao gerar a receita da API Gemini: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao gerar a receita.");
    }
};
