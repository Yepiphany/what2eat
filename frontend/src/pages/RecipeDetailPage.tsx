import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Users,
  Flame,
  ChevronLeft,
  Play,
  ShoppingCart,
  Heart,
  Share2,
  ChefHat,
  Check,
  X,
  Plus
} from 'lucide-react';
import { recipeApi } from '../services/api';
import { useCookingStore, useUserStore } from '../stores';
import type { Recipe } from '../types';
import { incrementViewedRecipes } from './ProfilePage';

const difficultyLabels = {
  easy: { text: '简单', color: 'bg-green-100 text-green-700' },
  medium: { text: '中等', color: 'bg-yellow-100 text-yellow-700' },
  hard: { text: '困难', color: 'bg-red-100 text-red-700' },
};

const tasteEmojis: Record<string, string> = {
  spicy: '🌶️',
  sweet: '🍬',
  sour: '🍋',
  salty: '🧂',
  umami: '🍖',
  savory: '🍖',
  mild: '🥬',
  bitter: '☕',
  辣: '🌶️',
  甜: '🍬',
  酸: '🍋',
  咸: '🧂',
  鲜: '🍖',
  清淡: '🥬',
  苦: '☕',
};

const tasteLabels: Record<string, string> = {
  spicy: '辣',
  sweet: '甜',
  sour: '酸',
  salty: '咸',
  umami: '鲜',
  savory: '鲜',
  mild: '清淡',
  bitter: '苦',
  辣: '辣',
  甜: '甜',
  酸: '酸',
  咸: '咸',
  鲜: '鲜',
  清淡: '清淡',
  苦: '苦',
};

const dietLabels: Record<string, string> = {
  balanced: '均衡饮食',
  meat_lover: '爱吃肉',
  vegetable_lover: '爱吃菜',
  low_carb: '低碳水',
  vegetarian: '爱吃菜',
  normal: '均衡饮食',
};

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInShoppingList, setIsInShoppingList] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const hasViewedRef = useRef(false);
  
  const { currentSession, setSession } = useCookingStore();
  const { currentUser } = useUserStore();

  useEffect(() => {
    if (id && !hasViewedRef.current) {
      hasViewedRef.current = true;
      fetchRecipe(id);
      incrementViewedRecipes();
    }
  }, [id]);

  const fetchRecipe = async (recipeId: string) => {
    setIsLoading(true);
    try {
      const data = await recipeApi.getRecipe(recipeId);
      setRecipe(data);
    } catch (error) {
      console.error('Failed to fetch recipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (recipe && id) {
      checkShoppingList();
    }
  }, [recipe, id]);

  const checkShoppingList = async () => {
    try {
      const lists = await recipeApi.getShoppingLists('pending');
      const exists = lists.some((list: any) => list.recipe_id === id);
      setIsInShoppingList(exists);
    } catch (error) {
      console.error('Failed to check shopping list:', error);
    }
  };

  const startCooking = async () => {
    if (!recipe || !currentUser) {
      navigate('/profile');
      return;
    }

    try {
      const session = await cookingApi.startSession(recipe.id, currentUser.id);
      setSession(session);
      navigate(`/cooking/${recipe.id}`);
    } catch (error) {
      console.error('Failed to start cooking session:', error);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleAddToShoppingList = async () => {
    if (!recipe || !recipe.missing_ingredients || recipe.missing_ingredients.length === 0) {
      return;
    }

    setIsAdding(true);
    try {
      await recipeApi.addToShoppingList(recipe.id, recipe.missing_ingredients, recipe.title);
      setIsInShoppingList(true);
      alert('已添加到采购清单');
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      alert('添加失败，请重试');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">菜谱不存在</h2>
        <Link to="/recipes" className="btn-primary">
          返回菜谱列表
        </Link>
      </div>
    );
  }

  const hasAllIngredients = recipe.missing_ingredients && recipe.missing_ingredients.length === 0;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
      >
        <ChevronLeft size={20} />
        <span>返回</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="relative bg-gradient-to-br from-primary-400 to-primary-600 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex space-x-2">
                  <button
                    onClick={toggleFavorite}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform"
                  >
                    <Heart
                      size={20}
                      className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}
                    />
                  </button>
                  <button
                    onClick={() => navigator.share?.({ title: recipe.title, text: recipe.description })}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform"
                  >
                    <Share2 size={20} className="text-gray-600" />
                  </button>
                </div>

                {recipe.match_percentage !== undefined && recipe.match_percentage !== null && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2">
                    <ChefHat size={20} className="text-primary-600" />
                    <span className="font-medium text-primary-600">
                      {recipe.match_percentage}% 食材匹配
                    </span>
                  </div>
                )}
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">{recipe.title}</h1>
              
              {recipe.description && (
                <p className="text-white/80 mb-4">{recipe.description}</p>
              )}
            </div>
            
            <div className="p-6">
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <Clock size={18} className="text-primary-600" />
                  <span className="font-medium">{recipe.cooking_time} 分钟</span>
                </div>
                
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${difficultyLabels[recipe.difficulty].color}`}>
                  <ChefHat size={18} />
                  <span className="font-medium">{difficultyLabels[recipe.difficulty].text}</span>
                </div>
                
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <Users size={18} className="text-primary-600" />
                  <span className="font-medium">{recipe.servings} 人份</span>
                </div>
                
                {recipe.calories && (
                  <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <Flame size={18} className="text-orange-500" />
                    <span className="font-medium">{recipe.calories} 卡路里</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {recipe.taste_tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                  >
                    {tasteEmojis[tag]} {tasteLabels[tag] || tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">所需食材</h2>
              
              {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                <button
                  onClick={handleAddToShoppingList}
                  disabled={isAdding || !recipe.missing_ingredients || recipe.missing_ingredients.length === 0 || isInShoppingList}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isInShoppingList
                      ? 'bg-accent-500 text-white'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  } ${(isAdding || !recipe.missing_ingredients || recipe.missing_ingredients.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAdding ? (
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShoppingCart size={18} />
                  )}
                  <span>{isInShoppingList ? '已添加' : '添加至采购清单'}</span>
                </button>
              )}
            </div>

            {recipe.matched_ingredients && recipe.matched_ingredients.length > 0 && (
              <div className="mb-4 p-4 bg-accent-50 rounded-lg">
                <h3 className="font-medium text-accent-700 mb-2 flex items-center">
                  <Check size={18} className="mr-2" />
                  已有的食材
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.matched_ingredients.map(ing => (
                    <span
                      key={ing}
                      className="px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm"
                    >
                      ✓ {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
              <div className="mb-4 p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-700 mb-2 flex items-center">
                  <X size={18} className="mr-2" />
                  需要准备的食材
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.missing_ingredients.map(ing => (
                    <span
                      key={ing}
                      className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
                
                {recipe.missing_ingredients.some(ing => 
                  ['肉', '鸡', '猪', '牛', '羊', '鱼', '虾', '蟹', '肉'].some(keyword => ing.includes(keyword))
                ) && (
                  <div className="mt-3 p-3 bg-red-100 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">
                      ⚠️ 此菜谱需要关键食材，请准备或购买
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {recipe.ingredients.map((ing, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                    recipe.matched_ingredients?.includes(ing)
                      ? 'bg-gray-50'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <span className={recipe.matched_ingredients?.includes(ing) ? 'text-gray-500 line-through' : 'text-gray-800'}>
                    {ing}
                  </span>
                  {recipe.matched_ingredients?.includes(ing) && (
                    <Check size={18} className="text-accent-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">烹饪步骤</h2>
            
            <div className="space-y-6">
              {recipe.steps.map((step, index) => (
                <div key={index} className="flex space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 leading-relaxed">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <div className="space-y-4">
              <button
                onClick={startCooking}
                className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Play size={24} />
                <span>开始烹饪</span>
              </button>

              {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                <button
                  onClick={() => navigate('/shopping')}
                  className="w-full btn-secondary py-3 flex items-center justify-center space-x-2"
                >
                  <ShoppingCart size={20} />
                  <span>查看采购清单</span>
                </button>
              )}

              {hasAllIngredients && (
                <div className="p-4 bg-accent-50 rounded-lg text-center">
                  <p className="text-accent-700 font-medium mb-1">🎉 可以开始烹饪了！</p>
                  <p className="text-sm text-accent-600">所有食材都已准备好</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">烹饪小贴士</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-600">•</span>
                    <span>烹饪前准备好所有食材</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-600">•</span>
                    <span>可以根据个人口味调整调料用量</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-600">•</span>
                    <span>烹饪过程中注意火候控制</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-600">•</span>
                    <span>使用语音控制功能解放双手</span>
                  </li>
                </ul>
              </div>

              {recipe.diet_types && recipe.diet_types.filter(type => dietLabels[type]).length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-3">适合饮食类型</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.diet_types.filter(type => dietLabels[type]).map(type => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {dietLabels[type]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
