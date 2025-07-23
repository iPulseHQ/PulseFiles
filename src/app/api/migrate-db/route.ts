import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple admin authentication
function isAuthorized(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const adminKey = process.env.ADMIN_API_KEY;
  
  if (!adminKey) {
    console.warn('ADMIN_API_KEY not set - migration disabled');
    return false;
  }
  
  return apiKey === adminKey;
}

export async function POST(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid API key' },
      { status: 401 }
    );
  }

  try {
    console.log('🔄 Starting database migration...');

    // Check current table structure
    const { error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'shared_files' })
      .single();

    if (columnsError) {
      console.log('Could not check columns, proceeding with migration...');
    }

    const migrations: string[] = [];

    // Add missing columns one by one
    const columnsToAdd = [
      {
        name: 'download_count',
        sql: 'ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;'
      },
      {
        name: 'last_downloaded_at',
        sql: 'ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP WITH TIME ZONE;'
      },
      {
        name: 'last_download_ip',
        sql: 'ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS last_download_ip TEXT;'
      },
      {
        name: 'file_type',
        sql: 'ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS file_type TEXT;'
      },
      {
        name: 'ip_address',
        sql: 'ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS ip_address TEXT;'
      },
      {
        name: 'expires_at',
        sql: 'ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL \'7 days\');'
      }
    ];

    for (const column of columnsToAdd) {
      try {
        console.log(`Adding column: ${column.name}`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: column.sql 
        });

        if (error) {
          console.error(`Error adding ${column.name}:`, error);
          migrations.push(`❌ Failed to add ${column.name}: ${error.message}`);
        } else {
          console.log(`✅ Successfully added/verified ${column.name}`);
          migrations.push(`✅ Added/verified column: ${column.name}`);
        }
      } catch (err) {
        console.error(`Exception adding ${column.name}:`, err);
        migrations.push(`❌ Exception adding ${column.name}: ${err}`);
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_shared_files_expires_at ON shared_files(expires_at);',
      'CREATE INDEX IF NOT EXISTS idx_shared_files_created_at ON shared_files(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_shared_files_email ON shared_files(email);',
      'CREATE INDEX IF NOT EXISTS idx_shared_files_ip_address ON shared_files(ip_address);'
    ];

    for (const indexSql of indexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: indexSql 
        });

        if (error) {
          console.error('Error creating index:', error);
          migrations.push(`❌ Failed to create index: ${error.message}`);
        } else {
          migrations.push(`✅ Created/verified index`);
        }
      } catch (err) {
        console.error('Exception creating index:', err);
        migrations.push(`❌ Exception creating index: ${err}`);
      }
    }

    // Test the table structure
    try {
      console.log('🧪 Testing table structure...');
      
      const { error: testError } = await supabase
        .from('shared_files')
        .select('id, file_name, download_count, expires_at, ip_address')
        .limit(1);

      if (testError) {
        migrations.push(`❌ Table test failed: ${testError.message}`);
      } else {
        migrations.push(`✅ Table structure test passed`);
      }
    } catch (err) {
      migrations.push(`❌ Table test exception: ${err}`);
    }

    console.log('✅ Database migration completed');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      migrations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid API key' },
      { status: 401 }
    );
  }

  try {
    // Check table structure
    const { error } = await supabase
      .from('shared_files')
      .select()
      .limit(0);

    if (error) {
      return NextResponse.json({
        tableExists: false,
        error: error.message
      });
    }

    return NextResponse.json({
      tableExists: true,
      message: 'Table structure check completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Table check error:', error);
    return NextResponse.json(
      { 
        error: 'Table check failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}