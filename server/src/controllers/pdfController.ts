import { Request, Response } from 'express';
import { PDF, IPDF } from '../models/PDF';
import { User, IUser } from '../models/User';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import appwriteUpload from '../utils/appwriteUpload';
import axios from 'axios';

interface AuthRequest extends Request {
  user?: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  };
}

interface GuestUser {
  name: string;
  email: string;
}

interface Comment {
  _id: mongoose.Types.ObjectId;
  text: string;
  user: mongoose.Types.ObjectId | GuestUser;
  createdAt: Date;
  replies: {
    text: string;
    user: mongoose.Types.ObjectId | GuestUser;
    createdAt: Date;
  }[];
}

export const uploadPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Convert file buffer to base64
    const base64String = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;
    
    // Upload to Appwrite
    const fileUrl = await appwriteUpload.saveFile(base64String);

    const pdf = new PDF({
      title: req.body.title || req.file.originalname,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      fileUrl: fileUrl,
      owner: req.user._id
    });

    await pdf.save();
    res.status(201).json(pdf);
  } catch (error) {
    console.error('PDF upload error:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Upload failed: ${error.message}` });
    } else {
      res.status(500).json({ error: 'Upload failed: An unexpected error occurred' });
    }
  }
};

export const getPDFs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pdfs = await PDF.find({
      $or: [
        { owner: req.user!._id },
        { sharedWith: req.user!._id }
      ]
    }).populate('owner', 'name email');

    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
};

export const getPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user!._id },
        { sharedWith: req.user!._id }
      ]
    }).populate('owner', 'name email')
      .populate('comments.user', 'name email')
      .populate('comments.replies.user', 'name email');

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PDF' });
  }
};

export const sharePDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).exec();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const pdf = await PDF.findOne({
      _id: req.params.id,
      owner: req.user!._id
    });

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    const userId = user._id as mongoose.Types.ObjectId;
    if (pdf.sharedWith.some(id => id.toString() === userId.toString())) {
      res.status(400).json({ error: 'PDF already shared with this user' });
      return;
    }

    pdf.sharedWith.push(userId);
    await pdf.save();

    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to share PDF' });
  }
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    const pdf = await PDF.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user!._id },
        { sharedWith: req.user!._id }
      ]
    });

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    pdf.comments.push({
      text,
      user: req.user!._id,
      createdAt: new Date()
    });

    await pdf.save();
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const addReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text, commentId } = req.body;
    const pdf = await PDF.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user!._id },
        { sharedWith: req.user!._id }
      ]
    });

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    const comment = (pdf.comments as Comment[]).find(c => c._id.toString() === commentId);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (!comment.replies) {
      comment.replies = [];
    }

    comment.replies.push({
      text,
      user: req.user!._id,
      createdAt: new Date()
    });

    await pdf.save();
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
};

export const generateShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      owner: req.user!._id
    });

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');
    pdf.shareToken = token;
    await pdf.save();

    // Generate the shareable link
    const shareLink = `${process.env.CLIENT_URL}/shared/${token}`;
    res.json({ link: shareLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate share link' });
  }
};

export const getSharedPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const pdf = await PDF.findOne({ shareToken: req.params.token })
      .populate('comments.user', 'name email')
      .populate('comments.replies.user', 'name email');

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shared PDF' });
  }
};

export const addSharedComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, guestName } = req.body;
    const pdf = await PDF.findOne({ shareToken: req.params.token });

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    const guestUser: GuestUser = {
      name: guestName,
      email: `guest-${Date.now()}@example.com`
    };

    pdf.comments.push({
      text,
      user: guestUser as any, // Type assertion needed since we're using a simplified user object
      createdAt: new Date()
    });

    await pdf.save();
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const addSharedReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, guestName, commentId } = req.body;
    const pdf = await PDF.findOne({ shareToken: req.params.token });

    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    const comment = (pdf.comments as Comment[]).find(c => c._id.toString() === commentId);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (!comment.replies) {
      comment.replies = [];
    }

    const guestUser: GuestUser = {
      name: guestName,
      email: `guest-${Date.now()}@example.com`
    };

    comment.replies.push({
      text,
      user: guestUser as any, // Type assertion needed since we're using a simplified user object
      createdAt: new Date()
    });

    await pdf.save();
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
};

export const proxyPdfFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      res.status(400).json({ error: 'File ID is required' });
      return;
    }

    const appwriteEndpoint = process.env.APPWRITE_ENDPOINT;
    const appwriteProjectId = process.env.APPWRITE_PROJECT_ID;
    const appwriteBucketId = process.env.APPWRITE_BUCKET_ID;
    const appwriteApiKey = process.env.APPWRITE_API_KEY;
    
    if (!appwriteEndpoint || !appwriteProjectId || !appwriteBucketId || !appwriteApiKey) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Updated URL format to match Appwrite's API specification
    const fileUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${fileId}/view`;
    
    console.log(`[PDF Proxy] Attempting to proxy PDF from Appwrite URL: ${fileUrl}`);
    console.log(`[PDF Proxy] Request headers:`, req.headers);
    
    try {
      const response = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'arraybuffer',
        headers: {
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
          'Accept': 'application/pdf' // Explicitly request PDF content
        }
      });
      
      // Log some information about the response
      console.log(`[PDF Proxy] Received data from Appwrite. Size: ${response.data.length} bytes`);
      console.log(`[PDF Proxy] Response content type: ${response.headers['content-type']}`);
      console.log(`[PDF Proxy] Response headers:`, response.headers);
      
      // Check if we received a PDF or binary data
      const contentType = response.headers['content-type'];
      
      // Check for PDF magic number (%PDF-)
      const data = Buffer.from(response.data);
      if (data.length >= 5) {
        const magicNumber = data.toString('ascii', 0, 5);
        console.log(`[PDF Proxy] File magic number: "${magicNumber}"`);
        
        if (magicNumber === '%PDF-') {
          // This is a valid PDF file by magic number check
          console.log('[PDF Proxy] PDF magic number detected in the response');
          
          // Set appropriate headers
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', data.length);
          res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
          res.setHeader('Cache-Control', 'no-cache');
          
          // Send the PDF data
          res.status(200).send(data);
          console.log('[PDF Proxy] Successfully sent PDF data to client');
          return;
        }
      }
      
      // If content type is HTML or not PDF, and we didn't detect PDF magic number
      if (!contentType || !contentType.includes('application/pdf')) {
        console.error('Received non-PDF content type:', contentType);
        
        // If the response is text/html or similar, log a portion for debugging
        if (contentType && (contentType.includes('text/html') || contentType.includes('text/plain'))) {
          const textContent = Buffer.from(response.data).toString('utf8').substring(0, 500);
          console.error('Content preview (first 500 chars):', textContent);
          
          // Instead of returning an error, try to redirect to the direct Appwrite URL
          const directUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${fileId}/view?project=${appwriteProjectId}`;
          res.redirect(directUrl);
          return;
        }
      }
      
      // Set appropriate headers for any other binary data
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', response.data.length);
      res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send the data
      res.status(200).send(response.data);
    } catch (error) {
      console.error('Failed to fetch PDF from Appwrite:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          data: error.response?.data instanceof Buffer 
            ? 'Binary data' 
            : typeof error.response?.data === 'string' 
              ? error.response?.data.substring(0, 200) + '...' 
              : error.response?.data ? JSON.stringify(error.response?.data).substring(0, 200) + '...' : 'No data'
        });
        
        // Try to redirect to direct URL if there's an error
        const directUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${fileId}/view?project=${appwriteProjectId}`;
        res.redirect(directUrl);
        return;
      }
      res.status(404).json({ error: 'PDF file not found or inaccessible' });
    }
  } catch (error) {
    console.error('PDF proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy PDF file' });
  }
}; 