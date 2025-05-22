import express, { RequestHandler } from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth';
import {
  uploadPDF,
  getPDFs,
  getPDF,
  sharePDF,
  addComment,
  addReply,
  generateShareLink,
  getSharedPDF,
  addSharedComment,
  addSharedReply,
  proxyPdfFile,
  inviteUsersByEmail,
  getInvitedUsers,
  removeInvitedEmail,
  addNestedReply,
  addSharedNestedReply
} from '../controllers/pdfController';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
});

router.get('/proxy/:fileId', proxyPdfFile);
router.get('/shared/:token', getSharedPDF);
router.post('/shared/:token/comments', addSharedComment);
router.post('/shared/:token/comments/:commentId/replies', addSharedReply);

router.use(auth);

router.post('/upload', upload.single('pdf'), uploadPDF as RequestHandler);
router.get('/', getPDFs as RequestHandler);
router.get('/:id', getPDF as RequestHandler);
router.post('/:id/share', sharePDF as RequestHandler);
router.post('/:id/comments', addComment as RequestHandler);
router.post('/:id/comments/:commentId/replies', addReply as RequestHandler);
router.post('/:id/comments/:commentId/replies/:replyId/replies', addNestedReply as RequestHandler);
router.post('/:id/share-link', generateShareLink as RequestHandler);
router.post('/:id/invite', inviteUsersByEmail as RequestHandler);
router.get('/:id/invited', getInvitedUsers as RequestHandler);
router.delete('/:id/invited/:email', removeInvitedEmail as RequestHandler);
router.post('/shared/:token/comments/:commentId/replies/:replyId/replies', addSharedNestedReply);

export default router; 