import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leases from './pages/Leases';
import Escalations from './pages/Escalations';
import Negotiations from './pages/Negotiations';
import Portfolio from './pages/Portfolio';
import MarketComps from './pages/MarketComps';
import Reports from './pages/Reports';
import LeaseCalendar from './pages/LeaseCalendar';
import Calculators from './pages/Calculators';
import LeaseComparison from './pages/LeaseComparison';
import AILab from './pages/AILab';
import Alerts from './pages/Alerts';
import Notifications from './pages/Notifications';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/leases" element={<PrivateRoute><Leases /></PrivateRoute>} />
        <Route path="/escalations" element={<PrivateRoute><Escalations /></PrivateRoute>} />
        <Route path="/negotiations" element={<PrivateRoute><Negotiations /></PrivateRoute>} />
        <Route path="/portfolio" element={<PrivateRoute><Portfolio /></PrivateRoute>} />
        <Route path="/market-comps" element={<PrivateRoute><MarketComps /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/calendar" element={<PrivateRoute><LeaseCalendar /></PrivateRoute>} />
        <Route path="/calculators" element={<PrivateRoute><Calculators /></PrivateRoute>} />
        <Route path="/compare" element={<PrivateRoute><LeaseComparison /></PrivateRoute>} />
        <Route path="/ai-lab" element={<PrivateRoute><AILab /></PrivateRoute>} />
        <Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
