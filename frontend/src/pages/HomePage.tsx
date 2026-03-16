import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Scan,
    Utensils,
    ChefHat,
    ArrowRight,
    Sparkles,
    ShoppingCart,
    RefreshCw,
    Trash2,
    PieChart,
    Settings,
    Carrot,
    X,
} from "lucide-react";

import { useIngredientsStore, useRecipesStore } from "../stores";
import { ingredientApi } from "../services/api";
import type { Ingredient } from "../types";
import { getUserId } from "../utils/userId";
import {
    getItemName,
    isItemCompleted,
    useShoppingLists,
} from "../hooks/useShoppingLists";
import {
    clearRecipeCacheDirty,
    markRecipeCacheDirty,
    requestRecipeForceRefresh,
} from "../services/recipeCache";

export default function HomePage() {
    const navigate = useNavigate();
    const { ingredients, addIngredient, clearIngredients } =
        useIngredientsStore();
    const {
        recommendations,
        recipePages,
        loadFromDatabase,
        clearRecommendations,
    } = useRecipesStore();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newIngredient, setNewIngredient] = useState({
        name: "",
        quantity: 1,
        unit: "个",
        category: "other",
    });
    const [isAdding, setIsAdding] = useState(false);
    const [showRecipeRefreshDialog, setShowRecipeRefreshDialog] =
        useState(false);
    const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const { shoppingLists } = useShoppingLists("pending");

    const expiringSoon = ingredients.filter((ing) => ing.is_expiring_soon);
    const hasIngredients = ingredients.length > 0;

    useEffect(() => {
        // 如果 recipePages 为空，从数据库加载
        if (recipePages.length === 0) {
            loadFromDatabase();
        }
    }, []);

    const pendingPurchaseCount = shoppingLists.reduce((count, list) => {
        const pendingItems = list.items.filter(
            (item: any) => !isItemCompleted(item),
        );
        return count + pendingItems.length;
    }, 0);

    const cardDescriptions: Record<string, string> = {
        scan: "拍照识别冰箱食材，自动整理库存和保鲜状态。",
        recommend: "根据当前食材智能匹配可做菜谱，减少决策成本。",
        inventory: "查看现有食材与保质提醒，及时补充和清理库存。",
        shopping: "汇总缺失食材，快速生成待采购清单。",
        stats: "追踪今日库存、推荐与采购数量变化。",
        profile: "管理口味偏好与使用习惯，让推荐更贴合你。",
    };

    const cardActions: Record<string, { to: string; label: string }> = {
        scan: { to: "/scan", label: "去扫描" },
        recommend: { to: "/cook/recommendations", label: "查看推荐" },
        inventory: { to: "/food", label: "查看库存" },
        shopping: { to: "/food/shopping", label: "前往采购" },
        stats: { to: "/profile#today-stats", label: "查看统计" },
        profile: { to: "/profile", label: "个性化设置" },
    };

    const cardActionStyles: Record<string, string> = {
        scan: "bg-primary-400 hover:bg-primary-500",
        recommend: "bg-accent-400 hover:bg-accent-500",
        inventory: "bg-orange-400 hover:bg-orange-500",
        shopping: "bg-orange-400 hover:bg-orange-500",
        stats: "bg-blue-400 hover:bg-blue-500",
        profile: "bg-gray-400 hover:bg-gray-500",
    };

    const handleAddIngredient = async () => {
        if (!newIngredient.name.trim()) return;

        setIsAdding(true);
        try {
            const saved = await ingredientApi.addIngredient(
                newIngredient as Partial<Ingredient>,
                getUserId(),
            );
            addIngredient(saved);
            markRecipeCacheDirty();
            setNewIngredient({
                name: "",
                quantity: 1,
                unit: "个",
                category: "other",
            });
            setShowAddForm(false);
            setShowRecipeRefreshDialog(true);
        } catch (err) {
            console.error("Failed to add ingredient:", err);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="relative h-[calc(100dvh-var(--layout-top-space)-var(--layout-nav-space))] w-full overflow-hidden animate-fade-in flex flex-col items-center bg-transparent">
            <div className="relative w-[100%] h-full pt-4 pb-1">
                <div className="relative z-20 mb-3 flex items-center justify-center gap-2">
                    <Utensils size={20} className="text-primary-600" />
                    <h1 className="text-3xl font-extrabold tracking-wide text-gray-800">
                        今天吃什么
                    </h1>
                </div>
                {[
                    {
                        id: "scan",
                        title: "扫描冰箱",
                        icon: <Scan size={24} className="text-primary-600" />,
                        bgBorder: "border-primary-200/60",
                        content: (
                            <div className="flex items-center space-x-4 h-full px-2">
                                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                                    <Scan
                                        size={32}
                                        className="text-primary-600"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-500 text-sm">
                                        AI识别食材自动录入，极简管理库存
                                    </p>
                                </div>
                                <Link
                                    to="/scan"
                                    className="w-12 h-12 bg-white shadow-md border border-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform ml-auto flex-shrink-0"
                                >
                                    <ArrowRight
                                        size={24}
                                        className="text-primary-600"
                                    />
                                </Link>
                            </div>
                        ),
                    },
                    {
                        id: "inventory",
                        title: "食材库存",
                        icon: <Carrot size={24} className="text-orange-600" />,
                        bgBorder: "border-orange-200/60",
                        content: (
                            <div className="flex flex-col h-full justify-center px-2 space-y-3 relative z-10 pointer-events-auto">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600 font-medium">
                                        当前库存: {ingredients.length} 种食材
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowClearConfirmDialog(true);
                                            }}
                                            className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                                        >
                                            清空
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowAddForm(true);
                                            }}
                                            className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                                        >
                                            添加
                                        </button>
                                    </div>
                                </div>

                                {expiringSoon.length > 0 && (
                                    <div className="text-xs text-red-600 bg-red-50/80 p-2.5 rounded-lg font-medium flex items-center shadow-sm">
                                        <ChefHat size={14} className="mr-1.5" />
                                        {expiringSoon
                                            .map((i) => i.name)
                                            .join("、")}{" "}
                                        即将过期!
                                    </div>
                                )}

                                {hasIngredients ? (
                                    <div className="flex flex-wrap gap-2 overflow-y-auto max-h-20 scrollbar-hide py-1">
                                        {ingredients.map((ing) => (
                                            <span
                                                key={ing.id}
                                                className={`px-2.5 py-1 rounded-full text-xs shadow-sm border ${ing.is_expiring_soon ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-700"}`}
                                            >
                                                {ing.name} {ing.quantity}
                                                {ing.unit}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-2 text-sm text-gray-400">
                                        空空如也，扫描一下冰箱吧
                                    </div>
                                )}
                            </div>
                        ),
                    },
                    {
                        id: "recommend",
                        title: "推荐菜谱",
                        icon: (
                            <Utensils size={24} className="text-accent-600" />
                        ),
                        bgBorder: "border-accent-200/60",
                        content: (
                            <div className="flex items-center space-x-3 h-full px-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-500 text-sm">
                                        不知道吃什么？根据现有食材为您推荐精选菜谱。
                                    </p>
                                </div>
                                <Link
                                    to="/cook/recommendations"
                                    className="px-5 py-3 bg-accent-100/80 text-accent-700 hover:bg-accent-200 rounded-xl font-medium text-sm transition-colors shadow-sm"
                                >
                                    浏览菜谱
                                </Link>
                            </div>
                        ),
                    },
                    {
                        id: "shopping",
                        title: "采购清单",
                        icon: (
                            <ShoppingCart
                                size={24}
                                className="text-orange-600"
                            />
                        ),
                        bgBorder: "border-orange-200/60",
                        content: (
                            <div className="flex flex-col h-full justify-center px-2 space-y-3 pointer-events-auto relative z-10">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">
                                        待采购{" "}
                                        <span className="text-orange-600 font-bold">
                                            {pendingPurchaseCount}
                                        </span>{" "}
                                        项商品
                                    </span>
                                    <Link
                                        to="/food/shopping"
                                        className="text-xs font-medium text-orange-700 px-3 py-1.5 bg-orange-100/80 hover:bg-orange-200 rounded-lg transition-colors"
                                    >
                                        前往采购
                                    </Link>
                                </div>
                                {shoppingLists.length > 0 ? (
                                    <div className="text-sm text-gray-700 bg-white/60 border border-orange-100 shadow-sm p-3 rounded-xl overflow-hidden">
                                        <div className="font-medium truncate text-orange-800 mb-1">
                                            {shoppingLists[0].recipe_title ||
                                                "日常缺食"}
                                        </div>
                                        <div className="truncate text-xs text-gray-500">
                                            {shoppingLists[0].items
                                                .filter(
                                                    (i: any) =>
                                                        !isItemCompleted(i),
                                                )
                                                .map((i: any) => getItemName(i))
                                                .join(", ")}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-2 text-sm text-gray-400">
                                        所有采购已完成
                                    </div>
                                )}
                            </div>
                        ),
                    },
                    {
                        id: "stats",
                        title: "今日统计",
                        icon: <PieChart size={24} className="text-blue-600" />,
                        bgBorder: "border-blue-200/60",
                        content: (
                            <div className="grid grid-cols-3 gap-3 h-full items-center px-2 py-2">
                                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 text-center shadow-sm border border-gray-100">
                                    <div className="text-xl font-bold text-primary-600 mb-1">
                                        {ingredients.length}
                                    </div>
                                    <div className="text-xs font-medium text-gray-500">
                                        库存
                                    </div>
                                </div>
                                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 text-center shadow-sm border border-gray-100">
                                    <div className="text-xl font-bold text-accent-600 mb-1">
                                        {recipePages.length > 0
                                            ? recipePages.reduce(
                                                  (t, p) => t + p.length,
                                                  0,
                                              )
                                            : recommendations.length}
                                    </div>
                                    <div className="text-xs font-medium text-gray-500">
                                        推荐
                                    </div>
                                </div>
                                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 text-center shadow-sm border border-gray-100">
                                    <div className="text-xl font-bold text-orange-500 mb-1">
                                        {pendingPurchaseCount}
                                    </div>
                                    <div className="text-xs font-medium text-gray-500">
                                        待买
                                    </div>
                                </div>
                            </div>
                        ),
                    },
                    {
                        id: "profile",
                        title: "个性设置",
                        icon: <Settings size={24} className="text-gray-600" />,
                        bgBorder: "border-gray-200/60",
                        content: (
                            <div className="flex items-center space-x-4 h-full px-2 pointer-events-auto relative z-10">
                                <div className="flex-1 space-y-2">
                                    <div className="text-xs text-gray-500 flex items-center">
                                        <Sparkles
                                            size={14}
                                            className="mr-1.5 text-yellow-500"
                                        />{" "}
                                        点击卡片查看完整内容
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center">
                                        <Sparkles
                                            size={14}
                                            className="mr-1.5 text-yellow-500"
                                        />{" "}
                                        自定义您的口味偏好
                                    </div>
                                </div>
                                <Link
                                    to="/profile"
                                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors"
                                >
                                    个性化设置
                                </Link>
                            </div>
                        ),
                    },
                ].map((card, index, arr) => {
                    const isActive = index === activeIndex;
                    const activeDescription =
                        cardDescriptions[card.id] ??
                        "查看该卡片的核心信息与操作入口。";
                    const activeAction = cardActions[card.id] ?? {
                        to: "/home",
                        label: "进入功能",
                    };
                    const activeActionStyle =
                        cardActionStyles[card.id] ??
                        "bg-primary-400 hover:bg-primary-500";

                    // --- STACKING MATH LOGIC ---
                    const CARD_HEIGHT = 180;
                    const VISIBLE_HEIGHT = CARD_HEIGHT * 0.4; // overlap 60%
                    // Reserve space for the page title while keeping the stack near bottom nav.
                    const STACK_BASE_OFFSET = 96;

                    // 当前激活卡片视为堆叠中的第 0 层，其余卡片顺延
                    const stackIndex = isActive
                        ? 0
                        : index < activeIndex
                          ? index + 1
                          : index;

                    // 所有卡片都保持在同一堆叠体系中，非单独抽离显示
                    const translateY =
                        STACK_BASE_OFFSET + stackIndex * VISIBLE_HEIGHT;

                    const cardOpacity = Math.max(0.72, 1 - stackIndex * 0.06);

                    return (
                        <div
                            key={card.id}
                            onClick={() => {
                                if (!isActive) setActiveIndex(index);
                            }}
                            className={`absolute left-0 right-0 rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden cursor-pointer backdrop-blur-xl bg-white/70 ${isActive ? `border-2 ${card.bgBorder}` : "border border-gray-200/70"}`}
                            style={{
                                height: `${CARD_HEIGHT}px`,
                                transform: `translateY(${translateY}px)`,
                                opacity: cardOpacity,
                                zIndex: arr.length - stackIndex,
                            }}
                        >
                            {isActive ? (
                                <div className="h-full flex items-center px-6 py-5 bg-white/60 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
                                    <div className="w-20 h-20 rounded-2xl bg-white/90 border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0">
                                        <div className="scale-[1.8]">
                                            {card.icon}
                                        </div>
                                    </div>
                                    <div className="ml-5 flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-800 tracking-wide text-xl truncate">
                                            {card.title}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-3">
                                            {activeDescription}
                                        </p>
                                    </div>
                                    <Link
                                        to={activeAction.to}
                                        aria-label={activeAction.label}
                                        title={activeAction.label}
                                        className={`ml-4 w-11 h-11 rounded-full text-white flex items-center justify-center shadow-md transition-colors flex-shrink-0 ${activeActionStyle}`}
                                    >
                                        <ArrowRight size={18} />
                                    </Link>
                                </div>
                            ) : (
                                <div className="absolute inset-x-0 bottom-0 h-1/3 flex items-center px-4 bg-white/65 backdrop-blur-xl border-t border-white/70 transition-all duration-500">
                                    <div className="p-1.5 rounded-lg bg-white/80 shadow-sm mr-2.5 opacity-80 transition-all duration-500 flex-shrink-0">
                                        {card.icon}
                                    </div>
                                    <h3 className="font-semibold text-gray-700 text-base tracking-wide truncate opacity-90">
                                        {card.title}
                                    </h3>
                                </div>
                            )}

                            {!isActive && null}
                        </div>
                    );
                })}
            </div>

            {showRecipeRefreshDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in px-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                <RefreshCw
                                    size={40}
                                    className="text-primary-600"
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                库存已更新
                            </h3>
                            <p className="text-gray-500">
                                重新生成菜谱以获取最新美食推荐
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={() =>
                                    setShowRecipeRefreshDialog(false)
                                }
                                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                            >
                                稍后再说
                            </button>
                            <button
                                onClick={() => {
                                    setShowRecipeRefreshDialog(false);
                                    requestRecipeForceRefresh();
                                    navigate("/cook/recommendations");
                                }}
                                className="flex-1 py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium shadow-md shadow-primary-200 transition-colors"
                            >
                                立即推荐
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showClearConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in px-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                <Trash2 size={40} className="text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                清空全部食材?
                            </h3>
                            <p className="text-gray-500">
                                一旦清空，所有食材和相应的菜谱推荐不可恢复。
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowClearConfirmDialog(false)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
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
                                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium shadow-md shadow-red-200 transition-colors"
                            >
                                清空
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] animate-fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">
                                快速添加食材
                            </h3>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="flex flex-col space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">
                                    食材名称
                                </label>
                                <input
                                    type="text"
                                    value={newIngredient.name}
                                    onChange={(e) =>
                                        setNewIngredient((prev: any) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder="比如：西红柿"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                                />
                            </div>

                            <div className="flex space-x-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">
                                        数量
                                    </label>
                                    <input
                                        type="number"
                                        value={newIngredient.quantity}
                                        onChange={(e) =>
                                            setNewIngredient((prev: any) => ({
                                                ...prev,
                                                quantity:
                                                    parseFloat(
                                                        e.target.value,
                                                    ) || 1,
                                            }))
                                        }
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-medium"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">
                                        单位
                                    </label>
                                    <select
                                        value={newIngredient.unit}
                                        onChange={(e) =>
                                            setNewIngredient((prev: any) => ({
                                                ...prev,
                                                unit: e.target.value,
                                            }))
                                        }
                                        className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all appearance-none font-medium"
                                    >
                                        <option value="个">个</option>
                                        <option value="斤">斤</option>
                                        <option value="克">克</option>
                                        <option value="千克">千克</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleAddIngredient}
                                disabled={isAdding || !newIngredient.name}
                                className={`w-full py-4 mt-4 rounded-xl font-bold text-white transition-all shadow-lg ${isAdding || !newIngredient.name ? "bg-primary-300 shadow-none cursor-not-allowed" : "bg-primary-500 hover:bg-primary-600 hover:-translate-y-0.5 active:translate-y-0 shadow-primary-200"}`}
                            >
                                {isAdding ? "处理中..." : "确认添加"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
