import { useState, useEffect } from 'react';
import {
  User,
  Settings,
  Heart,
  Clock,
  ChefHat,
  Sun,
  HelpCircle,
  LogOut,
  Save,
  Edit2,
  Check,
  Camera,
  Trophy,
  Calendar,
  TrendingUp,
  X
} from 'lucide-react';
import { useUserStore, useIngredientsStore, useRecipesStore } from '../stores';
import { userApi } from '../services/api';
import type { TastePreference, DietType } from '../types';

const tasteOptions: { value: TastePreference; label: string; emoji: string; color: string }[] = [
  { value: 'spicy', label: '辣', emoji: '🌶️', color: 'bg-red-100 text-red-700' },
  { value: 'sweet', label: '甜', emoji: '🍬', color: 'bg-pink-100 text-pink-700' },
  { value: 'sour', label: '酸', emoji: '🍋', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'salty', label: '咸', emoji: '🧂', color: 'bg-blue-100 text-blue-700' },
  { value: 'umami', label: '鲜', emoji: '🍖', color: 'bg-amber-100 text-amber-700' },
  { value: 'mild', label: '清淡', emoji: '🥬', color: 'bg-green-100 text-green-700' },
  { value: 'bitter', label: '苦', emoji: '☕', color: 'bg-gray-100 text-gray-700' },
];

const dietOptions: { value: DietType; label: string; description: string }[] = [
  { value: 'normal', label: '普通饮食', description: '无特殊限制，均衡饮食' },
  { value: 'keto', label: '生酮饮食', description: '低碳水、高脂肪、适量蛋白' },
  { value: 'low_carb', label: '低碳水', description: '减少碳水化合物摄入' },
  { value: 'low_fat', label: '低脂饮食', description: '减少脂肪摄入' },
  { value: 'vegetarian', label: '素食', description: '不吃肉类，可吃蛋奶' },
  { value: 'vegan', label: '纯素', description: '不吃任何动物制品' },
  { value: 'paleo', label: '原始人饮食', description: '模拟史前人类饮食方式' },
];

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedTastes, setSelectedTastes] = useState<TastePreference[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<DietType | null>(null);
  const [maxCookingTime, setMaxCookingTime] = useState<number>(60);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  
  const { currentUser, setUser, isAuthenticated, updatePreferences, logout } = useUserStore();
  const { ingredients } = useIngredientsStore();
  const { recommendations } = useRecipesStore();

  useEffect(() => {
    if (currentUser) {
      setEditedName(currentUser.username);
      setSelectedTastes(currentUser.taste_preferences || []);
      setSelectedDiet(currentUser.diet_type || null);
      if (currentUser.max_cooking_time) {
        setMaxCookingTime(currentUser.max_cooking_time);
      }
    }
  }, [currentUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (currentUser) {
        const updatedUser = await userApi.updatePreferences(currentUser.id, {
          taste_preferences: selectedTastes as string[],
          diet_type: selectedDiet || undefined,
          max_cooking_time: maxCookingTime,
        });
        setUser(updatedUser);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTaste = (taste: TastePreference) => {
    setSelectedTastes(prev =>
      prev.includes(taste)
        ? prev.filter(t => t !== taste)
        : [...prev, taste]
    );
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const stats = {
    totalIngredients: ingredients.length,
    expiringSoon: ingredients.filter(ing => ing.is_expiring_soon).length,
    recipesViewed: recommendations.length,
    favoriteRecipes: 12,
    cookingSessions: 8,
    totalCookingTime: 320,
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={40} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">登录后查看个人信息</h2>
        <p className="text-gray-500 mb-6">登录后可以享受个性化推荐和更多功能</p>
        <button
          onClick={() => {
            const demoUser = {
              id: 'demo_user',
              username: '美食爱好者',
              email: undefined,
              avatar_url: undefined,
              taste_preferences: [],
              diet_type: undefined,
              max_cooking_time: 60,
              cooking_level: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setUser(demoUser);
          }}
          className="btn-primary"
        >
          体验 Demo
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">我的</h1>
      </header>

      {/* merged sections: personal, stats, settings */}

      <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {editedName?.charAt(0) || 'U'}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-primary-500 rounded-full flex items-center justify-center text-primary-600 shadow-md">
                    <Camera size={14} />
                  </button>
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-xl font-bold text-gray-800 border-b-2 border-primary-500 outline-none bg-transparent"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-gray-800">{currentUser.username}</h2>
                  )}
                  <p className="text-gray-500 text-sm">{currentUser.email || 'demo@example.com'}</p>
                </div>
              </div>
              
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={isSaving}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isEditing
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEditing ? (
                  <>
                    <Save size={18} />
                    <span>{isSaving ? '保存中...' : '保存'}</span>
                  </>
                ) : (
                  <>
                    <Edit2 size={18} />
                    <span>编辑</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => setShowPreferencesModal(true)}
                className="p-4 bg-primary-50 rounded-xl text-center hover:bg-primary-100 transition-colors"
              >
                <div className="text-2xl mb-1">🍽️</div>
                <div className="text-lg font-bold text-primary-600">{selectedTastes.length}</div>
                <div className="text-sm text-gray-500">口味偏好</div>
              </button>
              
              <button
                onClick={() => setShowPreferencesModal(true)}
                className="p-4 bg-accent-50 rounded-xl text-center hover:bg-accent-100 transition-colors"
              >
                <div className="text-2xl mb-1">🥗</div>
                <div className="text-lg font-bold text-accent-600">
                  {selectedDiet ? dietOptions.find(d => d.value === selectedDiet)?.label : '未设置'}
                </div>
                <div className="text-sm text-gray-500">饮食类型</div>
              </button>
              
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <div className="text-2xl mb-1">⏱️</div>
                <div className="text-lg font-bold text-purple-600">{maxCookingTime}</div>
                <div className="text-sm text-gray-500">最大时间(分)</div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-xl text-center">
                <div className="text-2xl mb-1">📅</div>
                <div className="text-lg font-bold text-orange-600">初级</div>
                <div className="text-sm text-gray-500">烹饪水平</div>
              </div>
            </div>

            <button
              onClick={() => setShowPreferencesModal(true)}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <Settings size={18} />
              <span>管理口味偏好和饮食设置</span>
            </button>
          </div>

          {/* removed quick entries */}
        </div>

      <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp size={20} className="mr-2 text-primary-600" />
              本周统计
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl">
                <div className="text-3xl font-bold text-primary-600">{stats.totalIngredients}</div>
                <div className="text-sm text-gray-600">扫描食材</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl">
                <div className="text-3xl font-bold text-accent-600">{stats.recipesViewed}</div>
                <div className="text-sm text-gray-600">查看菜谱</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                <div className="text-3xl font-bold text-orange-600">{stats.expiringSoon}</div>
                <div className="text-sm text-gray-600">即将过期</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar size={20} className="mr-2 text-primary-600" />
              烹饪时间统计
            </h3>
            
            <div className="flex items-center justify-center py-8">
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-8 border-primary-100 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-8 border-primary-500 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary-600">{Math.floor(stats.totalCookingTime / 60)}</div>
                      <div className="text-sm text-gray-500">小时</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => {
                const heights = [40, 70, 50, 80, 60, 90, 45];
                const maxHeight = Math.max(...heights);
                const height = heights[i];
                
                return (
                  <div key={day} className="flex flex-col items-center">
                    <div
                      className="w-8 bg-primary-500 rounded-t-md transition-all"
                      style={{ height: `${(height / maxHeight) * 80}px` }}
                    />
                    <span className="text-xs text-gray-500 mt-1">{day.slice(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">最近活动</h3>
            <div className="space-y-3">
              {[
                { action: '完成烹饪', item: '番茄炒蛋', time: '2小时前', icon: '🍳' },
                { action: '收藏菜谱', item: '麻婆豆腐', time: '5小时前', icon: '❤️' },
                { action: '扫描食材', item: '5种新食材', time: '1天前', icon: '📸' },
                { action: '设置偏好', item: '口味：辣', time: '2天前', icon: '⚙️' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.item}</p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      <div className="space-y-6">
          <div className="card divide-y">
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <HelpCircle size={20} className="text-primary-600" />
                <span className="font-medium text-gray-800">帮助与反馈</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">关于</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>版本：1.0.0</p>
              <p>构建时间：2026年2月</p>
              <p className="text-primary-600">检查更新</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut size={20} />
            <span>退出登录</span>
          </button>
        </div>

      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">口味偏好设置</h2>
                <button
                  onClick={() => setShowPreferencesModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-3">选择你喜欢的口味</h3>
                <div className="flex flex-wrap gap-2">
                  {tasteOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => toggleTaste(option.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedTastes.includes(option.value)
                          ? 'bg-primary-500 text-white shadow-md'
                          : `${option.color} hover:opacity-80`
                      }`}
                    >
                      {option.emoji} {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">饮食类型</h3>
                <div className="space-y-2">
                  {dietOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDiet(selectedDiet === option.value ? null : option.value)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        selectedDiet === option.value
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{option.label}</span>
                        {selectedDiet === option.value && (
                          <Check size={20} className="text-primary-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">最大烹饪时间</h3>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={maxCookingTime}
                  onChange={(e) => setMaxCookingTime(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>15分钟</span>
                  <span className="font-medium text-primary-600">{maxCookingTime}分钟</span>
                  <span>120分钟</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t sticky bottom-0 bg-white">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
              >
                <Save size={20} />
                <span>{isSaving ? '保存中...' : '保存设置'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
