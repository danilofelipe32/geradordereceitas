import { Recipe } from '../types';

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

        Sua resposta DEVE ser um objeto JSON VÁLIDO e NADA MAIS. Não inclua texto explicativo, comentários ou markdown como \`\`\`json.
        O objeto JSON deve corresponder estritamente à seguinte estrutura:
        {
          "recipeName": "string",
          "description": "string",
          "servings": "string (ex: '4 pessoas')",
          "prepTime": "string (ex: '15 minutos')",
          "cookTime": "string (ex: '30 minutos')",
          "ingredients": ["string com quantidade e nome", "...", ...],
          "instructions": ["passo 1", "passo 2", ...],
          "nutrition": {
            "calories": "string (ex: '350 kcal')",
            "protein": "string (ex: '15g')",
            "carbs": "string (ex: '40g')",
            "fat": "string (ex: '12g')"
          }
        }
    `;

    try {
        const response = await fetch("https://apifreellm.com/api/chat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: prompt }),
        });

        if (!response.ok) {
            throw new Error(`Erro de rede: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            try {
                // The response from the LLM is expected to be a JSON string.
                const recipeData = JSON.parse(data.response);
                return recipeData as Recipe;
            } catch (parseError) {
                 console.error("Falha ao analisar JSON da resposta da API:", data.response, parseError);
                 throw new Error("Falha ao processar a resposta da receita. A API retornou um formato JSON inválido.");
            }
        } else if (data.status === 'rate_limited') {
            throw new Error(`Você está fazendo muitas solicitações. Por favor, aguarde ${data.retry_after || 5} segundos e tente novamente.`);
        } else {
            throw new Error(`A API retornou um erro: ${data.error || 'Erro desconhecido'}`);
        }

    } catch (error) {
        console.error("Erro ao gerar receita com ApiFreeLLM:", error);
        if (error instanceof Error) {
            if (error.message.includes('API key not valid')) {
                 throw new Error("A chave da API não é válida. Verifique sua configuração.");
            }
             if (error.message.includes('quota')) {
                 throw new Error("A cota da API foi excedida. Por favor, tente novamente mais tarde.");
            }
             if (error.message.includes('Failed to fetch')) {
                throw new Error("Não foi possível conectar-se à API. Verifique sua conexão com a Internet.");
            }
            throw error;
        }
        throw new Error("Ocorreu um erro inesperado durante a geração da receita.");
    }
};
