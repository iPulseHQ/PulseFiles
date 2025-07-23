import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, isFileExpired, decryptFilename, hashIP } from '@/lib/security';
import bcrypt from 'bcryptjs';
import JSZip from 'jszip';

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

function getClientIP(request: NextRequest): string {
  // Try multiple headers for IP detection
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cfConnecting = request.headers.get('cf-connecting-ip');
  const xClient = request.headers.get('x-client-ip');
  
  // Cloudflare
  if (cfConnecting && cfConnecting !== 'unknown') {
    return cfConnecting.trim();
  }
  
  // Standard forwarded header
  if (forwarded && forwarded !== 'unknown') {
    return forwarded.split(',')[0].trim();
  }
  
  // Real IP header
  if (real && real !== 'unknown') {
    return real.trim();
  }
  
  // Alternative client IP header
  if (xClient && xClient !== 'unknown') {
    return xClient.trim();
  }
  
  return '127.0.0.1'; // Default instead of 'unknown'
}

function isValidShareId(id: string): boolean {
  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }
  
  // Prevent path traversal
  if (id.includes('..') || id.includes('/') || id.includes('\\')) {
    return false;
  }
  
  // Allow secure generated IDs (64 chars) or custom slugs (3-50 chars)
  return (id.length === 64 && /^[A-Za-z0-9_-]+$/.test(id)) || 
         (id.length >= 3 && id.length <= 50 && /^[a-z0-9_-]+$/.test(id));
}

// Handle both GET and POST requests
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleDownloadRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleDownloadRequest(request, params);
}

async function handleDownloadRequest(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const { id } = await params;
    const clientIP = getClientIP(request);
    
    // Parse request body for password if it's a POST request
    let requestBody: { password?: string } = {};
    if (request.method === 'POST') {
      try {
        requestBody = await request.json();
      } catch {
        // Ignore JSON parsing errors for GET requests
      }
    }

    // Rate limiting - configurable downloads per IP
    const downloadRateLimit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');
    if (!checkRateLimit(`download_${clientIP}`, downloadRateLimit, 60000)) {
      return NextResponse.json(
        { error: 'Too many download attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate share ID format
    if (!isValidShareId(id)) {
      return NextResponse.json(
        { error: 'Invalid download link' },
        { status: 400 }
      );
    }

    // Get file record from database with folder contents
    const { data: fileRecord, error } = await supabase
      .from('shared_files')
      .select('*, folder_contents(*)')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check if file has expired
    if (isFileExpired(fileRecord.created_at, fileRecord.expires_at)) {
      return NextResponse.json(
        { error: 'Download link has expired' },
        { status: 410 }
      );
    }
    
    // Check download limits
    if (fileRecord.max_downloads && fileRecord.download_count >= fileRecord.max_downloads) {
      return NextResponse.json(
        { error: 'Download limit reached' },
        { status: 403 }
      );
    }
    
    // Handle access control
    if (fileRecord.access_control === 'password') {
      if (!requestBody.password) {
        return NextResponse.json(
          { error: 'Password required' },
          { status: 401 }
        );
      }
      
      // Verify password
      if (!fileRecord.password_hash) {
        return NextResponse.json(
          { error: 'Password protection not properly configured' },
          { status: 500 }
        );
      }
      
      const passwordValid = await bcrypt.compare(requestBody.password, fileRecord.password_hash);
      if (!passwordValid) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 401 }
        );
      }
    } else if (fileRecord.access_control === 'authenticated') {
      // Check if user is authenticated (this would require auth token validation)
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }
    }

    // Decrypt filename if available, otherwise use original
    let displayFilename = fileRecord.file_name;
    if (fileRecord.encrypted_filename && fileRecord.filename_salt) {
      displayFilename = decryptFilename(fileRecord.encrypted_filename, fileRecord.filename_salt);
    }

    let signedUrl: string;
    let fileName: string;
    
    if (fileRecord.is_folder && fileRecord.folder_contents && fileRecord.folder_contents.length > 0) {
      // Handle folder download - create ZIP file
      const zip = new JSZip();
      
      // Add each file from folder to ZIP
      for (const folderFile of fileRecord.folder_contents) {
        try {
          // Get file from S3
          const getCommand = new GetObjectCommand({
            Bucket: process.env.DO_BUCKET_NAME,
            Key: folderFile.s3_key,
          });
          
          const fileResponse = await s3.send(getCommand);
          if (fileResponse.Body) {
            const fileBuffer = await fileResponse.Body.transformToByteArray();
            zip.file(folderFile.file_path, fileBuffer);
          }
        } catch (fileError) {
          console.error(`Error adding file ${folderFile.file_path} to ZIP:`, fileError);
          // Continue with other files
        }
      }
      
      // Generate ZIP buffer
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      
      // For now, we'll need to upload the ZIP to S3 temporarily
      // In production, you might want to stream this directly
      const tempZipKey = `temp-zip/${id}-${Date.now()}.zip`;
      const zipUploadCommand = new PutObjectCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: tempZipKey,
        Body: zipBuffer,
        ContentType: 'application/zip',
      });
      
      await s3.send(zipUploadCommand);
      
      // Generate signed URL for ZIP download
      const zipDownloadCommand = new GetObjectCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: tempZipKey,
        ResponseContentDisposition: `attachment; filename="${displayFilename}.zip"`,
      });
      
      signedUrl = await getSignedUrl(s3, zipDownloadCommand, { expiresIn: 300 }); // 5 minutes
      fileName = `${displayFilename}.zip`;
      
      // Schedule cleanup of temporary ZIP file (in production, use a proper cleanup job)
      setTimeout(async () => {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.DO_BUCKET_NAME,
            Key: tempZipKey,
          });
          await s3.send(deleteCommand);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary ZIP file:', cleanupError);
        }
      }, 600000); // 10 minutes
      
    } else {
      // Single file download
      const s3Key = fileRecord.obfuscated_key || fileRecord.file_url.split('/').pop();
      
      // Generate signed URL for secure download (valid for 5 minutes)
      const command = new GetObjectCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${displayFilename}"`,
      });

      signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
      fileName = displayFilename;
    }

    // Use the database function to increment download count and check limits
    const { error: incrementError } = await supabase
      .rpc('increment_download_count', { file_id: id });
    
    if (incrementError) {
      console.error('Error incrementing download count:', incrementError);
      // Continue with download but log the error
    }
    
    // Log file access
    const downloadIPHash = hashIP(clientIP);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const { error: logError } = await supabase
      .rpc('log_file_access', {
        file_id: id,
        ip_addr: clientIP,
        ip_hash_val: downloadIPHash,
        user_agent_val: userAgent,
        success: true,
        method: fileRecord.access_control
      });
    
    if (logError) {
      console.error('Error logging file access:', logError);
    }
    
    // Also update the legacy fields for backwards compatibility
    await supabase
      .from('shared_files')
      .update({ 
        last_downloaded_at: new Date().toISOString(),
        last_download_ip: clientIP,
        last_download_ip_hash: downloadIPHash
      })
      .eq('id', id);

    // Log download attempt for security monitoring
    console.log(`Secure download: ${id} from IP: ${clientIP} at ${new Date().toISOString()}`);

    return NextResponse.json({
      downloadUrl: signedUrl,
      fileName: fileName,
      fileSize: fileRecord.file_size,
      isFolder: fileRecord.is_folder,
      expiresIn: 300 // seconds
    });

  } catch (error) {
    console.error('Secure download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}