import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { datasetsApi, predictionsApi } from '../utils/api';
import { formatDateTime, formatNumber } from '../utils/formatters';
import StatCard from '../components/StatCard';
import { Database, TrendingUp, BarChart2, Upload, Trash2, ArrowRight, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import './Dashboard.css';

export default function Dashboard() {
  const [datasets, setDatasets] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [datasetsRes, predictionsRes] = await Promise.all([
        datasetsApi.getAll(),
        predictionsApi.getAll(),
      ]);
      setDatasets(datasetsRes.data.data || []);
      setPredictions(predictionsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this dataset and all its predictions?')) return;
    try {
      await datasetsApi.delete(id);
      toast.success('Dataset deleted');
      loadData();
    } catch {
      toast.error('Failed to delete dataset');
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 320, height: 18 }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      </div>
    );
  }

  const totalPredictions = predictions.length;
  const avgR2 = predictions.length > 0
    ? predictions.reduce((s, p) => s + (parseFloat(p.r_squared) || 0), 0) / predictions.length
    : 0;

  return (
    <div className="dashboard animate-fadeIn">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Brain size={14} />
            <span>ML-Powered Forecasting</span>
          </div>
          <h1 className="hero-title">Predict Future Trends</h1>
          <p className="hero-subtitle">
            Upload your data, run regression models, and forecast what comes next.
            Supports linear, polynomial, exponential and more.
          </p>
          <Link to="/upload" className="btn-primary hero-cta">
            <Upload size={16} />
            Upload Dataset
          </Link>
        </div>
        <div className="hero-visual">
          <svg viewBox="0 0 400 200" className="hero-chart">
            <defs>
              <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Background grid */}
            {[40, 80, 120, 160].map(y => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#334155" strokeWidth="1" />
            ))}
            {/* Area */}
            <path d="M0,160 L50,140 L100,120 L150,100 L200,90 L250,70 L300,50 L350,35 L400,20 L400,200 L0,200 Z"
              fill="url(#heroGrad)" />
            {/* Line */}
            <path d="M0,160 L50,140 L100,120 L150,100 L200,90 L250,70 L300,50 L350,35 L400,20"
              fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            {/* Prediction dashes */}
            <path d="M300,50 L350,32 L400,12"
              fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" strokeLinecap="round" />
            {/* Dots */}
            {[[50,140],[100,120],[150,100],[200,90],[250,70],[300,50]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" />
            ))}
            {[[350,32],[400,12]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="4" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth="2" />
            ))}
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title="Datasets" value={datasets.length} subtitle="Uploaded CSV files" icon={Database} color="#3b82f6" />
        <StatCard title="Predictions" value={totalPredictions} subtitle="Models run" icon={TrendingUp} color="#8b5cf6" />
        <StatCard title="Avg Accuracy" value={`${(avgR2 * 100).toFixed(0)}%`} subtitle="R² score across models" icon={BarChart2} color="#10b981" />
        <StatCard title="Data Points" value={formatNumber(datasets.reduce((s, d) => s + (d.row_count || 0), 0))} subtitle="Total rows processed" icon={Brain} color="#f59e0b" />
      </div>

      {/* Datasets table */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Your Datasets</h2>
          <Link to="/upload" className="btn-secondary">
            <Upload size={14} />
            New Dataset
          </Link>
        </div>

        {datasets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Database size={40} /></div>
            <h3>No datasets yet</h3>
            <p>Upload a CSV file to get started with predictions</p>
            <Link to="/upload" className="btn-primary">
              <Upload size={14} />
              Upload Your First Dataset
            </Link>
          </div>
        ) : (
          <div className="datasets-grid">
            {datasets.map(ds => (
              <Link to={`/datasets/${ds.id}`} key={ds.id} className="dataset-card">
                <div className="dataset-card-header">
                  <div className="dataset-icon">
                    <Database size={16} />
                  </div>
                  <button className="delete-btn" onClick={(e) => handleDelete(ds.id, e)} title="Delete dataset">
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="dataset-name">{ds.name}</h3>
                {ds.description && <p className="dataset-desc">{ds.description}</p>}
                <div className="dataset-meta">
                  <span className="meta-tag">{ds.row_count.toLocaleString()} rows</span>
                  {ds.y_column && <span className="meta-tag">{ds.y_column}</span>}
                </div>
                <div className="dataset-footer">
                  <span className="dataset-date">{formatDateTime(ds.created_at)}</span>
                  <span className="view-link">View <ArrowRight size={12} /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent predictions */}
      {predictions.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Recent Predictions</h2>
          </div>
          <div className="predictions-list">
            {predictions.slice(0, 8).map(pred => (
              <Link to={`/predictions/${pred.id}`} key={pred.id} className="prediction-row">
                <div className="pred-model-badge">{pred.model_type}</div>
                <div className="pred-info">
                  <span className="pred-dataset">{pred.dataset_name}</span>
                  <span className="pred-equation">{pred.equation}</span>
                </div>
                <div className="pred-r2">
                  <span style={{ color: parseFloat(pred.r_squared) >= 0.85 ? '#10b981' : '#f59e0b' }}>
                    R² {(parseFloat(pred.r_squared) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="pred-date">{formatDateTime(pred.created_at)}</span>
                <ArrowRight size={14} color="var(--text-muted)" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
