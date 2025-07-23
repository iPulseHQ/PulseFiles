# OpenFiles

Secure file sharing with email notifications.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in your keys
3. Run: `npm run dev`

## Environment Variables

```bash
# DigitalOcean Spaces
DO_ACCESS_TOKEN=your-token
DO_SECRET_KEY=your-secret
DO_REGION=ams3
DO_BUCKET_NAME=your-bucket
DO_ENDPOINT=ams3.digitaloceanspaces.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key

# Email
RESEND_API_KEY=your-key

# Site
NEXT_PUBLIC_SITE_URL=your-domain
```

## Database

Run the SQL in `database-schema.sql` in your Supabase SQL editor.

## Features

- Upload files up to 10GB
- Secure share links with expiration
- Email notifications
- Admin dashboard at `/admin`
- Automatic cleanup

Built with Next.js 15 and TypeScript.