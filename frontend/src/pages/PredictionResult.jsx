import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, Scatter
} from 'recharts';
import { predictionsApi, datasetsApi } from '../utils/api';
import { formatNumber, formatDateTime, getR2Label, MODEL_LABELS } from '../utils/formatters';
import StatCard from '../components/StatCard';
import toast from 'react-hot-toast';
import { TrendingUp, ArrowLeft, Target, Activity, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import './PredictionResult.css';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-x" style={{ color: p.isPredicted ? '#8b5cf6' : 'var(--text-muted)' }}>
        {p.xLabel || `x = ${formatNumber(p.x, 1)}`}
        {p.isPredicted && <span className="tooltip-pred-badge"> Forecast</span>}
      </div>
      {payload.map((entry, i) => (
        entry.value !== null && entry.value !== undefined && (
          <div key={i} className="tooltip-row" style={{ color: entry.color }}>
            <span className="tooltip-dot" style={{ background: entry.color }} />
            <span>{entry.name}: <strong>{formatNumber(entry.value)}</strong></span>
          </div>
        )
      ))}
    </div>
  );
};

export default function PredictionResult() {
  const { id } = useParams();
  const [prediction, setPrediction] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const predRes = await predictionsApi.getById(id);
      const pred = predRes.data.data;
      setPrediction(pred);

      const dsRes = await datasetsApi.getById(pred.dataset_id);
      setDataset(dsRes.data.data);
    } catch {
      toast.error('Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="prediction-result">
        <div className="skeleton" style={{ width: 120, height: 24 }} />
        <div className="skeleton" style={{ width: 280, height: 32, margin: '16px 0' }} />
        <div className="skeleton" style={{ height: 360 }} />
      </div>
    );
  }

  if (!prediction || !dataset) {
    return <div className="error-state">Prediction not found</div>;
  }

  const r2Info = getR2Label(parseFloat(prediction.r_squared));
  const futurePoints = typeof prediction.future_points === 'string'
    ? JSON.parse(prediction.future_points)
    : prediction.future_points;

  const { dataPoints } = dataset;

  // Build combined chart data
  const sampledActual = dataPoints.length > 200
    ? dataPoints.filter((_, i) => i % Math.ceil(dataPoints.length / 200) === 0)
    : dataPoints;

  // Get fitted points from prediction (stored in fittedPoints if available, else just use actual)
  const actualData = sampledActual.map(p => ({
    x: p.x,
    xLabel: p.xLabel || String(p.x),
    actual: p.y,
    isPredicted: false,
  }));

  const futureData = futurePoints.map(p => ({
    x: p.x,
    xLabel: p.xLabel || `+${futurePoints.indexOf(p) + 1}`,
    forecast: p.y,
    isPredicted: true,
  }));

  // Merge actual + future
  const chartData = [
    ...actualData,
    // Bridge: last actual point also shown as forecast start
    { ...actualData[actualData.length - 1], forecast: actualData[actualData.length - 1]?.actual },
    ...futureData,
  ];

  const lastActual = actualData[actualData.length - 1];
  const lastForecast = futureData[futureData.length - 1];
  const forecastChange = lastActual && lastForecast
    ? ((lastForecast.forecast - lastActual.actual) / Math.abs(lastActual.actual)) * 100
    : 0;

  return (
    <div className="prediction-result animate-fadeIn">
      <div className="nav-row">
        <Link to={`/datasets/${prediction.dataset_id}`} className="back-link">
          <ArrowLeft size={16} /> Back to {prediction.dataset_name}
        </Link>
        <Link to="/" className="back-link secondary">
          Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="result-header">
        <div className="result-header-left">
          <div className="result-icon">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="result-model-tag">{MODEL_LABELS[prediction.model_type] || prediction.model_type}</div>
            <h1>Prediction Results</h1>
            <p className="result-dataset">
              <Database size={13} /> {prediction.dataset_name}
              <span>&middot;</span>
              {formatDateTime(prediction.created_at)}
            </p>
          </div>
        </div>

        <div className="accuracy-badge" style={{ borderColor: `${r2Info.color}50`, background: `${r2Info.color}15` }}>
          <div className="accuracy-value" style={{ color: r2Info.color }}>
            {(parseFloat(prediction.r_squared) * 100).toFixed(1)}%
          </div>
          <div className="accuracy-label">R² Score</div>
          <div className="accuracy-grade" style={{ color: r2Info.color }}>{r2Info.label}</div>
        </div>
      </div>

      {/* Equation card */}
      <div className="equation-card">
        <div className="equation-label">Model Equation</div>
        <div className="equation-value">{prediction.equation}</div>
        <div className="equation-hint">
          {parseFloat(prediction.r_squared) >= 0.85 ? (
            <><CheckCircle size={13} color="#10b981" /> Strong fit — model explains {(parseFloat(prediction.r_squared) * 100).toFixed(1)}% of variance</>
          ) : (
            <><AlertTriangle size={13} color="#f59e0b" /> Moderate fit — consider trying a different model type</>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row-4">
        <StatCard title="R² Score" value={`${(parseFloat(prediction.r_squared) * 100).toFixed(1)}%`} subtitle={r2Info.label} icon={Target} color={r2Info.color} />
        <StatCard title="Forecast Periods" value={prediction.forecast_periods} subtitle="Future data points" icon={Activity} color="#3b82f6" />
        <StatCard title="Final Forecast" value={formatNumber(lastForecast?.forecast)} subtitle={lastForecast?.xLabel} icon={TrendingUp} color="#8b5cf6" />
        <StatCard
          title="Forecast Change"
          value={`${forecastChange >= 0 ? '+' : ''}${forecastChange.toFixed(1)}%`}
          subtitle="vs last actual"
          icon={TrendingUp}
          color={forecastChange >= 0 ? '#10b981' : '#ef4444'}
        />
      </div>

      {/* Main prediction chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h2>Trend & Forecast</h2>
            <p>Blue = Actual data, Purple dashed = Predicted future values</p>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-line actual" />Actual</span>
            <span className="legend-item"><span className="legend-line forecast" />Forecast</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
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

            {lastActual && (
              <ReferenceLine
                x={lastActual.xLabel}
                stroke="#475569"
                strokeDasharray="4 4"
                label={{ value: 'Forecast →', position: 'insideTopRight', fill: '#64748b', fontSize: 11 }}
              />
            )}

            <Area type="monotone" dataKey="actual" stroke="none" fill="url(#actualGrad)" />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
              name="Actual"
              connectNulls={false}
            />
            <Area type="monotone" dataKey="forecast" stroke="none" fill="url(#forecastGrad)" />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              strokeDasharray="8 4"
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              name="Forecast"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast table */}
      <div className="forecast-table-card">
        <h2>Forecast Values</h2>
        <div className="forecast-table-wrapper">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Period</th>
                <th>Predicted Value</th>
                <th>Change from Last</th>
              </tr>
            </thead>
            <tbody>
              {futurePoints.map((p, i) => {
                const prev = i === 0 ? lastActual?.actual : futurePoints[i - 1].y;
                const change = prev ? ((p.y - prev) / Math.abs(prev)) * 100 : 0;
                return (
                  <tr key={i}>
                    <td className="td-num">{i + 1}</td>
                    <td>{p.xLabel || `+${i + 1}`}</td>
                    <td className="td-value">{formatNumber(p.y)}</td>
                    <td className={`td-change ${change >= 0 ? 'positive' : 'negative'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
