import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Topbar from '../components/Topbar/Topbar';
import '../styles/Register.css';

const validationSchema = Yup.object({
  name: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Required'),
});

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState<string>('');

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError('');
        await register(values.name, values.email, values.password);
        navigate('/dashboard');
      } catch (error: any) {
        setError(error.response?.data?.error || 'Registration failed. Please try again.');
      }
    },
  });

  return (
    <>
      <Topbar />
      <div className="register-container">
        <div className="register-paper">
          <h1 className="register-title">Create Account</h1>
          {error && <div className="error-message">{error}</div>}
          <form className="register-form" onSubmit={formik.handleSubmit}>
            <div className="form-field">
              <input
                className={`input-field ${formik.touched.name && formik.errors.name ? 'error' : ''}`}
                name="name"
                placeholder="Full Name"
                value={formik.values.name}
                onChange={formik.handleChange}
              />
              {formik.touched.name && formik.errors.name && (
                <div className="error-message">{formik.errors.name}</div>
              )}
            </div>
            <div className="form-field">
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
            <div className="form-field">
              <input
                className={`input-field ${formik.touched.password && formik.errors.password ? 'error' : ''}`}
                name="password"
                type="password"
                placeholder="Password"
                value={formik.values.password}
                onChange={formik.handleChange}
              />
              {formik.touched.password && formik.errors.password && (
                <div className="error-message">{formik.errors.password}</div>
              )}
            </div>
            <button className="register-button" type="submit">
              Create Account
            </button>
          </form>
          <div className="login-link">
            <RouterLink to="/login">Already have an account? Login</RouterLink>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register; 