import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ChefHat, Clock3, PlayCircle, Sparkles } from "lucide-react";
import { useCookingStore, useIngredientsStore, useRecipesStore } from "../stores";
import {
    RECIPE_CACHE_DIRTY_EVENT,
    isRecipeCacheDirty,
    requestRecipeForceRefresh,
} from "../services/recipeCache";

export default function CookHubPage() {
    const navigate = useNavigate();
    const { currentSession } = useCookingStore();
    const { ingredients } = useIngredientsStore();
    const { recipePages, recommendations } = useRecipesStore();
    const [cacheDirty, setCacheDirty] = useState(isRecipeCacheDirty());

    useEffect(() => {
        const syncDirtyState = () => setCacheDirty(isRecipeCacheDirty());
        window.addEventListener(RECIPE_CACHE_DIRTY_EVENT, syncDirtyState);
        window.addEventListener("storage", syncDirtyState);
        return () => {
            window.removeEventListener(RECIPE_CACHE_DIRTY_EVENT, syncDirtyState);
            window.removeEventListener("storage", syncDirtyState);
        };
    }, []);

    const recommendationCount =
        recipePages.reduce((sum, page) => sum + page.length, 0) || recommendations.length;

    const hasActiveSession =
        currentSession && currentSession.status !== "completed" && currentSession.recipe_id;

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                    to="/cook/recommendations"
                    className="card p-5 border-2 border-transparent hover:border-accent-500 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center">
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-800">查看推荐菜谱</h2>
                            <p className="text-sm text-gray-500">
                                当前可浏览 {recommendationCount} 道菜谱
                                {cacheDirty ? "（库存已变更，建议刷新）" : ""}
                            </p>
                        </div>
                    </div>
                </Link>

                {hasActiveSession ? (
                    <Link
                        to={`/cook/session/${currentSession.recipe_id}`}
                        className="card p-5 border-2 border-transparent hover:border-primary-500 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                                <PlayCircle size={22} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-800">继续当前烹饪</h2>
                                <p className="text-sm text-gray-500 truncate">
                                    {currentSession.recipe_title || "继续上次菜谱"}
                                </p>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div className="card p-5 border border-dashed border-gray-300">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                                <Clock3 size={22} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-700">暂无进行中烹饪</h2>
                                <p className="text-sm text-gray-500">从推荐列表选择一道菜开始</p>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <section className="card p-5 md:p-6">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                    <ChefHat size={20} className="text-primary-600" />
                    链路状态
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-500">库存食材</p>
                        <p className="mt-1 text-xl font-semibold text-gray-800">{ingredients.length}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-500">推荐菜谱</p>
                        <p className="mt-1 text-xl font-semibold text-gray-800">{recommendationCount}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-500">烹饪状态</p>
                        <p className="mt-1 text-xl font-semibold text-gray-800">
                            {hasActiveSession ? "进行中" : "待开始"}
                        </p>
                    </div>
                </div>

                {ingredients.length === 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-100 text-orange-700 text-sm">
                        当前库存为空，建议先前往扫描页完成入库再获取更准确推荐。
                    </div>
                )}

                {cacheDirty && ingredients.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm flex items-center justify-between gap-3">
                        <span>检测到库存变化，当前推荐可能已过期。</span>
                        <button
                            onClick={() => {
                                requestRecipeForceRefresh();
                                navigate("/cook/recommendations");
                            }}
                            className="px-3 py-1.5 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                        >
                            立即刷新
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
