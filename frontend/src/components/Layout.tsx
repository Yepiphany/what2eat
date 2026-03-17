import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Scan, User, Carrot, ChefHat } from "lucide-react";
import VoiceAssistant from "./VoiceAssistant";
import { useIngredientsStore } from "../stores";

const navItems = [
    { path: "/home", icon: Home, label: "首页" },
    { path: "/food", icon: Carrot, label: "食材" },
    { path: "/scan", icon: Scan, label: "扫描" },
    { path: "/cook", icon: ChefHat, label: "烹饪" },
    { path: "/profile", icon: User, label: "我的" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const syncDesiredIngredientStatus = useIngredientsStore(
        (state) => state.syncDesiredIngredientStatus,
    );

    useEffect(() => {
        syncDesiredIngredientStatus();
    }, [location.pathname, syncDesiredIngredientStatus]);

    const getActiveView = () => {
        const path = location.pathname;
        if (path === "/" || path.startsWith("/home")) return "home";
        if (path.startsWith("/food") || path.startsWith("/shopping"))
            return "food";
        if (path.startsWith("/scan") || path.startsWith("/scanner"))
            return "scan";
        if (
            path.startsWith("/cook") ||
            path.startsWith("/recipes") ||
            path.startsWith("/cooking")
        )
            return "cook";
        if (path === "/profile") return "profile";
        return "home";
    };

    const currentView = getActiveView();
    const isCookingMode =
        location.pathname.startsWith("/cook/session") ||
        location.pathname.startsWith("/cooking/");

    const isNavItemActive = (path: string) => {
        if (path === "/home") {
            return currentView === "home";
        }
        if (path === "/food") {
            return currentView === "food";
        }
        if (path === "/scan") {
            return currentView === "scan";
        }
        if (path === "/cook") {
            return currentView === "cook";
        }
        if (path === "/profile") {
            return currentView === "profile";
        }
        return false;
    };

    if (isCookingMode) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 [--layout-top-space:1.5rem] [--layout-nav-space:6rem]">
            <VoiceAssistant />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
                {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-white border-t border-gray-200">
                <div className="flex h-full items-center justify-around py-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isNavItemActive(item.path);
                        const isScanItem = item.path === "/scan";
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex h-full flex-col items-center justify-center px-4 transition-all duration-200 ${
                                    isScanItem ? "-translate-y-0.5" : ""
                                } ${
                                    isActive
                                        ? "text-primary-600"
                                        : "text-gray-500 hover:text-primary-600"
                                }`}
                            >
                                <div
                                    className={`${
                                        isScanItem
                                            ? `flex h-14 w-14 shrink-0 aspect-square items-center justify-center rounded-full border-4 border-white shadow-lg ${
                                                  isActive
                                                      ? "bg-primary-600 text-white"
                                                      : "bg-primary-500 text-white hover:bg-primary-600"
                                              }`
                                            : ""
                                    }`}
                                >
                                    <Icon size={isScanItem ? 26 : 24} />
                                </div>
                                {isScanItem ? (
                                    <div
                                        className="mt-1 h-4"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <span className="mt-1 text-xs leading-4">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
