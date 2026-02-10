import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import ScannerPage from './pages/ScannerPage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import CookingPage from './pages/CookingPage';
import ProfilePage from './pages/ProfilePage';
import ShoppingPage from './pages/ShoppingPage';
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
          <Route path="/" element={<HomePage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/cooking/:recipeId" element={<CookingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
