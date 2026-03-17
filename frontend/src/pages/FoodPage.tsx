import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    Carrot,
    Check,
    Heart,
    Plus,
    ScanLine,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";

import { ingredientApi } from "../services/api";
import { useIngredientsStore, useRecipesStore } from "../stores";
import { getUserId } from "../utils/userId";
import type { Ingredient } from "../types";
import {
    clearRecipeCacheDirty,
    markRecipeCacheDirty,
    requestRecipeForceRefresh,
} from "../services/recipeCache";
import {
    expiryDateFromLevel,
    getExpiryStatus,
    type ExpiryLevel,
} from "../utils/expiry";

const categoryLabels: Record<string, string> = {
    vegetable: "蔬菜",
    meat: "肉类",
    seafood: "海鲜",
    dairy: "奶制品",
    egg: "蛋类",
    grain: "谷物",
    fruit: "水果",
    seasoning: "调料",
    beverage: "饮品",
    other: "其他",
};

const categoryColors: Record<string, string> = {
    vegetable: "bg-green-100 text-green-700",
    meat: "bg-red-100 text-red-700",
    seafood: "bg-blue-100 text-blue-700",
    dairy: "bg-yellow-100 text-yellow-700",
    egg: "bg-orange-100 text-orange-700",
    grain: "bg-amber-100 text-amber-700",
    fruit: "bg-purple-100 text-purple-700",
    seasoning: "bg-gray-100 text-gray-700",
    beverage: "bg-cyan-100 text-cyan-700",
    other: "bg-gray-100 text-gray-600",
};

export default function FoodPage() {
    const navigate = useNavigate();
    const {
        ingredients,
        addIngredient,
        removeIngredient,
        setIngredients,
        clearIngredients,
    } = useIngredientsStore();
    const { clearRecommendations } = useRecipesStore();

    const [showAddForm, setShowAddForm] = useState(false);
    const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);
    const [showRecipeRefreshDialog, setShowRecipeRefreshDialog] =
        useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [expiryFilter, setExpiryFilter] = useState<"all" | ExpiryLevel>(
        "all",
    );
    const [newIngredient, setNewIngredient] = useState({
        name: "",
        quantity: 1,
        unit: "个",
        category: "other",
        expiry_level: "green" as ExpiryLevel,
    });

    const expiryCounts = useMemo(() => {
        return ingredients.reduce(
            (acc, item) => {
                const status = getExpiryStatus(item);
                acc[status.level] += 1;
                return acc;
            },
            { red: 0, yellow: 0, green: 0 },
        );
    }, [ingredients]);

    const sortedIngredients = useMemo(
        () =>
            [...ingredients].sort((a, b) => {
                const statusA = getExpiryStatus(a);
                const statusB = getExpiryStatus(b);

                if (statusA.sortPriority !== statusB.sortPriority) {
                    return statusA.sortPriority - statusB.sortPriority;
                }

                return a.name.localeCompare(b.name, "zh-CN");
            }),
        [ingredients],
    );

    const displayIngredients = useMemo(() => {
        if (expiryFilter === "all") {
            return sortedIngredients;
        }
        return sortedIngredients.filter(
            (item) => getExpiryStatus(item).level === expiryFilter,
        );
    }, [expiryFilter, sortedIngredients]);

    useEffect(() => {
        const loadAllIngredients = async () => {
            try {
                const data = await ingredientApi.getIngredients(getUserId());
                setIngredients(data);
            } catch (error) {
                console.error("Failed to load ingredients:", error);
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
                {
                    ...newIngredient,
                    expiry_date: expiryDateFromLevel(
                        newIngredient.expiry_level,
                    ),
                } as Partial<Ingredient>,
                getUserId(),
            );
            addIngredient(saved);
            markRecipeCacheDirty();
            setShowAddForm(false);
            setNewIngredient({
                name: "",
                quantity: 1,
                unit: "个",
                category: "other",
                expiry_level: "green",
            });
            setShowRecipeRefreshDialog(true);
        } catch (error) {
            console.error("Failed to add ingredient:", error);
            window.alert(
                `保存失败：${error instanceof Error ? error.message : "请检查后端或数据库配置"}`,
            );
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteIngredient = async (ingredientId: string) => {
        if (!confirm("确定要删除这个食材吗？")) {
            return;
        }

        try {
            await ingredientApi.deleteIngredient(ingredientId, getUserId());
            removeIngredient(ingredientId);
            markRecipeCacheDirty();
            setShowRecipeRefreshDialog(true);
        } catch (error) {
            console.error("Failed to delete ingredient:", error);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    to="/scan"
                    className="card p-5 border-2 border-transparent hover:border-primary-500 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                            <ScanLine size={22} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-800">
                                继续扫描入库
                            </h2>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/food/shopping"
                    className="card p-5 border-2 border-transparent hover:border-orange-400 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                            <ShoppingCart size={22} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-800">
                                查看采购清单
                            </h2>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/food/desired"
                    className="card p-5 border-2 border-transparent hover:border-purple-400 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                            <Heart size={22} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-800">
                                我的心想食材
                            </h2>
                        </div>
                    </div>
                </Link>
            </section>

            <section className="card p-5 md:p-6">
                <div className="flex flex-row items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Carrot size={20} className="text-primary-600" />
                        <span className="hidden sm:inline">食材库存</span>
                        <span className="sm:hidden">食材库存</span>
                    </h2>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowClearConfirmDialog(true)}
                            disabled={ingredients.length === 0}
                            className="flex items-center space-x-1 px-2 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={14} />
                            <span>清空</span>
                        </button>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                        >
                            <Plus size={16} />
                            <span>手动添加</span>
                        </button>
                    </div>
                </div>

                {ingredients.length > 0 && (
                    <div className="mb-4 grid grid-cols-4 gap-2 w-full border-b border-gray-200">
                        {[
                            {
                                key: "all",
                                label: "全部",
                                activeClass: "border-gray-600 text-gray-700",
                                inactiveClass:
                                    "border-transparent text-gray-400 hover:text-gray-600",
                            },
                            {
                                key: "red",
                                label: `立即吃 ${expiryCounts.red}`,
                                activeClass: "border-red-500 text-red-600",
                                inactiveClass:
                                    "border-transparent text-red-300 hover:text-red-500",
                            },
                            {
                                key: "yellow",
                                label: `尽快吃 ${expiryCounts.yellow}`,
                                activeClass:
                                    "border-yellow-500 text-yellow-600",
                                inactiveClass:
                                    "border-transparent text-yellow-400 hover:text-yellow-600",
                            },
                            {
                                key: "green",
                                label: `很新鲜 ${expiryCounts.green}`,
                                activeClass: "border-green-500 text-green-600",
                                inactiveClass:
                                    "border-transparent text-green-400 hover:text-green-600",
                            },
                        ].map((item) => (
                            <button
                                key={item.key}
                                onClick={() =>
                                    setExpiryFilter(
                                        item.key as typeof expiryFilter,
                                    )
                                }
                                className={`-mb-px w-full border-b-2 px-1 pb-2 text-xs font-semibold transition-colors ${
                                    expiryFilter === item.key
                                        ? item.activeClass
                                        : item.inactiveClass
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}

                {showAddForm && (
                    <div className="mb-6">
                        <div className="w-full max-w-full flex flex-wrap items-center gap-1.5 md:gap-2 p-2 md:p-2.5 bg-gray-50 rounded-lg">
                            <select
                                value={newIngredient.category}
                                onChange={(e) =>
                                    setNewIngredient((prev) => ({
                                        ...prev,
                                        category: e.target.value,
                                    }))
                                }
                                className={`shrink-0 px-2 py-1 rounded-full text-[11px] md:text-xs font-medium border-none cursor-pointer ${categoryColors[newIngredient.category] || categoryColors.other}`}
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

                            <input
                                type="text"
                                value={newIngredient.name}
                                onChange={(e) =>
                                    setNewIngredient((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                placeholder="食材名称"
                                className="flex-1 min-w-0 basis-[72px] px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs md:text-sm"
                            />

                            <input
                                type="number"
                                value={newIngredient.quantity}
                                min="1"
                                onChange={(e) =>
                                    setNewIngredient((prev) => ({
                                        ...prev,
                                        quantity:
                                            parseFloat(e.target.value) || 1,
                                    }))
                                }
                                className="w-12 md:w-14 shrink-0 px-1.5 py-1.5 border border-gray-200 rounded-lg text-center text-xs md:text-sm"
                            />

                            <select
                                value={newIngredient.unit}
                                onChange={(e) =>
                                    setNewIngredient((prev) => ({
                                        ...prev,
                                        unit: e.target.value,
                                    }))
                                }
                                className="shrink-0 max-w-[66px] px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs md:text-sm"
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

                            <div className="w-full">
                                <div className="grid grid-cols-3 gap-2 w-full border-b border-gray-200">
                                    {[
                                        {
                                            level: "red",
                                            label: "立即吃",
                                            activeClass:
                                                "border-red-500 text-red-600",
                                            inactiveClass:
                                                "border-transparent text-red-300 hover:text-red-500",
                                        },
                                        {
                                            level: "yellow",
                                            label: "尽快吃",
                                            activeClass:
                                                "border-yellow-500 text-yellow-600",
                                            inactiveClass:
                                                "border-transparent text-yellow-400 hover:text-yellow-600",
                                        },
                                        {
                                            level: "green",
                                            label: "很新鲜",
                                            activeClass:
                                                "border-green-500 text-green-600",
                                            inactiveClass:
                                                "border-transparent text-green-400 hover:text-green-600",
                                        },
                                    ].map((item) => (
                                        <button
                                            key={item.level}
                                            type="button"
                                            onClick={() =>
                                                setNewIngredient((prev) => ({
                                                    ...prev,
                                                    expiry_level:
                                                        item.level as ExpiryLevel,
                                                }))
                                            }
                                            className={`-mb-px w-full border-b-2 px-1 pb-2 text-xs font-semibold transition-colors ${
                                                newIngredient.expiry_level ===
                                                item.level
                                                    ? item.activeClass
                                                    : item.inactiveClass
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full flex items-center justify-center gap-3 pt-1">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <X size={16} />
                                </button>
                                <button
                                    onClick={handleAddIngredient}
                                    disabled={
                                        isAdding || !newIngredient.name.trim()
                                    }
                                    className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                                >
                                    <Check size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {ingredients.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Carrot size={48} className="mx-auto mb-4 opacity-50" />
                        <p>暂无食材</p>
                        <p className="text-sm mt-2">请先前往扫描页添加食材</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {displayIngredients.map((ing) => {
                            const expiryStatus = getExpiryStatus(ing);
                            return (
                                <div
                                    key={ing.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div
                                            className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors[ing.category || "other"]}`}
                                        >
                                            {categoryLabels[
                                                ing.category || "other"
                                            ] || "其他"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm md:text-base font-medium text-gray-800 truncate">
                                                {ing.name}
                                            </div>
                                            <div className="text-xs md:text-sm text-gray-500 truncate flex items-center gap-2">
                                                <span>
                                                    {ing.quantity}
                                                    {ing.unit}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full border text-xs font-medium ${expiryStatus.className}`}
                                                >
                                                    {expiryStatus.shortLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() =>
                                            handleDeleteIngredient(ing.id!)
                                        }
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {showRecipeRefreshDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle
                                    size={28}
                                    className="text-primary-600"
                                />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                                库存已更新
                            </h3>
                            <p className="text-sm md:text-base text-gray-600">
                                是否现在刷新推荐菜谱？
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() =>
                                    setShowRecipeRefreshDialog(false)
                                }
                                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                稍后再说
                            </button>
                            <button
                                onClick={() => {
                                    setShowRecipeRefreshDialog(false);
                                    requestRecipeForceRefresh();
                                    navigate("/cook?tab=recommendations");
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
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                清空食材
                            </h3>
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
