import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdfService } from '../services/api';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Topbar from '../components/Topbar/Topbar';
import '../styles/Upload.css';

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a PDF file');
        setFile(null);
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please drop a PDF file');
      }
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      await pdfService.upload(file, title || file.name);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Topbar />
      <div className="upload-page">
        <h1 className="upload-title">Upload PDF</h1>
        <div className="upload-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                className="title-input"
                placeholder="Enter a title for your PDF (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div
              className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="pdf-file"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="pdf-file" className="drop-zone-label">
                <CloudUploadIcon className="upload-icon" />
                <h3 className="drop-zone-title">
                  {file ? 'File Selected' : 'Drag & Drop PDF here'}
                </h3>
                <p className="drop-zone-subtitle">
                  {file ? file.name : 'or click to browse'}
                </p>
              </label>
            </div>

            {error && (
              <p className="error-message">
                {error}
              </p>
            )}

            <div className="button-container">
              <button
                type="submit"
                className="upload-button"
                disabled={loading || !file}
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  'Upload PDF'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Upload; 