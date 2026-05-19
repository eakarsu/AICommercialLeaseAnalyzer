import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/leases', label: 'Leases', icon: '📄' },
    { path: '/escalations', label: 'Escalations', icon: '📈' },
    { path: '/negotiations', label: 'Negotiations', icon: '🤝' },
    { path: '/portfolio', label: 'Portfolio', icon: '🏢' },
    { path: '/market-comps', label: 'Comps', icon: '📊' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    { path: '/calendar', label: 'Calendar', icon: '📅' },
    { path: '/alerts', label: 'Alerts', icon: '🔔' },
    { path: '/notifications', label: 'Notifications', icon: '📬' },
    { path: '/calculators', label: 'Calc', icon: '🧮' },
    { path: '/compare', label: 'Compare', icon: '⚖️' },
    { path: '/ai-lab', label: 'AI Lab', icon: '✨' },
    { path: '/custom-views', label: 'Lease Views', icon: '🧭' },
  ];

  return (
    <nav className="glass sticky top-0 z-50 border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-white font-bold text-lg hidden md:block">Lease Analyzer</span>
          </Link>
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname.startsWith(link.path)
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                }`}
              >
                <span className="mr-1">{link.icon}</span>
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-dark-400 text-sm hidden md:block">{user.name}</span>
            <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-sm font-medium text-dark-400 hover:text-white hover:bg-red-500/20 transition-all">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
