import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdfService } from '../services/api';
import Topbar from '../components/Topbar/Topbar';
import SearchIcon from '@mui/icons-material/Search';
import '../styles/Dashboard.css';

interface PDF {
  _id: string;
  title: string;
  filename: string;
  createdAt: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    try {
      const data = await pdfService.getAll();
      setPdfs(data);
    } catch (error) {
      console.error('Failed to load PDFs:', error);
    }
  };

  const handleUpload = () => {
    navigate('/upload');
  };

  const handlePDFClick = (id: string) => {
    navigate(`/pdf/${id}`);
  };

  const filteredPDFs = pdfs.filter(pdf =>
    pdf.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Topbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">My PDFs</h1>
          <div className="dashboard-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search PDFs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <SearchIcon className="search-icon" />
            </div>
            <button className="primary-button" onClick={handleUpload}>
              <span className="button-icon">+</span>
              Upload PDF
            </button>
          </div>
        </div>

        <div className="pdf-grid">
          {filteredPDFs.map((pdf) => (
            <div
              key={pdf._id}
              className="pdf-card"
              onClick={() => handlePDFClick(pdf._id)}
            >
              <div className="pdf-icon">📄</div>
              <h3 className="pdf-title">{pdf.title}</h3>
              <p className="pdf-date">
                Uploaded: {new Date(pdf.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Dashboard; 