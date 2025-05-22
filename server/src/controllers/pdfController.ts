import { Request, Response } from "express";
import { PDF, IPDF } from "../models/PDF";
import { User, IUser } from "../models/User";
import crypto from "crypto";
import mongoose from "mongoose";
import appwriteUpload from "../utils/appwriteUpload";
import axios from "axios";
import jwt from "jsonwebtoken";
import { sendInvitationEmail } from "../services/emailService";

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
  user:
    | mongoose.Types.ObjectId
    | {
        name: string;
        email: string;
      };
  createdAt: Date;
  replies?: {
    _id: mongoose.Types.ObjectId;
    text: string;
    user:
      | mongoose.Types.ObjectId
      | {
          name: string;
          email: string;
        };
    createdAt: Date;
    replies?: {
      _id: mongoose.Types.ObjectId;
      text: string;
      user:
        | mongoose.Types.ObjectId
        | {
            name: string;
            email: string;
          };
      createdAt: Date;
    }[];
  }[];
}

export const uploadPDF = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const base64String = `data:application/pdf;base64,${req.file.buffer.toString(
      "base64"
    )}`;

    const fileUrl = await appwriteUpload.saveFile(base64String);

    const title = req.body.title || req.file.originalname;

    const pdf = new PDF({
      title,
      name: title,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      fileUrl: fileUrl,
      owner: req.user._id,
    });

    await pdf.save();
    res.status(201).json(pdf);
  } catch (error) {
    console.error("PDF upload error:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Upload failed: ${error.message}` });
    } else {
      res
        .status(500)
        .json({ error: "Upload failed: An unexpected error occurred" });
    }
  }
};

export const getPDFs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const pdfs = await PDF.find({
      $or: [{ owner: req.user!._id }, { sharedWith: req.user!._id }],
    }).populate("owner", "name email");

    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch PDFs" });
  }
};

export const getPDF = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user!._id }, { sharedWith: req.user!._id }],
    })
      .populate("owner", "name email")
      .populate("comments.user", "name email")
      .populate("comments.replies.user", "name email");

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const accessToken = crypto.randomBytes(16).toString("hex");

    if (!pdf.accessTokens) {
      pdf.accessTokens = [];
    }

    if (pdf.accessTokens.length > 100) {
      pdf.accessTokens = pdf.accessTokens.slice(-50);
    }

    pdf.accessTokens.push(accessToken);
    await pdf.save();

    const pdfData = pdf.toObject();
    (pdfData as any).accessToken = accessToken;

    res.json(pdfData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch PDF" });
  }
};

export const sharePDF = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).exec();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const pdf = await PDF.findOne({
      _id: req.params.id,
      owner: req.user!._id,
    });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const userId = user._id as mongoose.Types.ObjectId;
    if (pdf.sharedWith.some((id) => id.toString() === userId.toString())) {
      res.status(400).json({ error: "PDF already shared with this user" });
      return;
    }

    pdf.sharedWith.push(userId);
    await pdf.save();

    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: "Failed to share PDF" });
  }
};

export const addComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { text } = req.body;
    const pdf = await PDF.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user!._id }, { sharedWith: req.user!._id }],
    });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      text,
      user: req.user!._id,
      createdAt: new Date(),
      replies: [],
    };

    pdf.comments.push(newComment);
    await pdf.save();
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
};

export const addReply = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { text } = req.body;
    const { id, commentId } = req.params;
    const pdf = await PDF.findOne({
      _id: id,
      $or: [{ owner: req.user!._id }, { sharedWith: req.user!._id }],
    });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const comment = (pdf.comments as Comment[]).find(
      (c) => c._id.toString() === commentId
    );
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    if (!comment.replies) {
      comment.replies = [];
    }

    const newReply = {
      _id: new mongoose.Types.ObjectId(),
      text,
      user: req.user!._id,
      createdAt: new Date(),
      replies: [],
    };

    comment.replies.push(newReply);
    await pdf.save();
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: "Failed to add reply" });
  }
};

export const generateShareLink = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      owner: req.user!._id,
    });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    pdf.shareToken = token;
    await pdf.save();

    const clientUrl = process.env.CLIENT_URL || "";
    const sharePath = `/shared/${token}`;
    const shareLink = clientUrl ? `${clientUrl}${sharePath}` : sharePath;

    res.json({ link: shareLink });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate share link" });
  }
};

export const inviteUsersByEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({ error: "Valid email addresses are required" });
      return;
    }

    const pdf = await PDF.findOne({
      _id: req.params.id,
      owner: req.user!._id,
    }).populate<{ owner: IUser }>("owner", "name email");

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    if (!pdf.shareToken) {
      pdf.shareToken = crypto.randomBytes(32).toString("hex");
    }

    const newInvites: string[] = [];
    emails.forEach((email) => {
      if (!pdf.invitedEmails.includes(email)) {
        pdf.invitedEmails.push(email);
        newInvites.push(email);
      }
    });

    await pdf.save();

    const clientUrl = process.env.CLIENT_URL || "";
    const sharePath = `/shared/${pdf.shareToken}`;
    const shareLink = clientUrl ? `${clientUrl}${sharePath}` : sharePath;

    const emailPromises = newInvites.map((email) =>
      sendInvitationEmail(
        email,
        pdf.name || "PDF Document",
        shareLink,
        pdf.owner?.name || "A user"
      )
    );

    Promise.all(emailPromises)
      .then((results) => {
        const successCount = results.filter((result) => result).length;
        console.log(
          `Successfully sent ${successCount} of ${newInvites.length} invitation emails`
        );
      })
      .catch((error) => {
        console.error("Error sending invitation emails:", error);
      });

    res.json({
      link: shareLink,
      invitedEmails: pdf.invitedEmails,
    });
  } catch (error) {
    console.error("Failed to invite users:", error);
    res.status(500).json({ error: "Failed to invite users" });
  }
};

export const getInvitedUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      owner: req.user!._id,
    });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    res.json({
      invitedEmails: pdf.invitedEmails,
      sharedWith: pdf.sharedWith,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get invited users" });
  }
};

export const removeInvitedEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.params;

    const pdf = await PDF.findOne({
      _id: req.params.id,
      owner: req.user!._id,
    });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    pdf.invitedEmails = pdf.invitedEmails.filter((e) => e !== email);
    await pdf.save();

    res.json({
      success: true,
      invitedEmails: pdf.invitedEmails,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove invited user" });
  }
};

export const getSharedPDF = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pdf = await PDF.findOne({ shareToken: req.params.token })
      .populate("comments.user", "name email")
      .populate("comments.replies.user", "name email");

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const requestEmail = req.query.email as string;
    if (requestEmail && !pdf.invitedEmails.includes(requestEmail)) {
      const authHeader = req.headers.authorization;
      let isAuthenticated = false;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
          ) as { id: string };
          const userId = new mongoose.Types.ObjectId(decoded.id);
          if (
            pdf.owner.equals(userId) ||
            pdf.sharedWith.some((id) => id.equals(userId))
          ) {
            isAuthenticated = true;
          }
        } catch (error) {
          console.error("Invalid auth token:", error);
        }
      }

      if (!isAuthenticated) {
        res
          .status(403)
          .json({ error: "You are not authorized to view this PDF" });
        return;
      }
    }

    const accessToken = crypto.randomBytes(16).toString("hex");

    if (!pdf.accessTokens) {
      pdf.accessTokens = [];
    }

    if (pdf.accessTokens.length > 100) {
      pdf.accessTokens = pdf.accessTokens.slice(-50);
    }

    pdf.accessTokens.push(accessToken);
    await pdf.save();

    const pdfData = pdf.toObject();
    (pdfData as any).accessToken = accessToken;

    res.json(pdfData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch shared PDF" });
  }
};

export const addSharedComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { text, guestName } = req.body;
    const pdf = await PDF.findOne({ shareToken: req.params.token });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const guestUser = {
      name: guestName,
      email: `guest-${Date.now()}@example.com`,
    };

    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      text,
      user: guestUser,
      createdAt: new Date(),
      replies: [],
    };

    pdf.comments.push(newComment);
    await pdf.save();
    res.json(pdf);
  } catch (error) {
    console.error("Failed to add comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

export const addSharedReply = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { text, guestName } = req.body;
    const { token, commentId } = req.params;
    const pdf = await PDF.findOne({ shareToken: token });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const comment = (pdf.comments as Comment[]).find(
      (c) => c._id.toString() === commentId
    );
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    if (!comment.replies) {
      comment.replies = [];
    }

    const guestUser = {
      name: guestName,
      email: `guest-${Date.now()}@example.com`,
    };

    comment.replies.push({
      _id: new mongoose.Types.ObjectId(),
      text,
      user: guestUser,
      createdAt: new Date(),
    });

    await pdf.save();
    res.json(pdf);
  } catch (error) {
    console.error("Failed to add reply:", error);
    res.status(500).json({ error: "Failed to add reply" });
  }
};

export const addNestedReply = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { text } = req.body;
    const { id, commentId, replyId } = req.params;
    const pdf = await PDF.findOne({
      _id: id,
      $or: [{ owner: req.user!._id }, { sharedWith: req.user!._id }],
    });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const comment = (pdf.comments as Comment[]).find(
      (c) => c._id.toString() === commentId
    );
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    const parentReply = comment.replies?.find(
      (r) => r._id.toString() === replyId
    );
    if (!parentReply) {
      res.status(404).json({ error: "Reply not found" });
      return;
    }

    if (!parentReply.replies) {
      parentReply.replies = [];
    }

    parentReply.replies.push({
      _id: new mongoose.Types.ObjectId(),
      text,
      user: req.user!._id,
      createdAt: new Date(),
    });

    await pdf.save();
    res.json(pdf);
  } catch (error) {
    console.error("Failed to add nested reply:", error);
    res.status(500).json({ error: "Failed to add nested reply" });
  }
};

export const addSharedNestedReply = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { text, guestName } = req.body;
    const { token, commentId, replyId } = req.params;
    const pdf = await PDF.findOne({ shareToken: token });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const comment = (pdf.comments as Comment[]).find(
      (c) => c._id.toString() === commentId
    );
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    const parentReply = comment.replies?.find(
      (r) => r._id.toString() === replyId
    );
    if (!parentReply) {
      res.status(404).json({ error: "Reply not found" });
      return;
    }

    if (!parentReply.replies) {
      parentReply.replies = [];
    }

    const guestUser = {
      name: guestName,
      email: `guest-${Date.now()}@example.com`,
    };

    parentReply.replies.push({
      _id: new mongoose.Types.ObjectId(),
      text,
      user: guestUser,
      createdAt: new Date(),
    });

    await pdf.save();
    res.json(pdf);
  } catch (error) {
    console.error("Failed to add nested reply:", error);
    res.status(500).json({ error: "Failed to add nested reply" });
  }
};

export const proxyPdfFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fileId } = req.params;
    const { accessToken } = req.query;

    if (!fileId) {
      res.status(400).json({ error: "File ID is required" });
      return;
    }

    let isAuthorized = false;
    let userId: mongoose.Types.ObjectId | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
          id: string;
        };
        userId = new mongoose.Types.ObjectId(decoded.id);
      } catch (error) {
        console.error("Invalid auth token:", error);
      }
    }

    const pdfFileUrl = new RegExp(fileId);
    const pdf = await PDF.findOne({ fileUrl: pdfFileUrl });

    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    if (userId) {
      if (
        pdf.owner.equals(userId) ||
        pdf.sharedWith.some((id) => id.equals(userId))
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && accessToken) {
      if (
        pdf.accessTokens &&
        pdf.accessTokens.includes(accessToken as string)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      res.status(403).json({
        error:
          "Unauthorized access. Please access this PDF through its shared link.",
      });
      return;
    }

    const appwriteEndpoint = process.env.APPWRITE_ENDPOINT;
    const appwriteProjectId = process.env.APPWRITE_PROJECT_ID;
    const appwriteBucketId = process.env.APPWRITE_BUCKET_ID;
    const appwriteApiKey = process.env.APPWRITE_API_KEY;

    if (
      !appwriteEndpoint ||
      !appwriteProjectId ||
      !appwriteBucketId ||
      !appwriteApiKey
    ) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }
    const fileUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${fileId}/view`;

    console.log(
      `[PDF Proxy] Attempting to proxy PDF from Appwrite URL: ${fileUrl}`
    );
    console.log(`[PDF Proxy] Request headers:`, req.headers);

    try {
      const response = await axios({
        method: "get",
        url: fileUrl,
        responseType: "arraybuffer",
        headers: {
          "X-Appwrite-Project": appwriteProjectId,
          "X-Appwrite-Key": appwriteApiKey,
          Accept: "application/pdf",
        },
      });

      const contentType = response.headers["content-type"];

      const data = Buffer.from(response.data);
      if (data.length >= 5) {
        const magicNumber = data.toString("ascii", 0, 5);
        console.log(`[PDF Proxy] File magic number: "${magicNumber}"`);

        if (magicNumber === "%PDF-") {
          console.log("[PDF Proxy] PDF magic number detected in the response");

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Length", data.length);
          res.setHeader(
            "Content-Disposition",
            'inline; filename="document.pdf"'
          );
          res.setHeader("Cache-Control", "no-cache");

          res.status(200).send(data);
          console.log("[PDF Proxy] Successfully sent PDF data to client");
          return;
        }
      }

      if (!contentType || !contentType.includes("application/pdf")) {
        console.error("Received non-PDF content type:", contentType);

        if (
          contentType &&
          (contentType.includes("text/html") ||
            contentType.includes("text/plain"))
        ) {
          const textContent = Buffer.from(response.data)
            .toString("utf8")
            .substring(0, 500);
          console.error("Content preview (first 500 chars):", textContent);

          const directUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${fileId}/view?project=${appwriteProjectId}`;
          res.redirect(directUrl);
          return;
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", response.data.length);
      res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
      res.setHeader("Cache-Control", "no-cache");

      res.status(200).send(response.data);
    } catch (error) {
      console.error("Failed to fetch PDF from Appwrite:", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          data:
            error.response?.data instanceof Buffer
              ? "Binary data"
              : typeof error.response?.data === "string"
              ? error.response?.data.substring(0, 200) + "..."
              : error.response?.data
              ? JSON.stringify(error.response?.data).substring(0, 200) + "..."
              : "No data",
        });

        const directUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${fileId}/view?project=${appwriteProjectId}`;
        res.redirect(directUrl);
        return;
      }
      res.status(404).json({ error: "PDF file not found or inaccessible" });
    }
  } catch (error) {
    console.error("PDF proxy error:", error);
    res.status(500).json({ error: "Failed to proxy PDF file" });
  }
};
