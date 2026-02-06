import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, X, RefreshCw } from 'lucide-react';
import { useIngredientsStore, useRecipesStore } from '../stores';
import { recipeApi } from '../services/api';
import type { Recipe, DietType, TastePreference } from '../types';

const difficultyOptions = [
  { value: 'easy', label: '简单', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium', label: '中等', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'hard', label: '困难', color: 'bg-red-100 text-red-700 border-red-200' },
];

export default function RecipesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showExcludeModal, setShowExcludeModal] = useState(false);
  
  const { ingredients } = useIngredientsStore();
  const { recipePages, currentPage, setRecipePages, addRecipePage, setCurrentPage, recommendations, setRecommendations, loadFromDatabase } = useRecipesStore();

  const availableIngredientNames = useMemo(() => 
    ingredients.map(ing => ing.name)
  , [ingredients]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);

  const fetchRecipes = useCallback(async (excludeList: string[] = [], forceRefresh: boolean = false) => {
    setIsLoading(true);
    
    try {
      const filteredIngredients = availableIngredientNames.filter(
        ing => !excludeList.includes(ing)
      );
      
      const request = {
        available_ingredients: filteredIngredients,
        force_refresh: forceRefresh,
      };
      
      const recipes = await recipeApi.getRecommendations(request);
      
      if (forceRefresh) {
        addRecipePage(recipes);
      } else {
        setRecommendations(recipes);
        setRecipePages([recipes]);
        setCurrentPage(0);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      if (recipePages.length === 0) {
        setRecommendations([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [availableIngredientNames, setRecommendations, addRecipePage, setCurrentPage, setRecipePages]);

  useEffect(() => {
    if (availableIngredientNames.length > 0) {
      loadFromDatabase().then(() => {
        if (recipePages.length === 0) {
          fetchRecipes([], false);
        }
      });
    }
  }, [availableIngredientNames]);

  const displayRecipes = recipePages[currentPage] || recommendations.slice(0, 5);
  const totalPages = recipePages.length;

  const handlePageChange = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, [setCurrentPage]);

  const toggleExcludeIngredient = useCallback((ingredient: string) => {
    setExcludedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    const option = difficultyOptions.find(opt => opt.value === difficulty);
    return option?.color || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const handleRefresh = useCallback(() => {
    setExcludedIngredients([]);
    fetchRecipes([], true);
  }, [fetchRecipes]);

  const confirmExclude = useCallback(() => {
    setShowExcludeModal(false);
    fetchRecipes(excludedIngredients, true);
  }, [fetchRecipes, excludedIngredients]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">🍳 智能菜谱推荐</h1>
        <p className="text-gray-500 mt-2">
          {availableIngredientNames.length > 0 ? (
            <>基于 {availableIngredientNames.length} 种食材，为您推荐四菜一汤</>
          ) : (
            <>添加食材后获取个性化推荐</>
          )}
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">AI 正在为您设计四菜一汤...</p>
            <p className="text-gray-400 text-sm mt-1">这可能需要几秒钟</p>
          </div>
        </div>
      ) : availableIngredientNames.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🥗</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            还没有食材
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            添加食材到库存后，AI 将根据您的食材推荐四菜一汤
          </p>
          <Link to="/scanner" className="btn-primary">
            扫描添加食材
          </Link>
        </div>
      ) : displayRecipes.length > 0 ? (
        <>
          <div className="space-y-4">
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayRecipes.filter((_, i) => i < 2).map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} getDifficultyColor={getDifficultyColor} />
                ))}
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {displayRecipes.slice(2).map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} getDifficultyColor={getDifficultyColor} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-6 space-x-4">
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      currentPage === index
                        ? 'bg-primary-500 w-6'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-8 py-4 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
              <span className="text-lg font-medium">不合胃口？</span>
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            没有找到合适的菜谱
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            尝试添加更多食材到库存中
          </p>
          <Link to="/scanner" className="btn-primary">
            扫描更多食材
          </Link>
        </div>
      )}

      {showExcludeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">选择不想吃的食材</h3>
              <button
                onClick={() => setShowExcludeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-500 mb-4">
              点击食材将其排除，系统将根据剩余食材重新推荐菜谱
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {availableIngredientNames.map(ing => (
                <button
                  key={ing}
                  onClick={() => toggleExcludeIngredient(ing)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    excludedIngredients.includes(ing)
                      ? 'bg-gray-300 text-gray-500 line-through'
                      : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  }`}
                >
                  {ing}
                </button>
              ))}
            </div>
            
            {excludedIngredients.length > 0 && (
              <p className="text-orange-600 text-sm mb-4">
                已排除 {excludedIngredients.length} 种食材
              </p>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowExcludeModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmExclude}
                className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                重新推荐
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe, getDifficultyColor }: { recipe: Recipe; getDifficultyColor: (difficulty: string) => string }) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="card hover:shadow-xl transition-all duration-300 group"
    >
      <div className="h-20 bg-gradient-to-br from-primary-400 to-primary-600 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(recipe.difficulty)}`}>
            {difficultyOptions.find(o => o.value === recipe.difficulty)?.label}
          </span>
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 flex items-center">
            <Clock size={12} className="mr-1" />
            {recipe.cooking_time}分钟
          </span>
        </div>
        
        {recipe.match_percentage && recipe.match_percentage > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
            <span className="text-sm font-medium text-primary-600">
              {recipe.match_percentage}%
            </span>
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
          {recipe.title}
        </h3>
        
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {recipe.description}
        </p>
        
        <div className="flex flex-wrap gap-1">
          {recipe.matched_ingredients && recipe.matched_ingredients.length > 0 && (
            <>
              {recipe.matched_ingredients.slice(0, 4).map(ing => (
                <span
                  key={ing}
                  className="text-xs px-2 py-0.5 bg-accent-100 text-accent-700 rounded-full"
                >
                  ✓ {ing}
                </span>
              ))}
              {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                  缺: {recipe.missing_ingredients.slice(0, 2).join(', ')}
                  {recipe.missing_ingredients.length > 2 && ` +${recipe.missing_ingredients.length - 2}`}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
