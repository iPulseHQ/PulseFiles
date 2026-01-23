/**
 * Azure Blob Storage Client
 * File storage for PulseFiles
 */

import { BlobServiceClient, ContainerClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';

// Validate environment variables
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
}

if (!process.env.AZURE_STORAGE_ACCOUNT_NAME) {
  throw new Error('AZURE_STORAGE_ACCOUNT_NAME environment variable is not set');
}

if (!process.env.AZURE_STORAGE_ACCOUNT_KEY) {
  throw new Error('AZURE_STORAGE_ACCOUNT_KEY environment variable is not set');
}

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'pulsefiles';
const ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;

// Create BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

// Get container client
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Create shared key credential for SAS token generation
const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);

export const azureStorage = {
  /**
   * Upload a file to Azure Blob Storage
   */
  async uploadFile(key: string, data: Buffer | string, contentType?: string): Promise<string> {
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    
    const uploadOptions: any = {
      blobHTTPHeaders: {
        blobContentType: contentType || 'application/octet-stream'
      }
    };

    await blockBlobClient.upload(data, Buffer.byteLength(data), uploadOptions);
    
    return blockBlobClient.url;
  },

  /**
   * Get a file from Azure Blob Storage
   */
  async getFile(key: string): Promise<Buffer> {
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    const downloadResponse = await blockBlobClient.download(0);
    
    if (!downloadResponse.readableStreamBody) {
      throw new Error('Failed to download file');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
    
    return Buffer.concat(chunks);
  },

  /**
   * Delete a file from Azure Blob Storage
   */
  async deleteFile(key: string): Promise<void> {
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.deleteIfExists();
  },

  /**
   * Generate a signed URL for temporary access to a file
   */
  generateSignedUrl(key: string, expiresInMinutes: number = 60): string {
    const blobClient = containerClient.getBlobClient(key);
    
    const sasToken = generateBlobSASQueryParameters({
      containerName: CONTAINER_NAME,
      blobName: key,
      permissions: BlobSASPermissions.parse('r'), // read only
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000)
    }, sharedKeyCredential).toString();

    return `${blobClient.url}?${sasToken}`;
  },

  /**
   * Generate a presigned URL for file upload
   */
  generateUploadUrl(key: string, expiresInMinutes: number = 60): string {
    const blobClient = containerClient.getBlobClient(key);
    
    const sasToken = generateBlobSASQueryParameters({
      containerName: CONTAINER_NAME,
      blobName: key,
      permissions: BlobSASPermissions.parse('w'), // write only
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000)
    }, sharedKeyCredential).toString();

    return `${blobClient.url}?${sasToken}`;
  },

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    return await blockBlobClient.exists();
  },

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string) {
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    const properties = await blockBlobClient.getProperties();
    
    return {
      size: properties.contentLength,
      contentType: properties.contentType,
      lastModified: properties.lastModified,
      etag: properties.etag
    };
  },

  /**
   * Copy a file within Azure Blob Storage
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const sourceBlobClient = containerClient.getBlobClient(sourceKey);
    const destBlobClient = containerClient.getBlobClient(destinationKey);
    
    await destBlobClient.beginCopyFromURL(sourceBlobClient.url);
  },

  /**
   * List files with a prefix
   */
  async listFiles(prefix?: string) {
    const files = [];
    
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      files.push({
        key: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        contentType: blob.properties.contentType
      });
    }
    
    return files;
  },

  /**
   * Create a multipart upload (for large files)
   * Returns uploadId (which is the blob name for Azure)
   */
  async createMultipartUpload(key: string, contentType?: string): Promise<string> {
    // In Azure, we don't need to explicitly create a multipart upload
    // We just return the blob name which will be used as the upload ID
    // The actual BlockBlobClient will be created when uploading parts
    return key;
  },

  /**
   * Upload a part in multipart upload
   * Returns blockId for the uploaded part
   */
  async uploadPart(key: string, partNumber: number, data: Buffer): Promise<string> {
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    const blockId = Buffer.from(`block-${partNumber.toString().padStart(6, '0')}`).toString('base64');
    
    await blockBlobClient.stageBlock(blockId, data, data.length);
    
    return blockId;
  },

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(key: string, blockIds: string[]) {
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.commitBlockList(blockIds);
    
    return blockBlobClient.url;
  },

  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(key: string) {
    // Azure automatically cleans up uncommitted blocks after 7 days
    // No explicit abort needed, but we can delete the blob if it exists
    await this.deleteFile(key);
  }
};

export default azureStorage;
