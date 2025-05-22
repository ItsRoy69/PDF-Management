import React, { useEffect, useState, useMemo } from 'react';
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
  Link,
  Chip,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';
import { pdfService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EmailIcon from '@mui/icons-material/Email';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// Use local worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

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

interface PDFData {
  title: string;
  fileUrl: string;
  comments: Comment[];
  invitedEmails?: string[];
}

const PDFViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [pdf, setPdf] = useState<PDFData | null>(null);
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  
  useEffect(() => {
    loadPDF();
  }, [id]);

  useEffect(() => {
    if (id) {
      loadInvitedUsers();
    }
  }, [id]);

  const loadPDF = async () => {
    try {
      setPdfLoading(true);
      setPdfError(null);
      const data = await pdfService.getOne(id!);
      setPdf(data);
      
      // Log success message
      console.log('PDF data loaded successfully:', data.title);
    } catch (error) {
      console.error('Failed to load PDF data:', error);
      setPdfError(`Failed to load PDF data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const loadInvitedUsers = async () => {
    try {
      const data = await pdfService.getInvitedUsers(id!);
      setInvitedUsers(data.invitedEmails || []);
    } catch (error) {
      console.error('Failed to load invited users:', error);
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
      
      const fullLink = link.startsWith('http') 
        ? link 
        : `${window.location.origin}${link.startsWith('/') ? '' : '/'}${link}`;
      
      setShareLink(fullLink);
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
    const matches = url.match(/\/files\/([^/]+)\/view/);
    return matches ? matches[1] : null;
  };

  const getPdfUrl = (fileUrl: string): string => {
    const fileId = getFileIdFromUrl(fileUrl);
    if (fileId) {
      // Add cache-busting parameter to avoid browser caching issues
      return `/api/pdf/proxy/${fileId}?t=${Date.now()}`;
    }
    return fileUrl;
  };

  // Gets a direct URL from Appwrite that could be used as fallback
  const getDirectAppwriteUrl = (fileUrl: string): string | null => {
    const fileId = getFileIdFromUrl(fileUrl);
    if (!fileId) return null;
    
    const appwriteEndpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const appwriteProjectId = import.meta.env.VITE_APPWRITE_PROJECT_ID; 
    const appwriteBucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
    
    if (!appwriteEndpoint || !appwriteProjectId || !appwriteBucketId) return null;
    
    return `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${fileId}/view?project=${appwriteProjectId}`;
  };

  const handleOpenPdf = () => {
    if (pdf?.fileUrl) {
      // Try to open the proxy URL, fall back to direct Appwrite URL if needed
      const url = getPdfUrl(pdf.fileUrl);
      const directUrl = getDirectAppwriteUrl(pdf.fileUrl);
      
      window.open(url, '_blank');
      
      // Log the URL for debugging
      console.log('Opening PDF URL:', url);
      if (directUrl) {
        console.log('Direct Appwrite URL (fallback):', directUrl);
      }
    }
  };

  // Memoize PDF options to prevent unnecessary re-renders
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`
  }), []);

  const handleInviteClick = () => {
    setInviteEmail('');
    setInviteEmails([]);
    setInviteDialogOpen(true);
  };

  const handleAddEmail = () => {
    if (inviteEmail && !inviteEmails.includes(inviteEmail)) {
      setInviteEmails([...inviteEmails, inviteEmail]);
      setInviteEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };

  const handleInviteUsers = async () => {
    if (inviteEmails.length === 0) return;
    
    try {
      const result = await pdfService.inviteUsers(id!, inviteEmails);
      setShareLink(result.link);
      setInviteDialogOpen(false);
      setSnackbarMessage(`Successfully invited ${inviteEmails.length} user(s)`);
      setSnackbarOpen(true);
      loadInvitedUsers();
    } catch (error) {
      console.error('Failed to invite users:', error);
      setSnackbarMessage('Failed to invite users');
      setSnackbarOpen(true);
    }
  };

  const handleRemoveInvitedUser = async (email: string) => {
    try {
      await pdfService.removeInvitedUser(id!, email);
      setInvitedUsers(invitedUsers.filter(e => e !== email));
      setSnackbarMessage('User removed successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to remove invited user:', error);
      setSnackbarMessage('Failed to remove user');
      setSnackbarOpen(true);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container>
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">{pdf?.title}</Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<ShareIcon />}
                onClick={handleShareClick}
                sx={{ mr: 1 }}
              >
                Share Link
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleInviteClick}
                sx={{ mr: 1 }}
              >
                Invite Users
              </Button>
              {pdfError && (
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadPDF}
                >
                  Retry
                </Button>
              )}
            </Box>
          </Box>
          {pdfLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
              <CircularProgress />
            </Box>
          )}
          {pdfError && (
            <Box sx={{ textAlign: 'center', my: 5 }}>
              <Typography color="error" gutterBottom>
                {pdfError}
              </Typography>
              <Button 
                variant="contained"
                startIcon={<PictureAsPdfIcon />}
                onClick={handleOpenPdf}
                sx={{ mt: 2 }}
              >
                Open PDF in New Tab
              </Button>
            </Box>
          )}
          {pdf && !pdfLoading && !pdfError && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
              <Button 
                variant="contained" 
                size="large" 
                startIcon={<PictureAsPdfIcon />}
                onClick={handleOpenPdf}
                sx={{ py: 2, px: 4 }}
              >
                Open PDF in New Tab
              </Button>
            </Box>
          )}
        </Paper>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Comments" />
              <Tab label="Invited Users" />
            </Tabs>
          </Box>
          
          {tabValue === 0 && (
            <Box>
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
            </Box>
          )}
          
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Invited Users
              </Typography>
              {invitedUsers.length > 0 ? (
                <List>
                  {invitedUsers.map((email) => (
                    <ListItem 
                      key={email}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleRemoveInvitedUser(email)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText 
                        primary={email}
                        secondary="Invited by email"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1">
                  No users have been invited by email yet.
                </Typography>
              )}
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleInviteClick}
                sx={{ mt: 2 }}
              >
                Invite More Users
              </Button>
            </Box>
          )}
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

      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
        <DialogTitle>Invite Users by Email</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Enter email addresses to invite users to access this PDF:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="example@email.com"
            />
            <Button
              startIcon={<EmailIcon />}
              onClick={handleAddEmail}
              sx={{ ml: 1 }}
            >
              Add
            </Button>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {inviteEmails.map(email => (
              <Chip 
                key={email} 
                label={email} 
                onDelete={() => handleRemoveEmail(email)} 
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleInviteUsers} 
            variant="contained"
            disabled={inviteEmails.length === 0}
          >
            Invite
          </Button>
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