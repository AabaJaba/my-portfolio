// /src/routing/AppRoutes.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage.jsx';
import AboutPage from './pages/AboutPage/AboutPage.jsx';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  );
};

export default AppRoutes;