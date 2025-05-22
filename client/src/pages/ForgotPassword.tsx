import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

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
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          Reset Password
        </Typography>
        
        {success ? (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">
              If an account with that email exists, we've sent password reset instructions.
            </Alert>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button variant="text" color="primary">
                  Return to Login
                </Button>
              </Link>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Enter your email address and we'll send you instructions to reset your password.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              margin="normal"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              disabled={formik.isSubmitting}
            >
              Send Reset Instructions
            </Button>
            
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button variant="text" color="primary">
                  Back to Login
                </Button>
              </Link>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ForgotPassword; 