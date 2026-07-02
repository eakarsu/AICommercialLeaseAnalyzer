import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaBalanceScale,
  FaBars,
  FaBell,
  FaBuilding,
  FaCalculator,
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaClipboardCheck,
  FaClipboardList,
  FaCompass,
  FaEnvelope,
  FaFileAlt,
  FaHandshake,
  FaHome,
  FaLayerGroup,
  FaMagic,
  FaSignOutAlt,
  FaTimes
} from 'react-icons/fa';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navSections = [
    {
      label: 'Overview',
      links: [
        { path: '/dashboard', label: 'Dashboard', icon: FaHome },
        { path: '/custom-views', label: 'Lease Views', icon: FaCompass }
      ]
    },
    {
      label: 'Lease Workspace',
      links: [
        { path: '/leases', label: 'Leases', icon: FaFileAlt },
        { path: '/portfolio', label: 'Portfolio', icon: FaBuilding },
        { path: '/market-comps', label: 'Market Comps', icon: FaChartBar },
        { path: '/compare', label: 'Lease Compare', icon: FaBalanceScale }
      ]
    },
    {
      label: 'Actions',
      links: [
        { path: '/escalations', label: 'Escalations', icon: FaChartLine },
        { path: '/negotiations', label: 'Negotiations', icon: FaHandshake },
        { path: '/calendar', label: 'Calendar', icon: FaCalendarAlt },
        { path: '/co-tenancy-clause-watch', label: 'Co-Tenancy Watch', icon: FaLayerGroup }
      ]
    },
    {
      label: 'AI & Outputs',
      links: [
        { path: '/ai-lab', label: 'AI Lab', icon: FaMagic },
        { path: '/reports', label: 'Reports', icon: FaClipboardList },
        { path: '/calculators', label: 'Calculators', icon: FaCalculator },
        { path: '/alerts', label: 'Alerts', icon: FaBell },
        { path: '/notifications', label: 'Notifications', icon: FaEnvelope },
        { path: '/audit-trail', label: 'Audit Trail', icon: FaClipboardCheck }
      ]
    }
  ];

  const flatLinks = navSections.flatMap((section) => section.links);
  const activeLink = flatLinks.find((link) => (
    link.path === '/dashboard'
      ? location.pathname === link.path
      : location.pathname.startsWith(link.path)
  ));

  const handleNavigate = () => setMobileOpen(false);

  const renderNavLink = (link) => {
    const Icon = link.icon;
    const active = link.path === '/dashboard'
      ? location.pathname === link.path
      : location.pathname.startsWith(link.path);

    return (
      <Link
        key={link.path}
        to={link.path}
        onClick={handleNavigate}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          active
            ? 'bg-primary-600/20 text-primary-300 shadow-inner shadow-primary-950/40'
            : 'text-dark-300 hover:bg-dark-800/80 hover:text-white'
        }`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          active
            ? 'bg-primary-500 text-white'
            : 'bg-dark-800 text-dark-400 group-hover:bg-dark-700 group-hover:text-white'
        }`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate">{link.label}</span>
      </Link>
    );
  };

  return (
    <div className="lease-sidebar-shell">
      <style>{`
        .lease-sidebar-shell ~ div {
          padding-top: 5.5rem !important;
        }

        @media (min-width: 1024px) {
          .lease-sidebar-shell ~ div {
            box-sizing: border-box;
            margin-left: 18rem !important;
            margin-right: 0 !important;
            max-width: none !important;
            min-height: 100vh;
            padding-left: 2rem !important;
            padding-right: 2rem !important;
            padding-top: 6rem !important;
            width: calc(100% - 18rem) !important;
          }
        }
      `}</style>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-dark-950/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-dark-700/70 bg-dark-950/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-20 items-center justify-between border-b border-dark-800 px-5">
          <Link to="/dashboard" onClick={handleNavigate} className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 shadow-lg shadow-primary-950/40">
              <span className="text-lg font-black text-white">A</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-white">Lease Analyzer</div>
              <div className="truncate text-xs font-medium text-dark-400">Commercial AI Suite</div>
            </div>
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-dark-400 transition hover:bg-dark-800 hover:text-white lg:hidden"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {navSections.map((section) => (
            <div key={section.label} className="mb-6">
              <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-dark-500">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.links.map(renderNavLink)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dark-800 p-4">
          <div className="mb-3 rounded-xl bg-dark-900/80 p-3">
            <div className="truncate text-sm font-semibold text-white">{user.name || 'User'}</div>
            <div className="truncate text-xs text-dark-400">{user.email || 'Signed in'}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/15 hover:text-red-200"
          >
            <FaSignOutAlt className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-dark-800/80 bg-dark-950/90 backdrop-blur-xl lg:left-72">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-dark-700 p-2 text-dark-300 transition hover:bg-dark-800 hover:text-white lg:hidden"
            >
              <FaBars className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-dark-400">AI Commercial Lease Analyzer</div>
              <h1 className="truncate text-lg font-bold text-white">{activeLink?.label || 'Workspace'}</h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="max-w-48 truncate text-sm text-dark-400">{user.name || 'User'}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-dark-400 transition-all hover:bg-red-500/15 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Navbar;
