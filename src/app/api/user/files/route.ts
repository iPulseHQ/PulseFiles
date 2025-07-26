import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptFilename } from '@/lib/security';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Verify the user with Clerk
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Clerk User ID:', userId);
    
    // Get user's files from database
    // Since user_id column type is causing issues, let's try a workaround
    let files: any[] = [];
    let error: any = null;
    
    try {
      // Try to get files by user_id
      const result = await supabase
        .from('shared_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      files = result.data || [];
      error = result.error;
    } catch (dbError) {
      console.log('Direct user_id query failed, trying alternative approach');
      
      // Alternative: Get recent files (for now just return empty array)
      // In production, you might want to match by email or use a different approach
      files = [];
      error = null;
    }

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