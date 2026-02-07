import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scan, Utensils, ChefHat, ArrowRight, Sparkles, Plus, X, ShoppingCart, Check, RefreshCw } from 'lucide-react';
import { useIngredientsStore, useRecipesStore } from '../stores';
import { ingredientApi, recipeApi } from '../services/api';
import type { Ingredient } from '../types';

export default function HomePage() {
  const { ingredients, addIngredient, setIngredients, removeIngredient } = useIngredientsStore();
  const { recommendations, setRecommendations, recipePages } = useRecipesStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: 1, unit: '个', category: 'other' });
  const [isAdding, setIsAdding] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [showRecipeRefreshDialog, setShowRecipeRefreshDialog] = useState(false);

  const expiringSoon = ingredients.filter(ing => ing.is_expiring_soon);
  const hasIngredients = ingredients.length > 0;

  useEffect(() => {
    loadShoppingLists();
  }, []);

  useEffect(() => {
    if (hasIngredients && recommendations.length === 0 && !isLoadingRecipes) {
      loadRecommendations();
    }
  }, [hasIngredients, recommendations.length]);

  const loadRecommendations = async () => {
    setIsLoadingRecipes(true);
    try {
      const request = {
        available_ingredients: ingredients.map(ing => ing.name),
        force_refresh: false,
      };
      const recipes = await recipeApi.getRecommendations(request);
      setRecommendations(recipes);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const loadShoppingLists = async () => {
    try {
      const lists = await recipeApi.getShoppingLists('pending');
      setShoppingLists(lists);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    }
  };

  const getItemName = (item: any): string => {
    if (typeof item === 'object' && item !== null) {
      return item.name || '';
    }
    return item || '';
  };

  const getItemCompleted = (item: any): boolean => {
    if (typeof item === 'object' && item !== null) {
      return item.completed === true;
    }
    return false;
  };

  const pendingPurchaseCount = shoppingLists.reduce((count, list) => {
    const pendingItems = list.items.filter((item: any) => !getItemCompleted(item));
    return count + pendingItems.length;
  }, 0);

  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim()) return;
    
    setIsAdding(true);
    try {
      const userId = localStorage.getItem('user_id') || '00000000-0000-0000-0000-000000000000';
      const saved = await ingredientApi.addIngredient(newIngredient as Partial<Ingredient>, userId);
      addIngredient(saved);
      setNewIngredient({ name: '', quantity: 1, unit: '个' });
      setShowAddForm(false);
      setShowRecipeRefreshDialog(true);
    } catch (err) {
      console.error('Failed to add ingredient:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    const userId = localStorage.getItem('user_id') || '00000000-0000-0000-0000-000000000000';
    try {
      await ingredientApi.deleteIngredient(ingredientId, userId);
      removeIngredient(ingredientId);
      setShowRecipeRefreshDialog(true);
    } catch (err) {
      console.error('Failed to delete ingredient:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-3">
          今天吃什么 🍽️
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          告别选择困难症，让AI帮你决定今天的美味！
          <br />
          <span className="text-primary-600 font-medium">扫一扫冰箱，美味即刻呈现</span>
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/scanner"
          className="card p-8 group hover:border-2 hover:border-primary-500 min-h-[160px] flex items-center"
        >
          <div className="flex items-center space-x-6 w-full">
            <div className="w-32 h-32 bg-primary-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Scan size={72} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-gray-800">扫一扫冰箱</h3>
              <p className="text-gray-500 text-base mt-2">AI识别食材，智能管理库存</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ml-auto">
            <ArrowRight size={24} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <div className="flex flex-col gap-6">
          <Link
            to="/recipes"
            className="card p-6 group hover:border-2 hover:border-accent-500"
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-accent-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Utensils size={32} className="text-accent-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-800">智能推荐</h3>
                <p className="text-gray-500 text-sm mt-1">根据食材推荐美味菜谱</p>
              </div>
              <ArrowRight size={20} className="text-gray-400 group-hover:text-accent-600 transition-colors" />
            </div>
          </Link>

          <Link
            to="/profile"
            className="card p-6 group hover:border-2 hover:border-purple-500"
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles size={32} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-800">个性化设置</h3>
                <p className="text-gray-500 text-sm mt-1">定制你的口味偏好</p>
              </div>
              <ArrowRight size={20} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      {hasIngredients && (
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">我的食材库存</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus size={14} />
              <span>手动添加</span>
            </button>
          </div>
          
          {expiringSoon.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-700">
                <ChefHat size={20} />
                <span className="font-medium">即将过期提醒</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                {expiringSoon.map(ing => ing.name).join('、')} 即将过期，建议尽快使用！
              </p>
            </div>
          )}

          {showAddForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">食材名称</label>
                  <input
                    type="text"
                    value={newIngredient.name}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：番茄"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm text-gray-600 mb-1">数量</label>
                  <input
                    type="number"
                    value={newIngredient.quantity}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm text-gray-600 mb-1">单位</label>
                  <select
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="个">个</option>
                    <option value="斤">斤</option>
                    <option value="克">克</option>
                    <option value="千克">千克</option>
                    <option value="毫升">毫升</option>
                    <option value="升">升</option>
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-sm text-gray-600 mb-1">分类</label>
                  <select
                    value={newIngredient.category}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="vegetable">蔬菜</option>
                    <option value="meat">肉类</option>
                    <option value="seafood">海鲜</option>
                    <option value="dairy">奶制品</option>
                    <option value="egg">蛋类</option>
                    <option value="grain">谷物</option>
                    <option value="fruit">水果</option>
                    <option value="seasoning">调味品</option>
                    <option value="beverage">饮料</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <button
                  onClick={handleAddIngredient}
                  disabled={isAdding || !newIngredient.name.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? '添加中...' : '添加'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewIngredient({ name: '', quantity: 1, unit: '个', category: 'other' }); }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
            {ingredients.map((ing) => (
              <span
                key={ing.id}
                className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center space-x-1 ${
                  ing.is_expiring_soon
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <span>{ing.name} {ing.quantity}{ing.unit}</span>
                <button
                  onClick={() => handleDeleteIngredient(ing.id!)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          {recommendations.length > 0 && (
            <section className="mt-8">
              <Link to="/shopping" className="flex items-center justify-between group">
                <h2 className="text-xl font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">我的采购清单</h2>
                <span className="text-primary-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity">进入 →</span>
              </Link>
              
              {shoppingLists.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {shoppingLists.slice(0, 3).map((list) => (
                    <div key={list.id} className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <ShoppingCart size={16} className="text-orange-600" />
                        <Link
                          to={`/recipes/${list.recipe_id}`}
                          className="font-medium text-gray-800 hover:text-primary-600"
                        >
                          {list.recipe_title || '未知菜谱'}
                        </Link>
                      </div>
                      <div className="space-y-1">
                        {list.items.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center space-x-2 text-sm">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              getItemCompleted(item)
                                ? 'bg-green-500 border-green-500'
                                : 'border-orange-300'
                            }`}>
                              {getItemCompleted(item) && <Check size={10} className="text-white" />}
                            </div>
                            <span className={getItemCompleted(item) ? 'text-gray-400 line-through' : 'text-gray-700'}>
                              {getItemName(item)}
                            </span>
                          </div>
                        ))}
                        {list.items.length > 3 && (
                          <p className="text-xs text-gray-500">等 {list.items.length} 项</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mt-4">暂无待采购的食材</p>
              )}
            </section>
          )}
        </section>
      )}

      {!hasIngredients && (
        <section className="card p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scan size={40} className="text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            开始使用
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            扫描你的冰箱或食材，系统将智能识别并推荐最适合的菜谱
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/scanner" className="btn-primary">
              立即扫描
            </Link>
            <Link to="/recipes" className="btn-secondary">
              浏览菜谱
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 使用技巧</h3>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex items-start space-x-2">
              <span className="text-primary-600">•</span>
              <span>定期扫描冰箱，保持食材库存最新</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-600">•</span>
              <span>设置口味偏好，获得更精准的推荐</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-600">•</span>
              <span>烹饪时使用语音控制，解放双手</span>
            </li>
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 今日统计</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-600">{ingredients.length}</div>
              <div className="text-sm text-gray-500">食材数量</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-600">
                {recipePages.length > 0 ? recipePages.reduce((total, page) => total + page.length, 0) : recommendations.length}
              </div>
              <div className="text-sm text-gray-500">推荐菜谱</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {pendingPurchaseCount}
              </div>
              <div className="text-sm text-gray-500">待采购</div>
            </div>
          </div>
        </div>
      </section>

      {showRecipeRefreshDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={32} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">食材已更改</h3>
              <p className="text-gray-600">
                您的食材库存已更新，是否要重新生成菜谱推荐？
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRecipeRefreshDialog(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                稍后再说
              </button>
              <button
                onClick={() => {
                  setShowRecipeRefreshDialog(false);
                  window.location.href = '/recipes';
                }}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
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
