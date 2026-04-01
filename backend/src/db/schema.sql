-- Prediction Model Database Schema

CREATE TABLE IF NOT EXISTS datasets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255),
  row_count INTEGER DEFAULT 0,
  x_column VARCHAR(255),
  y_column VARCHAR(255),
  columns JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_points (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
  x_value FLOAT NOT NULL,
  y_value FLOAT NOT NULL,
  x_label VARCHAR(255),
  row_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
  model_type VARCHAR(50) NOT NULL,
  model_params JSONB,
  equation TEXT,
  r_squared FLOAT,
  future_points JSONB,
  forecast_periods INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_points_dataset_id ON data_points(dataset_id);
CREATE INDEX IF NOT EXISTS idx_predictions_dataset_id ON predictions(dataset_id);
