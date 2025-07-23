# OpenFiles - Secure File Sharing

A Next.js application for secure file sharing with end-to-end encryption, built with TypeScript and Supabase.

# Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopenfilesapp%2Fopenfiles&project-name=openfiles&repository-name=openfiles)

## Prerequisites

Before running the application locally, you need the following:

- Node.js 18+ and npm
- Supabase account and project
- S3-compatible object storage (Wasabi, AWS S3, etc.)
- Email service (Resend) for notifications
- Git for version control

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# S3 Storage Configuration 
DO_REGION=us-east-1
DO_ENDPOINT=your_endpoint
DO_ACCESS_TOKEN=your_access_key
DO_SECRET_KEY=your_secret_key
DO_BUCKET_NAME=your_bucket_name

# Application Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key

# Optional: Rate limiting and upload limits
UPLOAD_RATE_LIMIT_MAX=100
```

## Required Services Setup

### 1. Supabase Setup
- Create a new Supabase project
- Run the database migrations (check `/supabase` folder if available)
- Enable authentication providers as needed
- Get your project URL and API keys from the dashboard

### 2. S3 Storage Setup 
- Create a new bucket
- Generate access keys with appropriate permissions
- Configure CORS if needed for direct uploads

### 3. Email Service Setup (Resend)
- Create a Resend account
- Get your API key from the dashboard
- Verify your sending domain if using custom email addresses

## Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd openfiles
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

4. Run the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Database Schema

The application uses the following main tables:
- `shared_files` - Main file sharing records
- `folder_contents` - Contents of shared folders
- Authentication tables (managed by Supabase Auth)

## Features

- Single file and folder uploads
- Chunked uploads for large files
- Email notifications
- Password protection
- Download limits
- Custom expiration times
- User authentication
- File encryption
- Progressive Web App (PWA) support

## File Size Limits

- Maximum file size: 10GB
- Chunked upload recommended for files over 100MB
- Folder uploads supported with validation

## Security Features

- File encryption with salted hashes
- IP address hashing for privacy
- Email address hashing
- Rate limiting
- Content Security Policy (CSP)
- Input sanitization and validation

## Troubleshooting

Common issues and solutions:

1. **Build failures**: Run `npm run type-check` to identify TypeScript issues
2. **Upload failures**: Check S3 credentials and bucket permissions
3. **Email not sending**: Verify Resend API key and from address
4. **Database errors**: Ensure Supabase connection and schema is up to date

## Production Deployment

1. Set all environment variables in your hosting platform
2. Run `npm run build` to create production build
3. Deploy to your preferred hosting service (Vercel, Netlify, etc.)
4. Configure domain and SSL certificates
5. Set up monitoring and error tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Support

For issues and questions, please check the GitHub repository issues section.