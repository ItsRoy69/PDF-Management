import mongoose from 'mongoose';

export interface IPDF extends mongoose.Document {
  title: string;
  filename: string;
  originalName: string;
  path: string;
  owner: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  shareToken?: string;
  comments: {
    text: string;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
    replies?: {
      text: string;
      user: mongoose.Types.ObjectId;
      createdAt: Date;
    }[];
  }[];
}

const pdfSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  comments: [{
    text: {
      type: String,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    replies: [{
      text: {
        type: String,
        required: true
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }]
}, {
  timestamps: true
});

export const PDF = mongoose.model<IPDF>('PDF', pdfSchema); 