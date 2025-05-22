import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Sends an invitation email to a user with a link to access a shared PDF
 * @param recipientEmail Email address of the invited user
 * @param pdfName Name of the PDF being shared
 * @param shareLink Link to access the PDF
 * @param senderName Name of the user sharing the PDF
 */
export const sendInvitationEmail = async (
  recipientEmail: string,
  pdfName: string,
  shareLink: string,
  senderName: string = 'A user'
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `You have been invited to view a PDF document`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">PDF Document Shared With You</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">${senderName} has shared a PDF document with you: <strong>${pdfName}</strong></p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">You can access it by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Document</a>
          </div>
          <p style="font-size: 14px; color: #777;">If you're having trouble with the button, you can also copy and paste this link into your browser:</p>
          <p style="font-size: 14px; color: #777; word-break: break-all;">${shareLink}</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
};

export default {
  sendInvitationEmail
}; 