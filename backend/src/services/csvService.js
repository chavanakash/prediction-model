const { parse } = require('csv-parse/sync');

/**
 * Parse CSV buffer and return structured data
 */
const parseCSV = (buffer) => {
  const content = buffer.toString('utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: false,
  });

  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const columns = Object.keys(records[0]);
  return { records, columns };
};

/**
 * Detect which columns are numeric
 */
const detectNumericColumns = (records, columns) => {
  const numericCols = [];
  const dateCols = [];

  for (const col of columns) {
    const values = records.slice(0, 20).map(r => r[col]).filter(v => v !== '' && v !== null);

    const numericCount = values.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
    const dateCount = values.filter(v => !isNaN(Date.parse(v))).length;

    if (numericCount / values.length > 0.8) numericCols.push(col);
    if (dateCount / values.length > 0.8 && numericCount / values.length <= 0.8) dateCols.push(col);
  }

  return { numericCols, dateCols };
};

/**
 * Convert records to x/y data points
 * @param {Array} records - CSV records
 * @param {string} xColumn - column to use as X axis
 * @param {string} yColumn - column to use as Y axis
 */
const recordsToDataPoints = (records, xColumn, yColumn) => {
  const points = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rawX = record[xColumn];
    const rawY = record[yColumn];

    let xValue;
    const yValue = parseFloat(rawY);

    if (isNaN(yValue)) continue;

    // Try to parse x as number first
    if (!isNaN(parseFloat(rawX)) && isFinite(rawX)) {
      xValue = parseFloat(rawX);
    } else if (!isNaN(Date.parse(rawX))) {
      // Convert date to numeric (days since epoch)
      xValue = Math.floor(new Date(rawX).getTime() / (1000 * 60 * 60 * 24));
    } else {
      // Use row index as x
      xValue = i;
    }

    points.push({
      x: xValue,
      y: yValue,
      xLabel: rawX,
      rowIndex: i,
    });
  }

  return points.filter(p => !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y));
};

/**
 * Auto-detect best x and y columns
 */
const autoDetectColumns = (records, columns) => {
  const { numericCols, dateCols } = detectNumericColumns(records, columns);

  let xColumn, yColumn;

  if (dateCols.length > 0) {
    xColumn = dateCols[0];
    yColumn = numericCols[0] || columns.find(c => c !== xColumn);
  } else if (numericCols.length >= 2) {
    xColumn = numericCols[0];
    yColumn = numericCols[1];
  } else if (numericCols.length === 1) {
    // Use row index as x
    xColumn = null;
    yColumn = numericCols[0];
  } else {
    throw new Error('Could not detect numeric columns for prediction');
  }

  return { xColumn, yColumn };
};

module.exports = { parseCSV, detectNumericColumns, recordsToDataPoints, autoDetectColumns };
