import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ingredient, Recipe, CookingSession, User } from '../types';
import { getUserId } from '../utils/userId';

interface DesiredIngredientEntry {
  name: string;
  createdDate: string;
}

const getLocalDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDesiredIngredientNames = (ingredients: string[]): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();

  ingredients.forEach((item) => {
    const normalized = item.trim();
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    names.push(normalized);
  });

  return names;
};

const normalizeDesiredEntries = (
  entries: DesiredIngredientEntry[],
): DesiredIngredientEntry[] => {
  const today = getLocalDateKey();
  const seen = new Set<string>();
  const normalized: DesiredIngredientEntry[] = [];

  entries.forEach((entry) => {
    const name = entry.name.trim();
    if (!name) {
      return;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push({
      name,
      createdDate: /^\d{4}-\d{2}-\d{2}$/.test(entry.createdDate)
        ? entry.createdDate
        : today,
    });
  });

  return normalized;
};

const buildDesiredIngredientState = (entries: DesiredIngredientEntry[]) => {
  const today = getLocalDateKey();
  const normalizedEntries = normalizeDesiredEntries(entries);

  const desiredIngredients = normalizedEntries
    .filter((entry) => entry.createdDate >= today)
    .map((entry) => entry.name);
  const desiredIngredientHistory = normalizedEntries
    .filter((entry) => entry.createdDate < today)
    .map((entry) => entry.name);

  return {
    desiredIngredientEntries: normalizedEntries,
    desiredIngredients,
    desiredIngredientHistory,
  };
};

interface IngredientsStore {
  ingredients: Ingredient[];
  desiredIngredients: string[];
  desiredIngredientEntries: DesiredIngredientEntry[];
  desiredIngredientHistory: string[];
  isLoading: boolean;
  error: string | null;
  
  setIngredients: (ingredients: Ingredient[]) => void;
  setDesiredIngredients: (ingredients: string[]) => void;
  addDesiredIngredient: (ingredient: string) => void;
  removeDesiredIngredient: (ingredient: string) => void;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;
  updateIngredient: (id: string, data: Partial<Ingredient>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  syncDesiredIngredientStatus: () => void;
  clearIngredients: () => Promise<void>;
}

export const useIngredientsStore = create<IngredientsStore>()(
  persist(
    (set) => ({
      ingredients: [],
      desiredIngredients: [],
      desiredIngredientEntries: [],
      desiredIngredientHistory: [],
      isLoading: false,
      error: null,
      
      setIngredients: (ingredients) => set({ ingredients }),

      setDesiredIngredients: (ingredients) =>
        set(() => {
          const entries = normalizeDesiredIngredientNames(ingredients).map((name) => ({
            name,
            createdDate: getLocalDateKey(),
          }));
          return buildDesiredIngredientState(entries);
        }),

      addDesiredIngredient: (ingredient) =>
        set((state) => {
          const normalized = ingredient.trim();
          if (!normalized) {
            return state;
          }

          const existsInTodayList = state.desiredIngredientEntries.some(
            (entry) =>
              entry.name.toLowerCase() === normalized.toLowerCase() &&
              entry.createdDate >= getLocalDateKey(),
          );
          if (existsInTodayList) {
            return state;
          }

          const filteredEntries = state.desiredIngredientEntries.filter(
            (entry) => entry.name.toLowerCase() !== normalized.toLowerCase(),
          );

          return buildDesiredIngredientState([
            ...filteredEntries,
            { name: normalized, createdDate: getLocalDateKey() },
          ]);
        }),

      removeDesiredIngredient: (ingredient) =>
        set((state) =>
          buildDesiredIngredientState(
            state.desiredIngredientEntries.filter(
              (entry) => entry.name.toLowerCase() !== ingredient.toLowerCase(),
            ),
          ),
        ),
      
      addIngredient: (ingredient) =>
        set((state) => ({
          ingredients: [...state.ingredients, ingredient],
        })),
      
      removeIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((ing) => ing.id !== id),
        })),
      
      updateIngredient: (id, data) =>
        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === id ? { ...ing, ...data } : ing
          ),
        })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),

      syncDesiredIngredientStatus: () =>
        set((state) => buildDesiredIngredientState(state.desiredIngredientEntries)),
      
      clearIngredients: async () => {
        set({
          ingredients: [],
          desiredIngredients: [],
          desiredIngredientEntries: [],
          desiredIngredientHistory: [],
        });
        try {
          const { ingredientApi } = await import('../services/api');
          await ingredientApi.clearAllIngredients(getUserId());
        } catch (e) {
          console.error('Failed to clear ingredients from database:', e);
        }
      },
    }),
    {
      name: 'ingredients-storage',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<IngredientsStore> & {
          desiredIngredientEntries?: DesiredIngredientEntry[];
          desiredIngredients?: string[];
        };

        const fallbackEntries = normalizeDesiredIngredientNames(
          persisted.desiredIngredients ?? [],
        ).map((name) => ({ name, createdDate: getLocalDateKey() }));

        const desiredState = buildDesiredIngredientState(
          Array.isArray(persisted.desiredIngredientEntries)
            ? persisted.desiredIngredientEntries
            : fallbackEntries,
        );

        return {
          ...currentState,
          ...persisted,
          ...desiredState,
        };
      },
    }
  )
);

interface RecipesStore {
  recommendations: Recipe[];
  recipePages: Recipe[][];
  currentPage: number;
  currentRecipe: Recipe | null;
  isLoading: boolean;
  error: string | null;
  
  setRecommendations: (recipes: Recipe[]) => void;
  setRecipePages: (pages: Recipe[][]) => void;
  addRecipePage: (page: Recipe[], ingredients: string[]) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setCurrentRecipe: (recipe: Recipe | null) => void;
  addRecommendations: (recipes: Recipe[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearRecommendations: () => Promise<void>;
  loadFromDatabase: (ingredients?: string[]) => Promise<number>;
  getRecipePagesLength: () => number;
}

export const useRecipesStore = create<RecipesStore>()(
  persist(
    (set, get) => ({
      recommendations: [],
      recipePages: [],
      currentPage: 0,
      currentRecipe: null,
      isLoading: false,
      error: null,
      
      setRecommendations: (recipes) => set({ recommendations: recipes }),
      
      setRecipePages: (pages) => set({ recipePages: pages }),
      
      getRecipePagesLength: () => get().recipePages.length,
      
      addRecipePage: async (page, ingredients: string[]) => {
        const state = get();
        const newPages = [...state.recipePages, page];
        console.log('[DEBUG] addRecipePage - 前端状态更新:', newPages.length, '页');
        set({ recipePages: newPages, currentPage: newPages.length - 1 });

        try {
          const { recipeApi } = await import('../services/api');
          const response = await recipeApi.saveRecipePage(getUserId(), {
            page_index: newPages.length - 1,
            recipes: page,
            ingredients,
          });
          console.log('[DEBUG] 第', response.page_index + 1, '页保存成功 (后端分配的page_index:', response.page_index, ')');
        } catch (e) {
          console.error('Failed to save recipe page:', e);
        }
      },
      
      setCurrentPage: (page) => set({ currentPage: page }),
      
      setCurrentRecipe: (recipe) => set({ currentRecipe: recipe }),
      
      addRecommendations: (recipes) =>
        set((state) => ({
          recommendations: [...state.recommendations, ...recipes],
        })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearRecommendations: async () => {
        set({ recommendations: [], recipePages: [], currentPage: 0, currentRecipe: null });
        
        try {
          const { recipeApi } = await import('../services/api');
          await recipeApi.clearRecipePages(getUserId());
        } catch (e) {
          console.error('Failed to clear recipe pages:', e);
        }
      },
      
      loadFromDatabase: async (ingredients?: string[]) => {
        try {
          console.log('[DEBUG] loadFromDatabase 开始...', ingredients ? `食材过滤: ${ingredients.join(',')}` : '无过滤');
          const { recipeApi } = await import('../services/api');
          const data = await recipeApi.getRecipePages(getUserId(), ingredients);
          console.log('[DEBUG] loadFromDatabase 返回:', data);
          const pages = data.pages || [];
          const state = get();
          const currentPg = state.currentPage;
          const validPage = pages.length > 0 ? Math.min(currentPg, pages.length - 1) : 0;
          set({
            recipePages: pages,
            currentPage: validPage,
            recommendations: pages[validPage] || [],
          });
          console.log('[DEBUG] store 更新后:', get().recipePages.length, '页');
          return pages.length;
        } catch (e) {
          console.error('Failed to load recipe pages from database:', e);
          return 0;
        }
      },
    }),
    {
      name: 'recipes-storage',
      partialize: (state) => ({ currentPage: state.currentPage }),
    }
  )
);

interface CookingStore {
  currentSession: CookingSession | null;
  isVoiceEnabled: boolean;
  isListening: boolean;
  volumeLevel: number;
  
  setSession: (session: CookingSession | null) => void;
  updateSession: (session: CookingSession) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setListening: (listening: boolean) => void;
  setVolumeLevel: (level: number) => void;
  clearSession: () => void;
}

export const useCookingStore = create<CookingStore>()((set) => ({
  currentSession: null,
  isVoiceEnabled: false,
  isListening: false,
  volumeLevel: 0,
  
  setSession: (session) => set({ currentSession: session }),
  
  updateSession: (session) => set({ currentSession: session }),
  
  setVoiceEnabled: (enabled) => set({ isVoiceEnabled: enabled }),
  
  setListening: (listening) => set({ isListening: listening }),
  
  setVolumeLevel: (level) => set({ volumeLevel: level }),
  
  clearSession: () =>
    set({
      currentSession: null,
      isVoiceEnabled: false,
      isListening: false,
      volumeLevel: 0,
    }),
}));

interface UserStore {
  currentUser: User | null;
  isAuthenticated: boolean;
  preferences: {
    tastePreferences: string[];
    dietType: string | null;
    maxCookingTime: number | null;
    cookingLevel: string | null;
  };
  
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  updatePreferences: (prefs: Partial<UserStore['preferences']>) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      preferences: {
        tastePreferences: [],
        dietType: null,
        maxCookingTime: null,
        cookingLevel: null,
      },
      
      setUser: (user) =>
        set({
          currentUser: user,
          isAuthenticated: !!user,
        }),
      
      setAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),
      
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
      
      logout: () =>
        set({
          currentUser: null,
          isAuthenticated: false,
          preferences: {
            tastePreferences: [],
            dietType: null,
            maxCookingTime: null,
            cookingLevel: null,
          },
        }),
    }),
    {
      name: 'user-storage',
    }
  )
);

interface AppStore {
  activeView: string;
  scanMode: 'camera' | 'upload';
  showPreferencesModal: boolean;
  
  setActiveView: (view: string) => void;
  setScanMode: (mode: 'camera' | 'upload') => void;
  togglePreferencesModal: () => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  activeView: 'home',
  scanMode: 'camera',
  showPreferencesModal: false,
  
  setActiveView: (view) => set({ activeView: view }),
  
  setScanMode: (mode) => set({ scanMode: mode }),
  
  togglePreferencesModal: () =>
    set((state) => ({ showPreferencesModal: !state.showPreferencesModal })),
}));
