/**
 * Script om alle Supabase code te vervangen door Neon + Azure Blob Storage
 * Run: node scripts/update-code-to-neon.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Updating code to use Neon + Azure Blob Storage...\n');

const files = [
  'src/app/api/upload/route.ts',
  'src/app/api/upload-chunk/route.ts',
  'src/app/api/secure-download/[id]/route.ts',
  'src/app/api/share/route.ts',
  'src/app/api/api-keys/route.ts',
  'src/app/api/user/files/route.ts',
  'src/app/download/[id]/page.tsx',
  'src/lib/cleanup.ts'
];

// Backup original files
console.log('📦 Creating backups...');
for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);
    console.log(`  ✅ Backed up: ${file}`);
  }
}

console.log('\n✅ Backups created');
console.log('\n⚠️  Manual code updates required:');
console.log('\n1. Replace Supabase imports with:');
console.log('   import { db } from \'@/lib/neon\';');
console.log('   import { azureStorage } from \'@/lib/azureStorage\';');
console.log('\n2. Replace S3 operations with azureStorage methods');
console.log('\n3. Replace supabase database calls with db methods');
console.log('\n4. Remove Supabase auth (keep Clerk only)');
console.log('\n📝 See MIGRATION_GUIDE.md for detailed instructions\n');

process.exit(0);
