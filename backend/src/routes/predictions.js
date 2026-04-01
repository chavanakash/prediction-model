const express = require('express');
const { pool } = require('../db');
const { runPrediction, autoPrediction } = require('../services/mlService');

const router = express.Router();

const VALID_MODELS = ['linear', 'polynomial', 'exponential', 'logarithmic', 'power', 'auto'];

// POST run prediction on a dataset
router.post('/:datasetId', async (req, res) => {
  const { datasetId } = req.params;
  const { modelType = 'auto', forecastPeriods = 10 } = req.body;

  if (!VALID_MODELS.includes(modelType)) {
    return res.status(400).json({ success: false, error: `Invalid model. Valid: ${VALID_MODELS.join(', ')}` });
  }

  if (forecastPeriods < 1 || forecastPeriods > 100) {
    return res.status(400).json({ success: false, error: 'forecastPeriods must be between 1 and 100' });
  }

  try {
    // Check dataset exists
    const datasetResult = await pool.query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
    if (datasetResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dataset not found' });
    }

    const pointsResult = await pool.query(
      'SELECT x_value, y_value, x_label, row_index FROM data_points WHERE dataset_id = $1 ORDER BY row_index ASC',
      [datasetId]
    );

    const dataPoints = pointsResult.rows.map(r => ({
      x: parseFloat(r.x_value),
      y: parseFloat(r.y_value),
      xLabel: r.x_label,
    }));

    const predResult = modelType === 'auto'
      ? autoPrediction(dataPoints, parseInt(forecastPeriods))
      : runPrediction(dataPoints, modelType, parseInt(forecastPeriods));

    // Save prediction to DB
    const saved = await pool.query(
      `INSERT INTO predictions (dataset_id, model_type, model_params, equation, r_squared, future_points, forecast_periods)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        datasetId,
        predResult.modelType,
        JSON.stringify(predResult.modelParams),
        predResult.equation,
        predResult.rSquared,
        JSON.stringify(predResult.futurePoints),
        forecastPeriods,
      ]
    );

    res.json({
      success: true,
      data: {
        ...saved.rows[0],
        futurePoints: predResult.futurePoints,
        fittedPoints: predResult.fittedPoints,
        rSquared: predResult.rSquared,
        equation: predResult.equation,
        modelType: predResult.modelType,
        dataset: datasetResult.rows[0],
      },
    });
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all predictions for a dataset
router.get('/dataset/:datasetId', async (req, res) => {
  const { datasetId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM predictions WHERE dataset_id = $1 ORDER BY created_at DESC',
      [datasetId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single prediction
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.*, d.name as dataset_name, d.x_column, d.y_column
       FROM predictions p JOIN datasets d ON p.dataset_id = d.id WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prediction not found' });
    }
    const prediction = result.rows[0];
    prediction.future_points = typeof prediction.future_points === 'string'
      ? JSON.parse(prediction.future_points)
      : prediction.future_points;

    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all predictions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, d.name as dataset_name FROM predictions p
       JOIN datasets d ON p.dataset_id = d.id ORDER BY p.created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
