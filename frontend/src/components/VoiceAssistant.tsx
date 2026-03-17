import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Send, X } from "lucide-react";
import { ingredientApi, recipeApi } from "../services/api";
import { useIngredientsStore, useRecipesStore, useUserStore } from "../stores";
import { getUserId } from "../utils/userId";
import {
    clearRecipeCacheDirty,
    markRecipeCacheDirty,
} from "../services/recipeCache";
import type {
    Ingredient,
    IngredientCategory,
    DietType,
    TastePreference,
} from "../types";

type Message = {
    id: string;
    role: "user" | "assistant";
    text: string;
};

type ActionButton = {
    label: string;
    action: "recommend_now";
};

const dishIngredientMap: Record<string, string[]> = {
    鱼香肉丝: [
        "猪里脊",
        "木耳",
        "胡萝卜",
        "青椒",
        "蒜",
        "姜",
        "豆瓣酱",
        "生抽",
        "醋",
        "糖",
    ],
    宫保鸡丁: ["鸡胸肉", "花生米", "黄瓜", "胡萝卜", "干辣椒", "花椒", "生抽"],
    番茄炒蛋: ["番茄", "鸡蛋", "葱", "盐"],
};

const categoryRules: Array<{
    keywords: string[];
    category: IngredientCategory;
}> = [
    { keywords: ["猪", "牛", "羊", "鸡", "鸭", "肉"], category: "meat" },
    { keywords: ["鱼", "虾", "蟹", "贝"], category: "seafood" },
    { keywords: ["奶", "芝士", "黄油"], category: "dairy" },
    { keywords: ["蛋"], category: "egg" },
    { keywords: ["米", "面", "燕麦"], category: "grain" },
    { keywords: ["苹果", "橙", "香蕉", "葡萄"], category: "fruit" },
    {
        keywords: ["盐", "糖", "醋", "酱", "料酒", "胡椒"],
        category: "seasoning",
    },
    { keywords: ["可乐", "牛奶", "果汁", "茶"], category: "beverage" },
    {
        keywords: ["菜", "番茄", "土豆", "白菜", "黄瓜", "西兰花", "豆角"],
        category: "vegetable",
    },
];

const QUANTITY_UNIT_PATTERN =
    "([零一二两三四五六七八九十百千半几俩仨\\d.]+)\\s*(斤|两|千克|公斤|kg|克|g|个|颗|根|只|盒|袋|瓶|块|条|把|份|片|毫升|升|ml|l)";

const ASR_NAME_CORRECTIONS: Array<[RegExp, string]> = [
    [/炉鱼|路鱼|鲈于/g, "鲈鱼"],
    [/豆角儿/g, "豆角"],
    [/鸡旦/g, "鸡蛋"],
];

const chineseDigitMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
};

const chineseUnitMap: Record<string, number> = {
    十: 10,
    百: 100,
    千: 1000,
};

const normalizeUnit = (rawUnit: string): string => {
    const u = rawUnit.toLowerCase();
    if (u === "kg") return "千克";
    if (u === "g") return "克";
    if (u === "ml") return "毫升";
    if (u === "l") return "升";
    return rawUnit;
};

const parseChineseNumber = (raw: string): number => {
    const normalized = raw.trim();
    if (!normalized) return 1;
    if (!Number.isNaN(Number(normalized))) return Number(normalized);
    if (normalized === "半") return 0.5;
    if (normalized === "几") return 3;
    if (normalized === "俩") return 2;
    if (normalized === "仨") return 3;

    if (normalized.startsWith("半") && normalized.length > 1) {
        const tail = parseChineseNumber(normalized.slice(1));
        return tail * 0.5;
    }

    let total = 0;
    let current = 0;
    for (const ch of normalized) {
        if (chineseDigitMap[ch] !== undefined) {
            current = chineseDigitMap[ch];
            continue;
        }

        if (chineseUnitMap[ch] !== undefined) {
            const base = current === 0 ? 1 : current;
            total += base * chineseUnitMap[ch];
            current = 0;
        }
    }

    const result = total + current;
    return result || 1;
};

type QuantityToken = {
    quantity: number;
    unit: string;
};

const extractQuantityTokens = (chunk: string): QuantityToken[] => {
    const quantityRegex = new RegExp(QUANTITY_UNIT_PATTERN, "gi");
    const tokens: QuantityToken[] = [];

    let match: RegExpExecArray | null = null;
    while ((match = quantityRegex.exec(chunk)) !== null) {
        const quantity = parseChineseNumber(match[1]);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;
        tokens.push({
            quantity,
            unit: normalizeUnit(match[2]),
        });
    }

    return tokens;
};

const chooseBestQuantity = (tokens: QuantityToken[]): QuantityToken => {
    if (!tokens.length) {
        return { quantity: 1, unit: "个" };
    }

    const highPriorityUnits = ["斤", "两", "千克", "公斤", "克", "毫升", "升"];
    const prioritized = tokens.filter((t) =>
        highPriorityUnits.includes(t.unit),
    );
    if (prioritized.length) {
        return prioritized[prioritized.length - 1];
    }

    return tokens[tokens.length - 1];
};

const inferCategory = (name: string): IngredientCategory => {
    for (const rule of categoryRules) {
        if (rule.keywords.some((k) => name.includes(k))) {
            return rule.category;
        }
    }
    return "other";
};

const normalizeIngredientName = (rawName: string): string => {
    let normalized = rawName;
    for (const [pattern, replacement] of ASR_NAME_CORRECTIONS) {
        normalized = normalized.replace(pattern, replacement);
    }

    return normalized
        .replace(
            /^(我|又|刚|刚刚|刚买的|新买的|买的|又买的|来点|来份|有|还有|再来|再加|请|帮我|把|给我|一下)+/g,
            "",
        )
        .replace(/^(又买了|买了)\s*/g, "")
        .replace(/^(大概|约|大约|差不多)\s*/g, "")
        .replace(
            /^(一|二|两|三|四|五|六|七|八|九|十|几|俩|仨)\s*(个|颗|根|只|盒|袋|瓶|块|条|把|份|片)\s*/g,
            "",
        )
        .trim();
};

const parseInventoryItems = (input: string): Array<Partial<Ingredient>> => {
    const cleaned = input
        .replace(
            /今天|刚刚|刚才|我刚刚|我刚|我又刚买了|我又买了|我买了|又买了|买了|帮我|请|库存|食材|加到|添加到|添加|入库|放进冰箱/g,
            "",
        )
        .replace(/[。！？!?.]/g, "");

    const chunks = cleaned
        .split(/[，,、和]/)
        .map((part) => part.trim())
        .filter(Boolean);

    const parsed = chunks
        .map((chunk) => {
            const tokens = extractQuantityTokens(chunk);
            const best = chooseBestQuantity(tokens);

            const rawNamePart = chunk.includes("的")
                ? chunk.split("的").pop() || chunk
                : chunk;
            const nameWithoutQuantities = rawNamePart
                .replace(new RegExp(QUANTITY_UNIT_PATTERN, "gi"), "")
                .replace(/^[是了的在买到\s]+/g, "")
                .replace(/[^\u4e00-\u9fa5A-Za-z]/g, "")
                .trim();

            const fallbackName = chunk
                .replace(new RegExp(QUANTITY_UNIT_PATTERN, "gi"), "")
                .replace(/[^\u4e00-\u9fa5A-Za-z]/g, "")
                .trim();

            const name = normalizeIngredientName(
                nameWithoutQuantities || fallbackName,
            );

            if (!name) return null;

            return {
                name,
                quantity: best.quantity,
                unit: best.unit,
                category: inferCategory(name),
            };
        })
        .filter(
            (item) =>
                !!item &&
                typeof item.name === "string" &&
                item.name.trim().length > 0,
        ) as Partial<Ingredient>[];

    return parsed;
};

const extractDishName = (text: string): string => {
    const match = text.match(
        /想吃([\u4e00-\u9fa5A-Za-z]+?)(需要|要|怎么|，|。|\?|？|$)/,
    );
    if (match?.[1]) return match[1].trim();

    const direct = text.match(/([\u4e00-\u9fa5A-Za-z]{2,})需要哪些食材/);
    if (direct?.[1]) return direct[1].trim();

    return "";
};

const desiredIngredientStopWords = new Set([
    "我",
    "想",
    "吃",
    "想吃",
    "要",
    "想要",
    "帮我",
    "请",
    "把",
    "给我",
    "一下",
    "心想",
    "心选",
    "食材",
    "心想食材",
    "心选食材",
    "添加",
    "加入",
    "设置",
    "标记",
    "删除",
    "移除",
    "去掉",
    "清空",
    "查看",
    "打开",
    "进入",
    "我的",
    "今天",
    "今晚",
    "明天",
    "中午",
    "早上",
    "下午",
    "晚上",
    "最近",
    "现在",
    "有点",
    "有些",
]);

const extractDesiredIngredients = (text: string): string[] => {
    const phraseMatch = text.match(
        /(?:今天|今晚|明天|现在|最近|我)?(?:特别|有点|有些)?(?:想吃|想要|想来点|想来份|来点|来份)([^。！？!?,，]+)/,
    );

    const source = phraseMatch?.[1] || text;
    const cleaned = source
        .replace(/[。！？!?]/g, " ")
        .replace(/心想食材|心选食材/g, " ")
        .replace(/(帮我|请|把|给我|一下|设置成|设置为|标记为|标记成)/g, " ")
        .replace(/(添加|加入|删除|移除|去掉|清空|查看|打开|进入)/g, " ")
        .replace(/(我想吃|想吃|想要|我想要|来点|来份|想来点|想来份)/g, " ")
        .replace(/(今天|今晚|明天|中午|早上|下午|晚上|最近|现在)/g, " ")
        .trim();

    return cleaned
        .split(/[\s,，、和及]+/)
        .map((part) => normalizeIngredientName(part).replace(/食材/g, "").trim())
        .filter(
            (part) =>
                part.length > 0 &&
                !desiredIngredientStopWords.has(part) &&
                /[\u4e00-\u9fa5A-Za-z]/.test(part),
        );
};

const extractDislikedIngredients = (text: string): string[] => {
    const cleaned = text
        .replace(/[。！？!?]/g, " ")
        .replace(/(心想食材|心选食材)/g, " ")
        .replace(/(我|真的|最近|现在|暂时|先|都|也|再也)/g, " ")
        .replace(/(不想吃|不吃|不要吃|别吃|不想要|不要|别要)/g, " ")
        .replace(/(了|啦|啊|呀|吧|嘛)/g, " ")
        .trim();

    return cleaned
        .split(/[\s,，、和及]+/)
        .map((part) => normalizeIngredientName(part).replace(/食材/g, "").trim())
        .filter(
            (part) =>
                part.length > 0 &&
                !desiredIngredientStopWords.has(part) &&
                /[\u4e00-\u9fa5A-Za-z]/.test(part),
        );
};

export default function VoiceAssistant() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        ingredients,
        desiredIngredients,
        setIngredients,
        addDesiredIngredient,
        removeDesiredIngredient,
        setDesiredIngredients,
    } = useIngredientsStore();
    const { setRecommendations } = useRecipesStore();
    const { preferences } = useUserStore();

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome-1",
            role: "assistant",
            text: "你好，我是你的烹饪助手栗子，也可以叫我小栗！想吃什么都可以和我说！",
        },
        {
            id: "welcome-2",
            role: "assistant",
            text: "你可以说：今天买了一颗白菜，三个西红柿，一斤猪肉，一斤鸡蛋！",
        },
        {
            id: "welcome-3",
            role: "assistant",
            text: "也可以说：今天我想吃茄子！",
        },
    ]);
    const [actionButton, setActionButton] = useState<ActionButton | null>(null);
    const [awaitingRecommendation, setAwaitingRecommendation] = useState(false);

    const recognitionRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);

    const supportSpeech = useMemo(
        () =>
            typeof window !== "undefined" &&
            !!(
                (window as any).SpeechRecognition ||
                (window as any).webkitSpeechRecognition
            ),
        [],
    );

    useEffect(() => {
        setIsPanelOpen(false);
        setActionButton(null);
        setAwaitingRecommendation(false);
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        if (!isPanelOpen) return;
        messagesRef.current?.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, isPanelOpen]);

    useEffect(() => {
        if (!isPanelOpen) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!containerRef.current) return;
            const target = event.target as Node;
            if (!containerRef.current.contains(target)) {
                setIsPanelOpen(false);
            }
        };

        window.addEventListener("mousedown", onPointerDown);
        return () => window.removeEventListener("mousedown", onPointerDown);
    }, [isPanelOpen]);

    const appendMessage = (role: "user" | "assistant", text: string) => {
        setMessages((prev) => [
            ...prev,
            { id: `${Date.now()}-${Math.random()}`, role, text },
        ]);
    };

    const speak = (text: string) => {
        if (!window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "zh-CN";
        utterance.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    const recommendRecipes = async (shouldNavigate: boolean = true) => {
        const names = ingredients.map((item) => item.name);
        if (names.length === 0) {
            const msg = "当前库存为空，请先添加食材。";
            appendMessage("assistant", msg);
            speak(msg);
            return;
        }

        try {
            const recipes = await recipeApi.getRecommendations({
                available_ingredients: names,
                required_ingredients: desiredIngredients,
                taste_preferences:
                    preferences.tastePreferences as TastePreference[],
                diet_type: (preferences.dietType || undefined) as
                    | DietType
                    | undefined,
                max_cooking_time: preferences.maxCookingTime || undefined,
                cooking_level: preferences.cookingLevel || undefined,
            } as any);

            if (!recipes.length) {
                const msg = "暂时没有生成到菜谱，请稍后再试。";
                appendMessage("assistant", msg);
                speak(msg);
                return;
            }

            setRecommendations(recipes);
            clearRecipeCacheDirty();
            const titles = recipes
                .slice(0, 3)
                .map((r) => `《${r.title}》`)
                .join("、");
            const msg = `已为你生成菜谱推荐：${titles}。已为你打开菜谱页。`;
            appendMessage("assistant", msg);
            speak(msg);
            if (shouldNavigate) {
                navigate("/cook?tab=recommendations");
            }
        } catch (error) {
            console.error("Failed to recommend recipes:", error);
            const msg = "推荐菜谱失败，请稍后再试。";
            appendMessage("assistant", msg);
            speak(msg);
        }
    };

    const handleCommand = async (text: string) => {
        const userText = text.trim();
        if (!userText) return;

        appendMessage("user", userText);
        setActionButton(null);

        const normalized = userText.replace(/\s/g, "");
        const yesIntent = /好|可以|需要|推荐|行|来吧/.test(normalized);

        if (awaitingRecommendation && yesIntent) {
            setAwaitingRecommendation(false);
            setIsPanelOpen(false);
            navigate("/cook?tab=recommendations");
            await recommendRecipes(false);
            return;
        }

        if (/买了|添加|加入|库存|入库|放进冰箱/.test(normalized)) {
            const items = parseInventoryItems(userText);
            if (!items.length) {
                const msg = "我没有识别到可添加的食材，请再说一次。";
                appendMessage("assistant", msg);
                speak(msg);
                return;
            }

            try {
                await ingredientApi.addIngredientsBatch(items, getUserId());
                const latest = await ingredientApi.getIngredients(getUserId());
                setIngredients(latest);
                markRecipeCacheDirty();

                const itemText = items
                    .map((item) => `${item.name}${item.quantity}${item.unit}`)
                    .join("、");
                const msg = `好的，已为您添加到库存：${itemText}。需要现在为您推荐菜谱吗？`;
                appendMessage("assistant", msg);
                speak(msg);
                setAwaitingRecommendation(true);
                setActionButton({
                    label: "立即推荐菜谱",
                    action: "recommend_now",
                });
            } catch (error) {
                console.error("Failed to add ingredients:", error);
                const msg = "添加库存失败，请稍后重试。";
                appendMessage("assistant", msg);
                speak(msg);
            }
            return;
        }

        if (/采购清单|需要哪些食材|买菜/.test(normalized)) {
            const dishName = extractDishName(userText);
            const itemList = dishIngredientMap[dishName] || [];

            if (!dishName || itemList.length === 0) {
                const msg =
                    "我暂时只支持部分常见菜名，请直接说例如“我想吃鱼香肉丝，需要哪些食材”。";
                appendMessage("assistant", msg);
                speak(msg);
                return;
            }

            try {
                await recipeApi.addToShoppingList(getUserId(), {
                    recipe_title: dishName,
                    items: itemList,
                });
                const msg = `${dishName}所需食材已为您添加至采购清单。`;
                appendMessage("assistant", msg);
                speak(msg);
            } catch (error) {
                console.error("Failed to add shopping list:", error);
                const msg = "添加采购清单失败，请稍后重试。";
                appendMessage("assistant", msg);
                speak(msg);
            }
            return;
        }

        if (/查看|打开|进入/.test(normalized) && /心想食材|心选食材/.test(normalized)) {
            navigate("/food/desired");
            const msg = "已为你打开心想食材页面。";
            appendMessage("assistant", msg);
            speak(msg);
            return;
        }

        if (/不想吃|不吃|不要吃|别吃/.test(normalized)) {
            const items = extractDislikedIngredients(userText);
            if (!items.length) {
                const msg = "我没有识别到你不想吃的食材，请再说一次。";
                appendMessage("assistant", msg);
                speak(msg);
                return;
            }

            items.forEach((item) => removeDesiredIngredient(item));
            const msg = `明白了，已从心想食材移除：${items.join("、")}。`;
            appendMessage("assistant", msg);
            speak(msg);
            return;
        }

        if (/清空/.test(normalized) && /心想食材|心选食材/.test(normalized)) {
            setDesiredIngredients([]);
            const msg = "已清空你的心想食材。";
            appendMessage("assistant", msg);
            speak(msg);
            return;
        }

        if (/删除|移除|去掉/.test(normalized) && /心想食材|心选食材/.test(normalized)) {
            const items = extractDesiredIngredients(userText);
            if (!items.length) {
                const msg = "我没有识别到要删除的心想食材，请再说一次。";
                appendMessage("assistant", msg);
                speak(msg);
                return;
            }

            items.forEach((item) => removeDesiredIngredient(item));
            const msg = `已为你移除心想食材：${items.join("、")}。`;
            appendMessage("assistant", msg);
            speak(msg);
            return;
        }

        if (
            /心想食材|心选食材/.test(normalized) ||
            (/想吃/.test(normalized) && !/需要哪些食材|采购清单|买菜/.test(normalized))
        ) {
            const items = extractDesiredIngredients(userText);
            if (!items.length) {
                const msg = "我没有识别到心想食材，请再说一次。";
                appendMessage("assistant", msg);
                speak(msg);
                return;
            }

            items.forEach((item) => addDesiredIngredient(item));
            const msg = `好的，已添加到心想食材：${items.join("、")}。`;
            appendMessage("assistant", msg);
            speak(msg);
            return;
        }

        if (/推荐菜谱|推荐做什么|吃什么|推荐一下/.test(normalized)) {
            await recommendRecipes();
            return;
        }

        const fallback =
            "我可以帮你：添加库存、管理心想食材、推荐菜谱、添加采购清单。请再说一次具体需求。";
        appendMessage("assistant", fallback);
        speak(fallback);
    };

    const startListening = () => {
        if (!supportSpeech) return;
        const Recognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        const recognition = new Recognition();

        recognition.lang = "zh-CN";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results?.[0]?.[0]?.transcript || "";
            handleCommand(transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
    };

    const submitText = async () => {
        const textToSubmit = input.trim();
        if (!textToSubmit) return;
        setInput("");
        await handleCommand(textToSubmit);
    };

    return (
        <div
            ref={containerRef}
            className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 relative">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsPanelOpen(true)}
                        className={`w-full h-12 pl-4 pr-14 border rounded-full text-sm text-left hover:bg-gray-50 bg-white shadow-sm flex items-center overflow-hidden transition-colors duration-200 ${
                            isListening
                                ? "border-green-500 ring-2 ring-green-100 text-green-700"
                                : "border-gray-200 text-gray-500"
                        }`}
                    >
                        {isListening
                            ? "正在语音识别..."
                            : "点击进入悬浮聊天，支持语音与文字"}
                    </button>
                    <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={!supportSpeech}
                        className={`absolute right-1 top-1 h-10 w-10 rounded-full flex items-center justify-center shadow-sm transform transition-all duration-200 hover:scale-110 active:scale-95 ${
                            isListening
                                ? "bg-green-500 text-white scale-110 animate-pulse-soft"
                                : "bg-primary-500 text-white hover:bg-primary-600"
                        } disabled:opacity-50`}
                        aria-label={
                            isListening ? "停止语音输入" : "开始语音输入"
                        }
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                </div>

                {!supportSpeech && (
                    <p className="mt-1 text-xs text-orange-600">
                        当前浏览器不支持语音识别，可继续使用文字输入。
                    </p>
                )}

                {isPanelOpen && (
                    <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-slide-up">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <Mic size={18} className="text-primary-600" />
                                <span className="font-semibold text-gray-800">
                                    栗子
                                </span>
                            </div>
                            <button
                                onClick={() => setIsPanelOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="关闭聊天面板"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div
                            ref={messagesRef}
                            className="h-72 overflow-y-auto p-3 space-y-3 bg-white"
                        >
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`w-fit max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                        msg.role === "assistant"
                                            ? "bg-gray-100 text-gray-700"
                                            : "ml-auto bg-primary-500 text-white"
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            ))}

                            {actionButton?.action === "recommend_now" && (
                                <button
                                    onClick={() => {
                                        setAwaitingRecommendation(false);
                                        setActionButton(null);
                                        setIsPanelOpen(false);
                                        navigate("/cook?tab=recommendations");
                                        void recommendRecipes(false);
                                    }}
                                    className="px-3 py-2 text-sm rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100"
                                >
                                    {actionButton.label}
                                </button>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-100 bg-white">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={
                                        isListening
                                            ? stopListening
                                            : startListening
                                    }
                                    disabled={!supportSpeech}
                                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                        isListening
                                            ? "bg-red-500 text-white"
                                            : "bg-gray-100 text-gray-700"
                                    } disabled:opacity-50`}
                                >
                                    {isListening ? (
                                        <MicOff size={18} />
                                    ) : (
                                        <Mic size={18} />
                                    )}
                                </button>

                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && submitText()
                                    }
                                    disabled={isListening}
                                    placeholder={
                                        isListening
                                            ? "正在听..."
                                            : "输入你的需求..."
                                    }
                                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                />

                                <button
                                    onClick={submitText}
                                    disabled={!input.trim()}
                                    className="h-10 w-10 rounded-lg bg-primary-500 text-white flex items-center justify-center disabled:opacity-40"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
