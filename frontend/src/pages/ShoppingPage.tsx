import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Trash2, Check, X, Plus } from 'lucide-react';
import { recipeApi } from '../services/api';

interface ShoppingListItem {
  id: string;
  recipe_id: string;
  recipe_title: string;
  items: (string | { name: string; completed: boolean })[];
  status: string;
  created_at: string;
}

function isItemObject(item: string | { name: string; completed: boolean }): item is { name: string; completed: boolean } {
  return typeof item === 'object' && item !== null && 'name' in item;
}

function getItemName(item: string | { name: string; completed: boolean }): string {
  if (isItemObject(item)) {
    return item.name;
  }
  return item;
}

function isItemCompleted(item: string | { name: string; completed: boolean }): boolean {
  if (isItemObject(item)) {
    return item.completed;
  }
  return false;
}

export default function ShoppingPage() {
  const navigate = useNavigate();
  const [shoppingLists, setShoppingLists] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [pendingCompleteItem, setPendingCompleteItem] = useState<ShoppingListItem | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    loadShoppingLists();
    loadCounts();
  }, [activeTab]);

  const loadCounts = async () => {
    try {
      const [pending, completed] = await Promise.all([
        recipeApi.getShoppingLists('pending'),
        recipeApi.getShoppingLists('completed')
      ]);
      setPendingCount(pending.length);
      setCompletedCount(completed.length);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  const loadShoppingLists = async () => {
    setIsLoading(true);
    try {
      const lists = await recipeApi.getShoppingLists(activeTab);
      setShoppingLists(lists);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (itemId: string) => {
    try {
      await recipeApi.toggleShoppingListItem(itemId);
      loadShoppingLists();
      loadCounts();
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleToggleItem = async (itemId: string, itemIndex: number, onComplete?: (items: any[]) => void) => {
    try {
      const response = await recipeApi.toggleShoppingListItem(itemId, itemIndex);
      await loadShoppingLists();
      loadCounts();
      if (onComplete && response.items) {
        const allCompleted = response.items.every((ing: any) => {
          if (typeof ing === 'object' && ing !== null) {
            return ing.completed === true;
          }
          return false;
        });
        if (allCompleted) {
          onComplete(response.items);
        }
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleToggleItemWithCheck = (item: ShoppingListItem, itemIndex: number) => {
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
        await recipeApi.completeShoppingList(pendingCompleteItem.id);
        loadShoppingLists();
        loadCounts();
      } catch (error) {
        console.error('Failed to complete shopping list:', error);
      }
    }
    setShowCompleteDialog(false);
    setPendingCompleteItem(null);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('确定删除此项目？')) return;
    
    try {
      await recipeApi.deleteShoppingListItem(itemId);
      loadShoppingLists();
      loadCounts();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="text-center relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-0 flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft size={24} />
          <span>返回</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-800">🛒 采购清单</h1>
      </header>

      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          待采购 ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          已完成 ({completedCount})
        </button>
      </div>

      {shoppingLists.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingCart size={64} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg mb-4">
            {activeTab === 'pending' ? '暂无待采购的食材' : '已全部完成'}
          </p>
          <Link
            to="/recipes"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={20} />
            <span>去添加采购清单</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {shoppingLists.map((item) => (
            <div key={item.id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {item.status === 'completed' ? (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check size={18} className="text-green-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <ShoppingCart size={18} className="text-orange-600" />
                    </div>
                  )}
                  <div>
                    <Link
                      to={`/recipes/${item.recipe_id}`}
                      className="font-medium text-gray-800 hover:text-primary-600"
                    >
                      {item.recipe_title || '未知菜谱'}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()} 添加
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
                  const itemCompleted = isItemCompleted(ing);
                  const isItemDisabled = item.status === 'completed';
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 py-2 px-3 rounded-lg transition-colors ${
                        itemCompleted
                          ? 'bg-green-50'
                          : 'bg-orange-50'
                      } ${isItemDisabled ? '' : 'hover:bg-orange-100'}`}
                    >
                      <button
                        disabled={isItemDisabled}
                        onClick={() => !isItemDisabled && handleToggleItemWithCheck(item, index)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          itemCompleted
                            ? 'bg-green-500 border-green-500'
                            : 'border-orange-300'
                        } ${isItemDisabled ? 'cursor-not-allowed opacity-100' : 'hover:border-orange-500 cursor-pointer'}`}
                      >
                        {itemCompleted && (
                          <Check size={14} className="text-white" />
                        )}
                      </button>
                      <span
                        className={`flex-1 ${
                          itemCompleted
                            ? 'text-gray-400 line-through'
                            : 'text-gray-800'
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
      )}

      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">采购完成！</h3>
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
    </div>
  );
}
