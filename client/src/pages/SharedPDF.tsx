import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  accessToken?: string;
}

const SharedPDF = () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const [pdf, setPdf] = useState<SharedPdfData | null>(null);
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [emailVerificationOpen, setEmailVerificationOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for email in URL query params
    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get('email');
    if (email) {
      setGuestEmail(email);
      // Try to load with the email from URL
      loadSharedPDF(email);
    } else {
      // Show email verification dialog if no email in URL
      setEmailVerificationOpen(true);
    }
  }, [token, location.search]);

  const loadSharedPDF = async (email?: string) => {
    try {
      setPdfLoading(true);
      setPdfError(null);
      setAuthError(null);
      
      const data = await pdfService.getSharedPDF(token!, email);
      setPdf(data);
      
      // If we successfully loaded with email, mark as verified
      if (email) {
        setEmailVerified(true);
        setEmailVerificationOpen(false);
      }
    } catch (error: any) {
      console.error('Failed to load shared PDF:', error);
      if (error.response && error.response.status === 403) {
        // This is an authorization error
        setAuthError('You are not authorized to access this PDF. Please check your email address.');
        setEmailVerificationOpen(true);
      } else {
        setPdfError('Failed to load PDF. Please try again later.');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleVerifyEmail = () => {
    if (!guestEmail) {
      setAuthError('Please enter your email address');
      return;
    }
    loadSharedPDF(guestEmail);
  };

  // Get file ID from Appwrite URL
  const getFileIdFromUrl = (url: string): string | null => {
    const matches = url.match(/\/files\/([^/]+)\/view/);
    return matches ? matches[1] : null;
  };

  // Get a direct PDF URL that works for opening in a new tab
  const getPdfUrl = (fileUrl: string): string => {
    const fileId = getFileIdFromUrl(fileUrl);
    if (fileId && pdf?.accessToken) {
      // Use our proxy endpoint with the access token
      return `/api/pdf/proxy/${fileId}?accessToken=${pdf.accessToken}`;
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
      loadSharedPDF(guestEmail);
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
      loadSharedPDF(guestEmail);
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
          {pdfLoading && !authError && (
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
                onClick={() => loadSharedPDF(guestEmail)}
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

      <Dialog open={emailVerificationOpen} onClose={() => setEmailVerificationOpen(false)}>
        <DialogTitle>Email Verification</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please enter your email address to access this PDF.
          </Typography>
          {authError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {authError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="example@email.com"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVerifyEmail} variant="contained">
            Verify
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SharedPDF; 