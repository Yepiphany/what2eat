import { useState, useRef, useEffect } from 'react';
import { X, RefreshCw, Check, AlertTriangle, Plus, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIngredientsStore } from '../stores';
import { ingredientApi } from '../services/api';
import type { Ingredient } from '../types';
import { incrementScannedIngredients } from '../services/statistics';
import { getUserId } from '../utils/userId';
import {
  markRecipeCacheDirty,
  requestRecipeForceRefresh,
} from '../services/recipeCache';

export default function ScannerPage() {
  const navigate = useNavigate();
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const toExpiryDateByDays = (days: number): string | undefined => {
    if (!Number.isFinite(days) || days <= 0) return undefined;
    const dt = new Date();
    dt.setDate(dt.getDate() + Math.floor(days));
    dt.setHours(23, 59, 59, 0);
    return dt.toISOString();
  };

  const normalizeScannedIngredient = (item: Partial<Ingredient>): Partial<Ingredient> => {
    const parsedEstimatedDays = Number((item as any).estimated_expiry_days);
    const resolvedExpiryDate =
      item.expiry_date || toExpiryDateByDays(parsedEstimatedDays) || undefined;

    return {
      ...item,
      quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1,
      unit: item.unit || '个',
      category: item.category || 'other',
      expiry_date: resolvedExpiryDate,
    };
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [detectedIngredients, setDetectedIngredients] = useState<Partial<Ingredient>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRecipeRefreshDialog, setShowRecipeRefreshDialog] = useState(false);
  const [showUsageTips, setShowUsageTips] = useState(false);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [dynamicHeights, setDynamicHeights] = useState({
    camera: 480,
    preview: 340,
    detectedList: 260,
  });
  
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tipsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ingredients, setIngredients } = useIngredientsStore();

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (previewUrl) {
      return;
    }

    const hasLiveVideoTrack =
      !!cameraStream && cameraStream.getVideoTracks().some((track) => track.readyState === 'live');

    if (videoRef.current && hasLiveVideoTrack && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors; user interaction (capture/reset) usually resumes playback.
      });
      return;
    }

    if (!hasLiveVideoTrack) {
      startCamera();
    }
  }, [previewUrl, cameraStream]);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const updateDynamicHeights = () => {
      const pageTop = pageRef.current?.getBoundingClientRect().top ?? 0;
      const contentTop = contentRef.current?.getBoundingClientRect().top ?? pageTop;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const isMobile = window.innerWidth < 768;
      const tipsHeight = previewUrl ? 52 : (tipsRef.current?.offsetHeight ?? (showUsageTips ? 180 : 52));
      const drawerBottomOffset = isMobile ? 80 : 24;
      const drawerReserve = tipsHeight + drawerBottomOffset + 12;

      const availablePageHeight = clamp(Math.floor(viewportHeight - pageTop - 8), 420, 1400);
      setPageHeight(availablePageHeight);

      const spaceForMainCard = clamp(
        Math.floor(viewportHeight - contentTop - drawerReserve),
        220,
        900
      );

      const previewHeight = clamp(Math.floor(spaceForMainCard * 0.52), 240, 500);
      const detectedListHeight = clamp(
        spaceForMainCard - previewHeight - 180,
        140,
        360
      );

      setDynamicHeights({
        camera: spaceForMainCard,
        preview: previewHeight,
        detectedList: detectedListHeight,
      });
    };

    const rafUpdate = () => {
      requestAnimationFrame(updateDynamicHeights);
    };

    rafUpdate();
    window.addEventListener('resize', rafUpdate);
    window.visualViewport?.addEventListener('resize', rafUpdate);

    return () => {
      window.removeEventListener('resize', rafUpdate);
      window.visualViewport?.removeEventListener('resize', rafUpdate);
    };
  }, [previewUrl, showUsageTips, error]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('无法访问摄像头，请确保已授权摄像头权限');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const getVisibleVideoCrop = (videoEl: HTMLVideoElement) => {
    const sourceWidth = videoEl.videoWidth;
    const sourceHeight = videoEl.videoHeight;
    const displayWidth = videoEl.clientWidth;
    const displayHeight = videoEl.clientHeight;

    if (!sourceWidth || !sourceHeight || !displayWidth || !displayHeight) {
      return {
        sx: 0,
        sy: 0,
        sWidth: sourceWidth,
        sHeight: sourceHeight,
      };
    }

    const sourceRatio = sourceWidth / sourceHeight;
    const displayRatio = displayWidth / displayHeight;

    if (sourceRatio > displayRatio) {
      const sWidth = sourceHeight * displayRatio;
      const sx = (sourceWidth - sWidth) / 2;
      return { sx, sy: 0, sWidth, sHeight: sourceHeight };
    }

    const sHeight = sourceWidth / displayRatio;
    const sy = (sourceHeight - sHeight) / 2;
    return { sx: 0, sy, sWidth: sourceWidth, sHeight };
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const { sx, sy, sWidth, sHeight } = getVisibleVideoCrop(videoRef.current);
      const devicePixelRatio = window.devicePixelRatio || 1;
      const outputWidth = Math.max(1, Math.round(videoRef.current.clientWidth * devicePixelRatio));
      const outputHeight = Math.max(1, Math.round(videoRef.current.clientHeight * devicePixelRatio));
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          videoRef.current,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          outputWidth,
          outputHeight
        );
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreviewUrl(imageUrl);
        analyzeImage(imageUrl);
      }
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const data = await ingredientApi.scanImageBase64(imageBase64);
      setDetectedIngredients(data.map((item) => normalizeScannedIngredient(item)));
    } catch (err) {
      console.error('Analysis error:', err);
      setError('图像分析失败，请重试或使用其他照片');
      setDetectedIngredients([
        {
          name: '示例食材',
          category: 'vegetable',
          quantity: 1,
          unit: '个',
          expiry_date: toExpiryDateByDays(3),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScanner = () => {
    setPreviewUrl(null);
    setDetectedIngredients([]);
    setError(null);
  };

  const saveIngredients = async () => {
    const validIngredients = detectedIngredients
      .filter(ing => ing.name && ing.name.trim() !== '')
      .map((ing) => ({
        ...ing,
        expiry_date: ing.expiry_date
          ? (String(ing.expiry_date).includes('T')
            ? ing.expiry_date
            : `${ing.expiry_date}T23:59:59`)
          : undefined,
      }));
    
    if (validIngredients.length === 0) {
      setError('请至少添加一种食材名称');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const currentUserId = getUserId();
      const savedIngredients = await ingredientApi.addIngredientsBatch(
        validIngredients as Partial<Ingredient>[],
        currentUserId
      );
      
      if (savedIngredients.length > 0) {
        const mergedById = new Map(ingredients.map((item) => [item.id, item]));
        savedIngredients.forEach((item) => {
          mergedById.set(item.id, item);
        });
        setIngredients(Array.from(mergedById.values()));
        markRecipeCacheDirty();
        incrementScannedIngredients(savedIngredients.length);
        setShowRecipeRefreshDialog(true);
      } else {
        setError('保存失败，请重试');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('保存失败，请检查网络连接');
    } finally {
      setIsSaving(false);
    }
  };

  const removeDetectedIngredient = (index: number) => {
    setDetectedIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomIngredient = () => {
    setDetectedIngredients(prev => [
      ...prev,
      {
        name: '',
        category: 'other',
        quantity: 1,
        unit: '个',
        expiry_date: undefined,
      },
    ]);
  };

  const updateIngredient = (index: number, field: string, value: string | number) => {
    setDetectedIngredients(prev => prev.map((ing, i) => {
      if (i === index) {
        return { ...ing, [field]: value };
      }
      return ing;
    }));
  };

  const categoryColors: Record<string, string> = {
    vegetable: 'bg-green-100 text-green-700',
    meat: 'bg-red-100 text-red-700',
    seafood: 'bg-blue-100 text-blue-700',
    dairy: 'bg-yellow-100 text-yellow-700',
    egg: 'bg-orange-100 text-orange-700',
    grain: 'bg-amber-100 text-amber-700',
    fruit: 'bg-purple-100 text-purple-700',
    seasoning: 'bg-gray-100 text-gray-700',
    beverage: 'bg-cyan-100 text-cyan-700',
    other: 'bg-gray-100 text-gray-600',
  };

  const categoryOptions = [
    { value: 'vegetable', label: '蔬菜' },
    { value: 'meat', label: '肉类' },
    { value: 'seafood', label: '海鲜' },
    { value: 'dairy', label: '乳制品' },
    { value: 'egg', label: '蛋类' },
    { value: 'grain', label: '谷物' },
    { value: 'fruit', label: '水果' },
    { value: 'seasoning', label: '调料' },
    { value: 'beverage', label: '饮品' },
    { value: 'other', label: '其他' },
  ];

  return (
    <div
      ref={pageRef}
      className="animate-fade-in overflow-hidden overflow-x-hidden flex min-h-0 flex-col gap-4 md:gap-6"
      style={pageHeight ? { height: `${pageHeight}px` } : undefined}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div ref={contentRef} className="min-h-0 flex-1">
      {previewUrl ? (
        <div
          className="card overflow-hidden min-h-0"
          style={{ height: `${dynamicHeights.camera}px` }}
        >
          <div className="relative h-full bg-black">
            <img
              src={previewUrl}
              alt="Scanned"
              className="w-full h-full object-cover object-center"
            />

            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={resetScanner}
                className="w-10 h-10 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur hover:bg-black/70 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            
            {isAnalyzing && (
              <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white p-4">
                  <RefreshCw size={40} className="animate-spin mx-auto mb-3 md:mb-4" />
                  <p className="text-base md:text-lg font-medium">AI正在识别食材...</p>
                </div>
              </div>
            )}
            
            {isSaving && !isAnalyzing && (
              <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white p-4">
                  <RefreshCw size={40} className="animate-spin mx-auto mb-3 md:mb-4" />
                  <p className="text-base md:text-lg font-medium">正在将食材加入库存...</p>
                </div>
              </div>
            )}

              <div
                className={`fixed inset-x-3 bottom-20 md:bottom-6 md:left-auto md:right-6 md:w-[360px] ${
                  isAnalyzing || isSaving ? 'z-40' : 'z-20'
                }`}
              >
              <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur transition-all duration-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800">
                    识别结果 ({detectedIngredients.length} 种食材)
                  </h3>
                </div>

                {isSaving ? (
                  <div className="px-4 py-4 text-sm text-gray-600">
                    正在保存食材，已收起详细列表...
                  </div>
                ) : (
                  <>
                    <div
                      className="space-y-2 md:space-y-3 overflow-y-auto px-4 pt-3"
                      style={{ maxHeight: `${dynamicHeights.detectedList}px` }}
                    >
                      {detectedIngredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="w-full max-w-full flex flex-wrap items-center gap-1.5 md:gap-2 p-2 md:p-2.5 bg-gray-50 rounded-lg"
                        >
                          <select
                            value={ingredient.category || 'other'}
                            onChange={(e) => updateIngredient(index, 'category', e.target.value)}
                            className={`shrink-0 px-2 py-1 rounded-full text-[11px] md:text-xs font-medium border-none cursor-pointer ${categoryColors[ingredient.category || 'other']}`}
                          >
                            {categoryOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={ingredient.name || ''}
                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                            placeholder="食材名称"
                              className="flex-1 min-w-0 basis-[72px] px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs md:text-sm"
                          />

                          <input
                            type="number"
                            value={ingredient.quantity || 1}
                            onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 1)}
                            className="w-12 md:w-14 shrink-0 px-1.5 py-1.5 border border-gray-200 rounded-lg text-center text-xs md:text-sm"
                          />

                          <select
                            value={ingredient.unit || '个'}
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                            className="shrink-0 max-w-[66px] px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs md:text-sm"
                          >
                            <option value="个">个</option>
                            <option value="斤">斤</option>
                            <option value="克">克</option>
                            <option value="千克">千克</option>
                            <option value="毫升">毫升</option>
                            <option value="升">升</option>
                            <option value="把">把</option>
                            <option value="根">根</option>
                          </select>

                          <button
                            onClick={() => removeDetectedIngredient(index)}
                            className="shrink-0 p-1.5 md:p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>

                          <input
                            type="date"
                            value={ingredient.expiry_date ? new Date(ingredient.expiry_date).toISOString().split('T')[0] : ''}
                            onChange={(e) =>
                              updateIngredient(
                                index,
                                'expiry_date',
                                e.target.value ? `${e.target.value}T23:59:59` : '',
                              )
                            }
                            className="w-full md:w-[168px] px-2 py-1.5 border border-gray-200 rounded-lg text-xs md:text-sm"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 md:mt-4 flex space-x-2 md:space-x-3 px-4 pb-4">
                      <button
                        onClick={addCustomIngredient}
                        className="flex-1 btn-secondary flex items-center justify-center space-x-2"
                      >
                        <Plus size={18} />
                        <span>添加食材</span>
                      </button>
                      <button
                        onClick={saveIngredients}
                        disabled={detectedIngredients.length === 0}
                        className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check size={18} />
                        <span>保存到库存</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card overflow-hidden min-h-0"
          style={{ height: `${dynamicHeights.camera}px` }}
        >
          <div className="relative bg-black h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute top-4 left-4 right-4 pointer-events-none">
              <div className="rounded-xl bg-black/40 px-3 py-2 text-center text-xs text-white backdrop-blur-sm md:text-sm">
                将食材放在画面中间，点击下方按钮拍照
              </div>
            </div>

            <button
              onClick={capturePhoto}
              className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            >
              <div className="w-16 h-16 bg-primary-500 rounded-full border-4 border-white" />
            </button>
          </div>
        </div>
      )}
      </div>

      {!previewUrl && (
      <div className="fixed inset-x-3 bottom-20 z-40 md:bottom-6 md:left-auto md:right-6 md:w-[360px]">
        <div
          ref={tipsRef}
          className={`rounded-2xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur transition-all duration-300 ${
            showUsageTips ? 'max-h-[55vh]' : 'max-h-14'
          } overflow-hidden`}
        >
          <button
            onClick={() => setShowUsageTips((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3"
            aria-expanded={showUsageTips}
          >
            <h3 className="font-semibold text-gray-800">📋 使用提示</h3>
            {showUsageTips ? (
              <ChevronDown size={18} className="text-gray-500" />
            ) : (
              <ChevronUp size={18} className="text-gray-500" />
            )}
          </button>

          {showUsageTips && (
            <ul className="px-4 pb-4 space-y-2 text-gray-600 text-sm max-h-[40vh] overflow-y-auto">
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>拍照时保持光线充足，食材清晰可见</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>建议将冰箱门打开或食材取出后拍照</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>识别结果可以手动编辑和补充</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>定期更新库存，系统会用红黄绿标签提示保质期状态</span>
              </li>
            </ul>
          )}
        </div>
      </div>
      )}

      {showRecipeRefreshDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={32} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">食材已更改</h3>
              <p className="text-gray-600">
                您的食材库存已更新，是否要重新生成菜谱推荐？
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRecipeRefreshDialog(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                稍后再说
              </button>
              <button
                onClick={() => {
                  setShowRecipeRefreshDialog(false);
                  requestRecipeForceRefresh();
                  navigate('/cook?tab=recommendations');
                }}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                重新推荐
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
