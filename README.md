# PDF Management & Collaboration System

A modern web application for managing, sharing, and collaborating on PDF documents with real-time commenting features.

## Features

### Core Features
- **User Authentication**
  - Secure signup and login system
  - Password reset and account recovery
  - JWT-based authentication

- **PDF Management**
  - Upload and store PDF files
  - View PDFs in the browser
  - Search functionality for PDF files
  - Secure file storage using Appwrite

- **Collaboration**
  - Share PDFs with other users
  - Generate unique sharing links
  - Real-time commenting system
  - Reply to existing comments
  - Text formatting in comments (bold, italic, bullet points)

- **Email Notifications**
  - Automatic email notifications for PDF sharing
  - Personalized invitations with sender details
  - Direct access links in emails

### Security Features
- Secure file access controls
- Password hashing
- Protected routes
- Secure file storage

## Tech Stack

### Frontend
- React + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- React Query for state management

### Backend
- Node.js with Express
- MongoDB for database
- JWT for authentication
- Nodemailer for email functionality
- Appwrite for file storage
- Multer for file uploads

### Development Tools
- ESLint for code linting
- TypeScript for type safety
- Git for version control

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Appwrite account
- Email service account (Gmail or other provider)

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd pdf-management
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Configure environment variables:

Create `.env` files in both client and server directories with the following variables:

Server `.env`:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
APPWRITE_ENDPOINT=your_appwrite_endpoint
APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_appwrite_api_key
APPWRITE_BUCKET_ID=your_appwrite_bucket_id
CLIENT_URL=http://localhost:5173
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

4. Start the development servers:

```bash
# Start server (from server directory)
npm run dev

# Start client (from client directory)
npm run dev
```

## Email Configuration

### For Gmail
1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to Google Account > Security
   - Select App passwords
   - Generate a new app password for "Mail"
   - Use this password in your `.env` file

### For Other Email Providers
1. Update the EMAIL_SERVICE value in your `.env` file
2. Provide the appropriate credentials

## API Documentation

### PDF Routes
- `POST /api/pdfs/upload`: Upload a new PDF
- `GET /api/pdfs`: Get all PDFs for the authenticated user
- `GET /api/pdfs/:id`: Get a specific PDF
- `POST /api/pdfs/:id/share`: Share a PDF with another user
- `POST /api/pdfs/:id/invite`: Invite users by email
- `GET /api/pdfs/:id/invited`: Get invited users for a PDF
- `DELETE /api/pdfs/:id/invited/:email`: Remove an invited user

### User Routes
- `POST /api/users/register`: Register a new user
- `POST /api/users/login`: User login
- `GET /api/users/me`: Get current user
