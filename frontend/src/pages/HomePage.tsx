import { Link } from 'react-router-dom';
import { Scan, Utensils, ChefHat, ArrowRight, Sparkles } from 'lucide-react';
import { useIngredientsStore, useRecipesStore } from '../stores';

export default function HomePage() {
  const { ingredients } = useIngredientsStore();
  const { recommendations } = useRecipesStore();

  const expiringSoon = ingredients.filter(ing => ing.is_expiring_soon);
  const hasIngredients = ingredients.length > 0;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/scanner"
          className="card p-6 group hover:border-2 hover:border-primary-500"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Scan size={32} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-800">扫一扫冰箱</h3>
              <p className="text-gray-500 text-sm mt-1">AI识别食材，智能管理库存</p>
            </div>
            <ArrowRight size={20} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

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

      {hasIngredients && (
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">我的食材库存</h2>
            <Link to="/scanner" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              添加更多 +
            </Link>
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

          <div className="flex flex-wrap gap-2">
            {ingredients.slice(0, 10).map((ing) => (
              <span
                key={ing.id}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  ing.is_expiring_soon
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {ing.name} {ing.quantity}{ing.unit}
              </span>
            ))}
            {ingredients.length > 10 && (
              <span className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-500">
                +{ingredients.length - 10} 更多
              </span>
            )}
          </div>

          {recommendations.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-800 mb-3">今日推荐</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendations.slice(0, 2).map((recipe) => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}`}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white text-2xl">
                      🍳
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{recipe.title}</h4>
                      <p className="text-sm text-gray-500">
                        {recipe.match_percentage}% 匹配度 · {recipe.cooking_time}分钟
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
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
              <div className="text-2xl font-bold text-accent-600">{recommendations.length}</div>
              <div className="text-sm text-gray-500">推荐菜谱</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {recommendations[0]?.match_percentage?.toFixed(0) || 0}%
              </div>
              <div className="text-sm text-gray-500">最高匹配</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
