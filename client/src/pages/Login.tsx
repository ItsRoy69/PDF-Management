import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Topbar from '../components/Topbar/Topbar';
import '../styles/Login.css';

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().required('Required'),
});

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError('');
        await login(values.email, values.password);
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Login failed:', error);
        setError(error.response?.data?.error || 'Login failed. Please try again.');
      }
    },
  });

  return (
    <>
      <Topbar />
      <div className="login-container">
        <div className="login-paper">
          <h1 className="login-title">Login</h1>
          {error && <div className="error-message">{error}</div>}
          <form className="login-form" onSubmit={formik.handleSubmit}>
            <div>
              <input
                className={`input-field ${formik.touched.email && formik.errors.email ? 'error' : ''}`}
                name="email"
                placeholder="Email"
                value={formik.values.email}
                onChange={formik.handleChange}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="error-message">{formik.errors.email}</div>
              )}
            </div>
            <div>
              <input
                className={`input-field ${formik.touched.password && formik.errors.password ? 'error' : ''}`}
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formik.values.password}
                onChange={formik.handleChange}
              />
              {formik.touched.password && formik.errors.password && (
                <div className="error-message">{formik.errors.password}</div>
              )}
            </div>
            <div className="forgot-password">
              <RouterLink to="/forgot-password">Forgot password?</RouterLink>
            </div>
            <button className="login-button" type="submit">
              Login
            </button>
          </form>
          <div className="register-link">
            <RouterLink to="/register">Don't have an account? Register</RouterLink>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login; 