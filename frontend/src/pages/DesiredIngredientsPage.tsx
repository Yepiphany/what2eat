import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Clock3, Heart, Plus, Trash2 } from "lucide-react";

import { useIngredientsStore } from "../stores";
import { requestRecipeForceRefresh } from "../services/recipeCache";

export default function DesiredIngredientsPage() {
    const navigate = useNavigate();
    const {
        desiredIngredients,
        desiredIngredientHistory,
        addDesiredIngredient,
        removeDesiredIngredient,
        setDesiredIngredients,
        syncDesiredIngredientStatus,
    } = useIngredientsStore();

    const [inputValue, setInputValue] = useState("");
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showRecipeRefreshDialog, setShowRecipeRefreshDialog] =
        useState(false);

    useEffect(() => {
        syncDesiredIngredientStatus();
    }, [syncDesiredIngredientStatus]);

    const handleAdd = () => {
        const value = inputValue.trim();
        if (!value) {
            return;
        }

        addDesiredIngredient(value);
        setInputValue("");
        setShowRecipeRefreshDialog(true);
    };

    const handleDelete = (name: string) => {
        removeDesiredIngredient(name);
        setShowRecipeRefreshDialog(true);
    };

    const handleClearAll = () => {
        setDesiredIngredients([]);
        setShowClearDialog(false);
        setShowRecipeRefreshDialog(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                    <ChevronLeft size={24} />
                    <span>返回</span>
                </button>
            </div>

            <section className="card p-5 md:p-6 border border-primary-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                        <Heart size={22} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-800 text-lg">
                            添加心想食材
                        </h2>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAdd();
                                }
                            }}
                            placeholder="例如：牛腩"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!inputValue.trim()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                        <Plus size={16} />
                        <span>添加</span>
                    </button>
                </div>

                <Link
                    to="/food/desired/history"
                    className="mt-4 block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-700">
                            <Clock3 size={18} />
                            <span className="font-medium">过往心想</span>
                        </div>
                        <span className="text-sm text-amber-700">
                            {desiredIngredientHistory.length} 条
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-amber-700/80">
                        查看曾经的心想食材
                    </p>
                </Link>
            </section>

            {desiredIngredients.length === 0 ? (
                <div className="card p-12 text-center">
                    <Heart size={64} className="mx-auto mb-4 text-primary-200" />
                    <p className="text-gray-500 text-lg mb-4">
                        还没有心想食材
                    </p>
                    <Link
                        to="/cook?tab=recommendations"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                        <span>去查看推荐</span>
                    </Link>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {desiredIngredients.map((item) => (
                            <div
                                key={item}
                                className="card p-4 flex items-center justify-between bg-primary-50 border border-primary-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                                        <Heart size={16} />
                                    </div>
                                    <span className="font-medium text-gray-800">
                                        {item}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(item)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    aria-label={`删除${item}`}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowClearDialog(true)}
                        className="flex items-center space-x-2 px-6 py-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg hover:shadow-xl mx-auto mt-4"
                    >
                        <Trash2 size={18} />
                        <span className="text-base font-medium">清空心想食材</span>
                    </button>
                </>
            )}

            {showClearDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 animate-scale-in">
                        <div className="text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                                清空心想食材
                            </h3>
                            <p className="text-gray-600 mb-6">
                                确定要清空所有心想食材吗？
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowClearDialog(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleClearAll}
                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                                >
                                    确定清空
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRecipeRefreshDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Heart size={28} className="text-primary-600" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                                心想食材已更新
                            </h3>
                            <p className="text-sm md:text-base text-gray-600">
                                是否现在刷新推荐菜谱？
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
        </div>
    );
}
