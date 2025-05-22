import { Request, Response } from 'express';
import { PDF, IPDF } from '../models/PDF';
import { User, IUser } from '../models/User';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import appwriteUpload from '../utils/appwriteUpload';

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