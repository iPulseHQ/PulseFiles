import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { EXPIRATION_OPTIONS, generateObfuscatedKey, sanitizeFilename } from '@/lib/security';

const s3 = new S3Client({
  region: process.env.DO_REGION,
  endpoint: `https://${process.env.DO_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.DO_ACCESS_TOKEN!,
    secretAccessKey: process.env.DO_SECRET_KEY!,
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Share API endpoint for developers
export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('pf_')) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Verify API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('api_key', apiKey);

    // Parse request body
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || file?.name || 'Shared File';
    const expiration = formData.get('expiration') as string || '7days';
    
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate expiration
    if (!EXPIRATION_OPTIONS[expiration as keyof typeof EXPIRATION_OPTIONS]) {
      return NextResponse.json(
        { error: 'Invalid expiration option' },
        { status: 400 }
      );
    }

    // Generate unique file ID
    const fileId = nanoid(64); // Use 64 chars like other endpoints
    
    // Calculate expiration date
    const expirationConfig = EXPIRATION_OPTIONS[expiration as keyof typeof EXPIRATION_OPTIONS];
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + expirationConfig.hours * 60 * 60 * 1000);

    // Sanitize filename and generate obfuscated key
    const sanitizedFilename = sanitizeFilename(file.name);
    const obfuscatedKey = generateObfuscatedKey(sanitizedFilename);
    
    // Convert file to buffer for storage
    const buffer = Buffer.from(await file.arrayBuffer());

    // Store in DigitalOcean Spaces
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.DO_BUCKET_NAME,
      Key: obfuscatedKey,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        'original-filename': sanitizedFilename,
        'upload-source': 'api',
      },
    });

    try {
      await s3.send(uploadCommand);
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Generate file URL for DigitalOcean Spaces
    const fileUrl = `https://${process.env.DO_ENDPOINT}/${process.env.DO_BUCKET_NAME}/${obfuscatedKey}`;

    // Save to database
    const { error: dbError } = await supabase
      .from('shared_files')
      .insert({
        id: fileId,
        user_id: keyData.user_id,
        file_name: sanitizedFilename,
        file_size: file.size,
        file_type: file.type,
        file_url: fileUrl,
        obfuscated_key: obfuscatedKey,
        email: '', // API uploads don't have email
        expires_at: expiresAt.toISOString(),
        access_control: 'public',
        is_active: true,
        download_count: 0,
        is_folder: false,
        created_via: 'api'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file - we don't need to remove from Supabase storage anymore
      return NextResponse.json(
        { error: 'Failed to save file metadata' },
        { status: 500 }
      );
    }

    // Return share URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pulsefiles.app';
    const shareUrl = `${baseUrl}/download/${fileId}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      fileId,
      fileName: sanitizedFilename,
      fileSize: file.size,
      expiresAt: expiresAt.toISOString(),
      message: 'File shared successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get API documentation
export async function GET() {
  return NextResponse.json({
    name: 'PulseFiles Share API',
    version: '1.0.0',
    description: 'API for sharing files programmatically',
    endpoints: {
      share: {
        method: 'POST',
        url: '/api/share',
        headers: {
          'x-api-key': 'Your API key (pf_...)'
        },
        body: 'FormData with file and optional title, expiration',
        response: {
          success: true,
          shareUrl: 'https://pulsefiles.app/download/abc123',
          fileId: 'abc123',
          title: 'My File',
          expiresAt: '2024-01-01T00:00:00.000Z'
        }
      }
    },
    examples: {
      curl: `curl -X POST https://pulsefiles.app/api/share \\
  -H "x-api-key: pf_your_api_key_here" \\
  -F "file=@document.pdf" \\
  -F "title=My Document" \\
  -F "expiration=7days"`,
      javascript: `const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('title', 'My Document');
formData.append('expiration', '7days');

fetch('https://pulsefiles.app/api/share', {
  method: 'POST',
  headers: {
    'x-api-key': 'pf_your_api_key_here'
  },
  body: formData
}).then(res => res.json()).then(data => {
  console.log('Share URL:', data.shareUrl);
});`
    }
  });
}