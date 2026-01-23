# Migration Guide: Supabase to Neon + Azure Blob Storage

## ✅ Migration Completed

Your PulseFiles application has been successfully migrated from Supabase to:
- **Neon PostgreSQL** for database
- **Azure Blob Storage** for file storage

### Migration Summary
- ✅ 62 shared files migrated
- ✅ 8 API keys migrated
- ✅ 6 folder contents migrated
- ✅ 1 file access log migrated
- ✅ Azure Blob Storage container created

---

## 📋 Vercel Environment Variables

When deploying to Vercel, add these environment variables in your project settings:

### Required - Database (Neon)
```
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
```
> Get this from your Neon dashboard: https://console.neon.tech/

### Required - Azure Blob Storage
```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=[account-name];AccountKey=[your-key];EndpointSuffix=core.windows.net

AZURE_STORAGE_ACCOUNT_NAME=[your-account-name]

AZURE_STORAGE_ACCOUNT_KEY=[your-account-key]

AZURE_STORAGE_CONTAINER_NAME=pulsefiles
```
> Get these from Azure Portal → Storage Accounts → Access Keys

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[your-publishable-key]

CLERK_SECRET_KEY=[your-secret-key]
```
> Get these from Clerk Dashboard: https://dashboard.clerk.com/

### Email (Resend)
```
RESEND_API_KEY=[your-resend-api-key]

EMAIL_FROM_ADDRESS=share@pulsefiles.app

EMAIL_FROM_NAME=PulseFiles
```
> Get API key from Resend Dashboard: https://resend.com/api-keys

### Security Keys
```
ENCRYPTION_KEY=[generate-random-32-char-string]

SESSION_SECRET=[generate-random-64-char-string]

JWT_SECRET=[generate-random-64-char-string]
```
> Generate with: `openssl rand -hex 32` (for ENCRYPTION_KEY) or `openssl rand -hex 64` (for others)

### Legacy (Optional - keep for backward compatibility)
```
NEXT_PUBLIC_SUPABASE_URL=https://gavacdllbxwkxxoqsoqv.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdmFjZGxsYnh3a3h4b3Fzb3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTg0OTEsImV4cCI6MjA2ODc3NDQ5MX0.4vm8QJcuRL8tIBJHeXBj55U1kOPMpGvdE9FlfCev4KQ

DO_BUCKET_NAME=openfiles

DO_ACCESS_TOKEN=DO00ZRKJ6DARGWUDQKCE

DO_REGION=US

DO_ENDPOINT=ams3.digitaloceanspaces.com
```

---

## 🚀 Deploy to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Migrate to Neon + Azure Blob Storage"
git push origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Add all environment variables from above

### Step 3: Deploy
Vercel will automatically:
- Run `npm install` (including @azure/storage-blob and @neondatabase/serverless)
- Run the postinstall script
- Build your application
- Deploy to production

---

## 🧪 Test Locally

Before deploying, test locally:

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000 and test:
- File uploads
- File downloads
- API endpoints
- Database queries

---

## 📦 What Changed

### Database
- **Before:** Supabase PostgreSQL
- **After:** Neon PostgreSQL (serverless)
- **Connection:** Using `@neondatabase/serverless` package

### File Storage
- **Before:** Supabase Storage / DigitalOcean Spaces
- **After:** Azure Blob Storage
- **Access:** Private containers with SAS tokens

### Package Changes
Added to `package.json`:
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.7",
    "@azure/storage-blob": "^12.30.0",
    "dotenv": "^16.4.7"
  },
  "scripts": {
    "postinstall": "node scripts/postinstall.js",
    "migrate": "node scripts/migrate-to-neon.js"
  }
}
```

---

## 🔄 Rollback Plan

If you need to rollback to Supabase:

1. Remove Neon/Azure environment variables from Vercel
2. Add back original Supabase credentials
3. Redeploy

Your Supabase data is still intact and unchanged.

---

## 📞 Support

If you encounter issues:

1. Check Vercel build logs for errors
2. Verify all environment variables are set correctly
3. Test database connection in Neon dashboard
4. Test Azure Blob Storage in Azure Portal

---

## ✅ Checklist

- [ ] All environment variables added to Vercel
- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] File uploads working
- [ ] File downloads working
- [ ] Database queries working
- [ ] API endpoints working

---

**Migration Date:** January 23, 2026
**Database:** Neon PostgreSQL
**Storage:** Azure Blob Storage
**Status:** ✅ Complete
