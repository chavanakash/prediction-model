const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { parseCSV, recordsToDataPoints, autoDetectColumns } = require('../services/csvService');
const { calculateStats } = require('../services/mlService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// GET all datasets
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, file_name, row_count, x_column, y_column, columns, created_at FROM datasets ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single dataset with data points
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetResult = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
    if (datasetResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dataset not found' });
    }

    const pointsResult = await pool.query(
      'SELECT x_value, y_value, x_label, row_index FROM data_points WHERE dataset_id = $1 ORDER BY row_index ASC',
      [id]
    );

    const dataset = datasetResult.rows[0];
    const dataPoints = pointsResult.rows.map(r => ({
      x: parseFloat(r.x_value),
      y: parseFloat(r.y_value),
      xLabel: r.x_label,
      rowIndex: r.row_index,
    }));

    const stats = calculateStats(dataPoints);

    res.json({
      success: true,
      data: {
        ...dataset,
        dataPoints,
        stats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST upload new dataset
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const client = await pool.connect();
  try {
    const { records, columns } = parseCSV(req.file.buffer);

    let { xColumn, yColumn } = autoDetectColumns(records, columns);
    if (req.body.xColumn) xColumn = req.body.xColumn;
    if (req.body.yColumn) yColumn = req.body.yColumn;

    if (!yColumn) {
      return res.status(400).json({ success: false, error: 'Could not detect numeric y column' });
    }

    const effectiveXColumn = xColumn || '__index__';
    const dataPoints = xColumn
      ? recordsToDataPoints(records, xColumn, yColumn)
      : records.map((r, i) => ({
          x: i,
          y: parseFloat(r[yColumn]),
          xLabel: String(i),
          rowIndex: i,
        })).filter(p => !isNaN(p.y));

    if (dataPoints.length < 3) {
      return res.status(400).json({ success: false, error: 'Need at least 3 valid data points' });
    }

    const name = req.body.name || req.file.originalname.replace('.csv', '');
    const description = req.body.description || '';

    await client.query('BEGIN');

    const datasetResult = await client.query(
      `INSERT INTO datasets (name, description, file_name, row_count, x_column, y_column, columns)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, req.file.originalname, dataPoints.length, effectiveXColumn, yColumn, JSON.stringify(columns)]
    );

    const datasetId = datasetResult.rows[0].id;

    // Batch insert data points
    const values = dataPoints.map((p, i) => `($1, ${p.x}, ${p.y}, ${JSON.stringify(p.xLabel || '')}, ${p.rowIndex || i})`);
    for (let i = 0; i < dataPoints.length; i += 500) {
      const batch = dataPoints.slice(i, i + 500);
      const placeholders = batch.map((p, j) => `($1, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4}, $${j * 4 + 5})`).join(', ');
      const flatValues = [datasetId, ...batch.flatMap(p => [p.x, p.y, p.xLabel || String(p.rowIndex), p.rowIndex || 0])];
      await client.query(
        `INSERT INTO data_points (dataset_id, x_value, y_value, x_label, row_index) VALUES ${placeholders}`,
        flatValues
      );
    }

    await client.query('COMMIT');

    const stats = calculateStats(dataPoints);

    res.status(201).json({
      success: true,
      data: {
        ...datasetResult.rows[0],
        dataPoints,
        stats,
        detectedColumns: { xColumn: effectiveXColumn, yColumn },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Upload error:', err);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// DELETE dataset
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM datasets WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dataset not found' });
    }
    res.json({ success: true, message: 'Dataset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
