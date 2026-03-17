import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import FoodPage from './pages/FoodPage';
import ScannerPage from './pages/ScannerPage';
import CookHubPage from './pages/CookHubPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import CookingPage from './pages/CookingPage';
import ProfilePage from './pages/ProfilePage';
import ShoppingPage from './pages/ShoppingPage';
import DesiredIngredientsPage from './pages/DesiredIngredientsPage';
import DesiredIngredientsHistoryPage from './pages/DesiredIngredientsHistoryPage';
import Layout from './components/Layout';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />

          <Route path="/food" element={<Navigate to="/food/inventory" replace />} />
          <Route path="/food/inventory" element={<FoodPage />} />
          <Route path="/food/shopping" element={<ShoppingPage />} />
          <Route path="/food/desired" element={<DesiredIngredientsPage />} />
          <Route path="/food/desired/history" element={<DesiredIngredientsHistoryPage />} />

          <Route path="/scan" element={<ScannerPage />} />

          <Route path="/cook" element={<CookHubPage />} />
          <Route path="/cook/recommendations" element={<Navigate to="/cook?tab=recommendations" replace />} />
          <Route
            path="/cook/recommendations/:id"
            element={<RecipeDetailPage />}
          />
          <Route path="/cook/session/:recipeId" element={<CookingPage />} />

          <Route path="/profile" element={<ProfilePage />} />

          {/* Legacy path redirects for compatibility while migrating links */}
          <Route path="/scanner" element={<Navigate to="/scan" replace />} />
          <Route path="/recipes" element={<Navigate to="/cook?tab=recommendations" replace />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/shopping" element={<Navigate to="/food/shopping" replace />} />
          <Route path="/cooking/:recipeId" element={<CookingPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
