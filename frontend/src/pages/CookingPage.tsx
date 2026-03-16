import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Mic,
  MicOff,
  Play,
  Pause,
  StepForward,
  Check,
  Clock,
  ChefHat,
  Timer,
  Home,
  RotateCcw
} from 'lucide-react';
import { cookingApi } from '../services/api';
import { useCookingStore } from '../stores';
import { getUserId } from '../utils/userId';
import type { CookingSession } from '../types';

const voiceCommands = [
  '下一步',
  '继续',
  '下一个',
  '好的',
  '知道了',
  '开始',
  '暂停',
  '继续'
];

export default function CookingPage() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<CookingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [stepTimer, setStepTimer] = useState<number | null>(null);
  const [isStepTimerActive, setIsStepTimerActive] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { currentSession, setSession: setGlobalSession, clearSession } = useCookingStore();

  useEffect(() => {
    if (recipeId) {
      fetchOrCreateSession();
    }
    
    return () => {
      cleanup();
    };
  }, [recipeId]);

  useEffect(() => {
    if (isListening && isVoiceEnabled) {
      startVoiceRecognition();
    } else {
      stopVoiceRecognition();
    }
  }, [isListening, isVoiceEnabled]);

  useEffect(() => {
    if (isTimerRunning && session?.steps[session.current_step]?.duration_seconds) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, session]);

  useEffect(() => {
    if (isStepTimerActive && stepTimer !== null && stepTimer > 0) {
      stepTimerRef.current = setInterval(() => {
        setStepTimer(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
      }
      if (stepTimer === 0) {
        setIsStepTimerActive(false);
        // 可以添加一个提示音或通知
        if ('speechSynthesis' in window && isVoiceEnabled) {
          speakStep('当前步骤时间到');
        }
      }
    }
    
    return () => {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
      }
    };
  }, [isStepTimerActive, stepTimer, isVoiceEnabled]);

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
    }
  };

  const fetchOrCreateSession = async () => {
    setIsLoading(true);
    try {
      let activeSession: CookingSession;
      if (currentSession && String(currentSession.recipe_id) === String(recipeId)) {
        activeSession = currentSession;
        setSession(currentSession);
        setElapsedTime(calculateElapsedTime(currentSession));
      } else {
        activeSession = await cookingApi.startSession(recipeId!, getUserId());
        setSession(activeSession);
        setGlobalSession(activeSession);
      }
      
      // 初始化当前步骤计时器
      const currentStepData = activeSession.steps[activeSession.current_step];
      if (currentStepData?.duration_seconds) {
        setStepTimer(currentStepData.duration_seconds);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateElapsedTime = (sess: CookingSession): number => {
    if (sess.started_at) {
      const start = new Date(sess.started_at);
      return Math.floor((Date.now() - start.getTime()) / 1000);
    }
    return 0;
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能');
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.trim().toLowerCase();
      
      console.log('[VOICE] 识别到命令:', command);
      
      if (voiceCommands.some(cmd => command.includes(cmd.toLowerCase()))) {
        advanceStep();
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('[VOICE] 识别错误:', event.error);
      if (event.error === 'not-allowed') {
        alert('请开启麦克风权限以使用语音控制');
        setIsVoiceEnabled(false);
      }
      setIsListening(false);
    };
    
    recognition.onend = () => {
      if (isListening && isVoiceEnabled) {
        try {
          recognition.start();
        } catch (e) {
          console.error('[VOICE] 重新启动失败:', e);
        }
      }
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const advanceStep = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // 防止冒泡
    if (!session) return;
    
    const isLast = session.current_step >= session.steps.length - 1;

    // 乐观更新：立即在本地跳转到下一步，提升响应速度
    if (!isLast) {
      const nextIdx = session.current_step + 1;
      const nextStep = session.steps[nextIdx];
      
      const optimisticSession = { ...session, current_step: nextIdx };
      setSession(optimisticSession);
      setGlobalSession(optimisticSession);
      
      if (nextStep?.duration_seconds) {
        setStepTimer(nextStep.duration_seconds);
        setIsStepTimerActive(isTimerRunning);
      } else {
        setStepTimer(null);
        setIsStepTimerActive(false);
      }

      if (isVoiceEnabled) {
        speakStep(`下一步：${nextStep?.instruction || ''}`);
      }
    }

    try {
      if (!isLast) {
        const updatedSession = await cookingApi.advanceStep(
          session.id,
          getUserId(),
          undefined,
          true
        );
        // 后端返回后更新最终状态（以防万一有细微差异）
        setSession(updatedSession);
        setGlobalSession(updatedSession);
      } else {
        // 最后一步，显示完成确认对话框
        setShowCompletionDialog(true);
        setIsTimerRunning(false);
        setIsStepTimerActive(false);
        speakStep('太棒了，您已完成所有烹饪步骤！');
      }
    } catch (error) {
      console.error('Failed to advance step:', error);
      // 如果报错，本地已经跳转了，不需要处理，除非需要回滚（通常不建议，会闪烁）
    }
  };

  const goToStep = async (stepIndex: number) => {
    if (!session || stepIndex === session.current_step) return;
    
    // 更新本地状态以支持自由跳转
    const updatedSession = { ...session, current_step: stepIndex };
    setSession(updatedSession);
    setGlobalSession(updatedSession);
    
    const step = updatedSession.steps[stepIndex];
    if (step?.duration_seconds) {
      setStepTimer(step.duration_seconds);
      setIsStepTimerActive(true); // 跳转后自动开启计时器
    } else {
      setStepTimer(null);
      setIsStepTimerActive(false);
    }

    // 自动语音播报跳转后的步骤
    if (isVoiceEnabled) {
      speakStep(`跳转到第${stepIndex + 1}步：${step?.instruction || ''}`);
    }
  };

  const pauseCooking = async () => {
    if (!session) return;
    
    // 乐观更新：立即停止本地计时器，消除延迟感
    setIsTimerRunning(false);
    setIsStepTimerActive(false);

    try {
      const updatedSession = await cookingApi.pauseSession(session.id, getUserId());
      setSession(updatedSession);
      setGlobalSession(updatedSession);
    } catch (error) {
      console.error('Failed to pause:', error);
      // 后端失败时，本地已经停了，不需要回滚状态，保证用户体验
    }
  };

  const resumeCooking = async () => {
    if (!session) return;
    
    // 乐观更新：立即开始本地计时器
    setIsTimerRunning(true);
    if (stepTimer !== null && stepTimer > 0) {
      setIsStepTimerActive(true);
    }

    try {
      const updatedSession = await cookingApi.resumeSession(session.id, getUserId());
      setSession(updatedSession);
      setGlobalSession(updatedSession);
    } catch (error) {
      console.error('Failed to resume:', error);
      // 后端失败时，保持本地运行状态
    }
  };

  const restartCooking = async () => {
    if (!session) return;
    
    try {
      await cookingApi.completeSession(session.id, getUserId());
      clearSession();
      const newSession = await cookingApi.startSession(recipeId!, getUserId());
      setSession(newSession);
      setGlobalSession(newSession);
      setElapsedTime(0);
      setIsTimerRunning(false);
    } catch (error) {
      console.error('Failed to restart:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speakStep = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCompleteCooking = async () => {
    if (!session) return;
    try {
      await cookingApi.completeSession(session.id, getUserId());
      const updatedSession = { ...session, status: 'completed' as const };
      setSession(updatedSession);
      setGlobalSession(updatedSession);
      setShowCompletionDialog(false);
      navigate('/cook/recommendations');
    } catch (error) {
      console.error('Failed to complete cooking:', error);
      navigate('/cook/recommendations');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">无法加载烹饪会话</h2>
        <Link to="/cook/recommendations" className="btn-primary">
          返回菜谱
        </Link>
      </div>
    );
  }

  const currentStep = session.steps[session.current_step];
  const isLastStep = session.current_step >= session.steps.length - 1;
  const progress = ((session.current_step + 1) / session.steps.length) * 100;

  return (
    <div className="animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/cook/recommendations')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft size={20} />
          <span>退出烹饪</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
            <Clock size={18} className="text-primary-600" />
            <span className="font-mono font-medium">{formatTime(elapsedTime)}</span>
          </div>
          
          <button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              isVoiceEnabled ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
            title="语音控制"
          >
            {isVoiceEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{session.recipe_title}</h1>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>烹饪进度</span>
                <span>第 {session.current_step + 1} / {session.steps.length} 步</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div 
              onClick={(e) => advanceStep(e)}
              className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
                      {session.current_step + 1}
                    </span>
                    <span className="text-white/80 font-medium">步骤 {session.current_step + 1}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {stepTimer !== null && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20"
                      >
                        <Timer size={18} className={isStepTimerActive ? 'animate-pulse text-accent-400' : 'text-white/80'} />
                        <span className="font-mono text-xl font-bold tracking-wider">
                          {formatTime(stepTimer)}
                        </span>
                      </div>
                    )}
                    {/* 已删除“点击进入下一步”引导 */}
                  </div>
                </div>
                
                <p className="text-2xl md:text-3xl font-medium leading-relaxed mb-8 min-h-[100px]">
                  {currentStep?.instruction || '准备开始烹饪'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {currentStep?.tips && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex items-start space-x-2">
                        <span className="text-lg">💡</span>
                        <p className="text-sm text-white/90 leading-relaxed">
                          {currentStep.tips}
                        </p>
                      </div>
                    </div>
                  )}

                  {currentStep?.duration_seconds && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Timer size={18} className="text-white/80" />
                        <span className="text-sm text-white/80">
                          建议时间：{Math.floor(currentStep.duration_seconds / 60)} 分钟
                        </span>
                      </div>
                      {/* 已删除建议时间旁的暂停按钮 */}
                    </div>
                  )}
                </div>

                {/* 移动端快捷下一步按钮 */}
                <div className="mt-8 lg:hidden">
                  <button
                    onClick={(e) => advanceStep(e)}
                    className="w-full py-4 bg-white text-primary-600 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
                  >
                    <StepForward size={22} />
                    <span>{isLastStep ? '完成烹饪' : '下一步'}</span>
                  </button>
                </div>
              </div>
            </div>

            {isVoiceEnabled && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Mic size={16} className={isListening ? 'text-red-500 animate-pulse' : 'text-gray-400'} />
                <span>
                  {isListening ? '正在监听..."下一步"、"继续"...' : '点击下方按钮开启语音控制'}
                </span>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">语音指令</h3>
            <div className="flex flex-wrap gap-2">
              {voiceCommands.slice(0, 6).map(cmd => (
                <span
                  key={cmd}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm"
                >
                  {cmd}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="card p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">步骤列表</h3>
              <span className="text-sm text-gray-500">
                {session.current_step + 1}/{session.steps.length}
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {session.steps.map((step, index) => (
                <div
                  key={step.step_number}
                  onClick={() => goToStep(index)}
                  className={`p-3 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                    index < session.current_step
                      ? 'bg-accent-50 border border-accent-200 opacity-80'
                      : index === session.current_step
                      ? 'bg-primary-50 border-2 border-primary-500 ring-2 ring-primary-100'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      index < session.current_step
                        ? 'bg-accent-500 text-white'
                        : index === session.current_step
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index < session.current_step ? (
                        <Check size={16} />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      index < session.current_step
                        ? 'text-gray-400 line-through'
                        : index === session.current_step
                        ? 'text-gray-800 font-medium'
                        : 'text-gray-500'
                    }`}>
                      {step.instruction}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {session.status !== 'completed' ? (
                <>
                  <button
                    onClick={isTimerRunning ? pauseCooking : resumeCooking}
                    className="w-full btn-secondary py-3 flex items-center justify-center space-x-2"
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause size={20} />
                        <span>暂停</span>
                      </>
                    ) : (
                      <>
                        <Play size={20} />
                        <span>开始/继续</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => advanceStep(e)}
                    className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                  >
                    <StepForward size={20} />
                    <span>{isLastStep ? '完成烹饪' : '下一步'}</span>
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">烹饪完成！🎉</h3>
                  <p className="text-gray-500 mb-4">总耗时：{formatTime(elapsedTime)}</p>
                  <div className="space-y-2">
                    <button
                      onClick={restartCooking}
                      className="w-full btn-secondary py-3 flex items-center justify-center space-x-2"
                    >
                      <RotateCcw size={20} />
                      <span>重新烹饪</span>
                    </button>
                    <button
                      onClick={() => navigate('/cook/recommendations')}
                      className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                    >
                      <Home size={20} />
                      <span>返回菜谱</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => setShowTips(!showTips)}
                className="w-full flex items-center justify-between text-sm text-gray-600"
              >
                <span className="flex items-center space-x-2">
                  <ChefHat size={16} />
                  <span>烹饪技巧</span>
                </span>
                <span>{showTips ? '收起' : '展开'}</span>
              </button>
              
              {showTips && (
                <div className="mt-4 space-y-2 text-sm text-gray-500 animate-slide-up">
                  <p>• 烹饪前准备好所有食材和调料</p>
                  <p>• 使用语音控制可以解放双手</p>
                  <p>• 注意安全，使用厨具时小心烫伤</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 完成烹饪对话框 */}
      {showCompletionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h2>
            <p className="text-gray-600 mb-8">您已完成所有烹饪步骤。现在要返回菜谱列表吗？</p>
            
            <div className="space-y-3">
              <button
                onClick={handleCompleteCooking}
                className="w-full btn-primary py-3 font-bold text-lg"
              >
                返回菜谱页
              </button>
              <button
                onClick={() => setShowCompletionDialog(false)}
                className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
              >
                留在本页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
