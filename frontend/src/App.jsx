import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Preview from './pages/Preview';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen font-sans selection:bg-primary/30">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/preview/:id" element={<Preview />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
