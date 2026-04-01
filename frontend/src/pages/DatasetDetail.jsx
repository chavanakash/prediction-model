import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush
} from 'recharts';
import { datasetsApi, predictionsApi } from '../utils/api';
import { formatNumber, formatDateTime, getR2Label, MODEL_LABELS } from '../utils/formatters';
import StatCard from '../components/StatCard';
import toast from 'react-hot-toast';
import { TrendingUp, Database, ArrowLeft, Play, History, BarChart2 } from 'lucide-react';
import './DatasetDetail.css';

const MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto (Best Fit)', desc: 'Automatically selects best model' },
  { value: 'linear', label: 'Linear', desc: 'y = mx + b' },
  { value: 'polynomial', label: 'Polynomial (2nd order)', desc: 'y = ax² + bx + c' },
  { value: 'exponential', label: 'Exponential', desc: 'y = ae^(bx)' },
  { value: 'logarithmic', label: 'Logarithmic', desc: 'y = a + b·ln(x)' },
  { value: 'power', label: 'Power', desc: 'y = ax^b' },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-x">{p.xLabel || `Index ${p.x}`}</div>
      {payload.map((entry, i) => (
        <div key={i} className="tooltip-row" style={{ color: entry.color }}>
          <span className="tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}: <strong>{formatNumber(entry.value)}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function DatasetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [modelType, setModelType] = useState('auto');
  const [forecastPeriods, setForecastPeriods] = useState(10);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [dsRes, predRes] = await Promise.all([
        datasetsApi.getById(id),
        predictionsApi.getByDataset(id),
      ]);
      setDataset(dsRes.data.data);
      setPredictions(predRes.data.data || []);
    } catch {
      toast.error('Failed to load dataset');
    } finally {
      setLoading(false);
    }
  };

  const runPrediction = async () => {
    setRunning(true);
    try {
      const res = await predictionsApi.run(id, { modelType, forecastPeriods });
      toast.success(`Prediction complete! R² = ${(res.data.data.rSquared * 100).toFixed(1)}%`);
      navigate(`/predictions/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Prediction failed');
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="dataset-detail">
        <div className="skeleton" style={{ width: 120, height: 24 }} />
        <div className="skeleton" style={{ width: 260, height: 32, margin: '16px 0' }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  if (!dataset) {
    return <div className="error-state">Dataset not found</div>;
  }

  const { dataPoints, stats } = dataset;

  // Prepare chart data (sample if too many points)
  const chartData = dataPoints.length > 300
    ? dataPoints.filter((_, i) => i % Math.ceil(dataPoints.length / 300) === 0)
    : dataPoints;

  return (
    <div className="dataset-detail animate-fadeIn">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="detail-header">
        <div className="detail-icon"><Database size={20} /></div>
        <div>
          <h1>{dataset.name}</h1>
          {dataset.description && <p className="detail-desc">{dataset.description}</p>}
          <p className="detail-meta">
            {dataset.row_count.toLocaleString()} rows &middot; Y: <strong>{dataset.y_column}</strong>
            {dataset.x_column !== '__index__' && <> &middot; X: <strong>{dataset.x_column}</strong></>}
            &middot; Uploaded {formatDateTime(dataset.created_at)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <StatCard title="Mean" value={formatNumber(stats.mean)} icon={BarChart2} color="#3b82f6" />
        <StatCard title="Min" value={formatNumber(stats.min)} icon={TrendingUp} color="#10b981" />
        <StatCard title="Max" value={formatNumber(stats.max)} icon={TrendingUp} color="#8b5cf6" />
        <StatCard title="Std Dev" value={formatNumber(stats.stdDev)} icon={BarChart2} color="#f59e0b" />
        <StatCard
          title="Trend"
          value={stats.trendDirection.charAt(0).toUpperCase() + stats.trendDirection.slice(1)}
          subtitle={`${stats.trendPercent >= 0 ? '+' : ''}${stats.trendPercent.toFixed(1)}%`}
          icon={TrendingUp}
          color={stats.trendDirection === 'upward' ? '#10b981' : stats.trendDirection === 'downward' ? '#ef4444' : '#64748b'}
        />
      </div>

      {/* Main chart */}
      <div className="chart-card">
        <div className="chart-card-header">
          <h2>Data Overview</h2>
          <span className="chart-note">{chartData.length !== dataPoints.length ? `Showing ${chartData.length} of ${dataPoints.length} points` : `${dataPoints.length} points`}</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.6} />
            <XAxis
              dataKey="xLabel"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatNumber(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="y"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#3b82f6' }}
              name={dataset.y_column}
            />
            {chartData.length > 30 && <Brush dataKey="xLabel" height={24} fill="#1e293b" stroke="#334155" travellerWidth={8} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Prediction runner */}
      <div className="prediction-runner">
        <div className="runner-header">
          <div className="runner-title">
            <Play size={18} />
            <h2>Run Prediction</h2>
          </div>
          <p className="runner-desc">Choose a regression model and forecast periods to predict future trends</p>
        </div>

        <div className="runner-controls">
          <div className="control-group">
            <label>Regression Model</label>
            <div className="model-grid">
              {MODEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`model-btn ${modelType === opt.value ? 'active' : ''}`}
                  onClick={() => setModelType(opt.value)}
                >
                  <span className="model-btn-label">{opt.label}</span>
                  <span className="model-btn-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Forecast Periods: <strong>{forecastPeriods}</strong></label>
            <input
              type="range"
              min={1}
              max={50}
              value={forecastPeriods}
              onChange={e => setForecastPeriods(Number(e.target.value))}
              className="range-input"
            />
            <div className="range-labels"><span>1</span><span>50</span></div>
          </div>

          <button className="btn-run" onClick={runPrediction} disabled={running}>
            {running ? (
              <><div className="spinner" /> Running Model...</>
            ) : (
              <><Play size={16} /> Run Prediction</>
            )}
          </button>
        </div>
      </div>

      {/* Previous predictions */}
      {predictions.length > 0 && (
        <div className="prev-predictions">
          <div className="section-header">
            <h2><History size={16} /> Previous Predictions</h2>
          </div>
          <div className="pred-list">
            {predictions.map(pred => {
              const r2Info = getR2Label(parseFloat(pred.r_squared));
              return (
                <Link to={`/predictions/${pred.id}`} key={pred.id} className="pred-card">
                  <div className="pred-card-model">{MODEL_LABELS[pred.model_type] || pred.model_type}</div>
                  <div className="pred-card-eq">{pred.equation}</div>
                  <div className="pred-card-meta">
                    <span className="r2-badge" style={{ color: r2Info.color, background: `${r2Info.color}20` }}>
                      R² {(parseFloat(pred.r_squared) * 100).toFixed(1)}% — {r2Info.label}
                    </span>
                    <span className="pred-card-date">{formatDateTime(pred.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
