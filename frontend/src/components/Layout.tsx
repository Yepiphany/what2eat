import { Link, useLocation } from 'react-router-dom';
import { Home, Scan, Utensils, User } from 'lucide-react';
import { useAppStore } from '../stores';

const navItems = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/scanner', icon: Scan, label: '扫描' },
  { path: '/recipes', icon: Utensils, label: '菜谱' },
  { path: '/profile', icon: User, label: '我的' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { activeView, setActiveView } = useAppStore();

  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/scanner') return 'scanner';
    if (path.startsWith('/recipes') && !path.includes('/cooking')) return 'recipes';
    if (path.startsWith('/cooking')) return 'cooking';
    if (path === '/profile') return 'profile';
    return 'home';
  };

  const currentView = getActiveView();
  const isCookingMode = currentView === 'cooking';

  if (isCookingMode) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🍳</span>
              <span className="text-xl font-bold text-primary-600">今天吃什么</span>
            </Link>
            
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-4 transition-all duration-200 ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-primary-600'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
