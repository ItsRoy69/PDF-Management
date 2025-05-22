import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import { Email as EmailIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ForgotPassword.css';

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError('');
        await forgotPassword(values.email);
        setSuccess(true);
      } catch (error: any) {
        console.error('Forgot password failed:', error);
        setError(error.response?.data?.error || 'Failed to process your request. Please try again.');
      }
    },
  });

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-form">
        <h1 className="forgot-password-title">Reset Password</h1>
        
        {success ? (
          <div>
            <div className="success-message">
              If an account with that email exists, we've sent password reset instructions.
            </div>
            <Link to="/login" className="back-link">
              <ArrowBackIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={formik.handleSubmit}>
            <p className="forgot-password-subtitle">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="form-group">
              <input
                className={`form-input ${formik.touched.email && formik.errors.email ? 'error' : ''}`}
                id="email"
                name="email"
                placeholder="Email Address"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="error-message">{formik.errors.email}</div>
              )}
            </div>
            
            <button
              type="submit"
              className="submit-button"
              disabled={formik.isSubmitting}
            >
              <EmailIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Send Reset Instructions
            </button>
            
            <Link to="/login" className="back-link">
              <ArrowBackIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword; 