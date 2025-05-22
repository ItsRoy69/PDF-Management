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
  addSharedReply
} from '../controllers/pdfController';

const router = express.Router();

// Configure multer for memory storage
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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Protected routes
router.use(auth);

router.post('/upload', upload.single('pdf'), uploadPDF as RequestHandler);
router.get('/', getPDFs as RequestHandler);
router.get('/:id', getPDF as RequestHandler);
router.post('/:id/share', sharePDF as RequestHandler);
router.post('/:id/comments', addComment as RequestHandler);
router.post('/:id/comments/:commentId/replies', addReply as RequestHandler);
router.post('/:id/share-link', generateShareLink as RequestHandler);

// Public routes for shared PDFs
router.get('/shared/:token', getSharedPDF as RequestHandler);
router.post('/shared/:token/comments', addSharedComment as RequestHandler);
router.post('/shared/:token/comments/:commentId/replies', addSharedReply as RequestHandler);

export default router; 