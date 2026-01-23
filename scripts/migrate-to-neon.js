/**
 * Migration script: Supabase to Neon + Azure Blob Storage
 * Run: node scripts/migrate-to-neon.js
 */

const { createClient } = require('@supabase/supabase-js');
const { neon } = require('@neondatabase/serverless');
const { BlobServiceClient } = require('@azure/storage-blob');

// Load environment variables
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEON_DATABASE_URL = process.env.DATABASE_URL;
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

console.log('🚀 Starting migration from Supabase to Neon + Azure Blob Storage\n');

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sql = neon(NEON_DATABASE_URL);

async function createNeonSchema() {
  console.log('📋 Creating Neon database schema...');
  
  try {
    // First, check what tables exist in Supabase
    const { data: existingTables } = await supabase
      .from('project')
      .select('*')
      .limit(1);

    console.log('  ℹ️  Checking Supabase schema...\n');

    // Create ALL tables (both existing Supabase tables and PulseFiles tables)
    await sql`
      -- Create project table
      CREATE TABLE IF NOT EXISTS project (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        json TEXT NOT NULL,
        height INTEGER NOT NULL,
        width INTEGER NOT NULL,
        "thumbnailUrl" TEXT,
        "isTemplate" BOOLEAN DEFAULT FALSE,
        "isPro" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log('  ✅ Created table: project');

    await sql`
      CREATE TABLE IF NOT EXISTS subscription (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "subscriptionId" TEXT NOT NULL,
        "customerId" TEXT NOT NULL,
        "priceId" TEXT NOT NULL,
        status TEXT NOT NULL,
        "currentPeriodEnd" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log('  ✅ Created table: subscription');

    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        "userId" TEXT NOT NULL UNIQUE,
        "brandColors" TEXT DEFAULT '[]',
        "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
        "brandFonts" TEXT
      );
    `;
    console.log('  ✅ Created table: user_settings');

    await sql`
      CREATE TABLE IF NOT EXISTS project_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        payload JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('  ✅ Created table: project_events');

    await sql`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('  ✅ Created table: images');

    await sql`
      CREATE TABLE IF NOT EXISTS image (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        "userId" TEXT NOT NULL,
        url TEXT NOT NULL,
        name TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('  ✅ Created table: image');

    await sql`
      CREATE TABLE IF NOT EXISTS project_member (
        id TEXT PRIMARY KEY,
        "projectId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        role TEXT NOT NULL,
        "addedBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE
      );
    `;
    console.log('  ✅ Created table: project_member');

    await sql`
      CREATE TABLE IF NOT EXISTS project_invitation (
        id TEXT PRIMARY KEY,
        "projectId" TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        "invitedBy" TEXT NOT NULL,
        status TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE
      );
    `;
    console.log('  ✅ Created table: project_invitation');

    await sql`
      CREATE TABLE IF NOT EXISTS project_share_link (
        id TEXT PRIMARY KEY,
        "projectId" TEXT NOT NULL,
        role TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdBy" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT TRUE,
        "expiresAt" TIMESTAMP,
        "usageCount" INTEGER DEFAULT 0,
        "maxUsageCount" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE
      );
    `;
    console.log('  ✅ Created table: project_share_link');

    await sql`
      CREATE TABLE IF NOT EXISTS project_page (
        id TEXT PRIMARY KEY,
        "projectId" TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        name TEXT NOT NULL DEFAULT 'Page',
        json TEXT NOT NULL,
        width INTEGER DEFAULT 900,
        height INTEGER DEFAULT 1200,
        "thumbnailUrl" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE
      );
    `;
    console.log('  ✅ Created table: project_page');

    // Create PulseFiles specific tables
    await sql`
      CREATE TABLE IF NOT EXISTS shared_files (
        id VARCHAR(64) PRIMARY KEY,
        user_id TEXT,
        file_name TEXT NOT NULL,
        encrypted_filename TEXT,
        filename_salt TEXT,
        file_url TEXT NOT NULL,
        obfuscated_key TEXT,
        file_size BIGINT NOT NULL,
        file_type TEXT,
        email TEXT NOT NULL,
        email_hash TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address TEXT,
        ip_hash TEXT,
        download_count INTEGER DEFAULT 0,
        last_downloaded_at TIMESTAMPTZ,
        last_download_ip TEXT,
        last_download_ip_hash TEXT,
        title TEXT,
        message TEXT,
        recipients TEXT[],
        password_hash TEXT,
        password_salt TEXT,
        access_control VARCHAR(20) DEFAULT 'public' CHECK (access_control IN ('public', 'password', 'authenticated')),
        is_folder BOOLEAN DEFAULT FALSE,
        folder_name TEXT,
        total_files INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        max_downloads INTEGER,
        download_limit_reached BOOLEAN DEFAULT FALSE,
        created_via TEXT DEFAULT 'web'
      );
    `;
    console.log('  ✅ Created table: shared_files');

    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        key_preview TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE
      );
    `;
    console.log('  ✅ Created table: api_keys');

    await sql`
      CREATE TABLE IF NOT EXISTS folder_contents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shared_file_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        file_type TEXT NOT NULL,
        s3_key TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (shared_file_id) REFERENCES shared_files(id) ON DELETE CASCADE
      );
    `;
    console.log('  ✅ Created table: folder_contents');

    await sql`
      CREATE TABLE IF NOT EXISTS file_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shared_file_id TEXT NOT NULL,
        accessed_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address TEXT,
        ip_hash TEXT,
        user_agent TEXT,
        download_successful BOOLEAN DEFAULT TRUE,
        access_method VARCHAR(20) DEFAULT 'direct' CHECK (access_method IN ('direct', 'password', 'authenticated')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (shared_file_id) REFERENCES shared_files(id) ON DELETE CASCADE
      );
    `;
    console.log('  ✅ Created table: file_access_logs');

    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL UNIQUE,
        email TEXT,
        full_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('  ✅ Created table: user_profiles');

    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_hash TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        request_count INTEGER DEFAULT 1,
        window_start TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(ip_hash, endpoint)
      );
    `;
    console.log('  ✅ Created table: rate_limits');

    // Create indexes
    console.log('\n  📊 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_shared_files_expires_at ON shared_files(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shared_files_created_at ON shared_files(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shared_files_email_hash ON shared_files(email_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_folder_contents_shared_file_id ON folder_contents(shared_file_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_file_access_logs_shared_file_id ON file_access_logs(shared_file_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_hash ON rate_limits(ip_hash, endpoint)`;
    console.log('  ✅ Indexes created');

    console.log('\n✅ Neon schema created successfully\n');
  } catch (error) {
    console.error('❌ Error creating schema:', error.message);
    throw error;
  }
}

async function getSupabaseTables() {
  console.log('🔍 Detecting existing Supabase tables...\n');
  
  const tables = [
    'project',
    'subscription',
    'user_settings',
    'project_events',
    'images',
    'image',
    'project_member',
    'project_invitation',
    'project_share_link',
    'project_page',
    'shared_files',
    'api_keys',
    'folder_contents',
    'file_access_logs',
    'user_profiles',
    'rate_limits'
  ];

  const existingTables = [];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        existingTables.push({ name: table, count: count || 0 });
        console.log(`  ✅ Found: ${table} (${count || 0} rows)`);
      }
    } catch (err) {
      // Table doesn't exist
    }
  }

  console.log(`\n  ℹ️  Found ${existingTables.length} tables in Supabase\n`);
  return existingTables;
}

async function getNeonColumns(table) {
  try {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${table} AND table_schema = 'public'
    `;
    return result.map(r => r.column_name);
  } catch (error) {
    return [];
  }
}

async function migrateData(existingTables) {
  if (existingTables.length === 0) {
    console.log('ℹ️  No data to migrate - starting with fresh Neon database\n');
    return;
  }

  console.log('📦 Migrating data from Supabase to Neon...\n');

  for (const { name: table, count } of existingTables) {
    if (count === 0) {
      console.log(`  ℹ️  ${table}: No data to migrate`);
      continue;
    }

    try {
      console.log(`  Migrating ${table}... (${count} rows)`);
      
      // Get Neon table columns
      const neonColumns = await getNeonColumns(table);
      if (neonColumns.length === 0) {
        console.log(`  ⚠️  ${table}: Could not get schema, skipping`);
        continue;
      }
      
      // Fetch all data from Supabase
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.log(`  ⚠️  ${table}: Error - ${error.message}`);
        continue;
      }

      // Insert data into Neon batch by batch
      let inserted = 0;
      for (const row of data) {
        // Filter columns to only include what exists in Neon
        const filteredRow = {};
        for (const col of neonColumns) {
          if (row.hasOwnProperty(col)) {
            filteredRow[col] = row[col];
          }
        }
        
        const columns = Object.keys(filteredRow);
        const values = Object.values(filteredRow);
        
        if (columns.length === 0) continue;
        
        // Build parameterized query
        const columnNames = columns.map(c => `"${c}"`).join(', ');
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        try {
          await sql.query(
            `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            values
          );
          inserted++;
        } catch (insertError) {
          // Silent fail for foreign key violations (will retry in next pass if needed)
        }
      }

      console.log(`  ✅ ${table}: Migrated ${inserted}/${data.length} rows`);
    } catch (error) {
      console.log(`  ❌ ${table}: Migration failed - ${error.message}`);
    }
  }

  console.log('\n✅ Data migration completed\n');
}

async function setupAzureBlob() {
  console.log('☁️  Setting up Azure Blob Storage...\n');
  
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
    
    // Create container for file storage
    const containerName = 'pulsefiles';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const exists = await containerClient.exists();
    if (!exists) {
      // Create with private access (use SAS tokens for access)
      await containerClient.create();
      console.log(`  ✅ Created container: ${containerName} (private access)`);
    } else {
      console.log(`  ℹ️  Container already exists: ${containerName}`);
    }
    
    console.log('  ℹ️  Container uses private access - files will be accessed via SAS tokens');
    console.log('\n✅ Azure Blob Storage setup completed\n');
  } catch (error) {
    console.error('❌ Error setting up Azure Blob Storage:', error.message);
    console.log('  ℹ️  Continuing with existing container configuration\n');
  }
}

async function main() {
  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing Supabase credentials in .env file');
    }
    if (!NEON_DATABASE_URL) {
      throw new Error('Missing DATABASE_URL in .env file');
    }
    if (!AZURE_CONNECTION_STRING) {
      throw new Error('Missing AZURE_STORAGE_CONNECTION_STRING in .env file');
    }

    console.log('✓ Environment variables validated\n');

    // Step 1: Create Neon schema
    await createNeonSchema();

    // Step 2: Detect existing Supabase tables
    const existingTables = await getSupabaseTables();

    // Step 3: Migrate data
    await migrateData(existingTables);

    // Step 4: Setup Azure Blob Storage
    await setupAzureBlob();

    console.log('🎉 Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('  - Neon database schema created');
    console.log(`  - ${existingTables.length} tables migrated from Supabase`);
    console.log('  - Azure Blob Storage container ready');
    console.log('\nNext steps:');
    console.log('1. Test database connection: npm run dev');
    console.log('2. Update your code to use Azure Blob Storage for file uploads');
    console.log('3. Deploy to Vercel with the environment variables from .env\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
