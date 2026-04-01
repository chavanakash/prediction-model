import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { datasetsApi } from '../utils/api';
import toast from 'react-hot-toast';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvPreview, setCsvPreview] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    setName(f.name.replace('.csv', '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    // Preview first few lines
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').slice(0, 6);
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(l => l.split(','));
      setCsvPreview({ headers, rows, totalLines: text.split('\n').length - 1 });
    };
    reader.readAsText(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a CSV file');
    if (!name.trim()) return toast.error('Please enter a name');

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);

    try {
      const res = await datasetsApi.upload(formData, setProgress);
      toast.success('Dataset uploaded successfully!');
      navigate(`/datasets/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setCsvPreview(null);
    setName('');
  };

  return (
    <div className="upload-page animate-fadeIn">
      <div className="page-header">
        <h1>Upload Dataset</h1>
        <p>Upload a CSV file to analyze trends and run predictions</p>
      </div>

      <div className="upload-container">
        <form onSubmit={handleSubmit} className="upload-form">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="file-info">
                <div className="file-icon"><FileText size={28} /></div>
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button type="button" className="clear-file" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="dropzone-content">
                <div className="dropzone-icon">
                  <UploadIcon size={32} />
                </div>
                <h3>{isDragActive ? 'Drop your CSV here' : 'Drag & drop CSV file'}</h3>
                <p>or <span className="browse-link">browse to select</span></p>
                <div className="dropzone-hints">
                  <span>CSV files only</span>
                  <span>Max 10MB</span>
                  <span>Numeric or date columns</span>
                </div>
              </div>
            )}
          </div>

          {/* CSV Preview */}
          {csvPreview && (
            <div className="csv-preview">
              <div className="preview-header">
                <CheckCircle size={14} color="#10b981" />
                <span>Preview — {csvPreview.totalLines.toLocaleString()} rows detected</span>
              </div>
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {csvPreview.headers.map((h, i) => (
                        <th key={i}>{h.trim()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.filter(r => r.some(c => c.trim())).slice(0, 4).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell.trim()}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Form fields */}
          <div className="form-fields">
            <div className="form-group">
              <label className="form-label">Dataset Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Sales Revenue Q4 2024"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-input form-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of what this data represents..."
                rows={3}
              />
            </div>
          </div>

          <div className="upload-info">
            <AlertCircle size={14} color="var(--accent-blue)" />
            <span>
              The system auto-detects date and numeric columns. For best results, use a CSV with
              a date/time column and at least one numeric column.
            </span>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="progress-bar-wrapper">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}

          <button type="submit" className="btn-upload" disabled={!file || uploading}>
            {uploading ? (
              <>
                <div className="spinner" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon size={16} />
                Upload & Analyze
              </>
            )}
          </button>
        </form>

        {/* Tips */}
        <div className="tips-panel">
          <h3>CSV Format Tips</h3>
          <ul className="tips-list">
            <li>
              <strong>Date column:</strong> Supports ISO dates, YYYY-MM-DD, or any standard format
            </li>
            <li>
              <strong>Numeric column:</strong> Integer or float values (e.g., sales, temperature, price)
            </li>
            <li>
              <strong>Multiple columns:</strong> The system picks the best X/Y pair automatically
            </li>
            <li>
              <strong>Minimum:</strong> At least 3 rows of valid data required
            </li>
          </ul>

          <div className="sample-header">Sample CSV Structure</div>
          <div className="code-block">
            <pre>{`date,value
2024-01-01,1520
2024-01-02,1634
2024-01-03,1589
2024-01-04,1712
...`}</pre>
          </div>
          <div className="code-block">
            <pre>{`month,revenue,units
Jan,45000,320
Feb,52000,390
Mar,48000,340
...`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
