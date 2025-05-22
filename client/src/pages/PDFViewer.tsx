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
import Topbar from '../components/Topbar/Topbar';
import '../styles/PDFViewer.css';

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
  accessToken?: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    if (isSubmitting || !comment.trim()) return;
    
    try {
      setIsSubmitting(true);
      await pdfService.addComment(id!, comment);
      setComment('');
      await loadPDF();
    } catch (error) {
      console.error('Failed to add comment:', error);
      setSnackbarMessage('Failed to add comment');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (commentId: string) => {
    try {
      await pdfService.addReply(id!, commentId, reply);
      setReply('');
      setSelectedComment(null);
      // Add a small delay before reloading to prevent race conditions
      setTimeout(() => {
        loadPDF();
      }, 500);
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
      // Add accessToken if available in the PDF data
      if (pdf?.accessToken) {
        return `/api/pdf/proxy/${fileId}?accessToken=${pdf.accessToken}&t=${Date.now()}`;
      }
      // Otherwise just use timestamp for cache-busting
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
    <>
      <Topbar />
      <div className="pdf-viewer-container">
        <div className="pdf-viewer-header">
          <h1 className="pdf-viewer-title">{pdf?.title}</h1>
          <div className="pdf-viewer-controls">
            <button className="pdf-viewer-button" onClick={handleShareClick}>
              <ShareIcon /> Share Link
            </button>
            <button className="pdf-viewer-button" onClick={handleInviteClick}>
              <PersonAddIcon /> Invite Users
            </button>
            {pdfError && (
              <button className="pdf-viewer-button secondary" onClick={loadPDF}>
                <RefreshIcon /> Retry
              </button>
            )}
          </div>
        </div>

        <div className="pdf-viewer-grid">
          <div className="pdf-viewer-card">
            {pdfLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="loading-spinner"></div>
              </div>
            )}
            {pdfError && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{pdfError}</p>
                <button className="pdf-viewer-button" onClick={handleOpenPdf}>
                  <PictureAsPdfIcon /> Open PDF in New Tab
                </button>
              </div>
            )}
            {pdf && !pdfLoading && !pdfError && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
                <button className="pdf-viewer-button" onClick={handleOpenPdf}>
                  <PictureAsPdfIcon /> Open PDF in New Tab
                </button>
              </div>
            )}
          </div>

          <div className="pdf-viewer-card">
            <div className="comments-section">
              <h2 className="comments-title">Comments</h2>
              <textarea
                className="comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
              />
              <button 
                className="pdf-viewer-button" 
                onClick={handleAddComment}
                disabled={isSubmitting || !comment.trim()}
              >
                {isSubmitting ? 'Adding...' : 'Add Comment'}
              </button>

              <ul className="comment-list">
                {pdf?.comments.map((comment: Comment) => (
                  <li key={comment._id} className="comment-item">
                    <p className="comment-text">{comment.text}</p>
                    <p className="comment-meta">
                      {comment.user.name} - {new Date(comment.createdAt).toLocaleString()}
                    </p>
                    {comment.replies.map((reply, index) => (
                      <div key={index} className="reply-section">
                        <p className="comment-text">{reply.text}</p>
                        <p className="comment-meta">
                          {reply.user.name} - {new Date(reply.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {selectedComment === comment._id ? (
                      <div className="reply-section">
                        <textarea
                          className="comment-input"
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Add a reply..."
                        />
                        <button className="pdf-viewer-button" onClick={() => handleAddReply(comment._id)}>
                          Add Reply
                        </button>
                      </div>
                    ) : (
                      <button className="reply-button" onClick={() => setSelectedComment(comment._id)}>
                        Reply
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {shareDialogOpen && (
          <div className="dialog-overlay">
            <div className="dialog">
              <h2 className="dialog-title">Share PDF</h2>
              <div className="dialog-content">
                <p>Share this link with others to give them access to this PDF:</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <button className="pdf-viewer-button" onClick={handleCopyLink}>
                    <ContentCopyIcon /> Copy
                  </button>
                </div>
              </div>
              <div className="dialog-actions">
                <button className="pdf-viewer-button secondary" onClick={() => setShareDialogOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {inviteDialogOpen && (
          <div className="dialog-overlay">
            <div className="dialog">
              <h2 className="dialog-title">Invite Users by Email</h2>
              <div className="dialog-content">
                <p>Enter email addresses to invite users to access this PDF:</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="example@email.com"
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <button className="pdf-viewer-button" onClick={handleAddEmail}>
                    <EmailIcon /> Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  {inviteEmails.map(email => (
                    <div
                      key={email}
                      style={{
                        background: '#f1f5f9',
                        padding: '0.5rem 1rem',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.25rem'
                        }}
                      >
                        <DeleteIcon style={{ fontSize: '1rem' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dialog-actions">
                <button className="pdf-viewer-button secondary" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </button>
                <button
                  className="pdf-viewer-button"
                  onClick={handleInviteUsers}
                  disabled={inviteEmails.length === 0}
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        )}

        {snackbarOpen && (
          <div
            style={{
              position: 'fixed',
              bottom: '1rem',
              right: '1rem',
              background: '#10b981',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {snackbarMessage}
          </div>
        )}
      </div>
    </>
  );
};

export default PDFViewer; 