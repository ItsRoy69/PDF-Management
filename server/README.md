# PDF Management Server

Backend server for the PDF management application.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables by creating a `.env` file with the following:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   APPWRITE_ENDPOINT=your_appwrite_endpoint
   APPWRITE_PROJECT_ID=your_appwrite_project_id
   APPWRITE_API_KEY=your_appwrite_api_key
   APPWRITE_BUCKET_ID=your_appwrite_bucket_id
   CLIENT_URL=http://localhost:5173
   
   # Email Configuration
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   ```

3. Run the development server:
   ```
   npm run dev
   ```

## Email Configuration

The application now sends email notifications when users are invited to view PDFs. To set up email functionality:

### For Gmail

1. Enable 2-Step Verification on your Google account:
   - Go to your Google Account > Security
   - Enable 2-Step Verification

2. Generate an App Password:
   - Go to your Google Account > Security
   - Under "Signing in to Google," select App passwords
   - Generate a new app password for "Mail" and "Other (Custom name)"
   - Use this password in your `.env` file (EMAIL_PASSWORD)

### For Other Email Providers

1. Update the EMAIL_SERVICE value in your `.env` file
2. Provide the appropriate credentials for your email service

## API Endpoints

### PDF Routes

- `POST /api/pdfs/upload`: Upload a new PDF
- `GET /api/pdfs`: Get all PDFs for the authenticated user
- `GET /api/pdfs/:id`: Get a specific PDF
- `POST /api/pdfs/:id/share`: Share a PDF with another user
- `POST /api/pdfs/:id/invite`: Invite users by email (sends email notifications)
- `GET /api/pdfs/:id/invited`: Get invited users for a PDF
- `DELETE /api/pdfs/:id/invited/:email`: Remove an invited user

### User Routes

- `POST /api/users/register`: Register a new user
- `POST /api/users/login`: User login
- `GET /api/users/me`: Get current user 