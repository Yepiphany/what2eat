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
  Volume2,
  VolumeX,
  ChefHat,
  Timer,
  Sparkles,
  Home,
  RotateCcw
} from 'lucide-react';
import { cookingApi } from '../services/api';
import { useCookingStore, useUserStore } from '../stores';
import type { CookingSession, CookingStep } from '../types';

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
  const [stepTimer, setStepTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { currentSession, setSession: setGlobalSession, clearSession } = useCookingStore();
  const { currentUser } = useUserStore();

  useEffect(() => {
    if (recipeId && currentUser) {
      fetchOrCreateSession();
    }
    
    return () => {
      cleanup();
    };
  }, [recipeId, currentUser]);

  useEffect(() => {
    if (isListening && isVoiceEnabled) {
      startVoiceRecognition();
    } else {
      stopVoiceRecognition();
    }
  }, [isListening, isVoiceEnabled]);

  useEffect(() => {
    if (isTimerRunning && session?.steps[session.current_step]?.duration_seconds) {
      setStepTimer(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setStepTimer(prev => {
          const currentStep = session?.steps[session.current_step];
          if (currentStep?.duration_seconds && prev >= currentStep.duration_seconds) {
            setIsTimerRunning(false);
            return currentStep.duration_seconds;
          }
          return prev + 1;
        });
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
      if (currentSession && currentSession.recipe_id === recipeId) {
        setSession(currentSession);
        setElapsedTime(calculateElapsedTime(currentSession));
      } else {
        const newSession = await cookingApi.startSession(recipeId!, currentUser!.id);
        setSession(newSession);
        setGlobalSession(newSession);
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
      
      if (voiceCommands.some(cmd => command.includes(cmd.toLowerCase()))) {
        advanceStep();
      }
    };
    
    recognition.onerror = () => {
      setIsListening(false);
    };
    
    recognition.onend = () => {
      if (isListening) {
        recognition.start();
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

  const advanceStep = async () => {
    if (!session || !currentUser) return;
    
    try {
      const updatedSession = await cookingApi.advanceStep(
        session.id,
        currentUser.id,
        undefined,
        true
      );
      setSession(updatedSession);
      setGlobalSession(updatedSession);
      setStepTimer(0);
      setIsTimerRunning(false);
    } catch (error) {
      console.error('Failed to advance step:', error);
    }
  };

  const pauseCooking = async () => {
    if (!session || !currentUser) return;
    
    try {
      const updatedSession = await cookingApi.pauseSession(session.id, currentUser.id);
      setSession(updatedSession);
      setGlobalSession(updatedSession);
      setIsTimerRunning(false);
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const resumeCooking = async () => {
    if (!session || !currentUser) return;
    
    try {
      const updatedSession = await cookingApi.resumeSession(session.id, currentUser.id);
      setSession(updatedSession);
      setGlobalSession(updatedSession);
      setIsTimerRunning(true);
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  };

  const restartCooking = async () => {
    if (!session || !currentUser) return;
    
    try {
      const updatedSession = await cookingApi.completeSession(session.id, currentUser.id);
      clearSession();
      const newSession = await cookingApi.startSession(recipeId!, currentUser.id);
      setSession(newSession);
      setGlobalSession(newSession);
      setElapsedTime(0);
      setStepTimer(0);
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
        <Link to="/recipes" className="btn-primary">
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
          onClick={() => navigate('/recipes')}
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

            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                    {session.current_step + 1}
                  </span>
                  <span className="text-white/80">步骤 {session.current_step + 1}</span>
                </div>
                
                <p className="text-2xl font-medium leading-relaxed mb-4">
                  {currentStep?.instruction || '准备开始烹饪'}
                </p>

                {currentStep?.tips && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-4">
                    <p className="text-sm text-white/90">
                      💡 小贴士：{currentStep.tips}
                    </p>
                  </div>
                )}

                  {currentStep?.duration_seconds && (
                    <div className="mt-4 flex items-center space-x-2">
                      <Timer size={18} className="text-white/80" />
                      <span className="text-white/80">
                        建议时间：{Math.floor(currentStep.duration_seconds / 60)} 分钟
                      </span>
                    </div>
                  )}
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
                  className={`p-3 rounded-lg transition-all ${
                    index < session.current_step
                      ? 'bg-accent-50 border border-accent-200'
                      : index === session.current_step
                      ? 'bg-primary-50 border-2 border-primary-500'
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
              {session.status === 'in_progress' ? (
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
                        <span>继续</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={advanceStep}
                    className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                  >
                    <StepForward size={20} />
                    <span>{isLastStep ? '完成烹饪' : '下一步'}</span>
                  </button>
                </>
              ) : session.status === 'completed' ? (
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
                      onClick={() => navigate('/recipes')}
                      className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                    >
                      <Home size={20} />
                      <span>返回菜谱</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    resumeCooking();
                    speakStep(currentStep?.instruction || '开始烹饪');
                  }}
                  className="w-full btn-primary py-4 flex items-center justify-center space-x-2 text-lg"
                >
                  <Play size={24} />
                  <span>开始烹饪</span>
                </button>
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
                  <p>• 按照步骤顺序进行，不要跳过</p>
                  <p>• 使用语音控制可以解放双手</p>
                  <p>• 注意安全，使用厨具时小心烫伤</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
