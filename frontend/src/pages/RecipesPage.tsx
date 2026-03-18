import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, X, RefreshCw, Trash2 } from 'lucide-react';
import { useIngredientsStore, useRecipesStore, useUserStore } from '../stores';
import { recipeApi } from '../services/api';
import type { Recipe, DietType, TastePreference } from '../types';
import { getUserId } from '../utils/userId';
import {
  clearRecipeCacheDirty,
  consumeRecipeForceRefreshRequest,
  hasRecipeForceRefreshRequest,
  isRecipeCacheDirty,
} from '../services/recipeCache';

const difficultyOptions = [
  { value: 'easy', label: '简单', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium', label: '中等', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'hard', label: '困难', color: 'bg-red-100 text-red-700 border-red-200' },
];

export default function RecipesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showExcludeModal, setShowExcludeModal] = useState(false);
  const [showFetchErrorDialog, setShowFetchErrorDialog] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [isFirstTimeLoading, setIsFirstTimeLoading] = useState(
    () => hasRecipeForceRefreshRequest() || isRecipeCacheDirty(),
  );
  // isInitialLoadRef removed as it was unused

  const { ingredients, desiredIngredients } = useIngredientsStore();
  const { recipePages, currentPage, setRecipePages, addRecipePage, setCurrentPage, recommendations, setRecommendations, loadFromDatabase, clearRecommendations, getRecipePagesLength } = useRecipesStore();
  const { preferences } = useUserStore();

  const availableIngredientNames = useMemo(() =>
    ingredients.map(ing => ing.name)
  , [ingredients]);
  const requiredIngredientNames = useMemo(
    () => desiredIngredients.map((item) => item.trim()).filter((item) => item.length > 0),
    [desiredIngredients],
  );
  const recommendationContextKey = useMemo(
    () => JSON.stringify({ availableIngredientNames, requiredIngredientNames }),
    [availableIngredientNames, requiredIngredientNames],
  );
  const cacheContextIngredients = useMemo(
    () => [
      ...availableIngredientNames,
      ...requiredIngredientNames.map((item) => `required:${item}`),
    ],
    [availableIngredientNames, requiredIngredientNames],
  );
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const hasLoadedRef = useRef(false); // 防止重复加载
  const lastContextKeyRef = useRef<string>(''); // 记录上次加载的推荐上下文
  const isFetchingRef = useRef(false); // 防止并发调用 fetchRecipes

  // 定义 fetchRecipes 函数，使用 useCallback 缓存
  const fetchRecipes = useCallback(async (excludeList: string[] = [], forceRefresh: boolean = false) => {
    // 防止并发调用
    if (isFetchingRef.current) {
      console.log('[DEBUG] fetchRecipes 正在执行中，跳过');
      return;
    }
    
    console.log('[DEBUG] fetchRecipes 被调用, forceRefresh=', forceRefresh);
    isFetchingRef.current = true;
    setIsLoading(true);
    
    try {
      const filteredIngredients = availableIngredientNames.filter(
        ing => !excludeList.includes(ing)
      );
      
      const request = {
        user_id: getUserId(),
        available_ingredients: filteredIngredients,
        required_ingredients: requiredIngredientNames,
        force_refresh: forceRefresh,
        taste_preferences: preferences.tastePreferences as TastePreference[],
        diet_type: preferences.dietType as DietType,
        max_cooking_time: preferences.maxCookingTime || undefined,
        cooking_level: preferences.cookingLevel || undefined,
      };
      
      console.log('[DEBUG] 调用 API 获取菜谱...');
      const recipes = await recipeApi.getRecommendations(request);
      console.log('[DEBUG] API 返回', recipes.length, '道菜谱');
      
      // API 返回空结果时提示用户重试
      if (recipes.length === 0) {
        setShowFetchErrorDialog(true);
        setIsFirstTimeLoading(false);
        return;
      }
      
      if (forceRefresh) {
        console.log('[DEBUG] 强制刷新，添加新页面');
        addRecipePage(recipes, cacheContextIngredients);
      } else {
        console.log('[DEBUG] 非强制刷新，检查当前页面数');
        // 使用 getRecipePagesLength 获取最新状态
        const currentPagesLength = getRecipePagesLength();
        console.log('[DEBUG] 当前页面数:', currentPagesLength);
        if (currentPagesLength === 0) {
          console.log('[DEBUG] 无缓存，设置新菜谱并保存到数据库');
          setRecommendations(recipes);
          setCurrentPage(0);
          // 只调用 addRecipePage，它会同时更新状态和保存到数据库
          addRecipePage(recipes, cacheContextIngredients);
        } else {
          console.log('[DEBUG] 已有页面，跳过设置新菜谱');
        }
      }
      clearRecipeCacheDirty();
      // 菜谱加载完成后，设置 isFirstTimeLoading 为 false
      setIsFirstTimeLoading(false);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      setShowFetchErrorDialog(true);
      // 即使出错也设置 isFirstTimeLoading 为 false，避免无限加载
      setIsFirstTimeLoading(false);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [availableIngredientNames, requiredIngredientNames, preferences.tastePreferences, preferences.dietType, preferences.maxCookingTime, preferences.cookingLevel, setRecommendations, addRecipePage, setCurrentPage, setRecipePages, getRecipePagesLength, cacheContextIngredients]);

  // 加载数据库数据 - 只在组件挂载和食材变化时执行
  useEffect(() => {
    // 清除标志
    const shouldForceRefresh =
      consumeRecipeForceRefreshRequest() || isRecipeCacheDirty();
    if (shouldForceRefresh) {
      console.log('[DEBUG] 检测到强制刷新标志，执行 forceRefresh');
      clearRecipeCacheDirty();
      
      const loadData = async () => {
        console.log('[DEBUG] 强制刷新 - 直接请求新菜谱，避免旧结果闪现');
        hasLoadedRef.current = true;
        lastContextKeyRef.current = recommendationContextKey;
        setIsFirstTimeLoading(true);
        await fetchRecipes([], true);
      };
      void loadData();
      return;
    }
    
    // 检查食材是否发生变化
    const contextChanged = lastContextKeyRef.current !== recommendationContextKey;
    
    // 防止重复加载（React 严格模式会导致组件渲染两次）
    if (hasLoadedRef.current && !contextChanged) {
      console.log('[DEBUG] 已经加载过且食材未变，跳过');
      return;
    }
    
    // 只在食材列表非空时执行
    if (availableIngredientNames.length === 0) {
      console.log('[DEBUG] 食材列表为空，跳过加载');
      return;
    }
    
    // 如果已经初始化过且食材未变，跳过
    if (hasInitialLoad && !contextChanged) {
      console.log('[DEBUG] 已经初始化过且食材未变，跳过加载');
      return;
    }
    
    if (isLoadingFromDb) {
      console.log('[DEBUG] 正在加载中，跳过');
      return;
    }
    
    const loadData = async () => {
      console.log('[DEBUG] 开始加载数据库, contextChanged=', contextChanged);
      hasLoadedRef.current = true; // 标记已加载
      lastContextKeyRef.current = recommendationContextKey; // 记录当前推荐上下文
      setIsLoadingFromDb(true);
      const loadedPageCount = await loadFromDatabase(cacheContextIngredients);
      console.log('[DEBUG] 数据库加载完成，加载了', loadedPageCount, '页, 类型:', typeof loadedPageCount);
      setHasInitialLoad(true);
      setIsLoadingFromDb(false);
      
      // 如果数据库中没有数据，则获取新菜谱
      console.log('[DEBUG] 检查是否需要获取新菜谱: loadedPageCount=', loadedPageCount, ', 条件:', loadedPageCount === 0);
      if (loadedPageCount === 0) {
        console.log('[DEBUG] 数据库无数据，获取新菜谱, hasLoadedRef=', hasLoadedRef.current);
        await fetchRecipes([], false);
      } else {
        console.log('[DEBUG] 数据库已有数据，跳过获取新菜谱');
        setIsFirstTimeLoading(false);
      }
    };
    void loadData();
  // 依赖 availableIngredientNames 数组本身，而不仅仅是长度
  // 但使用 hasLoadedRef 和 hasInitialLoad 来防止重复加载
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableIngredientNames, recommendationContextKey, cacheContextIngredients]);

  const displayRecipes = useMemo(() => {
    if (recipePages.length > 0 && recipePages[currentPage]) {
      return recipePages[currentPage];
    }
    return recommendations.slice(0, 5);
  }, [recipePages, currentPage, recommendations]);
  const totalPages = recipePages.length;

  useEffect(() => {
    console.log('[DEBUG] displayRecipes:', {
      currentPage,
      totalPages,
      displayCount: displayRecipes.length,
      firstRecipe: displayRecipes[0]?.title || 'none',
      secondRecipe: displayRecipes[1]?.title || 'none',
      recipePagesLength: recipePages.length,
      recipePagesStructure: Array.isArray(recipePages) ? recipePages.map((page, i) => ({
        pageIndex: i,
        count: page.length,
        firstTitle: page[0]?.title || 'none',
        secondTitle: page[1]?.title || 'none'
      })) : []
    });
  }, [currentPage, totalPages, displayRecipes, recipePages]);

  useEffect(() => {
    if (recipePages.length > 0 && recipePages[currentPage]) {
      setRecommendations(recipePages[currentPage]);
    }
  }, [recipePages, currentPage, setRecommendations]);

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
    setShowExcludeModal(true);
  }, []);

  const handleClearRecipes = useCallback(async () => {
    if (confirm('确定要清空所有菜谱吗？此操作不可撤销。')) {
      await clearRecommendations();
      // 重置所有状态，显示暂无菜谱界面
      setHasInitialLoad(true); // 设置为true，避免触发加载动画
      setCurrentPage(0);
      setRecommendations([]);
      setRecipePages([]);
      clearRecipeCacheDirty();
      // 重置加载标志，允许重新加载
      hasLoadedRef.current = false;
      setIsFirstTimeLoading(false); // 设置为false，显示暂无菜谱界面而不是加载动画
    }
  }, [clearRecommendations, setCurrentPage, setRecommendations, setRecipePages]);

  const confirmExclude = useCallback(() => {
    setShowExcludeModal(false);
    fetchRecipes(excludedIngredients, true);
  }, [fetchRecipes, excludedIngredients]);

  const isLoadingRecipes =
    isLoading || isLoadingFromDb || (isFirstTimeLoading && availableIngredientNames.length > 0);
  const isAiGenerating = isLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {isLoadingRecipes ? (
        <div className="flex justify-center py-8 md:py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-primary-500 mx-auto mb-3 md:mb-4" />
            <p className="text-gray-600 text-sm md:text-base">
              {isAiGenerating ? 'AI 正在为您设计四菜一汤...' : '正在加载菜谱...'}
            </p>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              {isAiGenerating ? '这可能需要几秒钟' : '请稍候'}
            </p>
          </div>
        </div>
      ) : availableIngredientNames.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
            <span className="text-3xl md:text-4xl">🥗</span>
          </div>
          <h3 className="text-base md:text-xl font-semibold text-gray-800 mb-1 md:mb-2">
            还没有食材
          </h3>
          <p className="text-xs md:text-base text-gray-500 mb-4 md:mb-6 max-w-md mx-auto px-4">
            添加食材到库存后，AI 将根据您的食材推荐四菜一汤
          </p>
          <Link to="/scan" className="btn-primary text-sm md:text-base">
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

          <div className="flex justify-center pt-4 md:pt-6 space-x-3 md:space-x-4">
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(index)}
                    className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all ${
                      currentPage === index
                        ? 'bg-primary-500 w-5 md:w-6'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-1 md:flex-none flex items-center justify-center space-x-1 md:space-x-2 px-4 md:px-8 py-2.5 md:py-4 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span className="text-sm md:text-lg font-medium">不合胃口？</span>
            </button>
            <button
              onClick={handleClearRecipes}
              disabled={isLoading}
              className="flex-1 md:flex-none flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-6 py-2.5 md:py-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} className="md:hidden" />
              <Trash2 size={18} className="hidden md:block" />
              <span className="text-sm md:text-lg font-medium">清空菜谱</span>
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8 md:py-12">
          <div className="w-48 h-48 md:w-72 md:h-72 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
            <span className="text-6xl md:text-9xl">🍽️</span>
          </div>
          <h3 className="text-base md:text-xl font-semibold text-gray-400 mb-4 md:mb-8">
            暂无菜谱推荐
          </h3>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 md:px-8 py-3 md:py-4 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            <span className="text-sm md:text-lg font-medium">获取推荐</span>
          </button>
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

      {showFetchErrorDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">获取菜谱失败</h3>
              <p className="text-gray-500">
                暂时无法获取新菜谱，请稍后再试。
                {recipePages.length > 0 && (
                  <>
                    <br />
                    您已有 {recipePages.length} 页菜谱可以浏览。
                  </>
                )}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFetchErrorDialog(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
              {recipePages.length > 0 && (
                <button
                  onClick={() => {
                    setShowFetchErrorDialog(false);
                    setCurrentPage(0);
                  }}
                  className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
                >
                  查看已有菜谱
                </button>
              )}
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
      to={`/cook/recommendations/${recipe.id}`}
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
        
        {recipe.match_percentage !== undefined && recipe.match_percentage !== null && (
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
            <span className="text-sm font-medium text-primary-600">
              {recipe.match_percentage}%
            </span>
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
          {recipe.title}
        </h3>
        
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {recipe.description}
        </p>
        
        <div className="flex flex-wrap gap-1">
          {recipe.matched_ingredients && recipe.matched_ingredients.length > 0 && recipe.matched_ingredients.slice(0, 4).map(ing => (
            <span
              key={ing}
              className="text-xs px-2 py-0.5 bg-accent-100 text-accent-700 rounded-full"
            >
              ✓ {ing}
            </span>
          ))}
          {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
              缺: {recipe.missing_ingredients.join(', ')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
