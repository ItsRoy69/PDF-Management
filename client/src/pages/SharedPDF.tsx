import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { pdfService } from '../services/api';
import Topbar from '../components/Topbar/Topbar';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import '../styles/PDFViewer.css';

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
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get('email');
    if (email) {
      setGuestEmail(email);
      loadSharedPDF(email);
    } else {
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
      
      if (email) {
        setEmailVerificationOpen(false);
      }
    } catch (error: any) {
      console.error('Failed to load shared PDF:', error);
      if (error.response && error.response.status === 403) {
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

  const getFileIdFromUrl = (url: string): string | null => {
    const matches = url.match(/\/files\/([^/]+)\/view/);
    return matches ? matches[1] : null;
  };

  const getPdfUrl = (fileUrl: string): string => {
    const fileId = getFileIdFromUrl(fileUrl);
    if (fileId && pdf?.accessToken) {
      return `/api/pdf/proxy/${fileId}?accessToken=${pdf.accessToken}`;
    }
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
    <>
      <Topbar />
      <div className="pdf-viewer-container">
        <div className="pdf-viewer-grid">
          <div className="pdf-viewer-card">
            <h1 className="pdf-viewer-title">{pdf?.title}</h1>
            {pdfLoading && !authError && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="loading-spinner"></div>
              </div>
            )}
            {pdfError && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{pdfError}</p>
                <button className="pdf-viewer-button" onClick={() => loadSharedPDF(guestEmail)}>
                  Retry
                </button>
              </div>
            )}
            {pdf && !pdfLoading && !pdfError && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <button className="pdf-viewer-button" onClick={handleOpenPdf}>
                  <PictureAsPdfIcon /> Open PDF in New Tab
                </button>
              </div>
            )}
          </div>

          <div className="pdf-viewer-card">
            <div className="comments-section">
              <h2 className="comments-title">Comments</h2>
              <input
                type="text"
                className="comment-input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your Name"
                style={{ marginBottom: '1rem' }}
              />
              <textarea
                className="comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
              />
              <button className="pdf-viewer-button" onClick={handleAddComment}>
                Add Comment
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

        {emailVerificationOpen && (
          <div className="dialog-overlay">
            <div className="dialog">
              <h2 className="dialog-title">Email Verification</h2>
              <div className="dialog-content">
                <p>Please enter your email address to access this PDF.</p>
                {authError && (
                  <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{authError}</p>
                )}
                <input
                  type="email"
                  className="comment-input"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
              <div className="dialog-actions">
                <button className="pdf-viewer-button" onClick={handleVerifyEmail}>
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SharedPDF; 