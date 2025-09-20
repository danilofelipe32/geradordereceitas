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

    // Constrói o prompt detalhado para a ApiFreeLLM, exigindo uma resposta em JSON.
    const prompt = `
        Você é um assistente culinário especialista. Sua única função é retornar um objeto JSON de uma receita.
        NÃO retorne NADA além do objeto JSON. Não use markdown (como \`\`\`json), não adicione texto antes ou depois. Sua resposta deve ser apenas o JSON bruto.

        O objeto JSON deve ter esta estrutura exata:
        {
          "recipeName": "string (em Português)",
          "description": "string (em Português)",
          "servings": "string",
          "prepTime": "string (ex: '15 minutos')",
          "cookTime": "string (ex: '30 minutos')",
          "ingredients": ["string com quantidade e nome", "string", ...],
          "instructions": ["string passo-a-passo", "string", ...],
          "nutrition": {
            "calories": "string (ex: '350 kcal')",
            "protein": "string (ex: '15g')",
            "carbs": "string (ex: '40g')",
            "fat": "string (ex: '12g')"
          }
        }

        Gere uma receita com base nos seguintes detalhes:
        - Tipo de refeição: "${mealType}"
        - Ingredientes principais: ${ingredients}
        - Restrições alimentares: ${dietaryInfo}
        
        A receita deve ser criativa, atraente e o conteúdo deve estar em português.
    `;

    try {
        const apiResponse = await fetch('https://apifreellm.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: prompt }),
        });

        if (!apiResponse.ok) {
            // A ApiFreeLLM geralmente retorna 200 mesmo para erros, mas isso é um fallback para problemas de rede.
            throw new Error(`Erro de rede ao contatar a API: ${apiResponse.statusText}`);
        }

        const responseData = await apiResponse.json();

        if (responseData.status !== 'success') {
            const errorMessage = responseData.error || 'Erro desconhecido retornado pela API FreeLLM.';
            const retryAfter = responseData.retry_after ? ` Tente novamente em ${responseData.retry_after} segundos.` : '';
            throw new Error(`Falha ao gerar receita: ${errorMessage}${retryAfter}`);
        }

        if (!responseData.response) {
            throw new Error("A API FreeLLM retornou uma resposta vazia.");
        }
        
        // A resposta da ApiFreeLLM é uma string que deve ser o nosso JSON da receita.
        const jsonText = responseData.response.trim();
        
        const recipeData = JSON.parse(jsonText);
        return recipeData as Recipe;

    } catch (error)
    {
        console.error("Erro ao gerar receita com ApiFreeLLM:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Falha ao processar a resposta da receita. A API pode ter retornado um formato JSON inválido.");
        }
        if (error instanceof Error) {
            // Re-lança mensagens personalizadas ou a mensagem de erro original para a UI.
            throw new Error(error.message || "Ocorreu um erro desconhecido durante a geração da receita.");
        }
        throw new Error("Ocorreu um erro inesperado e desconhecido.");
    }
};
