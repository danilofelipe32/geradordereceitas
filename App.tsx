import React, { useState, useCallback, useEffect } from 'react';
import { generateRecipe } from './services/geminiService';
import { Recipe } from './types';

const dietaryOptionsList = ["Vegetariano", "Vegano", "Sem Glúten", "Sem Laticínios", "Sem Oleaginosas", "Diabetes", "Celíaco", "Ovo Lacto Vegetariano", "Baixo FODMAP", "Keto", "Paleo"];
const mealTypesList = ["Café da Manhã", "Almoço", "Jantar", "Lanche", "Sobremesa"];
const unitOptions = ["unidade(s)", "g", "kg", "ml", "L", "xícara(s)", "colher(es) de sopa", "colher(es) de chá", "pitada(s)", "a gosto"];

interface Ingredient {
  id: number;
  name: string;
  quantity: string;
  unit: string;
}

// Helper Component: Loading Spinner
const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4 text-lg font-medium text-gray-700">Criando sua receita mágica...</p>
    <p className="text-sm text-gray-500">O chef Gemini está no comando!</p>
  </div>
);

// Helper Component: Error Display
interface ErrorDisplayProps {
  message: string;
}
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-lg" role="alert">
    <p className="font-bold">Ocorreu um Erro</p>
    <p>{message}</p>
  </div>
);

// Helper Component: Recipe Display
interface RecipeDisplayProps {
  recipe: Recipe;
  onSave: (recipe: Recipe) => void;
  isSaved: boolean;
}
const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ recipe, onSave, isSaved }) => {
    const [shareFeedback, setShareFeedback] = useState<string>('');

    const handleShare = async () => {
        const ingredientsText = recipe.ingredients.map(ing => `- ${ing}`).join('\n');
        const instructionsText = recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n');

        const shareText = `
Receita: ${recipe.recipeName}

${recipe.description}

🍴 Porções: ${recipe.servings}
🍳 Preparo: ${recipe.prepTime}
🔥 Cozimento: ${recipe.cookTime}

📋 Ingredientes:
${ingredientsText}

📝 Instruções:
${instructionsText}
        `.trim();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: recipe.recipeName,
                    text: shareText,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Compartilhamento cancelado ou falhou', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                setShareFeedback('Copiado!');
            } catch (error) {
                setShareFeedback('Falha ao copiar');
            } finally {
                setTimeout(() => setShareFeedback(''), 2000);
            }
        }
    };

    const InfoCard: React.FC<{ icon: JSX.Element; label: string; value: string }> = ({ icon, label, value }) => (
        <div className="bg-gray-100 p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="text-green-600 mb-2">{icon}</div>
            <p className="text-sm font-semibold text-gray-600">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    );

    return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl animate-fade-in w-full">
        <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">{recipe.recipeName}</h2>
                <p className="text-gray-500 mt-2 italic">{recipe.description}</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                <button
                    onClick={handleShare}
                    className="p-2 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200"
                    aria-label="Compartilhar Receita"
                >
                     {shareFeedback ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                    )}
                </button>
                <button
                    onClick={() => onSave(recipe)}
                    disabled={isSaved}
                    className={`p-2 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
                        isSaved
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                    aria-label={isSaved ? "Receita Salva" : "Salvar Receita"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" />
                    </svg>
                </button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
            <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} label="Porções" value={recipe.servings} />
            <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Preparo" value={recipe.prepTime} />
            <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.53a7 7 0 01-2.077-2.077" /></svg>} label="Cozimento" value={recipe.cookTime} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
                <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b-2 border-green-300 pb-2">Ingredientes</h3>
                <ul className="space-y-3 text-gray-700">
                    {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>{ingredient}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="md:col-span-3">
                <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b-2 border-green-300 pb-2">Instruções</h3>
                <ol className="space-y-4 text-gray-800">
                    {recipe.instructions.map((step, index) => (
                        <li key={index} className="flex items-start">
                           <span className="flex-shrink-0 bg-green-500 text-white rounded-full h-8 w-8 text-md font-bold flex items-center justify-center mr-4 mt-1 shadow">{index + 1}</span>
                           <span className="pt-1">{step}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>

        {recipe.nutrition && (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-2xl font-semibold text-gray-700 mb-4 text-center">Informações Nutricionais</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <InfoCard icon={<>⚡️</>} label="Calorias" value={recipe.nutrition.calories} />
                    <InfoCard icon={<>💪</>} label="Proteínas" value={recipe.nutrition.protein} />
                    <InfoCard icon={<>🍞</>} label="Carbs" value={recipe.nutrition.carbs} />
                    <InfoCard icon={<>🥑</>} label="Gorduras" value={recipe.nutrition.fat} />
                </div>
            </div>
        )}
    </div>
)};


// Helper Component: Favorites List
interface FavoritesListProps {
    recipes: Recipe[];
    onView: (recipe: Recipe) => void;
    onRemove: (recipeName: string) => void;
}
const FavoritesList: React.FC<FavoritesListProps> = ({ recipes, onView, onRemove }) => (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Receitas Favoritas</h2>
        {recipes.length === 0 ? (
            <div className="text-center py-16">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                 </svg>
                <p className="mt-4 text-gray-500">Você ainda não salvou nenhuma receita.</p>
                <p className="text-sm text-gray-400">Clique no ícone de salvar em uma receita gerada para adicioná-la aqui.</p>
            </div>
        ) : (
            <ul className="space-y-4">
                {recipes.map((recipe) => (
                    <li key={recipe.recipeName} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-green-300 transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">{recipe.recipeName}</h3>
                                <p className="text-sm text-gray-600 truncate max-w-xs sm:max-w-md">{recipe.description}</p>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                 <button 
                                    onClick={() => onView(recipe)}
                                    className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition"
                                    aria-label={`Ver receita de ${recipe.recipeName}`}
                                 >
                                    Ver
                                 </button>
                                 <button 
                                    onClick={() => onRemove(recipe.recipeName)}
                                    className="p-2 text-red-500 bg-red-100 rounded-full hover:bg-red-200 transition"
                                    aria-label={`Remover ${recipe.recipeName} dos favoritos`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                 </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
);


// Main App Component
const App: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ id: Date.now(), name: '', quantity: '', unit: '' }]);
  const [mealType, setMealType] = useState<string>('Jantar');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<'generator' | 'favorites'>('generator');

  useEffect(() => {
    try {
        const storedRecipes = localStorage.getItem('savedRecipes');
        if (storedRecipes) {
            setSavedRecipes(JSON.parse(storedRecipes));
        }
    } catch (error) {
        console.error("Falha ao analisar receitas salvas do localStorage", error);
        setSavedRecipes([]);
    }
  }, []);

  const isRecipeSaved = (recipeToCheck: Recipe | null): boolean => {
    if (!recipeToCheck) return false;
    return savedRecipes.some(r => r.recipeName === recipeToCheck.recipeName);
  };

  const handleSaveRecipe = (recipeToSave: Recipe) => {
      if (isRecipeSaved(recipeToSave)) return;
      const updatedRecipes = [...savedRecipes, recipeToSave];
      setSavedRecipes(updatedRecipes);
      localStorage.setItem('savedRecipes', JSON.stringify(updatedRecipes));
  };

  const handleRemoveRecipe = (recipeName: string) => {
      const updatedRecipes = savedRecipes.filter(r => r.recipeName !== recipeName);
      setSavedRecipes(updatedRecipes);
      localStorage.setItem('savedRecipes', JSON.stringify(updatedRecipes));
  };

  const handleViewSavedRecipe = (recipeToView: Recipe) => {
      setRecipe(recipeToView);
      setView('generator');
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const handleDietaryChange = (option: string) => {
    setDietaryRestrictions(prev =>
      prev.includes(option)
        ? prev.filter(item => item !== option)
        : [...prev, option]
    );
  };

  const handleIngredientChange = (id: number, field: keyof Omit<Ingredient, 'id'>, value: string) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  const handleAddIngredient = () => {
    setIngredients(prev => [...prev, { id: Date.now(), name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveIngredient = (id: number) => {
    if (ingredients.length > 1) {
      setIngredients(prev => prev.filter(ing => ing.id !== id));
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validIngredients = ingredients.filter(ing => ing.name.trim() !== '');
    if (validIngredients.length === 0) {
      setError("Por favor, insira pelo menos um ingrediente.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecipe(null);

    const ingredientsString = validIngredients
      .map(ing => `${ing.quantity} ${ing.unit} ${ing.name}`.trim())
      .join(', ');

    try {
      const result = await generateRecipe(ingredientsString, mealType, dietaryRestrictions);
      setRecipe(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsLoading(false);
    }
  }, [ingredients, mealType, dietaryRestrictions]);
  
  const NavButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`w-full py-3 text-lg font-bold rounded-lg transition-all duration-300 relative ${
        active
          ? 'text-green-600'
          : 'text-gray-500 hover:text-green-500'
      }`}
    >
      {children}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-green-500 rounded-full"></span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-transparent text-gray-800">
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-3 tracking-tight">Gerador de Receitas</h1>
            <p className="text-lg text-gray-200">Transforme seus ingredientes em uma obra-prima culinária.</p>
          </header>

          <nav className="flex justify-center mb-8 bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-lg space-x-2">
            <NavButton active={view === 'generator'} onClick={() => setView('generator')}>
                Gerador
            </NavButton>
            <NavButton active={view === 'favorites'} onClick={() => setView('favorites')}>
                Favoritos ({savedRecipes.length})
            </NavButton>
          </nav>

          {view === 'generator' && (
            <>
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl mb-8">
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-8 mb-6">
                            <div>
                                <label className="block text-xl font-semibold text-gray-700 mb-3">
                                Quais ingredientes você tem?
                                </label>
                                <div className="space-y-3">
                                {ingredients.map((ing) => (
                                    <div key={ing.id} className="grid grid-cols-12 gap-2 items-center">
                                        <input
                                            type="text"
                                            placeholder="Ingrediente"
                                            value={ing.name}
                                            onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                                            className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                            disabled={isLoading}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Qtd."
                                            min="0"
                                            value={ing.quantity}
                                            onChange={(e) => handleIngredientChange(ing.id, 'quantity', e.target.value)}
                                            className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                            disabled={isLoading}
                                        />
                                        <select
                                            value={ing.unit}
                                            onChange={(e) => handleIngredientChange(ing.id, 'unit', e.target.value)}
                                            className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition"
                                            disabled={isLoading}
                                        >
                                            <option value="">Unidade</option>
                                            {unitOptions.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveIngredient(ing.id)}
                                            disabled={isLoading || ingredients.length <= 1}
                                            className="col-span-1 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed flex justify-center items-center"
                                            aria-label="Remover ingrediente"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddIngredient}
                                    disabled={isLoading}
                                    className="mt-4 text-green-600 font-semibold hover:text-green-800 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                    Adicionar Ingrediente
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                  <label htmlFor="mealType" className="block text-lg font-medium text-gray-700 mb-2">Tipo de Refeição</label>
                                  <select
                                      id="mealType"
                                      value={mealType}
                                      onChange={(e) => setMealType(e.target.value)}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                                      disabled={isLoading}
                                  >
                                      {mealTypesList.map(type => <option key={type} value={type}>{type}</option>)}
                                  </select>
                              </div>

                              <div>
                                  <label className="block text-lg font-medium text-gray-700 mb-2">Opções de Dieta</label>
                                  <div className="flex flex-wrap gap-2">
                                      {dietaryOptionsList.map(option => (
                                      <button
                                          key={option}
                                          type="button"
                                          onClick={() => handleDietaryChange(option)}
                                          disabled={isLoading}
                                          className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 border-2 ${
                                          dietaryRestrictions.includes(option)
                                              ? 'bg-green-600 text-white border-green-600 shadow-md'
                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-100'
                                          }`}
                                      >
                                          {option}
                                      </button>
                                      ))}
                                  </div>
                              </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg py-4 px-4 rounded-lg hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-opacity-50 transition-all transform hover:scale-[1.02] duration-300 ease-in-out disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? 'Gerando...' : 'Gerar Receita'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 min-h-[200px] flex items-center justify-center">
                    {isLoading && <LoadingSpinner />}
                    {error && !isLoading && <ErrorDisplay message={error} />}
                    {recipe && !isLoading && <RecipeDisplay recipe={recipe} onSave={handleSaveRecipe} isSaved={isRecipeSaved(recipe)} />}
                    {!isLoading && !error && !recipe && (
                    <div className="text-center text-gray-300 bg-black/20 p-8 rounded-2xl">
                        <p className="text-xl">Sua receita gerada aparecerá aqui!</p>
                        <p className="text-sm opacity-80">Preencha o formulário acima para começar.</p>
                    </div>
                    )}
                </div>
            </>
          )}

          {view === 'favorites' && (
              <FavoritesList
                recipes={savedRecipes}
                onView={handleViewSavedRecipe}
                onRemove={handleRemoveRecipe}
              />
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
