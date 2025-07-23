import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptFilename } from '@/lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      );
    }

    // Verify the user with Supabase
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's files from database
    const { data: files, error } = await supabase
      .from('shared_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      );
    }

    // Decrypt filenames for display
    const filesWithDecryptedNames = files?.map((file: Record<string, unknown>) => {
      let displayName = file.file_name;
      
      // Decrypt filename if encrypted data is available
      if (file.encrypted_filename && file.filename_salt) {
        try {
          displayName = decryptFilename(String(file.encrypted_filename), String(file.filename_salt));
        } catch (error) {
          console.error('Failed to decrypt filename:', error);
          // Fallback to original filename
        }
      }
      
      return {
        ...file,
        file_name: displayName
      };
    }) || [];

    return NextResponse.json({ 
      files: filesWithDecryptedNames,
      count: filesWithDecryptedNames.length 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}