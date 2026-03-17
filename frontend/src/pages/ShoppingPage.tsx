import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ShoppingCart, Trash2, Check, Plus } from "lucide-react";
import {
    getItemName,
    isItemCompleted,
    type ShoppingListItem,
    useShoppingLists,
} from "../hooks/useShoppingLists";

export default function ShoppingPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"pending" | "completed">(
        "pending",
    );
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [pendingCompleteItem, setPendingCompleteItem] =
        useState<ShoppingListItem | null>(null);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const {
        shoppingLists,
        isLoading,
        pendingCount,
        completedCount,
        toggleItem,
        completeShoppingList,
        deleteShoppingListItem,
        clearAllShoppingLists,
    } = useShoppingLists(activeTab);

    const handleToggleItem = async (
        itemId: string,
        itemIndex: number,
        onComplete?: (
            items: (string | { name: string; completed: boolean })[],
        ) => void,
    ) => {
        try {
            const response = await toggleItem(itemId, itemIndex);
            if (onComplete && response.items) {
                const allCompleted = response.items.every((ing) =>
                    isItemCompleted(ing),
                );
                if (allCompleted) {
                    onComplete(response.items);
                }
            }
        } catch (error) {
            console.error("Failed to toggle item:", error);
        }
    };

    const handleToggleItemWithCheck = (
        item: ShoppingListItem,
        itemIndex: number,
    ) => {
        const wasLastIncomplete = !isItemCompleted(item.items[itemIndex]);

        if (wasLastIncomplete) {
            handleToggleItem(item.id, itemIndex, () => {
                setPendingCompleteItem(item);
                setShowCompleteDialog(true);
            });
        } else {
            handleToggleItem(item.id, itemIndex);
        }
    };

    const confirmMoveToCompleted = async () => {
        if (pendingCompleteItem) {
            try {
                await completeShoppingList(pendingCompleteItem.id);
            } catch (error) {
                console.error("Failed to complete shopping list:", error);
            }
        }
        setShowCompleteDialog(false);
        setPendingCompleteItem(null);
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm("确定删除此项目？")) return;

        try {
            await deleteShoppingListItem(itemId);
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    const handleClearAll = async () => {
        setShowClearDialog(false);
        setIsClearing(true);

        try {
            await clearAllShoppingLists();
        } catch (error) {
            console.error("Failed to clear shopping list:", error);
            alert("清空失败，请重试");
        } finally {
            setIsClearing(false);
        }
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

            <div className="flex space-x-2">
                <button
                    onClick={() => setActiveTab("pending")}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                        activeTab === "pending"
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                    待采购 ({pendingCount})
                </button>
                <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                        activeTab === "completed"
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                    已完成 ({completedCount})
                </button>
            </div>

            {isLoading && shoppingLists.length === 0 ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
                </div>
            ) : shoppingLists.length === 0 ? (
                <div className="card p-12 text-center">
                    <ShoppingCart
                        size={64}
                        className="mx-auto mb-4 text-gray-300"
                    />
                    <p className="text-gray-500 text-lg mb-4">
                        {activeTab === "pending"
                            ? "暂无待采购的食材"
                            : "已全部完成"}
                    </p>
                    <Link
                        to="/cook?tab=recommendations"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                        <Plus size={20} />
                        <span>去添加采购清单</span>
                    </Link>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {shoppingLists.map((item) => (
                            <div key={item.id} className="card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        {item.status === "completed" ? (
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <Check
                                                    size={18}
                                                    className="text-green-600"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                                <ShoppingCart
                                                    size={18}
                                                    className="text-orange-600"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            {item.recipe_id ? (
                                                <Link
                                                    to={`/cook/recommendations/${item.recipe_id}`}
                                                    className="font-medium text-gray-800 hover:text-primary-600"
                                                >
                                                    {item.recipe_title ||
                                                        "未知菜谱"}
                                                </Link>
                                            ) : (
                                                <span className="font-medium text-gray-800">
                                                    {item.recipe_title ||
                                                        "未知菜谱"}
                                                </span>
                                            )}
                                            <p className="text-sm text-gray-500">
                                                {new Date(
                                                    item.created_at,
                                                ).toLocaleDateString()}{" "}
                                                添加
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {item.items.map((ing, index) => {
                                        const itemName = getItemName(ing);
                                        const itemCompleted =
                                            isItemCompleted(ing);
                                        const isItemDisabled =
                                            item.status === "completed";

                                        return (
                                            <div
                                                key={index}
                                                className={`flex items-center space-x-3 py-2 px-3 rounded-lg transition-colors ${
                                                    itemCompleted
                                                        ? "bg-green-50"
                                                        : "bg-orange-50"
                                                } ${isItemDisabled ? "" : "hover:bg-orange-100"}`}
                                            >
                                                <button
                                                    disabled={isItemDisabled}
                                                    onClick={() =>
                                                        !isItemDisabled &&
                                                        handleToggleItemWithCheck(
                                                            item,
                                                            index,
                                                        )
                                                    }
                                                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                        itemCompleted
                                                            ? "bg-green-500 border-green-500"
                                                            : "border-orange-300"
                                                    } ${isItemDisabled ? "cursor-not-allowed opacity-100" : "hover:border-orange-500 cursor-pointer"}`}
                                                >
                                                    {itemCompleted && (
                                                        <Check
                                                            size={14}
                                                            className="text-white"
                                                        />
                                                    )}
                                                </button>
                                                <span
                                                    className={`flex-1 ${
                                                        itemCompleted
                                                            ? "text-gray-400 line-through"
                                                            : "text-gray-800"
                                                    }`}
                                                >
                                                    {itemName}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowClearDialog(true)}
                        disabled={isClearing}
                        className="flex items-center space-x-2 px-6 py-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mx-auto mt-6"
                    >
                        <Trash2 size={20} />
                        <span className="text-lg font-medium">
                            {isClearing ? "清空中..." : "清空采购清单"}
                        </span>
                    </button>
                </>
            )}

            {showCompleteDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 animate-scale-in">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                采购完成！
                            </h3>
                            <p className="text-gray-600 mb-6">
                                所有食材已采购完成，是否将此菜谱移至已完成？
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowCompleteDialog(false);
                                        setPendingCompleteItem(null);
                                    }}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    暂不
                                </button>
                                <button
                                    onClick={confirmMoveToCompleted}
                                    className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
                                >
                                    移至完成
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showClearDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 animate-scale-in">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                清空采购清单
                            </h3>
                            <p className="text-gray-600 mb-6">
                                确定要清空所有采购清单吗？此操作不可恢复。
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
        </div>
    );
}
