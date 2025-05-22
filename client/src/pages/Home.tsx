import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            PDF Management & Collaboration
          </h1>
          <p className="hero-subtitle">
            Streamline your document workflow with our powerful PDF management solution
          </p>
          <div className="features">
            <div className="feature-item">
              <span className="feature-icon">📄</span>
              <span>Easy Upload</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤝</span>
              <span>Real-time Collaboration</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Secure Storage</span>
            </div>
          </div>
          {isAuthenticated ? (
            <button
              className="primary-button"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          ) : (
            <div className="button-group">
              <button
                className="primary-button"
                onClick={() => navigate('/login')}
              >
                Get Started
              </button>
              <button
                className="secondary-button"
                onClick={() => navigate('/register')}
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 