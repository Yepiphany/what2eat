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
  const [shoppingLists, setShoppingLists] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const loadCounts = useCallback(async () => {
    try {
      const currentUserId = getUserId();
      const [pending, completed] = await Promise.all([
        recipeApi.getShoppingLists(currentUserId, 'pending'),
        recipeApi.getShoppingLists(currentUserId, 'completed'),
      ]);
      setPendingCount(pending.length);
      setCompletedCount(completed.length);
    } catch (error) {
      console.error('Failed to load shopping counts:', error);
    }
  }, []);

  const loadShoppingLists = useCallback(
      async (status: ShoppingTabStatus = activeStatus) => {
        setIsLoading(true);
        try {
          const lists = (await recipeApi.getShoppingLists(
                            getUserId(),
                            status,
                            )) as ShoppingListItem[];
          setShoppingLists(lists);
        } catch (error) {
          console.error('Failed to load shopping lists:', error);
        } finally {
          setIsLoading(false);
        }
      },
      [activeStatus],
  );

  useEffect(() => {
    void Promise.all([loadShoppingLists(activeStatus), loadCounts()]);
  }, [activeStatus, loadShoppingLists, loadCounts]);

  const toggleItem = useCallback(
      async (itemId: string, itemIndex: number) => {
        const response = await recipeApi.toggleShoppingListItem(
            getUserId(),
            itemId,
            itemIndex,
        );
        await Promise.all([loadShoppingLists(activeStatus), loadCounts()]);
        return response as {
          items?:
              (string |
               {
                 name: string;
                 completed: boolean
               })[]
        };
      },
      [activeStatus, loadShoppingLists, loadCounts],
  );

  const completeShoppingList = useCallback(
      async (itemId: string) => {
        await recipeApi.completeShoppingList(getUserId(), itemId);
        await Promise.all([loadShoppingLists(activeStatus), loadCounts()]);
      },
      [activeStatus, loadShoppingLists, loadCounts],
  );

  const deleteShoppingListItem = useCallback(
      async (itemId: string) => {
        await recipeApi.deleteShoppingListItem(getUserId(), itemId);
        await Promise.all([loadShoppingLists(activeStatus), loadCounts()]);
      },
      [activeStatus, loadShoppingLists, loadCounts],
  );

  const clearAllShoppingLists = useCallback(async () => {
    await recipeApi.clearShoppingList(getUserId());
    await Promise.all([loadShoppingLists(activeStatus), loadCounts()]);
  }, [activeStatus, loadShoppingLists, loadCounts]);

  return {
    shoppingLists,
    isLoading,
    pendingCount,
    completedCount,
    loadShoppingLists,
    loadCounts,
    toggleItem,
    completeShoppingList,
    deleteShoppingListItem,
    clearAllShoppingLists,
  };
}
