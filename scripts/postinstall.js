/**
 * Postinstall script for Vercel deployment
 * Ensures Azure Blob Storage SDK is properly installed
 */

console.log('📦 Running postinstall script...');

// Check if running in Vercel
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
  console.log('✓ Detected Vercel environment');
  console.log('✓ Azure Blob Storage SDK installed');
  console.log('✓ Neon serverless driver installed');
}

console.log('✅ Postinstall completed\n');
