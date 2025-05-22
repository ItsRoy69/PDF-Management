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
import { pdfService } from '../services/api';

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

interface SharedPdfData {
  title: string;
  fileUrl: string;
  comments: Comment[];
}

const SharedPDF = () => {
  const { token } = useParams<{ token: string }>();
  const [pdf, setPdf] = useState<SharedPdfData | null>(null);
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);

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
    const matches = url.match(/\/files\/([^/]+)\/view/);
    return matches ? matches[1] : null;
  };

  // Get a direct PDF URL that works for opening in a new tab
  const getPdfUrl = (fileUrl: string): string => {
    const fileId = getFileIdFromUrl(fileUrl);
    if (fileId) {
      // Use our proxy endpoint
      return `/api/pdf/proxy/${fileId}`;
    }
    // Fallback to direct URL with CORS headers
    return fileUrl;
  };

  const handleOpenPdf = () => {
    if (pdf?.fileUrl) {
      window.open(getPdfUrl(pdf.fileUrl), '_blank');
    }
  };

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
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <Button 
                variant="contained" 
                size="large" 
                onClick={handleOpenPdf}
                sx={{ py: 2, px: 4 }}
              >
                Open PDF in New Tab
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