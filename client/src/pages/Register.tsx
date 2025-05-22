import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import registration from '../assets/registration.png'
import '../styles/Register.css';
import { useAuth } from '../contexts/AuthContext';

const countries = [
  { code: 'US', name: 'United States', states: ['Delaware', 'California', 'Texas'] },
  { code: 'IN', name: 'India', states: ['Delhi', 'Maharashtra', 'Karnataka'] },
];

const validationSchema = Yup.object({
  firstName: Yup.string().required('Required'),
  lastName: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  country: Yup.string().required('Required'),
  state: Yup.string().required('Required'),
  phone: Yup.string().required('Required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Required'),
});

const steps = ['Get started', 'Business Info', 'Review', 'Finish'];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState('US');

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      country: 'US',
      state: '',
      phone: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError('');
        await register(
          values.firstName + ' ' + values.lastName,
          values.email,
          values.password
        );
        navigate('/dashboard');
      } catch (error: any) {
        setError(error.response?.data?.error || 'Registration failed. Please try again.');
      }
    },
  });

  const handleCountryChange = (e: any) => {
    setSelectedCountry(e.target.value);
    formik.setFieldValue('country', e.target.value);
    formik.setFieldValue('state', '');
  };

  const currentCountry = countries.find((c) => c.code === selectedCountry);

  return (
    <div className='register-component'>
      {/* Left Panel */}
      <div className='register-left-panel'>
        <img src={registration} alt="" />
        <div>
          <div className='register-testimonial'>
            <h3 className='register-testimonial-title'>
              I barely had to do anything
            </h3>
            <p className='register-testimonial-text'>
              Love the experience. Got my business set up and all necessary details in about a month and I barely had to do anything. Definitely recommend!
            </p>
            <div className='register-testimonial-author'>
              <div className='register-testimonial-avatar'>
                <PersonIcon />
              </div>
              <span className='register-testimonial-name'>Catherine Johns</span>
              <div className='register-testimonial-rating'>
                {'★★★★★'}
              </div>
            </div>
          </div>
          <div className='register-dots-container'>
            <div className='register-dot' />
            <div className='register-dot register-dot-inactive' />
            <div className='register-dot register-dot-inactive' />
          </div>
        </div>
      </div>
      {/* Right Panel */}
      <div className='register-right-panel'>
        <div className='register-stepper'>
          {steps.map((label, index) => (
            <div key={label} className='register-step'>
              <div className={`register-step-circle ${index === 0 ? 'active' : ''}`} />
              <span className='register-step-label'>{label}</span>
            </div>
          ))}
        </div>
        <h2 className='register-form-title'>
          Let's get started
        </h2>
        {error && (
          <p className='register-error'>
            {error}
          </p>
        )}
        <form onSubmit={formik.handleSubmit} autoComplete="off" className='register-form'>
          <div className='register-form-grid'>
            <div className='register-form-field'>
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                className={formik.touched.firstName && formik.errors.firstName ? 'error' : ''}
              />
              {formik.touched.firstName && formik.errors.firstName && (
                <span className='error-message'>{formik.errors.firstName}</span>
              )}
            </div>
            <div className='register-form-field'>
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                className={formik.touched.lastName && formik.errors.lastName ? 'error' : ''}
              />
              {formik.touched.lastName && formik.errors.lastName && (
                <span className='error-message'>{formik.errors.lastName}</span>
              )}
            </div>
            <div className='register-form-field full-width'>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formik.values.email}
                onChange={formik.handleChange}
                className={formik.touched.email && formik.errors.email ? 'error' : ''}
              />
              {formik.touched.email && formik.errors.email && (
                <span className='error-message'>{formik.errors.email}</span>
              )}
            </div>
            <div className='register-form-field'>
              <select
                name="country"
                value={formik.values.country}
                onChange={handleCountryChange}
                className={formik.touched.country && formik.errors.country ? 'error' : ''}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {formik.touched.country && formik.errors.country && (
                <span className='error-message'>{formik.errors.country}</span>
              )}
            </div>
            <div className='register-form-field'>
              <select
                name="state"
                value={formik.values.state}
                onChange={formik.handleChange}
                className={formik.touched.state && formik.errors.state ? 'error' : ''}
                disabled={!currentCountry}
              >
                {currentCountry?.states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {formik.touched.state && formik.errors.state && (
                <span className='error-message'>{formik.errors.state}</span>
              )}
            </div>
            <div className='register-form-field full-width'>
              <div className='phone-input-container'>
                <span className='phone-flag'>🇺🇸</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone number"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  className={formik.touched.phone && formik.errors.phone ? 'error' : ''}
                />
              </div>
              {formik.touched.phone && formik.errors.phone && (
                <span className='error-message'>{formik.errors.phone}</span>
              )}
            </div>
            <div className='register-form-field full-width'>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formik.values.password}
                onChange={formik.handleChange}
                className={formik.touched.password && formik.errors.password ? 'error' : ''}
              />
              {formik.touched.password && formik.errors.password && (
                <span className='error-message'>{formik.errors.password}</span>
              )}
            </div>
          </div>
          <button
            type="submit"
            className='register-submit-button'
          >
            GET STARTED
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register; 