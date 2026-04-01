export const formatNumber = (n, decimals = 2) => {
  if (n === null || n === undefined || isNaN(n)) return 'N/A';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return parseFloat(n.toFixed(decimals)).toString();
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const formatPercent = (n) => {
  if (n === null || n === undefined || isNaN(n)) return 'N/A';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

export const getR2Label = (r2) => {
  if (r2 >= 0.95) return { label: 'Excellent', color: '#10b981' };
  if (r2 >= 0.85) return { label: 'Good', color: '#3b82f6' };
  if (r2 >= 0.70) return { label: 'Moderate', color: '#f59e0b' };
  return { label: 'Weak', color: '#ef4444' };
};

export const MODEL_LABELS = {
  linear: 'Linear Regression',
  polynomial: 'Polynomial Regression',
  exponential: 'Exponential Regression',
  logarithmic: 'Logarithmic Regression',
  power: 'Power Regression',
  auto: 'Auto (Best Fit)',
};

export const MODEL_COLORS = {
  linear: '#3b82f6',
  polynomial: '#8b5cf6',
  exponential: '#f59e0b',
  logarithmic: '#10b981',
  power: '#ef4444',
};
