import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookHeart, ChefHat, Clock3, Flame, History, PlayCircle } from "lucide-react";
import { useCookingStore, useRecipesStore } from "../stores";
import {
    COOKING_HISTORY_UPDATED_EVENT,
    FAVORITES_UPDATED_EVENT,
    getCookingHistory,
    getFavoriteRecipes,
    type CookingHistoryItem,
    type FavoriteRecipeItem,
} from "../services/cookingLibrary";
import RecipesPage from "./RecipesPage";

const difficultyLabels: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
};

type CookTab = "recommendations" | "cooking" | "history" | "favorites";

const validTabs: CookTab[] = [
    "recommendations",
    "cooking",
    "history",
    "favorites",
];

function parseTab(value: string | null): CookTab {
    if (value && validTabs.includes(value as CookTab)) {
        return value as CookTab;
    }
    return "recommendations";
}

export default function CookHubPage() {
    const { currentSession } = useCookingStore();
    const { recipePages, recommendations } = useRecipesStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const [activeTab, setActiveTab] = useState<CookTab>(() =>
        parseTab(searchParams.get("tab")),
    );
    const [historyRecords, setHistoryRecords] = useState<CookingHistoryItem[]>(() => getCookingHistory());
    const [favoriteRecipes, setFavoriteRecipes] = useState<FavoriteRecipeItem[]>(() => getFavoriteRecipes());

    useEffect(() => {
        const syncHistory = () => setHistoryRecords(getCookingHistory());
        const syncFavorites = () => setFavoriteRecipes(getFavoriteRecipes());

        window.addEventListener("storage", syncHistory);
        window.addEventListener("storage", syncFavorites);
        window.addEventListener(COOKING_HISTORY_UPDATED_EVENT, syncHistory);
        window.addEventListener(FAVORITES_UPDATED_EVENT, syncFavorites);

        return () => {
            window.removeEventListener("storage", syncHistory);
            window.removeEventListener("storage", syncFavorites);
            window.removeEventListener(COOKING_HISTORY_UPDATED_EVENT, syncHistory);
            window.removeEventListener(FAVORITES_UPDATED_EVENT, syncFavorites);
        };
    }, []);

    useEffect(() => {
        const nextTab = parseTab(searchParams.get("tab"));
        if (nextTab !== activeTab) {
            setActiveTab(nextTab);
        }
    }, [searchParams, activeTab]);

    const recommendationCount =
        recipePages.reduce((sum, page) => sum + page.length, 0) || recommendations.length;

    const hasActiveSession =
        currentSession && currentSession.status !== "completed" && currentSession.recipe_id;

    const tabs: Array<{ key: CookTab; label: string; count: number }> = [
        { key: "recommendations", label: "推荐菜谱", count: recommendationCount },
        { key: "cooking", label: "烹饪", count: hasActiveSession ? 1 : 0 },
        { key: "history", label: "历史记录", count: historyRecords.length },
        { key: "favorites", label: "收藏", count: favoriteRecipes.length },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="overflow-x-auto">
                <div className="flex min-w-max gap-4 border-b border-gray-200">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setSearchParams({ tab: tab.key });
                                }}
                                className={`-mb-px border-b-2 px-1 pb-3 text-sm md:text-base font-semibold transition-colors ${
                                    isActive
                                        ? "border-primary-500 text-primary-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`ml-2 text-xs ${isActive ? "text-primary-500" : "text-gray-400"}`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {activeTab === "recommendations" && (
                <RecipesPage />
            )}

            {activeTab === "cooking" && (
                <section className="card p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Flame size={20} className="text-primary-600" />
                        烹饪
                    </h2>

                    {hasActiveSession ? (
                        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 md:p-5">
                            <p className="text-sm text-primary-700 mb-1">正在进行</p>
                            <p className="text-lg font-semibold text-gray-800">{currentSession.recipe_title || "继续上次菜谱"}</p>
                            <p className="text-sm text-gray-600 mt-1">
                                当前步骤：第 {currentSession.current_step + 1} 步
                                {currentSession.steps.length > 0 ? ` / 共 ${currentSession.steps.length} 步` : ""}
                            </p>
                            <Link
                                to={`/cook/session/${currentSession.recipe_id}`}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                            >
                                <PlayCircle size={18} />
                                继续当前烹饪
                            </Link>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                            <Clock3 size={28} className="mx-auto text-gray-400 mb-3" />
                            <p className="font-medium text-gray-700">暂无进行中的烹饪</p>
                            <p className="text-sm text-gray-500 mt-1">从推荐菜谱中选择一道菜开始吧</p>
                            <button
                                onClick={() => {
                                    setActiveTab("recommendations");
                                    setSearchParams({ tab: "recommendations" });
                                }}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                            >
                                <ChefHat size={18} />
                                去选菜谱
                            </button>
                        </div>
                    )}
                </section>
            )}

            {activeTab === "history" && (
                <section className="card p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <History size={20} className="text-gray-700" />
                        最近烹饪历史
                    </h2>

                    {historyRecords.length > 0 ? (
                        <div className="space-y-3">
                            {historyRecords.map((item) => (
                                <div
                                    key={item.session_id}
                                    className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.recipe_title}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            完成于 {new Date(item.completed_at).toLocaleString()}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            耗时 {formatElapsed(item.elapsed_seconds)}
                                        </p>
                                    </div>
                                    <Link
                                        to={`/cook/recommendations/${item.recipe_id}`}
                                        className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                    >
                                        查看菜谱
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
                            暂无烹饪历史，完成一次烹饪后会出现在这里。
                        </div>
                    )}
                </section>
            )}

            {activeTab === "favorites" && (
                <section className="card p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <BookHeart size={20} className="text-red-500" />
                        我的收藏菜谱
                    </h2>

                    {favoriteRecipes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {favoriteRecipes.map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/cook/recommendations/${item.id}`}
                                    className="rounded-xl border border-gray-200 p-4 hover:border-primary-500 hover:shadow-md transition-all"
                                >
                                    <p className="font-semibold text-gray-800 line-clamp-1">{item.title}</p>
                                    <p className="text-sm text-gray-500 mt-2">收藏于 {new Date(item.saved_at).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {item.cooking_time} 分钟 · {difficultyLabels[item.difficulty] || item.difficulty}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
                            暂无收藏菜谱，去菜谱详情点亮收藏即可在这里查看。
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

function formatElapsed(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}分${secs.toString().padStart(2, "0")}秒`;
}
