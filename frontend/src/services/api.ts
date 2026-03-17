import axios from 'axios';

import type {CookingHistoryMemoryItem, CookingSession, FavoriteRecipeMemoryItem, Ingredient, IngredientPresetResponse, MemoryGoalAction, MemoryGoalType, Recipe, RecipeRecommendationRequest, User, UserMemoryProfile,} from '../types';
import {getUserId} from '../utils/userId';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function toErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const payloadObj = payload as Record<string, unknown>;
      const detail = payloadObj.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }

      if (Array.isArray(detail)) {
        const joined = detail
                           .map((item) => {
                             if (typeof item === 'string') {
                               return item;
                             }
                             if (item && typeof item === 'object') {
                               const itemObj = item as Record<string, unknown>;
                               if (typeof itemObj.msg === 'string') {
                                 return itemObj.msg;
                               }
                             }
                             return '';
                           })
                           .filter(Boolean)
                           .join('；');
        if (joined) {
          return joined;
        }
      }

      const message = payloadObj.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', error.response?.data || error.message);
      return Promise.reject(error);
    },
);

export const ingredientApi = {
  scanImage: async(imageFile: File): Promise<Ingredient[]> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post('/ingredients/scan', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
    return response.data;
  },

  scanImageBase64: async(imageBase64: string): Promise<Ingredient[]> => {
    const base64Data =
        imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const response = await api.post('/ingredients/scan-base64', {
      image: base64Data,
    });
    return response.data;
  },

  getIngredients: async(userId: string): Promise<Ingredient[]> => {
    const response = await api.get(`/ingredients/user/${userId}`);
    return response.data;
  },

  getPresetIngredients: async(): Promise<IngredientPresetResponse> => {
    const response = await api.get('/ingredients/presets');
    return response.data;
  },

  addIngredient: async(
      ingredient: Partial<Ingredient>,
      userId: string,
      ): Promise<Ingredient> => {
    try {
      const response = await api.post('/ingredients', ingredient, {
        params: {user_id: userId},
      });
      return response.data;
    } catch (e) {
      throw new Error(toErrorMessage(e, '保存食材失败'));
    }
  },

  addIngredientsBatch: async(
      ingredients: Partial<Ingredient>[],
      userId: string,
      ): Promise<Ingredient[]> => {
    if (ingredients.length === 0) {
      return [];
    }

    try {
      const response = await api.post('/ingredients/batch', ingredients, {
        params: {user_id: userId},
      });
      return response.data;
    } catch (e) {
      console.warn(
          'Batch add failed, falling back to parallel single adds:',
          e,
      );
      const settled = await Promise.allSettled(
          ingredients.map(
              (ingredient) => ingredientApi.addIngredient(ingredient, userId),
              ),
      );
      const successfulItems =
          settled
              .filter(
                  (result): result is PromiseFulfilledResult<Ingredient> =>
                      result.status === 'fulfilled',
                  )
              .map((result) => result.value);

      if (successfulItems.length > 0) {
        return successfulItems;
      }

      const failedItem = settled.find(
          (result): result is PromiseRejectedResult =>
              result.status === 'rejected',
      );
      if (failedItem?.reason instanceof Error) {
        throw failedItem.reason;
      }

      throw new Error(toErrorMessage(e, '批量保存食材失败'));
    }
  },

  updateIngredient: async(
      ingredientId: string,
      ingredient: Partial<Ingredient>,
      userId: string,
      ): Promise<Ingredient> => {
    const response = await api.put(
        `/ingredients/${ingredientId}`,
        ingredient,
        {
          params: {user_id: userId},
        },
    );
    return response.data;
  },

  deleteIngredient: async(
      ingredientId: string,
      userId: string,
      ): Promise<void> => {
    await api.delete(`/ingredients/${ingredientId}`, {
      params: {user_id: userId},
    });
  },

  clearAllIngredients: async(userId: string): Promise<void> => {
    await api.delete('/ingredients', {
      params: {user_id: userId},
    });
  },
};

export const recipeApi = {
  getRecommendations: async(
      request: RecipeRecommendationRequest,
      ): Promise<Recipe[]> => {
    const response = await api.post('/recipes/recommend', request);
    return response.data;
  },

  getRecipe: async(recipeId: string): Promise<Recipe> => {
    const response = await api.get(`/recipes/${recipeId}`);
    return response.data;
  },

  getRecipes: async(params?: {
    category?: string;
    diet_type?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<Recipe[]> => {
    const response = await api.get('/recipes', {params});
    return response.data;
  },

  createRecipe: async(
      recipe: Partial<Recipe>,
      userId?: string,
      ): Promise<Recipe> => {
    const response = await api.post('/recipes', recipe, {
      params: {user_id: userId},
    });
    return response.data;
  },

  addToShoppingList: async(
      userId: string,
      data: {recipe_id?: string; items: string[]; recipe_title?: string},
      ): Promise<{message: string; id: string}> => {
    const response = await api.post('/shopping-list', data, {
      params: {user_id: userId},
    });
    return response.data;
  },

  getShoppingLists: async(
      userId: string,
      status?: string,
      ): Promise<any[]> => {
    const params: any = {user_id: userId};
    if (status) params.status = status;
    const response = await api.get('/shopping-list', {params});
    return response.data;
  },

  deleteShoppingListItem: async(
      userId: string,
      itemId: string,
      ): Promise<{message: string}> => {
    const response = await api.delete(`/shopping-list/${itemId}`, {
      params: {user_id: userId},
    });
    return response.data;
  },

  toggleShoppingListItem: async(
      userId: string,
      itemId: string,
      itemIndex: number,
      ): Promise<any> => {
    const response = await api.post(
        `/shopping-list/${itemId}/toggle-item`,
        null,
        {params: {user_id: userId, item_index: itemIndex}},
    );
    return response.data;
  },

  completeShoppingList: async(
      userId: string,
      itemId: string,
      ): Promise<{message: string}> => {
    const response = await api.put(
        `/shopping-list/${itemId}/complete`,
        null,
        {params: {user_id: userId}},
    );
    return response.data;
  },

  getRecipePages: async(
      userId: string,
      ingredients?: string[],
      ): Promise<{pages: Recipe[][]; current_page: number}> => {
    const params: any = {user_id: userId};
    if (ingredients && ingredients.length > 0) {
      params.ingredients = ingredients.join(',');
    }
    const response = await api.get('/recipe-pages', {params});
    return response.data;
  },

  saveRecipePage: async(
      userId: string,
      pageData: {page_index: number; recipes: Recipe[]; ingredients: string[];},
      ): Promise<{message: string; page_index: number}> => {
    const response = await api.post('/recipe-pages', pageData, {
      params: {user_id: userId},
    });
    return response.data;
  },

  clearRecipePages: async(userId: string): Promise<{message: string}> => {
    const response = await api.delete('/recipe-pages', {
      params: {user_id: userId},
    });
    return response.data;
  },

  clearShoppingList: async(userId: string): Promise<{message: string}> => {
    const response = await api.delete('/shopping-list', {
      params: {user_id: userId},
    });
    return response.data;
  },
};

export const cookingApi = {
  startSession: async(
      recipeId: string,
      userId: string,
      ): Promise<CookingSession> => {
    const response = await api.post('/cooking/session', {
      recipe_id: recipeId,
      user_id: userId,
    });
    return response.data;
  },

  getSession: async(
      sessionId: string,
      userId: string,
      ): Promise<CookingSession> => {
    const response = await api.get(`/cooking/session/${sessionId}`, {
      params: {user_id: userId},
    });
    return response.data;
  },

  advanceStep: async(
      sessionId: string,
      userId: string,
      voiceCommand?: {command: string; confidence: number},
      manualAdvance?: boolean,
      ): Promise<CookingSession> => {
    const response = await api.post(
        `/cooking/session/${sessionId}/advance`,
        {
          voice_command: voiceCommand,
          manual_advance: manualAdvance,
          user_id: userId,
        },
    );
    return response.data;
  },

  pauseSession: async(
      sessionId: string,
      userId: string,
      ): Promise<CookingSession> => {
    const response = await api.post(
        `/cooking/session/${sessionId}/pause`,
        null,
        {
          params: {user_id: userId},
        },
    );
    return response.data;
  },

  resumeSession: async(
      sessionId: string,
      userId: string,
      ): Promise<CookingSession> => {
    const response = await api.post(
        `/cooking/session/${sessionId}/resume`,
        null,
        {
          params: {user_id: userId},
        },
    );
    return response.data;
  },

  completeSession: async(
      sessionId: string,
      userId: string,
      ): Promise<CookingSession> => {
    const response = await api.post(
        `/cooking/session/${sessionId}/complete`,
        null,
        {
          params: {user_id: userId},
        },
    );
    return response.data;
  },

  connectWebSocket: (sessionId: string): WebSocket => {
    const base = API_BASE_URL.startsWith('http') ?
        API_BASE_URL :
        `${window.location.origin}${API_BASE_URL}`;
    const wsUrl = `${base.replace('http', 'ws')}/cooking/ws/${sessionId}`;
    return new WebSocket(wsUrl);
  },
};

export const userApi = {
  createUser: async(user: Partial<User>): Promise<User> => {
    const response = await api.post('/users', user);
    return response.data;
  },

  getUser: async(userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateUser: async(
      userId: string,
      userData: Partial<User>,
      ): Promise<User> => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  updatePreferences: async(
      userId: string,
      preferences: {
        taste_preferences?: string[];
        diet_type?: string;
        max_cooking_time?: number;
        cooking_level?: string;
      },
      ): Promise<User> => {
    const validUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uid = validUuid.test(userId) ? userId : getUserId();
    const response = await api.put(
        `/users/${uid}/preferences`,
        preferences,
    );
    return response.data;
  },

  deleteUser: async(userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  },
};

export const memoryApi = {
  getProfile: async(userId: string): Promise<UserMemoryProfile> => {
    const response = await api.get(`/users/${userId}/memory`);
    return response.data;
  },

  updateProfile: async(
      userId: string,
      data: Partial<Pick<
          UserMemoryProfile,
          |'favorite_recipes'|'history_records'|'temporary_goals'|
          'long_term_goals'|'ai_context_notes'>>,
      ): Promise<UserMemoryProfile> => {
    const response = await api.put(`/users/${userId}/memory`, data);
    return response.data;
  },

  syncFavorites: async(
      userId: string,
      favoriteRecipes: FavoriteRecipeMemoryItem[],
      ): Promise<UserMemoryProfile> => {
    const response = await api.put(`/users/${userId}/memory/favorites`, {
      favorite_recipes: favoriteRecipes,
    });
    return response.data;
  },

  syncHistory: async(
      userId: string,
      historyRecords: CookingHistoryMemoryItem[],
      ): Promise<UserMemoryProfile> => {
    const response = await api.put(`/users/${userId}/memory/history`, {
      history_records: historyRecords,
    });
    return response.data;
  },

  updateGoal: async(
      userId: string,
      goal: string,
      goalType: MemoryGoalType,
      action: MemoryGoalAction,
      ): Promise<UserMemoryProfile> => {
    const response = await api.post(`/users/${userId}/memory/goals`, {
      goal,
      goal_type: goalType,
      action,
    });
    return response.data;
  },
};

export default api;
