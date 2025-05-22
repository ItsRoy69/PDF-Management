import { Request, Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

interface RegisterRequest extends Request {
  body: {
    name: string;
    email: string;
    password: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

interface ForgotPasswordRequest extends Request {
  body: {
    email: string;
  };
}

interface ResetPasswordRequest extends Request {
  body: {
    password: string;
  };
  params: {
    token: string;
  };
}

export const register = async (req: RegisterRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    console.log('Registration attempt for email:', email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Registration failed: User already exists');
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const user = new User({
      name,
      email,
      password
    });

    await user.save();
    console.log('User registered successfully:', email);

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('Login failed: User not found');
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    console.log('Comparing passwords for user:', email);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Login failed: Invalid password');
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    console.log('Login successful for user:', email);

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const forgotPassword = async (req: ForgotPasswordRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    console.log('Password reset requested for email:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('Password reset requested for non-existent user:', email);
      res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    
    await user.save();

    const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetURL = `${clientURL}/reset-password/${resetToken}`;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) requested a password reset for your account.\n\n
        Please click on the following link, or paste it into your browser to complete the process:\n\n
        ${resetURL}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };
    
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
    
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      console.log('Invalid or expired reset token:', token);
      res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      return;
    }
    
    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ error: 'Failed to validate reset token' });
  }
};

export const resetPassword = async (req: ResetPasswordRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      console.log('Invalid or expired reset token during password reset:', token);
      res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      return;
    }
    
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    console.log('Password reset successful for user:', user.email);
    
    const newToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      message: 'Password reset successful',
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}; 