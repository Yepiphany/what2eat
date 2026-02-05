import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, Flame, ChevronDown, Sparkles } from 'lucide-react';
import { useIngredientsStore, useRecipesStore } from '../stores';
import { recipeApi } from '../services/api';
import type { Recipe, DietType, TastePreference } from '../types';

const tasteOptions: { value: TastePreference; label: string; emoji: string }[] = [
  { value: 'spicy', label: '辣', emoji: '🌶️' },
  { value: 'sweet', label: '甜', emoji: '🍬' },
  { value: 'sour', label: '酸', emoji: '🍋' },
  { value: 'salty', label: '咸', emoji: '🧂' },
  { value: 'umami', label: '鲜', emoji: '🍖' },
  { value: 'mild', label: '清淡', emoji: '🥬' },
  { value: 'bitter', label: '苦', emoji: '☕' },
];

const dietOptions: { value: DietType; label: string }[] = [
  { value: 'normal', label: '普通' },
  { value: 'keto', label: '生酮' },
  { value: 'low_carb', label: '低碳水' },
  { value: 'low_fat', label: '低脂' },
  { value: 'vegetarian', label: '素食' },
  { value: 'vegan', label: '纯素' },
  { value: 'paleo', label: '原始人饮食' },
];

const difficultyOptions = [
  { value: 'easy', label: '简单', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: '中等', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'hard', label: '困难', color: 'bg-red-100 text-red-700' },
];

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTastes, setSelectedTastes] = useState<TastePreference[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<DietType | null>(null);
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { ingredients } = useIngredientsStore();
  const { recommendations, setRecommendations, setLoading } = useRecipesStore();

  const availableIngredientNames = ingredients.map(ing => ing.name);

  useEffect(() => {
    fetchRecommendations();
  }, [selectedTastes, selectedDiet, maxTime, selectedDifficulty]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setLoading(true);
    
    try {
      const request = {
        available_ingredients: availableIngredientNames,
        taste_preferences: selectedTastes,
        diet_type: selectedDiet || undefined,
        max_cooking_time: maxTime || undefined,
        max_difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard' || undefined,
      };
      
      const recipes = await recipeApi.getRecommendations(request);
      setRecommendations(recipes);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const toggleTaste = (taste: TastePreference) => {
    setSelectedTastes(prev =>
      prev.includes(taste)
        ? prev.filter(t => t !== taste)
        : [...prev, taste]
    );
  };

  const clearFilters = () => {
    setSelectedTastes([]);
    setSelectedDiet(null);
    setMaxTime(null);
    setSelectedDifficulty(null);
  };

  const hasActiveFilters = selectedTastes.length > 0 || selectedDiet || maxTime || selectedDifficulty;

  const filteredRecipes = searchQuery
    ? recommendations.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : recommendations;

  const getDifficultyColor = (difficulty: string) => {
    const option = difficultyOptions.find(opt => opt.value === difficulty);
    return option?.color || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">🍳 智能菜谱推荐</h1>
        <p className="text-gray-500 mt-2">
          {recommendations.length} 道菜谱推荐
          {availableIngredientNames.length > 0 && (
            <span className="text-primary-600">
              {' '}基于 {availableIngredientNames.length} 种食材
            </span>
          )}
        </p>
      </header>

      <div className="flex space-x-3">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索菜谱..."
            className="input-field pl-12"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
            showFilters || hasActiveFilters
              ? 'bg-primary-50 border-primary-500 text-primary-600'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter size={20} />
          <span>筛选</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-primary-500 rounded-full" />
          )}
        </button>
      </div>

      {showFilters && (
        <div className="card p-6 animate-slide-up">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                口味偏好
              </label>
              <div className="flex flex-wrap gap-2">
                {tasteOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleTaste(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedTastes.includes(option.value)
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                饮食类型
              </label>
              <div className="flex flex-wrap gap-2">
                {dietOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDiet(
                      selectedDiet === option.value ? null : option.value
                    )}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedDiet === option.value
                        ? 'bg-accent-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Clock size={16} className="inline mr-1" />
                最大烹饪时间
              </label>
              <div className="flex flex-wrap gap-2">
                {[15, 30, 45, 60, 90].map(time => (
                  <button
                    key={time}
                    onClick={() => setMaxTime(maxTime === time ? null : time)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      maxTime === time
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {time}分钟内
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                难度
              </label>
              <div className="flex flex-wrap gap-2">
                {difficultyOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDifficulty(
                      selectedDifficulty === option.value ? null : option.value
                    )}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedDifficulty === option.value
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${option.color}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  清除所有筛选
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      ) : filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecipes.map(recipe => (
            <Link
              key={recipe.id}
              to={`/recipes/${recipe.id}`}
              className="card hover:shadow-xl transition-all duration-300 group"
            >
              <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600">
                <div className="absolute inset-0 flex items-center justify-center text-white text-6xl opacity-50">
                  🍳
                </div>
                
                {recipe.match_percentage && recipe.match_percentage > 0 && (
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                    <Sparkles size={14} className="text-primary-600" />
                    <span className="text-sm font-medium text-primary-600">
                      {recipe.match_percentage}% 匹配
                    </span>
                  </div>
                )}
                
                <div className="absolute bottom-3 left-3 flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                    {difficultyOptions.find(o => o.value === recipe.difficulty)?.label}
                  </span>
                  <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 flex items-center">
                    <Clock size={12} className="mr-1" />
                    {recipe.cooking_time}分钟
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
                  {recipe.title}
                </h3>
                
                {recipe.description && (
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.taste_tags.slice(0, 3).map(tag => {
                    const tasteOption = tasteOptions.find(t => t.value === tag);
                    return (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600"
                      >
                        {tasteOption?.emoji} {tasteOption?.label}
                      </span>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {recipe.calories && (
                      <span className="text-sm text-gray-500">
                        🔥 {recipe.calories} 卡路里
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      👥 {recipe.servings}人份
                    </span>
                  </div>
                  
                  <span className="text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    查看详情 →
                  </span>
                </div>
                
                {recipe.matched_ingredients && recipe.matched_ingredients.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">已有食材：</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.matched_ingredients.slice(0, 5).map(ing => (
                        <span
                          key={ing}
                          className="text-xs px-2 py-0.5 bg-accent-100 text-accent-700 rounded-full"
                        >
                          ✓ {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">缺少食材：</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.missing_ingredients.slice(0, 3).map(ing => (
                        <span
                          key={ing}
                          className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full"
                        >
                          {ing}
                        </span>
                      ))}
                      {recipe.missing_ingredients.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{recipe.missing_ingredients.length - 3}更多
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            没有找到合适的菜谱
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            尝试调整筛选条件或添加更多食材到库存中
          </p>
          <Link to="/scanner" className="btn-primary">
            扫描更多食材
          </Link>
        </div>
      )}
    </div>
  );
}
