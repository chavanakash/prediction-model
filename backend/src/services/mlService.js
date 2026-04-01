const regression = require('regression');

/**
 * Run prediction model on data points
 * @param {Array} dataPoints - [{x, y}]
 * @param {string} modelType - linear | polynomial | exponential | logarithmic | power
 * @param {number} forecastPeriods - number of future points to predict
 */
const runPrediction = (dataPoints, modelType = 'linear', forecastPeriods = 10) => {
  if (!dataPoints || dataPoints.length < 3) {
    throw new Error('Need at least 3 data points for prediction');
  }

  const data = dataPoints.map(p => [p.x, p.y]);

  let result;
  let equation;

  switch (modelType) {
    case 'linear':
      result = regression.linear(data, { precision: 6 });
      equation = `y = ${result.equation[0].toFixed(4)}x + ${result.equation[1].toFixed(4)}`;
      break;
    case 'polynomial':
      result = regression.polynomial(data, { order: 2, precision: 6 });
      equation = `y = ${result.equation[0].toFixed(4)}x² + ${result.equation[1].toFixed(4)}x + ${result.equation[2].toFixed(4)}`;
      break;
    case 'exponential':
      result = regression.exponential(data, { precision: 6 });
      equation = `y = ${result.equation[0].toFixed(4)}e^(${result.equation[1].toFixed(4)}x)`;
      break;
    case 'logarithmic':
      result = regression.logarithmic(data, { precision: 6 });
      equation = `y = ${result.equation[0].toFixed(4)} + ${result.equation[1].toFixed(4)}ln(x)`;
      break;
    case 'power':
      result = regression.power(data, { precision: 6 });
      equation = `y = ${result.equation[0].toFixed(4)}x^${result.equation[1].toFixed(4)}`;
      break;
    default:
      result = regression.linear(data, { precision: 6 });
      equation = `y = ${result.equation[0].toFixed(4)}x + ${result.equation[1].toFixed(4)}`;
  }

  const maxX = Math.max(...dataPoints.map(p => p.x));
  const stepSize = calculateStepSize(dataPoints);

  const futurePoints = [];
  for (let i = 1; i <= forecastPeriods; i++) {
    const futureX = maxX + i * stepSize;
    const predicted = result.predict(futureX);
    futurePoints.push({
      x: futureX,
      y: Math.max(0, predicted[1]),
      isPredicted: true,
    });
  }

  // Calculate R² if not provided
  const rSquared = result.r2 !== undefined ? result.r2 : calculateRSquared(dataPoints, result);

  // Fitted points for the original data
  const fittedPoints = dataPoints.map(p => ({
    x: p.x,
    y: result.predict(p.x)[1],
    xLabel: p.xLabel,
  }));

  return {
    modelType,
    equation,
    rSquared,
    futurePoints,
    fittedPoints,
    modelParams: { equation: result.equation },
  };
};

const calculateStepSize = (dataPoints) => {
  if (dataPoints.length < 2) return 1;
  const sorted = [...dataPoints].sort((a, b) => a.x - b.x);
  const diffs = [];
  for (let i = 1; i < sorted.length; i++) {
    diffs.push(sorted[i].x - sorted[i - 1].x);
  }
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
};

const calculateRSquared = (dataPoints, result) => {
  const yMean = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
  const ssTot = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssRes = dataPoints.reduce((sum, p) => {
    const predicted = result.predict(p.x)[1];
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  return ssTot === 0 ? 1 : 1 - ssRes / ssTot;
};

/**
 * Auto-select best model based on R² score
 */
const autoPrediction = (dataPoints, forecastPeriods = 10) => {
  const models = ['linear', 'polynomial', 'exponential'];
  let bestResult = null;
  let bestR2 = -Infinity;

  for (const model of models) {
    try {
      const result = runPrediction(dataPoints, model, forecastPeriods);
      if (result.rSquared > bestR2) {
        bestR2 = result.rSquared;
        bestResult = result;
      }
    } catch (_) {
      // Skip model if it fails (e.g., negative values for log/exp)
    }
  }

  if (!bestResult) {
    return runPrediction(dataPoints, 'linear', forecastPeriods);
  }

  return bestResult;
};

/**
 * Calculate basic statistics for the dataset
 */
const calculateStats = (dataPoints) => {
  const yValues = dataPoints.map(p => p.y);
  const n = yValues.length;
  const mean = yValues.reduce((a, b) => a + b, 0) / n;
  const sorted = [...yValues].sort((a, b) => a - b);
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const variance = yValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...yValues);
  const max = Math.max(...yValues);

  // Trend direction
  const firstHalf = yValues.slice(0, Math.floor(n / 2));
  const secondHalf = yValues.slice(Math.floor(n / 2));
  const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trendDirection = secondMean > firstMean ? 'upward' : secondMean < firstMean ? 'downward' : 'stable';
  const trendPercent = firstMean !== 0 ? ((secondMean - firstMean) / Math.abs(firstMean)) * 100 : 0;

  return { mean, median, stdDev, min, max, n, trendDirection, trendPercent };
};

module.exports = { runPrediction, autoPrediction, calculateStats };
