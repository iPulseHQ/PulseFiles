# Code Migration Checklist: Supabase → Neon + Azure Blob

## ✅ Completed
- [x] Neon database schema created
- [x] Azure Blob Storage container created  
- [x] Data migrated (62 files, 8 API keys, 6 folder contents)
- [x] Created `src/lib/neon.ts` - Database utility
- [x] Created `src/lib/azureStorage.ts` - Storage utility
- [x] Packages installed (@neondatabase/serverless, @azure/storage-blob)

## 📝 Files That Need Code Updates

### High Priority (Core functionality)

#### 1. `src/app/api/upload/route.ts`
**Current:** Uses Supabase + S3/DigitalOcean Spaces
**Changes needed:**
```typescript
// REMOVE these imports:
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ADD these imports:
import { db } from '@/lib/neon';
import { azureStorage } from '@/lib/azureStorage';

// REMOVE Supabase client:
const supabase = createClient(...);

// REMOVE S3 client:
const s3 = new S3Client(...);

// REPLACE database operations:
// OLD:
const { error } = await supabase.from('shared_files').insert({...});

// NEW:
await db.createFile({
  id: shareId,
  user_id: currentUser?.id || null,
  file_name: sanitizedFileName,
  // ... rest of fields
});

// REPLACE file upload:
// OLD:
await s3.send(new PutObjectCommand({...}));

// NEW:
const fileBuffer = Buffer.from(await file.arrayBuffer());
const fileUrl = await azureStorage.uploadFile(
  obfuscatedKey,
  fileBuffer,
  file.type
);
```

#### 2. `src/app/api/secure-download/[id]/route.ts`
**Changes needed:**
```typescript
// ADD imports:
import { db } from '@/lib/neon';
import { azureStorage } from '@/lib/azureStorage';

// REPLACE database query:
// OLD:
const { data: file } = await supabase
  .from('shared_files')
  .select('*')
  .eq('id', id)
  .single();

// NEW:
const file = await db.getFileById(id);

// REPLACE file download:
// OLD:
const command = new GetObjectCommand({...});
const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

// NEW:
const signedUrl = azureStorage.generateSignedUrl(file.obfuscated_key, 60);

// REPLACE download count update:
// OLD:
await supabase.rpc('increment_download_count', { file_id: id });

// NEW:
await db.updateFileDownloadStats(id, clientIP, ipHash);
```

#### 3. `src/app/api/upload-chunk/route.ts`
**Changes needed:**
```typescript
import { db } from '@/lib/neon';
import { azureStorage } from '@/lib/azureStorage';

// REPLACE multipart upload:
// OLD:
const command = new CreateMultipartUploadCommand({...});
const { UploadId } = await s3.send(command);

// NEW:
const { uploadId, blockBlobClient } = await azureStorage.createMultipartUpload(s3Key);

// REPLACE part upload:
// OLD:
const uploadCommand = new UploadPartCommand({...});
await s3.send(uploadCommand);

// NEW:
const { blockId } = await azureStorage.uploadPart(s3Key, partNumber, chunkBuffer);

// REPLACE complete upload:
// OLD:
const completeCommand = new CompleteMultipartUploadCommand({...});
await s3.send(completeCommand);

// NEW:
await azureStorage.completeMultipartUpload(s3Key, blockIds);
```

#### 4. `src/app/api/api-keys/route.ts`
**Changes needed:**
```typescript
import { db } from '@/lib/neon';

// REPLACE all supabase queries:
// GET:
const apiKeys = await db.getApiKeysByUserId(userId);

// POST:
await db.createApiKey({
  user_id: userId,
  name,
  api_key,
  key_preview
});

// DELETE:
await db.deleteApiKey(id, userId);
```

#### 5. `src/app/api/user/files/route.ts`
```typescript
import { db } from '@/lib/neon';

// REPLACE:
const files = await db.getFilesByUserId(userId);
```

#### 6. `src/app/download/[id]/page.tsx`
```typescript
import { db } from '@/lib/neon';

// REPLACE:
const file = await db.getFileByIdAndSlug(params.id, slug);

if (file?.is_folder) {
  const folderContents = await db.getFolderContents(file.id);
}
```

#### 7. `src/app/api/share/route.ts` (API endpoint)
```typescript
import { db } from '@/lib/neon';
import { azureStorage } from '@/lib/azureStorage';

// REPLACE API key verification:
const apiKey = await db.getApiKey(apiKeyValue);
await db.updateApiKeyLastUsed(apiKeyValue);

// REPLACE file operations same as upload route
```

#### 8. `src/lib/cleanup.ts`
```typescript
import { db, sql } from '@/lib/neon';
import { azureStorage } from '@/lib/azureStorage';

// REPLACE:
const expiredFiles = await db.getExpiredFiles();

for (const file of expiredFiles) {
  // Delete from Azure
  if (file.obfuscated_key) {
    await azureStorage.deleteFile(file.obfuscated_key);
  }
  
  // Delete folder contents
  if (file.is_folder) {
    const contents = await db.getFolderContents(file.id);
    for (const content of contents) {
      await azureStorage.deleteFile(content.s3_key);
    }
  }
  
  // Mark as inactive
  await db.deleteFile(file.id);
}
```

### Medium Priority

#### 9. `src/contexts/AuthContext.tsx`
**Current:** Uses Supabase Auth
**Changes:** Remove Supabase auth completely, use only Clerk

```typescript
// REMOVE all Supabase imports and logic
// Keep only Clerk authentication
```

#### 10. `src/app/api/cron/keep-alive/route.ts`
```typescript
import { sql } from '@/lib/neon';

// REPLACE:
await sql`SELECT 1`;
```

### Environment Variables Updates

#### Remove (no longer needed):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DO_ACCESS_TOKEN`
- `DO_SECRET_KEY`
- `DO_BUCKET_NAME`
- `DO_REGION`
- `DO_ENDPOINT`

#### Keep/Add:
- `DATABASE_URL` (Neon)
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY`
- `AZURE_STORAGE_CONTAINER_NAME`

## 🔍 Search & Replace Patterns

### Global replacements:
```bash
# Find Supabase imports
grep -r "from '@supabase/supabase-js'" src/

# Find S3 imports  
grep -r "from '@aws-sdk/client-s3'" src/

# Find database operations
grep -r "supabase.from" src/
grep -r "supabase.rpc" src/
grep -r "supabase.auth" src/

# Find S3 operations
grep -r "s3.send" src/
grep -r "PutObjectCommand" src/
grep -r "GetObjectCommand" src/
```

## 🧪 Testing Checklist

After code updates, test:
- [ ] File upload (single file)
- [ ] File upload (folder)
- [ ] File download  
- [ ] Folder download (ZIP)
- [ ] Password protected files
- [ ] Email sharing
- [ ] Link sharing
- [ ] API key creation/deletion
- [ ] User files list
- [ ] File expiration/cleanup
- [ ] Chunked uploads (large files)
- [ ] Rate limiting

## 📦 Quick Start Commands

```bash
# 1. Install dependencies (already done)
npm install

# 2. Run development server
npm run dev

# 3. Test locally before deploying
```

## ⚠️ Important Notes

1. **Keep Supabase credentials** in `.env` during transition for rollback
2. **Test thoroughly** before deploying to production
3. **Azure Blob uses SAS tokens** - URLs are temporary signed URLs
4. **Folder uploads** store individual files in Azure with paths
5. **Rate limiting** now uses Neon database (rate_limits table)

## 🚀 Deployment

Once all code is updated and tested:

1. Push to GitHub
2. Set environment variables in Vercel
3. Deploy
4. Monitor logs for any issues

## 📞 Rollback Plan

If issues occur:
1. Revert git commits
2. Restore `.backup` files
3. Switch back to Supabase environment variables
4. Redeploy

---

**Status:** Ready for code updates
**Next Step:** Start with upload/download routes (highest priority)
