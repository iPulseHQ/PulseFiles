import { NextResponse } from 'next/server';
import { cleanupExpiredFiles } from '@/lib/cleanup';

// Passive cleanup that runs on file access
// This provides automatic cleanup without needing cron jobs
export async function GET() {
  try {
    // Only run cleanup occasionally to avoid performance impact
    const shouldCleanup = Math.random() < 0.1; // 10% chance
    
    if (!shouldCleanup) {
      return NextResponse.json({
        success: true,
        message: 'Cleanup skipped this request'
      });
    }

    console.log('🧹 Running passive cleanup...');
    
    // Only clean expired files, not orphaned (lighter operation)
    const result = await cleanupExpiredFiles();
    
    return NextResponse.json({
      success: true,
      message: 'Passive cleanup completed',
      deletedFiles: result.deletedFiles,
      freedSpace: result.deletedSize,
      duration: result.duration
    });

  } catch (error) {
    console.error('Passive cleanup error:', error);
    return NextResponse.json(
      { error: 'Passive cleanup failed' },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST() {
  return GET();
}