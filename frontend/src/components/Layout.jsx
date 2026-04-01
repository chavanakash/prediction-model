import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, Upload, Menu, X, Activity } from 'lucide-react';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload Data', icon: Upload },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <div className="brand-icon">
              <TrendingUp size={20} />
            </div>
            <span className="brand-text">TrendCast</span>
            <span className="brand-badge">AI</span>
          </Link>

          <div className="navbar-links">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link ${location.pathname === path ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="navbar-right">
            <div className="status-indicator">
              <Activity size={14} />
              <span>Live</span>
            </div>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mobile-menu">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`mobile-nav-link ${location.pathname === path ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <p>TrendCast &mdash; AI-Powered Trend Prediction &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
