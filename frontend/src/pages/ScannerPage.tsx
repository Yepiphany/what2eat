import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, Check, AlertTriangle, Plus, List, Trash2 } from 'lucide-react';
import { useIngredientsStore, useRecipesStore } from '../stores';
import { ingredientApi } from '../services/api';
import type { Ingredient } from '../types';
import { incrementScannedIngredients } from './ProfilePage';
import { getUserId } from '../utils/userId';

export default function ScannerPage() {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [viewMode, setViewMode] = useState<'scan' | 'inventory'>('scan');
  const [isScanning, setIsScanning] = useState(false);
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { ingredients, addIngredient, setIngredients, removeIngredient, clearIngredients } = useIngredientsStore();
  const { clearRecommendations } = useRecipesStore();

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [mode]);

  useEffect(() => {
    if (viewMode === 'inventory') {
      loadAllIngredients();
    }
  }, [viewMode]);

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
      setError('无法访问摄像头，请确保已授权摄像头权限或使用上传模式');
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreviewUrl(imageUrl);
        setIsScanning(true);
        analyzeImage(imageUrl);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setPreviewUrl(imageUrl);
        setIsScanning(true);
        analyzeImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const base64Data = imageBase64.split(',')[1];
      const response = await fetch('http://localhost:8000/api/v1/ingredients/scan-base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data }),
      });
      
      if (!response.ok) {
        throw new Error('分析失败，请重试');
      }
      
      const data = await response.json();
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
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setPreviewUrl(null);
    setDetectedIngredients([]);
    setIsScanning(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const categoryLabels: Record<string, string> = {
    vegetable: '蔬菜',
    meat: '肉类',
    seafood: '海鲜',
    dairy: '乳制品',
    egg: '蛋类',
    grain: '谷物',
    fruit: '水果',
    seasoning: '调料',
    beverage: '饮品',
    other: '其他',
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
    <div className="space-y-6 animate-fade-in">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          {viewMode === 'inventory' ? '📦 我的食材库存' : '📸 扫一扫冰箱'}
        </h1>
        <p className="text-gray-500 mt-2">
          {viewMode === 'inventory' ? '管理您的食材库存' : 'AI智能识别食材，管理你的饮食库存'}
        </p>
      </header>

      <div className="flex justify-center space-x-4">
        {viewMode === 'inventory' ? (
          <button
            onClick={() => { setViewMode('scan'); resetScanner(); }}
            className="flex items-center space-x-2 px-6 py-3 rounded-full font-medium bg-primary-500 text-white shadow-lg"
          >
            <Camera size={20} />
            <span>返回扫描</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all ${
                mode === 'camera'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Camera size={20} />
              <span>拍照识别</span>
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all ${
                mode === 'upload'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Upload size={20} />
              <span>上传照片</span>
            </button>
            <button
              onClick={() => setViewMode('inventory')}
              className="flex items-center space-x-2 px-6 py-3 rounded-full font-medium bg-accent-500 text-white shadow-lg"
            >
              <List size={20} />
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

      {viewMode === 'inventory' ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              全部食材 ({ingredients.length} 种)
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowClearConfirmDialog(true)}
                disabled={ingredients.length === 0}
                className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                <span>清空</span>
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
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
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
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
                      <div className="font-medium text-gray-800">{ing.name}</div>
                      <div className="text-sm text-gray-500">
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
        <div className="card overflow-hidden">
          <div className="relative">
            <img
              src={previewUrl}
              alt="Scanned"
              className="w-full h-64 object-cover"
            />
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <RefreshCw size={48} className="animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">AI正在识别食材...</p>
                </div>
              </div>
            )}
            
            {isSaving && !isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <RefreshCw size={48} className="animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">正在将食材加入库存...</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                识别结果 ({detectedIngredients.length} 种食材)
              </h3>
              <button
                onClick={resetScanner}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {detectedIngredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <select
                    value={ingredient.category || 'other'}
                    onChange={(e) => updateIngredient(index, 'category', e.target.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-none cursor-pointer ${categoryColors[ingredient.category || 'other']}`}
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
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  
                  <input
                    type="number"
                    value={ingredient.quantity || 1}
                    onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 1)}
                    className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-center"
                  />
                  
                  <select
                    value={ingredient.unit || '个'}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="px-2 py-2 border border-gray-200 rounded-lg"
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
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={addCustomIngredient}
                className="flex-1 btn-secondary flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>添加食材</span>
              </button>
              <button
                onClick={saveIngredients}
                disabled={detectedIngredients.length === 0}
                className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={20} />
                <span>保存到库存</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {mode === 'camera' ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-96 object-cover"
              />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-white/80 rounded-lg">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
                  <div className="absolute -top-2 right-1/2 transform translate-x-1/2 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
                  <div className="absolute -bottom-2 right-1/2 transform translate-x-1/2 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />
                </div>
              </div>

              <button
                onClick={capturePhoto}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
              >
                <div className="w-16 h-16 bg-primary-500 rounded-full border-4 border-white" />
              </button>
            </div>
          ) : (
            <div className="p-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary-500 transition-colors cursor-pointer"
              >
                <Upload size={64} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  点击上传照片
                </p>
                <p className="text-gray-500 text-sm">
                  支持 JPG、PNG 格式，建议照片清晰、光线充足
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold text-gray-800 mb-3">📋 使用提示</h3>
        <ul className="space-y-2 text-gray-600 text-sm">
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
      </div>

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
                  window.location.href = '/recipes';
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
