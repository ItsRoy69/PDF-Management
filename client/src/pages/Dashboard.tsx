import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import { pdfService } from '../services/api';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

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
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My PDFs
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            placeholder="Search PDFs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleUpload}
          >
            Upload PDF
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {filteredPDFs.map((pdf) => (
            <Paper
              key={pdf._id}
              elevation={3}
              sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
              onClick={() => handlePDFClick(pdf._id)}
            >
              <Typography variant="h6" gutterBottom>
                {pdf.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uploaded: {new Date(pdf.createdAt).toLocaleDateString()}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard; 