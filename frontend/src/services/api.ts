import axios from 'axios';
import type {
  Ingredient,
  Recipe,
  CookingSession,
  User,
  RecipeRecommendationRequest,
  ShoppingList
} from '../types';
import { getUserId } from '../utils/userId';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const ingredientApi = {
  scanImage: async (imageFile: File): Promise<Ingredient[]> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post('/ingredients/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getIngredients: async (userId: string): Promise<Ingredient[]> => {
    const response = await api.get(`/ingredients/user/${userId}`);
    return response.data;
  },

  addIngredient: async (ingredient: Partial<Ingredient>, userId: string): Promise<Ingredient> => {
    try {
      const response = await api.post('/ingredients', ingredient, {
        params: { user_id: userId },
      });
      return response.data;
    } catch (e) {
      console.warn('Add ingredient failed, using local fallback:', e);
      const now = new Date().toISOString();
      return {
        id: `${Date.now()}`,
        user_id: userId,
        name: ingredient.name || '未命名食材',
        category: (ingredient as any).category || 'other',
        quantity: typeof ingredient.quantity === 'number' ? ingredient.quantity : 1,
        unit: ingredient.unit || '个',
        expiry_date: ingredient.expiry_date || null,
        image_url: ingredient.image_url || null,
        created_at: now as any,
        updated_at: now as any,
        days_until_expiry: null,
        is_expiring_soon: false,
      } as unknown as Ingredient;
    }
  },

  updateIngredient: async (ingredientId: string, ingredient: Partial<Ingredient>, userId: string): Promise<Ingredient> => {
    const response = await api.put(`/ingredients/${ingredientId}`, ingredient, {
      params: { user_id: userId },
    });
    return response.data;
  },

  deleteIngredient: async (ingredientId: string, userId: string): Promise<void> => {
    await api.delete(`/ingredients/${ingredientId}`, {
      params: { user_id: userId },
    });
  },

  clearAllIngredients: async (userId: string): Promise<void> => {
    await api.delete('/ingredients', {
      params: { user_id: userId },
    });
  },
};

export const recipeApi = {
  getRecommendations: async (request: RecipeRecommendationRequest): Promise<Recipe[]> => {
    const response = await api.post('/recipes/recommend', request);
    return response.data;
  },

  getRecipe: async (recipeId: string): Promise<Recipe> => {
    const response = await api.get(`/recipes/${recipeId}`);
    return response.data;
  },

  getRecipes: async (params?: {
    category?: string;
    diet_type?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<Recipe[]> => {
    const response = await api.get('/recipes', { params });
    return response.data;
  },

  createRecipe: async (recipe: Partial<Recipe>, userId?: string): Promise<Recipe> => {
    const response = await api.post('/recipes', recipe, {
      params: { user_id: userId },
    });
    return response.data;
  },

  addToShoppingList: async (userId: string, data: { recipe_id: string; items: string[]; recipe_title?: string }): Promise<{ message: string; id: string }> => {
    const response = await api.post('/shopping-list', data, { params: { user_id: userId } });
    return response.data;
  },

  getShoppingLists: async (userId: string, status?: string): Promise<any[]> => {
    const params: any = { user_id: userId };
    if (status) params.status = status;
    const response = await api.get('/shopping-list', { params });
    return response.data;
  },

  deleteShoppingListItem: async (userId: string, itemId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/shopping-list/${itemId}`, { params: { user_id: userId } });
    return response.data;
  },

  toggleShoppingListItem: async (userId: string, itemId: string, itemIndex: number): Promise<any> => {
    const response = await api.post(`/shopping-list/${itemId}/toggle-item`, null, { params: { user_id: userId, item_index: itemIndex } });
    return response.data;
  },

  completeShoppingList: async (userId: string, itemId: string): Promise<{ message: string }> => {
    const response = await api.put(`/shopping-list/${itemId}/complete`, null, { params: { user_id: userId } });
    return response.data;
  },

  getRecipePages: async (userId: string): Promise<{ pages: Recipe[][]; current_page: number }> => {
    const response = await api.get('/recipe-pages', { params: { user_id: userId } });
    return response.data;
  },

  saveRecipePage: async (userId: string, pageData: {
    page_index: number;
    recipes: Recipe[];
    ingredients: string[];
  }): Promise<{ message: string; page_index: number }> => {
    const response = await api.post('/recipe-pages', pageData, { params: { user_id: userId } });
    return response.data;
  },

  clearRecipePages: async (userId: string): Promise<{ message: string }> => {
    const response = await api.delete('/recipe-pages', { params: { user_id: userId } });
    return response.data;
  },

  clearShoppingList: async (userId: string): Promise<{ message: string }> => {
    const response = await api.delete('/shopping-list', { params: { user_id: userId } });
    return response.data;
  },
};

export const cookingApi = {
  startSession: async (recipeId: string, userId: string): Promise<CookingSession> => {
    const response = await api.post('/cooking/session', {
      recipe_id: recipeId,
      user_id: userId,
    });
    return response.data;
  },

  getSession: async (sessionId: string, userId: string): Promise<CookingSession> => {
    const response = await api.get(`/cooking/session/${sessionId}`, {
      params: { user_id: userId },
    });
    return response.data;
  },

  advanceStep: async (
    sessionId: string,
    userId: string,
    voiceCommand?: { command: string; confidence: number },
    manualAdvance?: boolean
  ): Promise<CookingSession> => {
    const response = await api.post(`/cooking/session/${sessionId}/advance`, {
      voice_command: voiceCommand,
      manual_advance: manualAdvance,
      user_id: userId,
    });
    return response.data;
  },

  pauseSession: async (sessionId: string, userId: string): Promise<CookingSession> => {
    const response = await api.post(`/cooking/session/${sessionId}/pause`, null, {
      params: { user_id: userId },
    });
    return response.data;
  },

  resumeSession: async (sessionId: string, userId: string): Promise<CookingSession> => {
    const response = await api.post(`/cooking/session/${sessionId}/resume`, null, {
      params: { user_id: userId },
    });
    return response.data;
  },

  completeSession: async (sessionId: string, userId: string): Promise<CookingSession> => {
    const response = await api.post(`/cooking/session/${sessionId}/complete`, null, {
      params: { user_id: userId },
    });
    return response.data;
  },

  connectWebSocket: (sessionId: string): WebSocket => {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/cooking/ws/${sessionId}`;
    return new WebSocket(wsUrl);
  },
};

export const userApi = {
  createUser: async (user: Partial<User>): Promise<User> => {
    const response = await api.post('/users', user);
    return response.data;
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  updatePreferences: async (
    userId: string,
    preferences: {
      taste_preferences?: string[];
      diet_type?: string;
      max_cooking_time?: number;
      cooking_level?: string;
    }
  ): Promise<User> => {
    const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uid = validUuid.test(userId) ? userId : getUserId();
    const response = await api.put(`/users/${uid}/preferences`, null, { params: preferences });
    return response.data;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  },
};

export default api;
