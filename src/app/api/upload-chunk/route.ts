import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { 
  generateSecureShareId, 
  isAllowedFileType, 
  isValidFileSize, 
  sanitizeFilename,
  generateExpirationDate,
  checkRateLimit,
  hashPassword,
  validateEmails,
  encryptFilename,
  hashEmail,
  hashIP,
  type ExpirationOption,
  type AccessControl
} from '@/lib/security';
import { escapeHtml } from '@/lib/utils';

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

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not configured - email notifications will fail');
}

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

// Store for multipart upload sessions (in production, use Redis)
const uploadSessions = new Map<string, {
  uploadId: string;
  fileName: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
  shareId: string;
  fileSize: number;
  email: string;
  recipients: string[];
  title: string;
  message: string;
  shareMode: 'email' | 'link';
  accessControl: AccessControl;
  password?: string;
  maxDownloads?: number;
  expirationDate: Date;
  clientIP: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Check if user is authenticated (optional)
    let currentUser = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      currentUser = user;
    }
    
    // Rate limiting - configurable for uploads
    const uploadRateLimit = parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '100');
    if (!checkRateLimit(`chunk_${clientIP}`, uploadRateLimit, 60000)) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please slow down.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'init') {
      // Initialize multipart upload
      const fileName = formData.get('fileName') as string;
      const fileSize = parseInt(formData.get('fileSize') as string);
      const fileType = formData.get('fileType') as string;
      const email = formData.get('email') as string;
      const recipients = JSON.parse(formData.get('recipients') as string || '[]') as string[];
      const title = (formData.get('title') as string)?.trim() || '';
      const message = (formData.get('message') as string)?.trim() || '';
      
      // Sanitize inputs to prevent XSS
      const sanitizedTitle = title.length > 0 ? escapeHtml(title.substring(0, 200)) : '';
      const sanitizedMessage = message.length > 0 ? escapeHtml(message.substring(0, 1000)) : '';
      const shareMode = (formData.get('shareMode') as 'email' | 'link') || 'email';
      const accessControl = (formData.get('accessControl') as AccessControl) || 'public';
      const password = formData.get('password') as string;
      const maxDownloads = formData.get('maxDownloads') ? parseInt(formData.get('maxDownloads') as string) : undefined;
      const expirationOption = (formData.get('expirationOption') as ExpirationOption) || '7days';
      const customSlug = formData.get('customSlug') as string;

      if (!fileName || !fileSize || !fileType) {
        return NextResponse.json(
          { error: 'Missing required file parameters' },
          { status: 400 }
        );
      }

      // Validate recipients
      const validEmails = recipients.length > 0 ? recipients : [email];
      const { valid: validatedEmails, invalid: invalidEmails } = validateEmails(validEmails);
      
      if (invalidEmails.length > 0) {
        return NextResponse.json(
          { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
          { status: 400 }
        );
      }

      if (validatedEmails.length === 0) {
        return NextResponse.json(
          { error: 'At least one valid email address is required' },
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

      if (!isAllowedFileType(fileType, fileName)) {
        return NextResponse.json(
          { error: 'File type not allowed. Please upload a supported file format.' },
          { status: 400 }
        );
      }

      if (!isValidFileSize(fileSize)) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10GB.' },
          { status: 400 }
        );
      }

      const sanitizedFileName = sanitizeFilename(fileName);
      const s3FileName = `${Date.now()}-${sanitizedFileName}`;
      
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
      
      const expirationDate = generateExpirationDate(expirationOption);

      // Create multipart upload
      const createMultipartCommand = new CreateMultipartUploadCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: s3FileName,
        ContentType: fileType,
        Metadata: {
          'original-name': sanitizedFileName,
          'upload-ip': clientIP,
          'share-id': shareId
        }
      });

      const multipartResponse = await s3.send(createMultipartCommand);
      
      if (!multipartResponse.UploadId) {
        return NextResponse.json(
          { error: 'Failed to initialize upload' },
          { status: 500 }
        );
      }

      // Store session
      uploadSessions.set(shareId, {
        uploadId: multipartResponse.UploadId,
        fileName: s3FileName,
        parts: [],
        shareId,
        fileSize,
        email: validatedEmails[0], // Primary email for backward compatibility
        recipients: validatedEmails,
        title: sanitizedTitle || sanitizedFileName,
        message: sanitizedMessage,
        shareMode,
        accessControl,
        password: password?.trim(),
        maxDownloads,
        expirationDate,
        clientIP
      });

      return NextResponse.json({
        success: true,
        sessionId: shareId,
        uploadId: multipartResponse.UploadId
      });

    } else if (action === 'chunk') {
      // Upload chunk
      const sessionId = formData.get('sessionId') as string;
      const chunkNumber = parseInt(formData.get('chunkNumber') as string);
      const chunk = formData.get('chunk') as File;

      if (!sessionId || !chunkNumber || !chunk) {
        return NextResponse.json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Invalid session' },
          { status: 400 }
        );
      }

      const chunkBuffer = Buffer.from(await chunk.arrayBuffer());

      const uploadPartCommand = new UploadPartCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: session.fileName,
        PartNumber: chunkNumber,
        UploadId: session.uploadId,
        Body: chunkBuffer,
      });

      const partResponse = await s3.send(uploadPartCommand);
      
      if (!partResponse.ETag) {
        return NextResponse.json(
          { error: 'Failed to upload chunk' },
          { status: 500 }
        );
      }

      // Store part info
      session.parts[chunkNumber - 1] = {
        ETag: partResponse.ETag,
        PartNumber: chunkNumber
      };

      return NextResponse.json({
        success: true,
        chunkNumber,
        etag: partResponse.ETag
      });

    } else if (action === 'complete') {
      // Complete multipart upload
      const sessionId = formData.get('sessionId') as string;
      
      if (!sessionId) {
        return NextResponse.json(
          { error: 'Missing session ID' },
          { status: 400 }
        );
      }

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Invalid session' },
          { status: 400 }
        );
      }

      // Filter out empty parts and sort by part number
      const validParts = session.parts.filter(part => part && part.ETag);
      
      const completeMultipartCommand = new CompleteMultipartUploadCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: session.fileName,
        UploadId: session.uploadId,
        MultipartUpload: {
          Parts: validParts
        }
      });

      await s3.send(completeMultipartCommand);

      // Hash password if needed
      let passwordHash: string | null = null;
      let passwordSalt: string | null = null;
      if (session.accessControl === 'password' && session.password) {
        const hashedPassword = await hashPassword(session.password);
        passwordHash = hashedPassword.hash;
        passwordSalt = hashedPassword.salt;
      }

      // Generate encrypted filename and hash data
      const originalFileName = session.fileName.split('-').slice(1).join('-');
      const { encrypted: encryptedFilename, salt: filenameSalt } = encryptFilename(originalFileName);
      const emailHash = hashEmail(session.email);
      const ipHash = hashIP(session.clientIP);

      // Save to database
      const fileUrl = `https://${process.env.DO_BUCKET_NAME}.${process.env.DO_ENDPOINT}/${session.fileName}`;
      
      const { error: dbError } = await supabase
        .from('shared_files')
        .insert({
          id: session.shareId,
          user_id: currentUser?.id || null,
          file_name: originalFileName,
          encrypted_filename: encryptedFilename,
          filename_salt: filenameSalt,
          file_url: fileUrl,
          obfuscated_key: session.fileName,
          file_size: session.fileSize,
          file_type: 'application/octet-stream',
          email: session.email,
          email_hash: emailHash,
          recipients: session.recipients,
          title: session.title,
          message: session.message || null,
          ip_address: session.clientIP,
          ip_hash: ipHash,
          access_control: session.accessControl,
          password_hash: passwordHash,
          password_salt: passwordSalt,
          is_folder: false,
          folder_name: null,
          total_files: 1,
          max_downloads: session.maxDownloads,
          expires_at: session.expirationDate.toISOString(),
          created_at: new Date().toISOString(),
          download_count: 0,
          is_active: true,
          download_limit_reached: false
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Failed to save file record' },
          { status: 500 }
        );
      }

      // Send email - different content based on share mode
      const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/download/${session.shareId}`;
      
      try {
        if (session.shareMode === 'email') {
          // Send to all recipients
          for (const recipientEmail of session.recipients) {
            const { error: emailError } = await resend.emails.send({
              from: process.env.EMAIL_FROM_ADDRESS || 'share@openfiles.app',
              to: [recipientEmail],
              subject: session.title || `File ready: ${originalFileName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
                  <h2>${session.title || `File shared: ${originalFileName}`}</h2>
                  
                  ${session.message ? `
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                      <p style="margin: 0; font-style: italic; color: #495057;">"${session.message}"</p>
                    </div>
                  ` : ''}
                  
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>File:</strong> ${originalFileName}</p>
                    <p style="margin: 5px 0 0 0; color: #666;"><strong>Size:</strong> ${formatFileSize(session.fileSize)}</p>
                    ${session.accessControl === 'password' ? '<p style="margin: 5px 0 0 0; color: #e74c3c;"><strong>Password protected</strong></p>' : ''}
                    ${session.maxDownloads ? `<p style="margin: 5px 0 0 0; color: #666;"><strong>Download limit:</strong> ${session.maxDownloads} times</p>` : ''}
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${shareUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; 
                              display: inline-block;">
                      Download File
                    </a>
                  </div>
                  
                  <p style="color: #666; font-size: 14px;">
                    Link expires: ${session.expirationDate.toLocaleDateString()}
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
            from: process.env.EMAIL_FROM_ADDRESS || 'share@openfiles.app',
            to: [session.email],
            subject: `Share link generated: ${session.title || originalFileName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
                <h2>Your share link has been generated!</h2>
                
                <p>Your file <strong>${session.title || originalFileName}</strong> has been uploaded successfully.</p>
                
                ${session.message ? `
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <p style="margin: 0; font-weight: bold; color: #495057;">Your message:</p>
                    <p style="margin: 5px 0 0 0; font-style: italic; color: #495057;">"${session.message}"</p>
                  </div>
                ` : ''}
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>File:</strong> ${originalFileName}</p>
                  <p style="margin: 5px 0 0 0; color: #666;"><strong>Size:</strong> ${formatFileSize(session.fileSize)}</p>
                  ${session.accessControl === 'password' ? '<p style="margin: 5px 0 0 0; color: #e74c3c;"><strong>Password protected</strong></p>' : ''}
                  ${session.maxDownloads ? `<p style="margin: 5px 0 0 0; color: #666;"><strong>Download limit:</strong> ${session.maxDownloads} times</p>` : ''}
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
                  Link expires: ${session.expirationDate.toLocaleDateString()}
                </p>
                
                ${session.accessControl === 'password' ? `
                  <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
                    <p style="margin: 0; color: #856404;"><strong>Password Protection:</strong> Recipients will need the password you set to access this file.</p>
                  </div>
                ` : ''}
                
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                  Copy and share this link with anyone you want to give access to your file.
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

      // Clean up session
      uploadSessions.delete(sessionId);

      return NextResponse.json({
        success: true,
        shareUrl: shareUrl,
        expirationDate: session.expirationDate.toISOString(),
        message: 'Large file uploaded successfully and email sent',
      });

    } else if (action === 'abort') {
      // Abort multipart upload
      const sessionId = formData.get('sessionId') as string;
      
      if (!sessionId) {
        return NextResponse.json(
          { error: 'Missing session ID' },
          { status: 400 }
        );
      }

      const session = uploadSessions.get(sessionId);
      if (session) {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: process.env.DO_BUCKET_NAME,
          Key: session.fileName,
          UploadId: session.uploadId
        });

        await s3.send(abortCommand);
        uploadSessions.delete(sessionId);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Chunked upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}