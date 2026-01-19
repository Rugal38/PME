import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Depenses from './pages/Depenses';
import Centres from './pages/Centres';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import Responsables from './pages/Responsables';
import Budgets from './pages/Budgets';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider, AuthContext } from './context/AuthContext';
import './App.css';

// A layout for authenticated users
const AppLayout = () => (
  <div className="app-container">
    <Sidebar />
    <main className="main-content">
      <Outlet /> 
    </main>
  </div>
);

const AppRoutes = () => {
  const { user } = useContext(AuthContext);
  return (
      <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/depenses" element={<Depenses />} />
              <Route path="/centres" element={<Centres />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/budgets" element={<Budgets />} /> 
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              } />
              <Route path="/responsables" element={
                <AdminRoute>
                  <Responsables />
                </AdminRoute>
              } />
          </Route>
      </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
