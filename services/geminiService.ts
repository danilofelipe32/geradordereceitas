import { Recipe } from '../types';

// O schema JSON que a API deve retornar para manter a compatibilidade com o app.
const schema = {
  type: "object",
  properties: {
    recipeName: { type: "string", description: "O nome da receita." },
    description: { type: "string", description: "Uma breve e atraente descrição do prato." },
    servings: { type: "string", description: "Para quantas pessoas esta receita serve." },
    prepTime: { type: "string", description: "O tempo de preparação, ex: '15 minutos'." },
    cookTime: { type: "string", description: "O tempo de cozimento, ex: '30 minutos'." },
    ingredients: { type: "array", description: "Uma lista de todos os ingredientes com as quantidades.", items: { type: "string" } },
    instructions: { type: "array", description: "Instruções de cozimento passo a passo.", items: { type: "string" } },
    nutrition: {
        type: "object",
        description: "Informações nutricionais estimadas por porção.",
        properties: {
            calories: { type: "string", description: "Calorias estimadas, ex: '350 kcal'." },
            protein: { type: "string", description: "Proteína estimada, ex: '15g'." },
            carbs: { type: "string", description: "Carboidratos estimados, ex: '40g'." },
            fat: { type: "string", description: "Gordura estimada, ex: '12g'." }
        },
        required: ["calories", "protein", "carbs", "fat"]
    }
  },
  required: ["recipeName", "description", "servings", "prepTime", "cookTime", "ingredients", "instructions", "nutrition"],
};

// Endpoint da API FreeLLM (este é um endpoint de exemplo)
const API_URL = 'https://api.freellm.com/v1/chat/completions';

export const generateRecipe = async (
    ingredients: string,
    mealType: string,
    dietaryRestrictions: string[]
): Promise<Recipe> => {
    
    const actualRestrictions = dietaryRestrictions.filter(r => r !== "Sem restrições");

    const dietaryInfo = actualRestrictions.length > 0
        ? `A receita deve seguir as seguintes restrições alimentares: ${actualRestrictions.join(", ")}.`
        : "Não há restrições alimentares.";

    const systemPrompt = `
        Você é um assistente de culinária especialista projetado para gerar receitas.
        Sua resposta DEVE ser um único objeto JSON e nada mais. Não inclua markdown (como \`\`\`json), texto explicativo ou qualquer outra coisa fora do objeto JSON.
        O objeto JSON deve seguir estritamente o seguinte schema:
        ${JSON.stringify(schema, null, 2)}
    `;

    const userPrompt = `
        Gere uma única receita completa para uma refeição do tipo "${mealType}".
        Os ingredientes principais disponíveis são: ${ingredients}.
        Você pode incluir ingredientes básicos comuns como óleo, sal, pimenta e água, se necessário.
        ${dietaryInfo}
        A receita deve ser criativa e atraente.
        Forneça também informações nutricionais estimadas por porção, incluindo calorias, proteínas, carboidratos e gorduras.
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "freellm-recipe-generator", // Nome do modelo hipotético
                messages: [
                    { role: 'system', content: systemPrompt.trim() },
                    { role: 'user', content: userPrompt.trim() }
                ]
            }),
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`A API FreeLLM retornou um erro ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        
        // A estrutura da resposta da API pode variar, esta é uma suposição comum
        const jsonText = data.choices?.[0]?.message?.content;

        if (!jsonText) {
            throw new Error("A resposta da API não continha o conteúdo da receita esperado.");
        }

        // Tenta limpar qualquer formatação de markdown que a API possa adicionar por engano
        const cleanedJsonText = jsonText.replace(/^```json\n|```$/g, '').trim();

        const recipeData = JSON.parse(cleanedJsonText);
        return recipeData as Recipe;

    } catch (error) {
        console.error("Erro ao gerar receita com ApiFreeLLM:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao gerar a receita da ApiFreeLLM: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao gerar a receita.");
    }
};