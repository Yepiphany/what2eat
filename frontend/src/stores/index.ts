import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ingredient, Recipe, CookingSession, User } from '../types';

interface IngredientsStore {
  ingredients: Ingredient[];
  isLoading: boolean;
  error: string | null;
  
  setIngredients: (ingredients: Ingredient[]) => void;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;
  updateIngredient: (id: string, data: Partial<Ingredient>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearIngredients: () => void;
}

export const useIngredientsStore = create<IngredientsStore>()(
  persist(
    (set) => ({
      ingredients: [],
      isLoading: false,
      error: null,
      
      setIngredients: (ingredients) => set({ ingredients }),
      
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
      
      clearIngredients: () => set({ ingredients: [] }),
    }),
    {
      name: 'ingredients-storage',
    }
  )
);

interface RecipesStore {
  recommendations: Recipe[];
  currentRecipe: Recipe | null;
  isLoading: boolean;
  error: string | null;
  
  setRecommendations: (recipes: Recipe[]) => void;
  setCurrentRecipe: (recipe: Recipe | null) => void;
  addRecommendations: (recipes: Recipe[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearRecommendations: () => void;
}

export const useRecipesStore = create<RecipesStore>()((set) => ({
  recommendations: [],
  currentRecipe: null,
  isLoading: false,
  error: null,
  
  setRecommendations: (recipes) => set({ recommendations: recipes }),
  
  setCurrentRecipe: (recipe) => set({ currentRecipe: recipe }),
  
  addRecommendations: (recipes) =>
    set((state) => ({
      recommendations: [...state.recommendations, ...recipes],
    })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  clearRecommendations: () => set({ recommendations: [], currentRecipe: null }),
}));

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
