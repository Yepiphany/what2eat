import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Clock3, Heart } from "lucide-react";

import { useIngredientsStore } from "../stores";

export default function DesiredIngredientsHistoryPage() {
    const navigate = useNavigate();
    const { desiredIngredientHistory, syncDesiredIngredientStatus } =
        useIngredientsStore();

    useEffect(() => {
        syncDesiredIngredientStatus();
    }, [syncDesiredIngredientStatus]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                    <ChevronLeft size={24} />
                    <span>返回</span>
                </button>
            </div>

            <section className="card p-5 md:p-6 border border-amber-200 bg-amber-50">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Clock3 size={22} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-800 text-lg">过往心想</h2>
                        <p className="text-sm text-amber-700">曾经的心想食材会展示在这里</p>
                    </div>
                </div>
            </section>

            {desiredIngredientHistory.length === 0 ? (
                <div className="card p-12 text-center">
                    <Heart size={64} className="mx-auto mb-4 text-amber-200" />
                    <p className="text-gray-500 text-lg">暂无过往心想食材</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {desiredIngredientHistory.map((item) => (
                        <div
                            key={item}
                            className="card p-4 flex items-center justify-between bg-amber-50 border border-amber-100"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700">
                                    <Heart size={16} />
                                </div>
                                <span className="font-medium text-gray-800">{item}</span>
                            </div>
                            <span className="text-sm text-amber-700">曾经</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
