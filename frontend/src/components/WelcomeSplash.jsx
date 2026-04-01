import React, { useState, useEffect } from 'react';
import './WelcomeSplash.css';

export default function WelcomeSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide after animation completes (3.2s fade-out start + 0.8s duration)
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-overlay">
      <div className="splash-content">
        <p className="splash-eyebrow">TrendCast AI &nbsp;·&nbsp; Prediction Engine</p>
        <h1 className="splash-welcome">Welcome Back,</h1>
        <h2 className="splash-name">Akash</h2>
        <div className="splash-divider" />
        <p className="splash-tagline">Your data. Your forecasts. Your edge.</p>
        <div className="splash-loader">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
