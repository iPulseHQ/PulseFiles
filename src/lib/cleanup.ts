import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

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

export interface CleanupResult {
  deletedFiles: number;
  deletedSize: number;
  errors: string[];
  duration: number;
}

export async function cleanupExpiredFiles(): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    deletedFiles: 0,
    deletedSize: 0,
    errors: [],
    duration: 0
  };

  try {
    console.log('🧹 Starting cleanup of expired files...');

    // Get all expired files from database
    const { data: expiredFiles, error: dbError } = await supabase
      .from('shared_files')
      .select('*')
      .lt('expires_at', new Date().toISOString());

    if (dbError) {
      result.errors.push(`Database error: ${dbError.message}`);
      return result;
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      console.log('✅ No expired files to clean up');
      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(`🗑️ Found ${expiredFiles.length} expired files to delete`);

    // Delete files from S3 and database
    for (const file of expiredFiles) {
      try {
        // Extract filename from URL
        const urlParts = file.file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        // Delete from S3
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.DO_BUCKET_NAME,
          Key: fileName
        });

        await s3.send(deleteCommand);

        // Delete from database
        const { error: deleteError } = await supabase
          .from('shared_files')
          .delete()
          .eq('id', file.id);

        if (deleteError) {
          result.errors.push(`Failed to delete ${file.file_name} from database: ${deleteError.message}`);
          continue;
        }

        result.deletedFiles++;
        result.deletedSize += file.file_size || 0;

        console.log(`🗑️ Deleted: ${file.file_name} (${(file.file_size / 1024 / 1024).toFixed(2)} MB)`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete ${file.file_name}: ${errorMessage}`);
      }
    }

    // Log cleanup results
    await logCleanupResult(result);

    result.duration = Date.now() - startTime;
    console.log(`✅ Cleanup completed: ${result.deletedFiles} files deleted, ${(result.deletedSize / 1024 / 1024).toFixed(2)} MB freed`);
    
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Cleanup failed: ${errorMessage}`);
    result.duration = Date.now() - startTime;
    return result;
  }
}

export async function cleanupOrphanedFiles(): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    deletedFiles: 0,
    deletedSize: 0,
    errors: [],
    duration: 0
  };

  try {
    console.log('🔍 Looking for orphaned files in S3...');

    // List all files in S3
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.DO_BUCKET_NAME
    });

    const s3Objects = await s3.send(listCommand);
    
    if (!s3Objects.Contents || s3Objects.Contents.length === 0) {
      result.duration = Date.now() - startTime;
      return result;
    }

    // Get all file URLs from database
    const { data: dbFiles, error: dbError } = await supabase
      .from('shared_files')
      .select('file_url');

    if (dbError) {
      result.errors.push(`Database error: ${dbError.message}`);
      return result;
    }

    const dbFileNames = new Set(
      dbFiles?.map(file => {
        const urlParts = file.file_url.split('/');
        return urlParts[urlParts.length - 1];
      }) || []
    );

    // Find orphaned files
    const orphanedFiles = s3Objects.Contents.filter(obj => 
      obj.Key && !dbFileNames.has(obj.Key)
    );

    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found');
      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(`🗑️ Found ${orphanedFiles.length} orphaned files to delete`);

    // Delete orphaned files
    for (const file of orphanedFiles) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.DO_BUCKET_NAME,
          Key: file.Key!
        });

        await s3.send(deleteCommand);

        result.deletedFiles++;
        result.deletedSize += file.Size || 0;

        console.log(`🗑️ Deleted orphaned file: ${file.Key}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete orphaned file ${file.Key}: ${errorMessage}`);
      }
    }

    result.duration = Date.now() - startTime;
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Orphaned cleanup failed: ${errorMessage}`);
    result.duration = Date.now() - startTime;
    return result;
  }
}

async function logCleanupResult(result: CleanupResult) {
  try {
    // Store cleanup log in database (you may want to create a cleanup_logs table)
    const logEntry = {
      cleanup_date: new Date().toISOString(),
      deleted_files: result.deletedFiles,
      deleted_size: result.deletedSize,
      errors: result.errors,
      duration: result.duration
    };

    // For now, just log to console
    console.log('📊 Cleanup log:', JSON.stringify(logEntry, null, 2));
    
  } catch (error) {
    console.error('Failed to log cleanup result:', error);
  }
}

// Get cleanup statistics
export async function getCleanupStats() {
  try {
    const { data: totalFiles, error: totalError } = await supabase
      .from('shared_files')
      .select('file_size', { count: 'exact' });

    const { data: expiredFiles, error: expiredError } = await supabase
      .from('shared_files')
      .select('file_size', { count: 'exact' })
      .lt('expires_at', new Date().toISOString());

    if (totalError || expiredError) {
      throw new Error('Failed to get cleanup stats');
    }

    const totalSize = totalFiles?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
    const expiredSize = expiredFiles?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;

    return {
      totalFiles: totalFiles?.length || 0,
      totalSize,
      expiredFiles: expiredFiles?.length || 0,
      expiredSize,
      storageUsed: (totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      canFreeUp: (expiredSize / 1024 / 1024 / 1024).toFixed(2) + ' GB'
    };

  } catch (error) {
    console.error('Failed to get cleanup stats:', error);
    return null;
  }
}