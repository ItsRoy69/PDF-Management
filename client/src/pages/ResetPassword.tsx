import { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const validationSchema = Yup.object({
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const { validateResetToken, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setIsValidToken(false);
        return;
      }

      try {
        const isValid = await validateResetToken(token);
        setIsValidToken(isValid);
      } catch (error) {
        console.error('Error validating token:', error);
        setIsValidToken(false);
      }
    };

    checkToken();
  }, [token, validateResetToken]);

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (!token) return;
        
        setError('');
        await resetPassword(token, values.password);
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Password reset failed:', error);
        setError(error.response?.data?.error || 'Failed to reset password. Please try again.');
      }
    },
  });

  if (isValidToken === null) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Validating your reset link...
        </Typography>
      </Container>
    );
  }

  if (isValidToken === false) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Invalid Reset Link
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            This password reset link is invalid or has expired.
          </Alert>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary">
                Request New Reset Link
              </Button>
            </Link>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          Reset Your Password
        </Typography>
        
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            id="password"
            name="password"
            label="New Password"
            type="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            margin="normal"
          />
          
          <TextField
            fullWidth
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm New Password"
            type="password"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
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
            Reset Password
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPassword; 