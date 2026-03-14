import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertTriangle, Plus, List, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIngredientsStore, useRecipesStore } from '../stores';
import { ingredientApi } from '../services/api';
import type { Ingredient } from '../types';
import { incrementScannedIngredients } from './ProfilePage';
import { getUserId } from '../utils/userId';

export default function ScannerPage() {
  const navigate = useNavigate();
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const [viewMode, setViewMode] = useState<'scan' | 'inventory'>('scan');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [detectedIngredients, setDetectedIngredients] = useState<Partial<Ingredient>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: 1, unit: '个', category: 'other' });
  const [isAdding, setIsAdding] = useState(false);
  const [showRecipeRefreshDialog, setShowRecipeRefreshDialog] = useState(false);
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);
  const [showUsageTips, setShowUsageTips] = useState(false);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [dynamicHeights, setDynamicHeights] = useState({
    camera: 480,
    preview: 340,
    inventoryList: 300,
    detectedList: 260,
  });
  
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tipsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ingredients, addIngredient, setIngredients, removeIngredient, clearIngredients } = useIngredientsStore();
  const { clearRecommendations } = useRecipesStore();

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'inventory') {
      loadAllIngredients();
    }
  }, [viewMode]);

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
      const isScanView = viewMode === 'scan';
      const tipsHeight = isScanView
        ? (previewUrl ? 52 : (tipsRef.current?.offsetHeight ?? (showUsageTips ? 180 : 52)))
        : 0;
      const drawerBottomOffset = isScanView ? (isMobile ? 80 : 24) : 0;
      const drawerReserve = isScanView ? tipsHeight + drawerBottomOffset + 12 : 0;

      const availablePageHeight = clamp(Math.floor(viewportHeight - pageTop - 8), 420, 1400);
      setPageHeight(availablePageHeight);

      const spaceForMainCard = clamp(
        Math.floor(viewportHeight - contentTop - drawerReserve),
        220,
        900
      );

      const previewHeight = clamp(Math.floor(spaceForMainCard * 0.52), 240, 500);
      const inventoryListHeight = clamp(
        spaceForMainCard - (showAddForm ? 250 : 150),
        160,
        560
      );
      const detectedListHeight = clamp(
        spaceForMainCard - previewHeight - 180,
        140,
        360
      );

      setDynamicHeights({
        camera: spaceForMainCard,
        preview: previewHeight,
        inventoryList: inventoryListHeight,
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
  }, [viewMode, previewUrl, showAddForm, showUsageTips, error]);

  const loadAllIngredients = async () => {
    try {
      const data = await ingredientApi.getIngredients(getUserId());
      setIngredients(data);
    } catch (err) {
      console.error('Failed to load ingredients:', err);
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    if (!confirm('确定要删除这个食材吗？')) {
      return;
    }
    try {
      await ingredientApi.deleteIngredient(ingredientId, getUserId());
      removeIngredient(ingredientId);
      setShowRecipeRefreshDialog(true);
    } catch (err) {
      console.error('Failed to delete ingredient:', err);
    }
  };

  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim()) return;
    
    setIsAdding(true);
    try {
      const saved = await ingredientApi.addIngredient(newIngredient as Partial<Ingredient>, getUserId());
      addIngredient(saved);
      setNewIngredient({ name: '', quantity: 1, unit: '个', category: 'other' });
      setShowAddForm(false);
      console.log('[DEBUG] 设置对话框为 true');
      setShowRecipeRefreshDialog(true);
      console.log('[DEBUG] 对话框状态已设置');
    } catch (err) {
      console.error('Failed to add ingredient:', err);
    } finally {
      setIsAdding(false);
    }
  };

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
      setDetectedIngredients(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('图像分析失败，请重试或使用其他照片');
      setDetectedIngredients([
        {
          name: '示例食材',
          category: 'vegetable',
          quantity: 1,
          unit: '个',
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
    const validIngredients = detectedIngredients.filter(ing => ing.name && ing.name.trim() !== '');
    
    if (validIngredients.length === 0) {
      setError('请至少添加一种食材名称');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const savedIngredients = [];
      const currentUserId = getUserId();
      
      for (const ingredient of validIngredients) {
        try {
          const saved = await ingredientApi.addIngredient(ingredient as Partial<Ingredient>, currentUserId);
          savedIngredients.push(saved);
        } catch (err) {
          console.error('Failed to save ingredient:', ingredient.name, err);
        }
      }
      
      if (savedIngredients.length > 0) {
        const allIngredients = await ingredientApi.getIngredients(currentUserId);
        setIngredients(allIngredients);
        incrementScannedIngredients(savedIngredients.length);
        setShowRecipeRefreshDialog(true);
        setTimeout(() => resetScanner(), 100);
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
      {viewMode === 'inventory' && (
        <header className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">📦 我的食材库存</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 px-4">管理您的食材库存</p>
        </header>
      )}

      <div className="flex flex-wrap justify-center gap-3 px-4">
        {viewMode === 'inventory' ? (
          <button
            onClick={() => { setViewMode('scan'); resetScanner(); }}
            className="flex items-center space-x-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base font-medium bg-primary-500 text-white shadow-lg"
          >
            <Camera size={18} />
            <span>返回扫描</span>
          </button>
        ) : (
          <>
            <button
              className="flex items-center space-x-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base font-medium bg-primary-500 text-white shadow-lg"
            >
              <Camera size={18} />
              <span>拍照识别</span>
            </button>
            <button
              onClick={() => setViewMode('inventory')}
              className="flex items-center space-x-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base font-medium bg-accent-500 text-white shadow-lg"
            >
              <List size={18} />
              <span>查看库存</span>
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div ref={contentRef} className="min-h-0 flex-1">
      {viewMode === 'inventory' ? (
        <div className="card p-4 md:p-6 min-h-0 h-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-3 md:space-y-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-800">
              全部食材 ({ingredients.length} 种)
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowClearConfirmDialog(true)}
                disabled={ingredients.length === 0}
                className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                <Trash2 size={16} />
                <span>清空</span>
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm md:text-base"
              >
                <Plus size={18} />
                <span>手动添加</span>
              </button>
            </div>
          </div>

          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">食材名称</label>
                  <input
                    type="text"
                    value={newIngredient.name}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="输入食材名称"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm text-gray-600 mb-1">数量</label>
                  <input
                    type="number"
                    value={newIngredient.quantity}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm text-gray-600 mb-1">单位</label>
                  <select
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
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
                </div>
                <div className="w-28">
                  <label className="block text-sm text-gray-600 mb-1">分类</label>
                  <select
                    value={newIngredient.category}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="vegetable">蔬菜</option>
                    <option value="meat">肉类</option>
                    <option value="seafood">海鲜</option>
                    <option value="dairy">奶制品</option>
                    <option value="egg">蛋类</option>
                    <option value="grain">谷物</option>
                    <option value="fruit">水果</option>
                    <option value="seasoning">调味品</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                  <button
                    onClick={handleAddIngredient}
                    disabled={isAdding || !newIngredient.name.trim()}
                    className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {ingredients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <List size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无食材</p>
              <p className="text-sm mt-2">请扫描添加食材到库存</p>
            </div>
          ) : (
            <div
              className="space-y-3 overflow-y-auto"
              style={{ maxHeight: `${dynamicHeights.inventoryList}px` }}
            >
              {ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors[ing.category || 'other']}`}>
                      {ing.category || '未知'}
                    </div>
                    <div>
                      <div className="text-sm md:text-base font-medium text-gray-800">{ing.name}</div>
                      <div className="text-[10px] md:text-sm text-gray-500">
                        {ing.quantity}{ing.unit} · {ing.expiry_date ? `保质期至 ${new Date(ing.expiry_date).toLocaleDateString()}` : '无保质期'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteIngredient(ing.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : previewUrl ? (
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
                <X size={20} />
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

                <div
                  className="space-y-2 md:space-y-3 overflow-y-auto px-4 pt-3"
                  style={{ maxHeight: `${dynamicHeights.detectedList}px` }}
                >
                  {detectedIngredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 md:space-x-3 p-2.5 md:p-3 bg-gray-50 rounded-lg"
                    >
                      <select
                        value={ingredient.category || 'other'}
                        onChange={(e) => updateIngredient(index, 'category', e.target.value)}
                        className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium border-none cursor-pointer ${categoryColors[ingredient.category || 'other']}`}
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
                        className="flex-1 px-2 md:px-3 py-1.5 md:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />

                      <input
                        type="number"
                        value={ingredient.quantity || 1}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-14 md:w-16 px-2 py-1.5 md:py-2 border border-gray-200 rounded-lg text-center text-sm"
                      />

                      <select
                        value={ingredient.unit || '个'}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        className="px-2 py-1.5 md:py-2 border border-gray-200 rounded-lg text-sm"
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
                        className="p-1.5 md:p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
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

      {viewMode === 'scan' && !previewUrl && (
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
                <span>定期更新库存，系统会提醒即将过期的食材</span>
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
                  sessionStorage.setItem('forceRefreshRecipes', 'true');
                  navigate('/recipes');
                }}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                重新推荐
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">清空食材</h3>
              <p className="text-gray-600">
                确定要清空所有食材及菜谱推荐吗？此操作不可恢复。
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearConfirmDialog(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowClearConfirmDialog(false);
                  clearIngredients();
                  clearRecommendations();
                }}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                确定清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
