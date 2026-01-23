import { NextResponse } from 'next/server';
import { db } from '@/lib/neon';
import { decryptFilename } from '@/lib/security';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Verify the user with Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Clerk User ID:', userId);
    
    // Get user's files from database using Neon
    const files = await db.getFilesByUserId(userId);

    // Decrypt filenames for display
    const filesWithDecryptedNames = files?.map((file: any) => {
      let displayName = file.file_name;
      
      // Decrypt filename if encrypted data is available
      if (file.encrypted_filename && file.filename_salt) {
        try {
          displayName = decryptFilename(file.encrypted_filename, file.filename_salt);
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
