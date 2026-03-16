import {useEffect, useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {AlertTriangle, Boxes, Check, Plus, ScanLine, ShoppingCart, Trash2, X} from 'lucide-react';

import {ingredientApi} from '../services/api';
import {useIngredientsStore, useRecipesStore} from '../stores';
import {getUserId} from '../utils/userId';
import type {Ingredient} from '../types';
import {
  clearRecipeCacheDirty,
  markRecipeCacheDirty,
  requestRecipeForceRefresh,
} from '../services/recipeCache';

const categoryLabels: Record<string, string> = {
  vegetable: '蔬菜',
  meat: '肉类',
  seafood: '海鲜',
  dairy: '奶制品',
  egg: '蛋类',
  grain: '谷物',
  fruit: '水果',
  seasoning: '调料',
  beverage: '饮品',
  other: '其他',
};

const categoryColors: Record<string, string> = {
  vegetable: 'bg-green-100 text-green-700',
  meat: 'bg-red-100 text-red-700',
  seafood: 'bg-blue-100 text-blue-700',
  dairy: 'bg-yellow-100 text-yellow-700',
  egg: 'bg-orange-100 text-orange-700',
  grain: 'bg-amber-100 text-amber-700',
  fruit: 'bg-purple-100 text-purple-700',
  seasoning: 'bg-gray-100 text-gray-700',
  beverage: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function FoodPage() {
  const navigate = useNavigate();
  const {ingredients, addIngredient, removeIngredient, setIngredients, clearIngredients} =
      useIngredientsStore();
  const {clearRecommendations} = useRecipesStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);
  const [showRecipeRefreshDialog, setShowRecipeRefreshDialog] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    quantity: 1,
    unit: '个',
    category: 'other',
  });

  const expiringSoon = useMemo(
      () => ingredients.filter((item) => item.is_expiring_soon),
      [ingredients],
  );

  useEffect(() => {
    const loadAllIngredients = async () => {
      try {
        const data = await ingredientApi.getIngredients(getUserId());
        setIngredients(data);
      } catch (error) {
        console.error('Failed to load ingredients:', error);
      }
    };

    void loadAllIngredients();
  }, [setIngredients]);

  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim()) {
      return;
    }

    setIsAdding(true);
    try {
      const saved = await ingredientApi.addIngredient(
          newIngredient as Partial<Ingredient>,
          getUserId(),
      );
      addIngredient(saved);
      markRecipeCacheDirty();
      setShowAddForm(false);
      setNewIngredient({name: '', quantity: 1, unit: '个', category: 'other'});
      setShowRecipeRefreshDialog(true);
    } catch (error) {
      console.error('Failed to add ingredient:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    if (!confirm('确定要删除这个食材吗？')) {
      return;
    }

    try {
      await ingredientApi.deleteIngredient(ingredientId, getUserId());
      removeIngredient(ingredientId);
      markRecipeCacheDirty();
      setShowRecipeRefreshDialog(true);
    } catch (error) {
      console.error('Failed to delete ingredient:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
            to="/scan"
            className="card p-5 border-2 border-transparent hover:border-primary-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
              <ScanLine size={22}/>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">继续扫描入库</h2>
              <p className="text-sm text-gray-500">拍照识别并写入库存</p>
            </div>
          </div>
        </Link>

        <Link
            to="/food/shopping"
            className="card p-5 border-2 border-transparent hover:border-orange-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ShoppingCart size={22}/>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">查看采购清单</h2>
              <p className="text-sm text-gray-500">统一处理缺失食材采购</p>
            </div>
          </div>
        </Link>
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-3 md:space-y-0">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Boxes size={20} className="text-primary-600"/>
            全部食材 ({ingredients.length} 种)
          </h2>
          <div className="flex items-center space-x-2">
            <button
                onClick={() => setShowClearConfirmDialog(true)}
                disabled={ingredients.length === 0}
                className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16}/>
              <span>清空</span>
            </button>
            <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus size={18}/>
              <span>手动添加</span>
            </button>
          </div>
        </div>

        {expiringSoon.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-100 flex items-center gap-2 text-orange-700 text-sm">
              <AlertTriangle size={16}/>
              有 {expiringSoon.length} 项食材临近过期，建议优先使用
            </div>
        )}

        {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">食材名称</label>
                  <input
                      type="text"
                      value={newIngredient.name}
                      onChange={(e) =>
                        setNewIngredient((prev) => ({...prev, name: e.target.value}))
                      }
                      placeholder="输入食材名称"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-sm text-gray-600 mb-1">数量</label>
                  <input
                      type="number"
                      value={newIngredient.quantity}
                      min="1"
                      onChange={(e) =>
                        setNewIngredient((prev) => ({
                          ...prev,
                          quantity: parseFloat(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center"
                  />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-sm text-gray-600 mb-1">单位</label>
                  <select
                      value={newIngredient.unit}
                      onChange={(e) =>
                        setNewIngredient((prev) => ({...prev, unit: e.target.value}))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="个">个</option>
                    <option value="斤">斤</option>
                    <option value="克">克</option>
                    <option value="千克">千克</option>
                    <option value="毫升">毫升</option>
                    <option value="升">升</option>
                    <option value="把">把</option>
                    <option value="根">根</option>
                  </select>
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-sm text-gray-600 mb-1">分类</label>
                  <select
                      value={newIngredient.category}
                      onChange={(e) =>
                        setNewIngredient((prev) => ({...prev, category: e.target.value}))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="vegetable">蔬菜</option>
                    <option value="meat">肉类</option>
                    <option value="seafood">海鲜</option>
                    <option value="dairy">奶制品</option>
                    <option value="egg">蛋类</option>
                    <option value="grain">谷物</option>
                    <option value="fruit">水果</option>
                    <option value="seasoning">调味品</option>
                    <option value="beverage">饮品</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 self-end">
                  <button
                      onClick={() => setShowAddForm(false)}
                      className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg"
                  >
                    <X size={20}/>
                  </button>
                  <button
                      onClick={handleAddIngredient}
                      disabled={isAdding || !newIngredient.name.trim()}
                      className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    <Check size={20}/>
                  </button>
                </div>
              </div>
            </div>
        )}

        {ingredients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Boxes size={48} className="mx-auto mb-4 opacity-50"/>
              <p>暂无食材</p>
              <p className="text-sm mt-2">请先前往扫描页添加食材</p>
            </div>
        ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {ingredients.map((ing) => (
                  <div
                      key={ing.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors[ing.category || 'other']}`}
                      >
                        {categoryLabels[ing.category || 'other'] || '其他'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm md:text-base font-medium text-gray-800 truncate">
                          {ing.name}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">
                          {ing.quantity}
                          {ing.unit} · {' '}
                          {ing.expiry_date
                            ? `保质期至 ${new Date(ing.expiry_date).toLocaleDateString()}`
                            : '未设置保质期'}
                        </div>
                      </div>
                    </div>
                    <button
                        onClick={() => handleDeleteIngredient(ing.id!)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
              ))}
            </div>
        )}
      </section>

      {showRecipeRefreshDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="text-primary-600"/>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                  库存已更新
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  是否现在刷新推荐菜谱，保持烹饪链路一致？
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
                      requestRecipeForceRefresh();
                      navigate('/cook/recommendations');
                    }}
                    className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
                >
                  立即刷新
                </button>
              </div>
            </div>
          </div>
      )}

      {showClearConfirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-600"/>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">清空食材</h3>
                <p className="text-gray-600">
                  确定要清空所有食材及菜谱推荐吗？此操作不可恢复。
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                    onClick={() => setShowClearConfirmDialog(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                    onClick={() => {
                      setShowClearConfirmDialog(false);
                      clearIngredients();
                      clearRecommendations();
                      clearRecipeCacheDirty();
                    }}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  确定清空
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
