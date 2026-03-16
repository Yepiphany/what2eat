import {useCallback, useEffect, useState} from 'react';

import {recipeApi} from '../services/api';
import {getUserId} from '../utils/userId';

export type ShoppingTabStatus = 'pending'|'completed';

export interface ShoppingListItem {
  id: string;
  recipe_id: string|null;
  recipe_title: string;
  items: (string|{
    name: string;
    completed: boolean
  })[];
  status: string;
  created_at: string;
}

export function isItemObject(
    item:
        string|{
          name: string;
          completed: boolean
        },
    ): item is {
  name: string;
  completed: boolean
}
{
  return typeof item === 'object' && item !== null && 'name' in item;
}

export function getItemName(
    item:
        string|{
          name: string;
          completed: boolean
        },
    ): string {
  return isItemObject(item) ? item.name : item;
}

export function isItemCompleted(
    item:
        string|{
          name: string;
          completed: boolean
        },
    ): boolean {
  return isItemObject(item) ? item.completed : false;
}

export function useShoppingLists(activeStatus: ShoppingTabStatus = 'pending') {
  const [allLists, setAllLists] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 派生状态，减少不必要的状态同步
  const pendingLists = allLists.filter((list) => list.status === 'pending');
  const completedLists = allLists.filter((list) => list.status === 'completed');
  
  const shoppingLists = activeStatus === 'pending' ? pendingLists : completedLists;
  const pendingCount = pendingLists.length;
  const completedCount = completedLists.length;

  const loadAllLists = useCallback(async () => {
    // 只有在没数据时才显示全局加载，否则静默刷新
    if (allLists.length === 0) {
      setIsLoading(true);
    }
    try {
      const lists = await recipeApi.getShoppingLists(getUserId()) as ShoppingListItem[];
      setAllLists(lists || []);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [allLists.length]); // 依赖中加入 length

  useEffect(() => {
    void loadAllLists();
  }, [loadAllLists]);

  const toggleItem = useCallback(
      async (itemId: string, itemIndex: number) => {
        // 先触发乐观更新
        setAllLists((prevLists) => 
          prevLists.map((list) => {
            if (list.id === itemId) {
              const newItems = [...list.items];
              const itemToUpdate = newItems[itemIndex];
              if (isItemObject(itemToUpdate)) {
                newItems[itemIndex] = { ...itemToUpdate, completed: !itemToUpdate.completed };
              } else {
                newItems[itemIndex] = { name: itemToUpdate, completed: true };
              }
              return { ...list, items: newItems };
            }
            return list;
          })
        );
        
        try {
          const response = await recipeApi.toggleShoppingListItem(getUserId(), itemId, itemIndex);
          return response as {
            items?: (string | { name: string; completed: boolean })[]
          };
        } catch (error) {
          // 如果失败，回退状态
          console.error('Toggle failed, reloading', error);
          await loadAllLists();
          throw error;
        }
      },
      [loadAllLists],
  );

  const completeShoppingList = useCallback(
      async (itemId: string) => {
        // 乐观更新
        setAllLists(prev => prev.map(list => 
          list.id === itemId ? { ...list, status: 'completed' } : list
        ));
        
        try {
          await recipeApi.completeShoppingList(getUserId(), itemId);
        } catch (error) {
          await loadAllLists();
          throw error;
        }
      },
      [loadAllLists]
  );


  const deleteShoppingListItem = useCallback(
      async (itemId: string) => {
        // 乐观更新
        setAllLists(prev => prev.filter(list => list.id !== itemId));
        try {
          await recipeApi.deleteShoppingListItem(getUserId(), itemId);
        } catch (error) {
          await loadAllLists();
          throw error;
        }
      },
      [loadAllLists],
  );

  const clearAllShoppingLists = useCallback(async () => {
    // 这里清除所有的？我们可能是只清除 activeStatus 对应的那些？ 
    // 不对，假设是全部清除或只清除特定的
    await recipeApi.clearShoppingList(getUserId());
    await loadAllLists();
  }, [loadAllLists]);

  return {
    shoppingLists,
    isLoading,
    pendingCount,
    completedCount,
    loadShoppingLists: loadAllLists,
    loadCounts: loadAllLists,
    toggleItem,
    completeShoppingList,
    deleteShoppingListItem,
    clearAllShoppingLists,
  };
}
