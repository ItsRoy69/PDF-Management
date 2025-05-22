import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Topbar.css';

const APP_NAME = 'PDF Manager';

const Topbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="topbar">
      <div className="topbar-container">
        <Link to="/" className="app-name">
          {APP_NAME}
        </Link>

        {/* Mobile menu button */}
        <button className="mobile-menu-button" onClick={toggleMenu}>
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
        </button>

        {/* Navigation links */}
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/login" className="nav-link">
            Login
          </Link>
          <Link to="/signup" className="nav-link signup">
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Topbar; 