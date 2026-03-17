import { useState, useEffect } from "react";
import {
    User,
    HelpCircle,
    LogOut,
    Save,
    Edit2,
    Check,
    Camera,
    TrendingUp,
    X,
    BookHeart,
    Heart,
    History,
    Target,
    Plus,
    Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserStore, useIngredientsStore } from "../stores";
import { memoryApi, userApi } from "../services/api";
import { getUserId } from "../utils/userId";
import type {
    TastePreference,
    DietType,
    UserMemoryProfile,
    MemoryGoalType,
} from "../types";
import {
    getScannedIngredientsCount,
    getViewedRecipesCount,
} from "../services/statistics";
import { getExpiryStatus } from "../utils/expiry";
import {
    COOKING_HISTORY_UPDATED_EVENT,
    FAVORITES_UPDATED_EVENT,
    getCookingHistory,
    getFavoriteRecipes,
} from "../services/cookingLibrary";

const tasteOptions: {
    value: TastePreference;
    label: string;
    emoji: string;
    color: string;
}[] = [
    {
        value: "spicy",
        label: "辣",
        emoji: "🌶️",
        color: "bg-red-100 text-red-700",
    },
    {
        value: "sweet",
        label: "甜",
        emoji: "🍬",
        color: "bg-pink-100 text-pink-700",
    },
    {
        value: "sour",
        label: "酸",
        emoji: "🍋",
        color: "bg-yellow-100 text-yellow-700",
    },
    {
        value: "salty",
        label: "咸",
        emoji: "🧂",
        color: "bg-blue-100 text-blue-700",
    },
    {
        value: "umami",
        label: "鲜",
        emoji: "🍖",
        color: "bg-amber-100 text-amber-700",
    },
    {
        value: "mild",
        label: "清淡",
        emoji: "🥬",
        color: "bg-green-100 text-green-700",
    },
    {
        value: "bitter",
        label: "苦",
        emoji: "☕",
        color: "bg-gray-100 text-gray-700",
    },
];

const dietOptions: { value: DietType; label: string; description: string }[] = [
    { value: "balanced", label: "均衡饮食", description: "荤素搭配，营养均衡" },
    {
        value: "meat_lover",
        label: "爱吃肉",
        description: "偏好肉类菜品，无肉不欢",
    },
    {
        value: "vegetable_lover",
        label: "爱吃菜",
        description: "偏好蔬菜菜品，清淡健康",
    },
    {
        value: "fitness_meal",
        label: "健身餐",
        description: "高蛋白、控油控盐，助力训练恢复",
    },
];

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [selectedTastes, setSelectedTastes] = useState<TastePreference[]>([]);
    const [selectedDiet, setSelectedDiet] = useState<DietType | null>(null);
    const [maxCookingTime, setMaxCookingTime] = useState<number>(60);
    const [showSettingModal, setShowSettingModal] = useState(false);
    const [activeSetting, setActiveSetting] = useState<
        "taste" | "diet" | "time" | "level" | null
    >(null);
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [scannedIngredientsCount, setScannedIngredientsCount] = useState(0);
    const [viewedRecipesCount, setViewedRecipesCount] = useState(0);
    const [memoryProfile, setMemoryProfile] = useState<UserMemoryProfile | null>(
        null,
    );
    const [isMemoryLoading, setIsMemoryLoading] = useState(false);
    const [isMemorySaving, setIsMemorySaving] = useState(false);
    const [temporaryGoalInput, setTemporaryGoalInput] = useState("");
    const [longTermGoalInput, setLongTermGoalInput] = useState("");
    const [showPerceptionModal, setShowPerceptionModal] = useState(false);

    const { currentUser, setUser, isAuthenticated, updatePreferences, logout } =
        useUserStore();
    const { ingredients } = useIngredientsStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            setEditedName(currentUser.username);
            setSelectedTastes(currentUser.taste_preferences || []);
            setSelectedDiet(currentUser.diet_type || null);
            if (currentUser.max_cooking_time) {
                setMaxCookingTime(currentUser.max_cooking_time);
            }
            setSelectedLevel(currentUser.cooking_level || null);
        }

        setScannedIngredientsCount(getScannedIngredientsCount());
        setViewedRecipesCount(getViewedRecipesCount());
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setMemoryProfile(null);
            return;
        }

        let isCancelled = false;
        const loadMemory = async () => {
            setIsMemoryLoading(true);
            try {
                const profile = await memoryApi.getProfile(getUserId());
                if (!isCancelled) {
                    setMemoryProfile(profile);
                }
            } catch (error) {
                console.error("Failed to load memory profile:", error);
            } finally {
                if (!isCancelled) {
                    setIsMemoryLoading(false);
                }
            }
        };

        loadMemory();

        const refreshOnLocalUpdate = () => {
            void loadMemory();
        };

        window.addEventListener(FAVORITES_UPDATED_EVENT, refreshOnLocalUpdate);
        window.addEventListener(
            COOKING_HISTORY_UPDATED_EVENT,
            refreshOnLocalUpdate,
        );

        return () => {
            isCancelled = true;
            window.removeEventListener(
                FAVORITES_UPDATED_EVENT,
                refreshOnLocalUpdate,
            );
            window.removeEventListener(
                COOKING_HISTORY_UPDATED_EVENT,
                refreshOnLocalUpdate,
            );
        };
    }, [currentUser]);

    const updateGoal = async (goalType: MemoryGoalType, goal: string, action: "add" | "remove") => {
        const trimmed = goal.trim();
        if (!trimmed) {
            return;
        }

        setIsMemorySaving(true);
        try {
            const profile = await memoryApi.updateGoal(
                getUserId(),
                trimmed,
                goalType,
                action,
            );
            setMemoryProfile(profile);
            if (goalType === "temporary" && action === "add") {
                setTemporaryGoalInput("");
            }
            if (goalType === "long_term" && action === "add") {
                setLongTermGoalInput("");
            }
        } catch (error) {
            console.error("Failed to update goal:", error);
        } finally {
            setIsMemorySaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (currentUser) {
                const payload: any = {};
                if (activeSetting === "taste")
                    payload.taste_preferences = selectedTastes as string[];
                if (activeSetting === "diet")
                    payload.diet_type = selectedDiet || undefined;
                if (activeSetting === "time")
                    payload.max_cooking_time = maxCookingTime;
                if (activeSetting === "level")
                    payload.cooking_level = selectedLevel || undefined;
                const updatedUser = await userApi.updatePreferences(
                    getUserId(),
                    payload,
                );
                setUser(updatedUser);
                if (activeSetting === "taste")
                    updatePreferences({ tastePreferences: selectedTastes });
                if (activeSetting === "diet")
                    updatePreferences({ dietType: selectedDiet || null });
                if (activeSetting === "time")
                    updatePreferences({ maxCookingTime });
                if (activeSetting === "level")
                    updatePreferences({ cookingLevel: selectedLevel || null });
            }
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save preferences:", error);
            if (currentUser) {
                setUser({
                    ...currentUser,
                    taste_preferences:
                        activeSetting === "taste"
                            ? selectedTastes
                            : currentUser.taste_preferences,
                    diet_type:
                        activeSetting === "diet"
                            ? selectedDiet || undefined
                            : currentUser.diet_type,
                    max_cooking_time:
                        activeSetting === "time"
                            ? maxCookingTime
                            : currentUser.max_cooking_time,
                    cooking_level:
                        activeSetting === "level"
                            ? selectedLevel || undefined
                            : currentUser.cooking_level,
                    updated_at: new Date().toISOString() as any,
                } as any);
                if (activeSetting === "taste")
                    updatePreferences({ tastePreferences: selectedTastes });
                if (activeSetting === "diet")
                    updatePreferences({ dietType: selectedDiet || null });
                if (activeSetting === "time")
                    updatePreferences({ maxCookingTime });
                if (activeSetting === "level")
                    updatePreferences({ cookingLevel: selectedLevel || null });
            }
        } finally {
            setIsSaving(false);
            setShowSettingModal(false);
            setActiveSetting(null);
        }
    };

    const toggleTaste = (taste: TastePreference) => {
        setSelectedTastes((prev) =>
            prev.includes(taste)
                ? prev.filter((t) => t !== taste)
                : [...prev, taste],
        );
    };

    const handleLogout = () => {
        logout();
        window.location.href = "/";
    };

    const expiryLevelStats = ingredients.reduce(
        (acc, item) => {
            const status = getExpiryStatus(item);
            acc[status.level] += 1;
            return acc;
        },
        { red: 0, yellow: 0, green: 0 },
    );

    const stats = {
        totalIngredients: scannedIngredientsCount,
        recipesViewed: viewedRecipesCount,
        favoriteRecipes:
            memoryProfile?.favorite_recipes.length ?? getFavoriteRecipes().length,
        cookingSessions:
            memoryProfile?.history_records.length ?? getCookingHistory().length,
    };

    const temporaryGoals = memoryProfile?.temporary_goals || [];
    const longTermGoals = memoryProfile?.long_term_goals || [];
    const selectedDietLabel = selectedDiet
        ? dietOptions.find((option) => option.value === selectedDiet)?.label
        : null;
    const selectedTasteLabels = selectedTastes
        .map((taste) => tasteOptions.find((option) => option.value === taste)?.label)
        .filter(Boolean)
        .join("、");
    const levelLabelMap: Record<string, string> = {
        beginner: "初级",
        intermediate: "中级",
        advanced: "高级",
    };
    const perceptionSummary = [
        selectedTasteLabels
            ? `你偏好${selectedTasteLabels}风味`
            : "你还没有明确口味标签",
        selectedDietLabel
            ? `饮食倾向是${selectedDietLabel}`
            : "饮食类型尚未设置",
        `常用烹饪时长在${maxCookingTime}分钟内`,
        temporaryGoals.length > 0
            ? `近期目标：${temporaryGoals.slice(0, 2).join("、")}`
            : "近期目标可补充以获得更聚焦建议",
        longTermGoals.length > 0
            ? `长期目标：${longTermGoals.slice(0, 2).join("、")}`
            : "长期目标可补充以优化长期饮食规划",
        selectedLevel
            ? `当前烹饪水平${levelLabelMap[selectedLevel] || "未设置"}，建议继续优先推荐成功率高且步骤清晰的菜谱。`
            : "建议设置烹饪水平，我会更准确控制菜谱复杂度。",
    ].join("。") + "。";

    if (!isAuthenticated || !currentUser) {
        return (
            <div className="text-center py-20">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={40} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    登录后查看个人信息
                </h2>
                <p className="text-gray-500 mb-6">
                    登录后可以享受个性化推荐和更多功能
                </p>
                <button
                    onClick={() => {
                        const existingUserId =
                            localStorage.getItem("user_id") ||
                            crypto.randomUUID();
                        const demoUser = {
                            id: existingUserId,
                            username: "美食爱好者",
                            email: undefined,
                            avatar_url: undefined,
                            taste_preferences: [],
                            diet_type: undefined,
                            max_cooking_time: 60,
                            cooking_level: undefined,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                        localStorage.setItem("user_id", existingUserId);
                        setUser(demoUser);
                    }}
                    className="btn-primary"
                >
                    体验 Demo
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* merged sections: personal, stats, settings */}

            <div className="space-y-6">
                <div className="card p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                                    {editedName?.charAt(0) || "U"}
                                </div>
                                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-primary-500 rounded-full flex items-center justify-center text-primary-600 shadow-md">
                                    <Camera size={14} />
                                </button>
                            </div>
                            <div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) =>
                                            setEditedName(e.target.value)
                                        }
                                        className="text-xl font-bold text-gray-800 border-b-2 border-primary-500 outline-none bg-transparent"
                                    />
                                ) : (
                                    <h2 className="text-xl font-bold text-gray-800">
                                        {currentUser.username}
                                    </h2>
                                )}
                                <p className="text-gray-500 text-sm">
                                    {currentUser.email || "demo@example.com"}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() =>
                                isEditing ? handleSave() : setIsEditing(true)
                            }
                            disabled={isSaving}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                isEditing
                                    ? "bg-primary-500 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {isEditing ? (
                                <>
                                    <Save size={18} />
                                    <span>
                                        {isSaving ? "保存中..." : "保存"}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Edit2 size={18} />
                                    <span>编辑</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <button
                            onClick={() => {
                                setActiveSetting("taste");
                                setShowSettingModal(true);
                            }}
                            className="p-4 bg-primary-50 rounded-xl text-center hover:bg-primary-100 transition-colors"
                        >
                            <div className="text-2xl mb-1">🍽️</div>
                            <div className="text-lg font-bold text-primary-600">
                                {selectedTastes.length > 0
                                    ? selectedTastes
                                          .map(
                                              (t) =>
                                                  tasteOptions.find(
                                                      (o) => o.value === t,
                                                  )?.label,
                                          )
                                          .join("、")
                                    : "未设置"}
                            </div>
                            <div className="text-sm text-gray-500">
                                口味偏好
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setActiveSetting("diet");
                                setShowSettingModal(true);
                            }}
                            className="p-4 bg-accent-50 rounded-xl text-center hover:bg-accent-100 transition-colors"
                        >
                            <div className="text-2xl mb-1">🥗</div>
                            <div className="text-lg font-bold text-accent-600">
                                {selectedDiet
                                    ? dietOptions.find(
                                          (d) => d.value === selectedDiet,
                                      )?.label
                                    : "未设置"}
                            </div>
                            <div className="text-sm text-gray-500">
                                饮食类型
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setActiveSetting("time");
                                setShowSettingModal(true);
                            }}
                            className="p-4 bg-purple-50 rounded-xl text-center hover:bg-purple-100 transition-colors"
                        >
                            <div className="text-2xl mb-1">⏱️</div>
                            <div className="text-lg font-bold text-purple-600">
                                {maxCookingTime}分钟
                            </div>
                            <div className="text-sm text-gray-500">
                                最大烹饪时间
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setActiveSetting("level");
                                setShowSettingModal(true);
                            }}
                            className="p-4 bg-orange-50 rounded-xl text-center hover:bg-orange-100 transition-colors"
                        >
                            <div className="text-2xl mb-1">📅</div>
                            <div className="text-lg font-bold text-orange-600">
                                {selectedLevel
                                    ? (
                                          {
                                              beginner: "初级",
                                              intermediate: "中级",
                                              advanced: "高级",
                                          } as any
                                      )[selectedLevel]
                                    : "未设置"}
                            </div>
                            <div className="text-sm text-gray-500">
                                烹饪水平
                            </div>
                        </button>
                    </div>
                </div>

                {/* stats */}
                <div id="today-stats" className="card p-6 scroll-mt-20">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                        <TrendingUp
                            size={20}
                            className="mr-2 text-primary-600"
                        />
                        今日统计
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl">
                            <div className="text-3xl font-bold text-primary-600">
                                {stats.totalIngredients}
                            </div>
                            <div className="text-sm text-gray-600">
                                扫描食材
                            </div>
                        </div>

                        <div className="text-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl">
                            <div className="text-3xl font-bold text-accent-600">
                                {stats.recipesViewed}
                            </div>
                            <div className="text-sm text-gray-600">
                                查看菜谱
                            </div>
                        </div>

                        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                            <div className="text-sm font-semibold text-orange-700 space-y-1">
                                <div>立即吃 {expiryLevelStats.red}</div>
                                <div>尽快吃 {expiryLevelStats.yellow}</div>
                                <div>很新鲜 {expiryLevelStats.green}</div>
                            </div>
                            <div className="text-sm text-gray-600">
                                保质期标签
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card p-0 overflow-hidden">
                    <div className="relative p-6 md:p-8 bg-gradient-to-br from-primary-50 via-white to-accent-50 text-gray-800">
                        <div className="pointer-events-none absolute -left-16 top-0 w-52 h-52 rounded-full bg-primary-300/35 blur-3xl nebula-drift" />
                        <div className="pointer-events-none absolute -right-10 bottom-4 w-56 h-56 rounded-full bg-accent-300/30 blur-3xl nebula-drift-delayed" />
                        <div className="pointer-events-none absolute left-1/2 top-1/4 w-44 h-44 -translate-x-1/2 rounded-full bg-primary-200/30 blur-3xl nebula-drift" />

                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800 flex items-center">
                                    <Target
                                        size={20}
                                        className="mr-2 text-primary-600"
                                    />
                                    AI 记忆档案
                                </h3>
                            </div>

                            <div className="relative mx-auto w-full max-w-[620px] h-[300px] sm:h-[340px] md:h-[360px]">
                                <div className="absolute inset-[18%] sm:inset-[15%] md:inset-[12%] rounded-full border border-primary-200/70 nebula-orbit" />
                                <div className="absolute inset-[4%] sm:inset-[3%] md:inset-[2%] rounded-full border border-accent-200/60 nebula-orbit-reverse" />

                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full border border-primary-200 bg-gradient-to-br from-primary-100/90 to-primary-200/80 backdrop-blur-xl nebula-core-pulse flex flex-col items-center justify-center text-center shadow-[0_0_60px_rgba(244,63,94,0.25)]">
                                    <Heart
                                        size={28}
                                        className="text-primary-500 sm:hidden"
                                        fill="currentColor"
                                    />
                                    <Heart
                                        size={36}
                                        className="text-primary-500 hidden sm:block"
                                        fill="currentColor"
                                    />
                                    <div className="mt-1 sm:mt-2 text-3xl sm:text-3xl md:text-4xl font-bold text-primary-700">
                                        {stats.favoriteRecipes +
                                            stats.cookingSessions}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-primary-700/80 mt-1">
                                        记忆中枢
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate("/cook?tab=favorites")}
                                    className="absolute left-[2%] sm:left-[6%] md:left-[8%] top-[18%] w-28 sm:w-32 md:w-36 rounded-2xl border border-primary-200 bg-primary-100/80 backdrop-blur-md p-2.5 sm:p-3 nebula-float shadow-sm text-left hover:bg-primary-100 transition-colors"
                                    aria-label="查看收藏"
                                >
                                    <div className="flex items-center text-primary-700 text-[11px] sm:text-sm">
                                        <BookHeart size={14} className="mr-1 sm:hidden" />
                                        <BookHeart size={16} className="mr-1 hidden sm:block" /> 收藏
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-primary-700 mt-1">
                                        {stats.favoriteRecipes}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-primary-600 mt-0.5">
                                        点击查看
                                    </div>
                                </button>

                                <button
                                    onClick={() => navigate("/cook?tab=history")}
                                    className="absolute right-[2%] sm:right-[7%] md:right-[9%] top-[20%] w-28 sm:w-32 md:w-36 rounded-2xl border border-accent-200 bg-accent-100/80 backdrop-blur-md p-2.5 sm:p-3 nebula-float shadow-sm text-left hover:bg-accent-100 transition-colors"
                                    style={{ animationDelay: "1.2s" }}
                                    aria-label="查看历史"
                                >
                                    <div className="flex items-center text-accent-700 text-[11px] sm:text-sm">
                                        <History size={14} className="mr-1 sm:hidden" />
                                        <History size={16} className="mr-1 hidden sm:block" /> 历史
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-accent-700 mt-1">
                                        {stats.cookingSessions}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-accent-600 mt-0.5">
                                        点击查看
                                    </div>
                                </button>

                                <button
                                    onClick={() => setShowPerceptionModal(true)}
                                    className="absolute left-1/2 -translate-x-1/2 bottom-[10%] sm:bottom-[12%] w-32 sm:w-36 md:w-40 rounded-2xl border border-primary-200 bg-white/85 backdrop-blur-md p-2.5 sm:p-3 nebula-float shadow-sm text-left hover:bg-white transition-colors"
                                    style={{ animationDelay: "1.8s" }}
                                    aria-label="查看 AI 感知"
                                >
                                    <div className="flex items-center text-primary-700 text-[11px] sm:text-sm">
                                        <Target size={14} className="mr-1 sm:hidden" />
                                        <Target size={16} className="mr-1 hidden sm:block" /> 感知
                                    </div>
                                    <div className="text-base sm:text-lg font-bold text-primary-700 mt-1">
                                        AI 思考
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-primary-600 mt-0.5">
                                        点击查看
                                    </div>
                                </button>
                            </div>

                            {isMemoryLoading && (
                                <p className="text-xs text-gray-500 text-center">
                                    正在加载个性化档案...
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* settings + about */}
                <div className="card divide-y">
                    <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <HelpCircle
                                size={20}
                                className="text-primary-600"
                            />
                            <span className="font-medium text-gray-800">
                                帮助与反馈
                            </span>
                        </div>
                        <span className="text-gray-400">→</span>
                    </button>
                </div>

                <div className="card p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">关于</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>版本：0.1.0</p>
                        <p>构建时间：2026年2月</p>
                        <button
                            className="text-primary-600"
                            onClick={() => alert("已是最新版本")}
                        >
                            检查更新
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"
                >
                    <LogOut size={20} />
                    <span>退出登录</span>
                </button>
            </div>

            {showPerceptionModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-primary-100 shadow-xl overflow-hidden">
                        <div className="p-5 border-b bg-gradient-to-r from-primary-50 to-accent-50 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <Target size={18} className="mr-2 text-primary-600" />
                                AI 感知
                            </h3>
                            <button
                                onClick={() => setShowPerceptionModal(false)}
                                className="p-2 hover:bg-white rounded-full"
                                aria-label="关闭感知弹窗"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            <p className="text-sm text-gray-600">
                                基于你的口味偏好、烹饪习惯和目标，我的当前判断是：
                            </p>
                            <p className="text-sm leading-6 text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-3">
                                {perceptionSummary}
                            </p>
                        </div>

                        <div className="p-4 border-t bg-gray-50">
                            <button
                                onClick={() => setShowPerceptionModal(false)}
                                className="w-full btn-primary"
                            >
                                我知道了
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSettingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b sticky top-0 bg-white z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {activeSetting === "taste" &&
                                        "口味偏好与目标设置"}
                                    {activeSetting === "diet" && "饮食类型设置"}
                                    {activeSetting === "time" && "最大烹饪时间"}
                                    {activeSetting === "level" &&
                                        "烹饪水平设置"}
                                </h2>
                                <button
                                    onClick={() => setShowSettingModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {activeSetting === "taste" && (
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="font-medium text-gray-800 mb-3">
                                            选择你喜欢的口味
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {tasteOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() =>
                                                        toggleTaste(option.value)
                                                    }
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                                        selectedTastes.includes(
                                                            option.value,
                                                        )
                                                            ? "bg-primary-500 text-white shadow-md"
                                                            : `${option.color} hover:opacity-80`
                                                    }`}
                                                >
                                                    {option.emoji} {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-primary-50/70 border border-primary-100 p-3 space-y-3">
                                        <p className="text-sm font-medium text-primary-700">
                                            临时目标
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                value={temporaryGoalInput}
                                                onChange={(e) =>
                                                    setTemporaryGoalInput(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="例如：这周少油少盐"
                                                className="flex-1 h-10 px-3 border border-primary-100 bg-white rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                            <button
                                                onClick={() =>
                                                    updateGoal(
                                                        "temporary",
                                                        temporaryGoalInput,
                                                        "add",
                                                    )
                                                }
                                                disabled={
                                                    isMemorySaving ||
                                                    !temporaryGoalInput.trim()
                                                }
                                                className="h-10 px-3 rounded-lg bg-primary-500 text-white disabled:opacity-50"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {temporaryGoals.map((goal) => (
                                                <span
                                                    key={`temp-${goal}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-primary-200 text-primary-700 text-sm"
                                                >
                                                    {goal}
                                                    <button
                                                        onClick={() =>
                                                            updateGoal(
                                                                "temporary",
                                                                goal,
                                                                "remove",
                                                            )
                                                        }
                                                        className="text-primary-600 hover:text-primary-800"
                                                        aria-label={`删除目标 ${goal}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-accent-50/70 border border-accent-100 p-3 space-y-3">
                                        <p className="text-sm font-medium text-accent-700">
                                            长期目标
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                value={longTermGoalInput}
                                                onChange={(e) =>
                                                    setLongTermGoalInput(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="例如：三个月内减脂 5kg"
                                                className="flex-1 h-10 px-3 border border-accent-100 bg-white rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                            <button
                                                onClick={() =>
                                                    updateGoal(
                                                        "long_term",
                                                        longTermGoalInput,
                                                        "add",
                                                    )
                                                }
                                                disabled={
                                                    isMemorySaving ||
                                                    !longTermGoalInput.trim()
                                                }
                                                className="h-10 px-3 rounded-lg bg-primary-500 text-white disabled:opacity-50"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {longTermGoals.map((goal) => (
                                                <span
                                                    key={`long-${goal}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-accent-200 text-accent-700 text-sm"
                                                >
                                                    {goal}
                                                    <button
                                                        onClick={() =>
                                                            updateGoal(
                                                                "long_term",
                                                                goal,
                                                                "remove",
                                                            )
                                                        }
                                                        className="text-accent-600 hover:text-accent-800"
                                                        aria-label={`删除目标 ${goal}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {isMemoryLoading && (
                                        <p className="text-xs text-gray-500">
                                            正在加载个性化档案...
                                        </p>
                                    )}
                                </div>
                            )}
                            {activeSetting === "diet" && (
                                <div>
                                    <h3 className="font-medium text-gray-800 mb-3">
                                        饮食类型
                                    </h3>
                                    <div className="space-y-2">
                                        {dietOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() =>
                                                    setSelectedDiet(
                                                        selectedDiet ===
                                                            option.value
                                                            ? null
                                                            : option.value,
                                                    )
                                                }
                                                className={`w-full p-4 rounded-xl text-left transition-all ${
                                                    selectedDiet ===
                                                    option.value
                                                        ? "bg-primary-50 border-2 border-primary-500"
                                                        : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-800">
                                                        {option.label}
                                                    </span>
                                                    {selectedDiet ===
                                                        option.value && (
                                                        <Check
                                                            size={20}
                                                            className="text-primary-600"
                                                        />
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {option.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activeSetting === "time" && (
                                <div>
                                    <h3 className="font-medium text-gray-800 mb-3">
                                        最大烹饪时间
                                    </h3>
                                    <input
                                        type="range"
                                        min="15"
                                        max="120"
                                        step="15"
                                        value={maxCookingTime}
                                        onChange={(e) =>
                                            setMaxCookingTime(
                                                parseInt(e.target.value),
                                            )
                                        }
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                                        <span>15分钟</span>
                                        <span className="font-medium text-primary-600">
                                            {maxCookingTime}分钟
                                        </span>
                                        <span>120分钟</span>
                                    </div>
                                </div>
                            )}
                            {activeSetting === "level" && (
                                <div>
                                    <h3 className="font-medium text-gray-800 mb-3">
                                        烹饪水平
                                    </h3>
                                    <div className="space-y-2">
                                        {[
                                            {
                                                value: "beginner",
                                                label: "初级",
                                            },
                                            {
                                                value: "intermediate",
                                                label: "中级",
                                            },
                                            {
                                                value: "advanced",
                                                label: "高级",
                                            },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() =>
                                                    setSelectedLevel(
                                                        selectedLevel ===
                                                            option.value
                                                            ? null
                                                            : option.value,
                                                    )
                                                }
                                                className={`w-full p-4 rounded-xl text-left transition-all ${
                                                    selectedLevel ===
                                                    option.value
                                                        ? "bg-primary-50 border-2 border-primary-500"
                                                        : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-800">
                                                        {option.label}
                                                    </span>
                                                    {selectedLevel ===
                                                        option.value && (
                                                        <Check
                                                            size={20}
                                                            className="text-primary-600"
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t sticky bottom-0 bg-white">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                            >
                                <Save size={20} />
                                <span>
                                    {isSaving ? "保存中..." : "保存设置"}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
