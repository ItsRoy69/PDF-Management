import express, { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
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

// Configure multer for PDF upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
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
router.post('/:id/share-link', generateShareLink as RequestHandler);
router.post('/:id/comments', addComment as RequestHandler);
router.post('/:id/comments/:commentId/replies', addReply as RequestHandler);

// Public routes for shared PDFs
router.get('/shared/:token', getSharedPDF as RequestHandler);
router.post('/shared/:token/comments', addSharedComment as RequestHandler);
router.post('/shared/:token/comments/:commentId/replies', addSharedReply as RequestHandler);

export default router; 