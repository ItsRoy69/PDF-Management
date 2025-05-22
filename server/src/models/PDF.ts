import mongoose from 'mongoose';

export interface IPDF extends mongoose.Document {
  title: string;
  name: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  owner: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  invitedEmails: string[];
  shareToken?: string;
  accessTokens?: string[];
  comments: {
    _id: mongoose.Types.ObjectId;
    text: string;
    user: mongoose.Types.ObjectId | {
      name: string;
      email: string;
    };
    createdAt: Date;
    replies?: {
      _id: mongoose.Types.ObjectId;
      text: string;
      user: mongoose.Types.ObjectId | {
        name: string;
        email: string;
      };
      createdAt: Date;
      replies?: {
        _id: mongoose.Types.ObjectId;
        text: string;
        user: mongoose.Types.ObjectId | {
          name: string;
          email: string;
        };
        createdAt: Date;
      }[];
    }[];
  }[];
}

const PDFSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  invitedEmails: [String],
  shareToken: String,
  accessTokens: [String],
  comments: [{
    text: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    createdAt: { type: Date, default: Date.now },
    replies: [{
      text: { type: String, required: true },
      user: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },
      createdAt: { type: Date, default: Date.now },
      replies: [{
        text: { type: String, required: true },
        user: {
          type: mongoose.Schema.Types.Mixed,
          required: true
        },
        createdAt: { type: Date, default: Date.now }
      }]
    }]
  }]
}, { timestamps: true });

export const PDF = mongoose.model<IPDF>('PDF', PDFSchema); 