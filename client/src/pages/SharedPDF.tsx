import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';
import { pdfService } from '../services/api';

// Update the worker source to use the CDN version
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface Comment {
  _id: string;
  text: string;
  user: {
    name: string;
  };
  createdAt: string;
  replies: {
    text: string;
    user: {
      name: string;
    };
    createdAt: string;
  }[];
}

const SharedPDF = () => {
  const { token } = useParams<{ token: string }>();
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  // Try to fetch and create a direct object URL for the PDF
  const [directPdfUrl, setDirectPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSharedPDF();
  }, [token]);

  const loadSharedPDF = async () => {
    try {
      setPdfLoading(true);
      setPdfError(null);
      const data = await pdfService.getSharedPDF(token!);
      setPdf(data);
    } catch (error) {
      console.error('Failed to load shared PDF:', error);
      setPdfError('Failed to load PDF. Please try again later.');
    } finally {
      setPdfLoading(false);
    }
  };

  // Get file ID from Appwrite URL
  const getFileIdFromUrl = (url: string): string | null => {
    const matches = url.match(/\/files\/([^\/]+)\/view/);
    return matches ? matches[1] : null;
  };

  // Get a direct PDF URL that works with react-pdf
  const getPdfUrl = (fileUrl: string): string => {
    const fileId = getFileIdFromUrl(fileUrl);
    if (fileId) {
      // Use our proxy endpoint
      return `/api/pdf/proxy/${fileId}`;
    }
    // Fallback to direct URL with CORS headers
    return fileUrl;
  };

  // Function to handle PDF load error
  const handlePdfLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    // More detailed error message
    setPdfError(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    setPdfLoading(false);
    
    // Log additional debugging information
    if (pdf?.fileUrl) {
      console.log('Attempted to load PDF from:', getPdfUrl(pdf.fileUrl));
    }
  };

  // Add console logging to debug the PDF URL
  useEffect(() => {
    if (pdf?.fileUrl) {
      console.log('PDF URL:', getPdfUrl(pdf.fileUrl));
      // Try to fetch the PDF to check if it's accessible
      fetch(getPdfUrl(pdf.fileUrl))
        .then(response => {
          console.log('PDF fetch response:', response.status, response.statusText);
          if (!response.ok) {
            console.error('PDF fetch failed with status:', response.status);
          }
        })
        .catch(error => {
          console.error('PDF fetch error:', error);
        });
    }
  }, [pdf]);

  // Try to fetch and create a direct object URL for the PDF
  useEffect(() => {
    if (pdf?.fileUrl) {
      // Try to fetch the PDF directly as a blob
      fetch(getPdfUrl(pdf.fileUrl))
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          // Create an object URL from the blob
          const objectUrl = URL.createObjectURL(blob);
          setDirectPdfUrl(objectUrl);
          console.log('Created direct PDF object URL:', objectUrl);
        })
        .catch(error => {
          console.error('Failed to create direct PDF URL:', error);
        });
    }
    
    // Clean up object URL when component unmounts or PDF changes
    return () => {
      if (directPdfUrl) {
        URL.revokeObjectURL(directPdfUrl);
      }
    };
  }, [pdf]);

  const handleAddComment = async () => {
    if (!guestName) {
      alert('Please enter your name to comment');
      return;
    }

    try {
      await pdfService.addSharedComment(token!, comment, guestName);
      setComment('');
      loadSharedPDF();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!guestName) {
      alert('Please enter your name to reply');
      return;
    }

    try {
      await pdfService.addSharedReply(token!, commentId, reply, guestName);
      setReply('');
      setSelectedComment(null);
      loadSharedPDF();
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  return (
    <Container>
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom>
            {pdf?.title}
          </Typography>
          {pdfLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
              <CircularProgress />
            </Box>
          )}
          {pdfError && (
            <Box sx={{ textAlign: 'center', my: 5 }}>
              <Typography color="error">{pdfError}</Typography>
              <Button 
                variant="outlined" 
                sx={{ mt: 2 }}
                onClick={loadSharedPDF}
              >
                Retry
              </Button>
            </Box>
          )}
          {pdf && !pdfLoading && !pdfError && (
            <Document
              file={directPdfUrl || (pdf.fileUrl ? getPdfUrl(pdf.fileUrl) : undefined)}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                setPdfLoading(false);
              }}
              onLoadError={handlePdfLoadError}
              loading={<CircularProgress />}
              error={<Typography color="error">Failed to load PDF</Typography>}
            >
              <Page pageNumber={pageNumber} />
            </Document>
          )}
          {numPages && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
              >
                Previous
              </Button>
              <Typography sx={{ mx: 2 }}>
                Page {pageNumber} of {numPages}
              </Typography>
              <Button
                disabled={pageNumber >= (numPages || 1)}
                onClick={() => setPageNumber(pageNumber + 1)}
              >
                Next
              </Button>
            </Box>
          )}
        </Paper>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Comments
          </Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Your Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
            />
            <Button
              variant="contained"
              onClick={handleAddComment}
              sx={{ mt: 1 }}
            >
              Add Comment
            </Button>
          </Box>
          <List>
            {pdf?.comments.map((comment: Comment) => (
              <React.Fragment key={comment._id}>
                <ListItem>
                  <ListItemText
                    primary={comment.text}
                    secondary={`${comment.user.name} - ${new Date(
                      comment.createdAt
                    ).toLocaleString()}`}
                  />
                </ListItem>
                {comment.replies.map((reply, index) => (
                  <ListItem key={index} sx={{ pl: 4 }}>
                    <ListItemText
                      primary={reply.text}
                      secondary={`${reply.user.name} - ${new Date(
                        reply.createdAt
                      ).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
                {selectedComment === comment._id ? (
                  <Box sx={{ pl: 4 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Add a reply..."
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleAddReply(comment._id)}
                      sx={{ mt: 1 }}
                    >
                      Add Reply
                    </Button>
                  </Box>
                ) : (
                  <Button
                    onClick={() => setSelectedComment(comment._id)}
                    sx={{ pl: 4 }}
                  >
                    Reply
                  </Button>
                )}
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default SharedPDF; 