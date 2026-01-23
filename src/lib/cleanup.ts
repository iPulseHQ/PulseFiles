import { db, sql } from '@/lib/neon';
import { azureStorage } from '@/lib/azureStorage';

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

    // Get all expired files from database using Neon
    const expiredFiles = await db.getExpiredFiles();

    if (!expiredFiles || expiredFiles.length === 0) {
      console.log('✅ No expired files to clean up');
      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(`🗑️ Found ${expiredFiles.length} expired files to delete`);

    // Delete files from Azure Blob Storage and database
    for (const file of expiredFiles) {
      try {
        // Delete from Azure Blob Storage
        if (file.is_folder) {
          // Get folder contents and delete each file
          const folderContents = await db.getFolderContents(file.id);
          
          for (const content of folderContents) {
            try {
              await azureStorage.deleteFile(content.s3_key);
            } catch (err) {
              console.error(`Failed to delete folder file ${content.file_path}:`, err);
            }
          }
        } else if (file.obfuscated_key) {
          // Single file deletion
          await azureStorage.deleteFile(file.obfuscated_key);
        }

        // Mark as inactive in database (soft delete)
        await db.deleteFile(file.id);

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
    console.log('🔍 Looking for orphaned files in Azure Blob Storage...');

    // List all files in Azure Blob Storage
    const allBlobs = await azureStorage.listFiles();
    
    if (allBlobs.length === 0) {
      result.duration = Date.now() - startTime;
      return result;
    }

    // Get all file keys from database
    const allFiles = await sql`SELECT obfuscated_key FROM shared_files WHERE obfuscated_key IS NOT NULL`;
    const folderContents = await sql`SELECT s3_key FROM folder_contents`;

    const dbFileKeys = new Set([
      ...allFiles.map((f: any) => f.obfuscated_key),
      ...folderContents.map((f: any) => f.s3_key)
    ]);

    // Find orphaned files (in Azure but not in database)
    const orphanedFiles = allBlobs.filter(blob => !dbFileKeys.has(blob.key));

    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found');
      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(`🗑️ Found ${orphanedFiles.length} orphaned files to delete`);

    // Delete orphaned files
    for (const file of orphanedFiles) {
      try {
        await azureStorage.deleteFile(file.key);

        result.deletedFiles++;
        result.deletedSize += file.size || 0;

        console.log(`🗑️ Deleted orphaned file: ${file.key}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to delete orphaned file ${file.key}: ${errorMessage}`);
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
    // Store cleanup log in database
    const logEntry = {
      cleanup_date: new Date().toISOString(),
      deleted_files: result.deletedFiles,
      deleted_size: result.deletedSize,
      errors: result.errors,
      duration: result.duration
    };

    // For now, just log to console
    // You could create a cleanup_logs table to store this
    console.log('📊 Cleanup log:', JSON.stringify(logEntry, null, 2));
    
  } catch (error) {
    console.error('Failed to log cleanup result:', error);
  }
}

// Get cleanup statistics
export async function getCleanupStats() {
  try {
    const totalFilesResult = await sql`
      SELECT COUNT(*) as count, SUM(file_size) as total_size 
      FROM shared_files 
      WHERE is_active = true
    `;
    
    const expiredFilesResult = await sql`
      SELECT COUNT(*) as count, SUM(file_size) as total_size 
      FROM shared_files 
      WHERE expires_at < NOW() AND is_active = true
    `;

    const totalFiles = Number(totalFilesResult[0]?.count || 0);
    const totalSize = Number(totalFilesResult[0]?.total_size || 0);
    const expiredFiles = Number(expiredFilesResult[0]?.count || 0);
    const expiredSize = Number(expiredFilesResult[0]?.total_size || 0);

    return {
      totalFiles,
      totalSize,
      expiredFiles,
      expiredSize,
      storageUsed: (totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      canFreeUp: (expiredSize / 1024 / 1024 / 1024).toFixed(2) + ' GB'
    };

  } catch (error) {
    console.error('Failed to get cleanup stats:', error);
    return null;
  }
}
