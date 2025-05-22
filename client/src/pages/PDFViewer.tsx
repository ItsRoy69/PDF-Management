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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';
import { pdfService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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

const PDFViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const { user } = useAuth();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);

  // Try to fetch and create a direct object URL for the PDF
  const [directPdfUrl, setDirectPdfUrl] = useState<string | null>(null);
  
  useEffect(() => {
    loadPDF();
  }, [id]);

  const loadPDF = async () => {
    try {
      setPdfLoading(true);
      setPdfError(null);
      const data = await pdfService.getOne(id!);
      setPdf(data);
    } catch (error) {
      console.error('Failed to load PDF:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePdfLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    setPdfLoading(false);
    
    if (pdf?.fileUrl) {
      console.log('Attempted to load PDF from:', getPdfUrl(pdf.fileUrl));
    }
  };

  const handleAddComment = async () => {
    try {
      await pdfService.addComment(id!, comment);
      setComment('');
      loadPDF();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAddReply = async (commentId: string) => {
    try {
      await pdfService.addReply(id!, commentId, reply);
      setReply('');
      setSelectedComment(null);
      loadPDF();
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const handleShareClick = async () => {
    try {
      const link = await pdfService.generateShareLink(id!);
      setShareLink(link);
      setShareDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      setSnackbarMessage('Failed to generate share link');
      setSnackbarOpen(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setSnackbarMessage('Link copied to clipboard!');
    setSnackbarOpen(true);
  };

  const getFileIdFromUrl = (url: string): string | null => {
    const matches = url.match(/\/files\/([^\/]+)\/view/);
    return matches ? matches[1] : null;
  };

  const getPdfUrl = (fileUrl: string): string => {
    const fileId = getFileIdFromUrl(fileUrl);
    if (fileId) {
      return `/api/pdf/proxy/${fileId}`;
    }
    return fileUrl;
  };

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

  useEffect(() => {
    if (pdf?.fileUrl) {
      console.log('PDF URL:', getPdfUrl(pdf.fileUrl));
    }
  }, [pdf]);

  return (
    <Container>
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">{pdf?.title}</Typography>
            <Button
              variant="contained"
              startIcon={<ShareIcon />}
              onClick={handleShareClick}
            >
              Share
            </Button>
          </Box>
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
                onClick={loadPDF}
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

      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share PDF</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Share this link with others to give them access to this PDF:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TextField
              fullWidth
              value={shareLink}
              InputProps={{ readOnly: true }}
            />
            <Button
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyLink}
              sx={{ ml: 1 }}
            >
              Copy
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PDFViewer; 