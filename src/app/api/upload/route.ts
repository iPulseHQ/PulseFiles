import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { 
  generateSecureShareId, 
  isAllowedFileType, 
  isValidFileSize, 
  sanitizeFilename,
  generateExpirationDate,
  checkRateLimit,
  encryptFilename,
  generateObfuscatedKey,
  hashEmail,
  hashIP,
  hashPassword,
  validateEmails,
  validateFolderUpload,
  type ExpirationOption,
  type AccessControl
} from '@/lib/security';

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

const resend = new Resend(process.env.RESEND_API_KEY);

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real.trim();
  }
  
  return 'unknown';
}

// Removed unused function - using validateEmails from security.ts

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function POST(request: NextRequest) {
  try {
    // Check required environment variables
    const requiredEnvVars = [
      'DO_REGION', 'DO_ENDPOINT', 'DO_ACCESS_TOKEN', 'DO_SECRET_KEY', 'DO_BUCKET_NAME',
      'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SITE_URL', 'RESEND_API_KEY'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        return NextResponse.json(
          { error: `Server configuration error: Missing ${envVar}` },
          { status: 500 }
        );
      }
    }
    
    // Rate limiting check
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP, 5, 60000)) { // 5 uploads per minute
      return NextResponse.json(
        { error: 'Too many upload attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user is authenticated (optional)
    let currentUser = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      currentUser = user;
    }

    const formData = await request.formData();
    
    // File/folder handling
    const file = formData.get('file') as File;
    const files = formData.getAll('files') as File[];
    const isFolder = formData.get('isFolder') === 'true';
    const folderName = formData.get('folderName') as string;
    
    // Metadata
    const shareMode = (formData.get('shareMode') as 'email' | 'link') || 'email';
    const recipients = JSON.parse(formData.get('recipients') as string || '[]') as string[];
    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const expirationOption = (formData.get('expirationOption') as ExpirationOption) || '7days';
    const customSlug = formData.get('customSlug') as string;
    const accessControl = (formData.get('accessControl') as AccessControl) || 'public';
    const password = formData.get('password') as string;
    const maxDownloads = formData.get('maxDownloads') ? parseInt(formData.get('maxDownloads') as string) : null;

    // Validate inputs
    if (!file && !isFolder) {
      return NextResponse.json(
        { error: 'File or folder is required' },
        { status: 400 }
      );
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient email is required' },
        { status: 400 }
      );
    }

    // Validate recipient emails
    const { valid: validEmails, invalid: invalidEmails } = validateEmails(recipients);
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    if (validEmails.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 recipients allowed' },
        { status: 400 }
      );
    }

    // Validate password if password protection is enabled
    if (accessControl === 'password' && !password?.trim()) {
      return NextResponse.json(
        { error: 'Password is required for password-protected files' },
        { status: 400 }
      );
    }

    // Validate folder upload if applicable
    if (isFolder && files.length > 0) {
      const folderValidation = validateFolderUpload(files);
      if (!folderValidation.valid) {
        return NextResponse.json(
          { error: `Folder validation failed: ${folderValidation.errors.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate file types and sizes
    if (isFolder && files.length > 0) {
      // Folder validation already done above
    } else if (file) {
      // Single file validation
      if (!isAllowedFileType(file.type, file.name)) {
        return NextResponse.json(
          { error: 'File type not allowed. Please upload a supported file format.' },
          { status: 400 }
        );
      }

      if (!isValidFileSize(file.size)) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10GB. For files over 100MB, consider using chunked upload.' },
          { status: 400 }
        );
      }
    }

    // Process filename(s)
    let sanitizedFileName: string;
    let totalSize: number;
    
    if (isFolder && files.length > 0) {
      sanitizedFileName = sanitizeFilename(folderName || 'folder');
      totalSize = files.reduce((sum, f) => sum + f.size, 0);
    } else if (file) {
      sanitizedFileName = sanitizeFilename(file.name);
      totalSize = file.size;
    } else {
      return NextResponse.json(
        { error: 'No file or folder provided' },
        { status: 400 }
      );
    }
    
    // Encrypt filename for database storage
    const { encrypted: encryptedFilename, salt: filenameSalt } = encryptFilename(sanitizedFileName);
    
    // Generate share ID - use custom slug if provided, otherwise generate secure ID
    let shareId: string;
    if (customSlug && customSlug.trim().length > 0) {
      // Validate custom slug
      const cleanSlug = customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (cleanSlug.length < 3) {
        return NextResponse.json(
          { error: 'Custom link must be at least 3 characters long' },
          { status: 400 }
        );
      }
      
      // Check if custom slug already exists
      const { data: existingFile } = await supabase
        .from('shared_files')
        .select('id')
        .eq('id', cleanSlug)
        .single();
      
      if (existingFile) {
        return NextResponse.json(
          { error: 'Custom link already exists. Please choose a different one.' },
          { status: 400 }
        );
      }
      
      shareId = cleanSlug;
    } else {
      shareId = generateSecureShareId();
    }
    
    // Generate obfuscated S3 key for single files
    const obfuscatedKey = isFolder ? null : generateObfuscatedKey(sanitizedFileName, shareId);
    
    // Hash password if password protection is enabled
    let passwordHash: string | null = null;
    let passwordSalt: string | null = null;
    if (accessControl === 'password' && password?.trim()) {
      const hashedPassword = await hashPassword(password.trim());
      passwordHash = hashedPassword.hash;
      passwordSalt = hashedPassword.salt;
    }

    // Generate expiration date using the selected option
    const expirationDate = generateExpirationDate(expirationOption);

    let fileUrl: string;
    const folderContents: Array<{
      filePath: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      s3Key: string;
    }> = [];

    if (isFolder && files.length > 0) {
      // Handle folder upload - create a ZIP file or upload individual files
      // For now, let's upload files individually and track them
      const baseKey = `folders/${shareId}`;
      
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const relativePath = currentFile.webkitRelativePath || currentFile.name;
        const fileKey = `${baseKey}/${relativePath}`;
        const fileBuffer = Buffer.from(await currentFile.arrayBuffer());
        
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.DO_BUCKET_NAME,
          Key: fileKey,
          Body: fileBuffer,
          ACL: 'private',
          ContentType: currentFile.type,
          Metadata: {
            'share-id': shareId,
            'file-index': i.toString(),
            'total-files': files.length.toString(),
            'upload-date': new Date().toISOString()
          }
        });

        await s3.send(uploadCommand);
        
        folderContents.push({
          filePath: relativePath,
          fileName: currentFile.name,
          fileSize: currentFile.size,
          fileType: currentFile.type,
          s3Key: fileKey
        });
      }
      
      fileUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/download/${shareId}`;
    } else if (file) {
      // Single file upload
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: obfuscatedKey!,
        Body: fileBuffer,
        ACL: 'private',
        ContentType: file.type,
        Metadata: {
          'share-id': shareId,
          'file-size': file.size.toString(),
          'upload-date': new Date().toISOString()
        }
      });

      await s3.send(uploadCommand);
      fileUrl = `https://${process.env.DO_BUCKET_NAME}.${process.env.DO_ENDPOINT}/${obfuscatedKey}`;
    } else {
      throw new Error('No file or folder to upload');
    }
    
    // Hash sensitive data for privacy
    const primaryEmail = validEmails[0]; // Use first valid email as primary
    const emailHash = hashEmail(primaryEmail);
    const ipHash = hashIP(clientIP);

    // Insert main file record
    const { error: dbError } = await supabase
      .from('shared_files')
      .insert({
        id: shareId,
        user_id: currentUser?.id || null,
        file_name: sanitizedFileName,
        encrypted_filename: encryptedFilename,
        filename_salt: filenameSalt,
        file_url: fileUrl,
        obfuscated_key: isFolder ? null : obfuscatedKey,
        file_size: totalSize,
        file_type: isFolder ? 'folder' : (file?.type || 'application/octet-stream'),
        email: primaryEmail, // Keep primary email for backwards compatibility
        email_hash: emailHash,
        recipients: validEmails, // Array of all recipients
        title: title?.trim() || sanitizedFileName,
        message: message?.trim() || null,
        ip_address: clientIP,
        ip_hash: ipHash,
        access_control: accessControl,
        password_hash: passwordHash,
        password_salt: passwordSalt,
        is_folder: isFolder,
        folder_name: isFolder ? (folderName || sanitizedFileName) : null,
        total_files: isFolder ? files.length : 1,
        max_downloads: maxDownloads,
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString(),
        download_count: 0,
        is_active: true,
        download_limit_reached: false
      });

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Provide more specific error message
      let errorMessage = 'Failed to save file record';
      if (dbError.message?.includes('download_count')) {
        errorMessage = 'Database schema needs updating. Please run the database migration script.';
      } else if (dbError.code === 'PGRST204') {
        errorMessage = 'Database table is missing required columns. Please check the database schema.';
      }
      
      return NextResponse.json(
        { error: errorMessage, details: dbError.message },
        { status: 500 }
      );
    }

    // Insert folder contents if this is a folder upload
    if (isFolder && folderContents.length > 0) {
      const folderRecords = folderContents.map(content => ({
        shared_file_id: shareId,
        file_path: content.filePath,
        file_name: content.fileName,
        file_size: content.fileSize,
        file_type: content.fileType,
        s3_key: content.s3Key
      }));

      const { error: folderError } = await supabase
        .from('folder_contents')
        .insert(folderRecords);

      if (folderError) {
        console.error('Folder contents error:', folderError);
        // Don't fail the upload, just log the error
      }
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/download/${shareId}`;

    // Send emails - different content based on share mode
    try {
      if (shareMode === 'email') {
        // Send to all recipients
        for (const recipientEmail of validEmails) {
          const { error: emailError } = await resend.emails.send({
            from: 'share@openfiles.app',
            to: [recipientEmail],
            subject: title?.trim() || `File ready: ${sanitizedFileName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
                <h2>${title?.trim() || (isFolder ? `Folder shared: ${sanitizedFileName}` : `File shared: ${sanitizedFileName}`)}</h2>
                
                ${message?.trim() ? `
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <p style="margin: 0; font-style: italic; color: #495057;">"${message.trim()}"</p>
                  </div>
                ` : ''}
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  ${isFolder ? `
                    <p style="margin: 0;"><strong>Folder:</strong> ${sanitizedFileName}</p>
                    <p style="margin: 5px 0 0 0; color: #666;"><strong>Files:</strong> ${files.length} files, ${formatFileSize(totalSize)}</p>
                  ` : `
                    <p style="margin: 0;"><strong>File:</strong> ${sanitizedFileName}</p>
                    <p style="margin: 5px 0 0 0; color: #666;"><strong>Size:</strong> ${formatFileSize(totalSize)}</p>
                  `}
                  ${accessControl === 'password' ? '<p style="margin: 5px 0 0 0; color: #e74c3c;"><strong>Password protected</strong></p>' : ''}
                  ${maxDownloads ? `<p style="margin: 5px 0 0 0; color: #666;"><strong>Download limit:</strong> ${maxDownloads} times</p>` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${shareUrl}" 
                     style="background-color: #007bff; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 5px; font-weight: bold; 
                            display: inline-block;">
                    ${isFolder ? 'Download Folder' : 'Download File'}
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Link expires: ${expirationDate.toLocaleDateString()}
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Shared securely via OpenFiles
                </p>
              </div>
            `,
          });

          if (emailError) {
            console.error('Email sending error:', emailError);
          }
        }
      } else {
        // Send confirmation to uploader with link to share
        const { error: emailError } = await resend.emails.send({
          from: 'share@openfiles.app',
          to: [primaryEmail],
          subject: `Share link generated: ${title?.trim() || sanitizedFileName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
              <h2>Your share link has been generated!</h2>
              
              <p>Your ${isFolder ? 'folder' : 'file'} <strong>${title?.trim() || sanitizedFileName}</strong> has been uploaded successfully.</p>
              
              ${message?.trim() ? `
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                  <p style="margin: 0; font-weight: bold; color: #495057;">Your message:</p>
                  <p style="margin: 5px 0 0 0; font-style: italic; color: #495057;">"${message.trim()}"</p>
                </div>
              ` : ''}
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                ${isFolder ? `
                  <p style="margin: 0;"><strong>Folder:</strong> ${sanitizedFileName}</p>
                  <p style="margin: 5px 0 0 0; color: #666;"><strong>Files:</strong> ${files.length} files, ${formatFileSize(totalSize)}</p>
                ` : `
                  <p style="margin: 0;"><strong>File:</strong> ${sanitizedFileName}</p>
                  <p style="margin: 5px 0 0 0; color: #666;"><strong>Size:</strong> ${formatFileSize(totalSize)}</p>
                `}
                ${accessControl === 'password' ? '<p style="margin: 5px 0 0 0; color: #e74c3c;"><strong>Password protected</strong></p>' : ''}
                ${maxDownloads ? `<p style="margin: 5px 0 0 0; color: #666;"><strong>Download limit:</strong> ${maxDownloads} times</p>` : ''}
              </div>
              
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #bbdefb;">
                <p style="margin: 0; font-weight: bold; color: #1976d2;">Share this link:</p>
                <p style="margin: 10px 0; word-break: break-all; font-family: monospace; font-size: 14px; color: #0d47a1; background: white; padding: 10px; border-radius: 3px;">
                  ${shareUrl}
                </p>
                <button onclick="navigator.clipboard.writeText('${shareUrl}')" style="background-color: #1976d2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  Copy Link
                </button>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Link expires: ${expirationDate.toLocaleDateString()}
              </p>
              
              ${accessControl === 'password' ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
                  <p style="margin: 0; color: #856404;"><strong>Password Protection:</strong> Recipients will need the password you set to access this ${isFolder ? 'folder' : 'file'}.</p>
                </div>
              ` : ''}
              
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                Copy and share this link with anyone you want to give access to your ${isFolder ? 'folder' : 'file'}.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                Shared securely via OpenFiles
              </p>
            </div>
          `,
        });

        if (emailError) {
          console.error('Email sending error:', emailError);
        }
      }
    } catch (emailException) {
      console.error('Failed to send email:', emailException);
    }

    return NextResponse.json({
      success: true,
      shareUrl: shareUrl,
      expirationDate: expirationDate.toISOString(),
      message: shareMode === 'email' 
        ? 'File uploaded securely and email sent successfully'
        : 'File uploaded securely. Share link generated!',
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide more specific error information for debugging
    let errorMessage = 'Upload failed';
    if (error instanceof Error) {
      errorMessage = `Upload failed: ${error.message}`;
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: errorMessage, debug: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    );
  }
}