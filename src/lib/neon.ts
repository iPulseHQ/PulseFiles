/**
 * Neon Database Client
 * Serverless PostgreSQL connection for PulseFiles
 */

import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create Neon SQL client
export const sql = neon(process.env.DATABASE_URL);

// Database helper functions
export const db = {
  // Shared Files
  async getFileById(id: string) {
    const result = await sql`
      SELECT * FROM shared_files 
      WHERE id = ${id} AND is_active = true
      LIMIT 1
    `;
    return result[0] || null;
  },

  async getFileByIdAndSlug(id: string, slug?: string) {
    if (slug) {
      const result = await sql`
        SELECT * FROM shared_files 
        WHERE id = ${id} AND file_name = ${slug} AND is_active = true
        LIMIT 1
      `;
      return result[0] || null;
    }
    return this.getFileById(id);
  },

  async getFilesByUserId(userId: string) {
    return await sql`
      SELECT * FROM shared_files 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
    `;
  },

  async createFile(fileData: any) {
    const result = await sql`
      INSERT INTO shared_files (
        id, user_id, file_name, encrypted_filename, filename_salt,
        file_url, obfuscated_key, file_size, file_type, email, email_hash,
        expires_at, ip_address, ip_hash, title, message, recipients,
        password_hash, password_salt, access_control, is_folder, folder_name,
        total_files, max_downloads, created_via
      ) VALUES (
        ${fileData.id}, ${fileData.user_id}, ${fileData.file_name},
        ${fileData.encrypted_filename}, ${fileData.filename_salt},
        ${fileData.file_url}, ${fileData.obfuscated_key}, ${fileData.file_size},
        ${fileData.file_type}, ${fileData.email}, ${fileData.email_hash},
        ${fileData.expires_at}, ${fileData.ip_address}, ${fileData.ip_hash},
        ${fileData.title}, ${fileData.message}, ${fileData.recipients},
        ${fileData.password_hash}, ${fileData.password_salt},
        ${fileData.access_control}, ${fileData.is_folder}, ${fileData.folder_name},
        ${fileData.total_files}, ${fileData.max_downloads}, ${fileData.created_via}
      )
      RETURNING *
    `;
    return result[0];
  },

  async updateFileDownloadStats(id: string, ipAddress?: string, ipHash?: string) {
    await sql`
      UPDATE shared_files 
      SET 
        download_count = download_count + 1,
        last_downloaded_at = NOW(),
        last_download_ip = ${ipAddress},
        last_download_ip_hash = ${ipHash}
      WHERE id = ${id}
    `;
  },

  async getExpiredFiles() {
    return await sql`
      SELECT * FROM shared_files 
      WHERE expires_at < NOW() AND is_active = true
    `;
  },

  async deleteFile(id: string) {
    await sql`
      UPDATE shared_files 
      SET is_active = false 
      WHERE id = ${id}
    `;
  },

  // Folder Contents
  async getFolderContents(sharedFileId: string) {
    return await sql`
      SELECT * FROM folder_contents 
      WHERE shared_file_id = ${sharedFileId}
      ORDER BY file_path
    `;
  },

  async createFolderContent(contentData: any) {
    const result = await sql`
      INSERT INTO folder_contents (
        shared_file_id, file_path, file_name, file_size, file_type, s3_key
      ) VALUES (
        ${contentData.shared_file_id}, ${contentData.file_path},
        ${contentData.file_name}, ${contentData.file_size},
        ${contentData.file_type}, ${contentData.s3_key}
      )
      RETURNING *
    `;
    return result[0];
  },

  // API Keys
  async getApiKeysByUserId(userId: string) {
    return await sql`
      SELECT * FROM api_keys 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
    `;
  },

  async getApiKey(apiKey: string) {
    const result = await sql`
      SELECT * FROM api_keys 
      WHERE api_key = ${apiKey} AND is_active = true
      LIMIT 1
    `;
    return result[0] || null;
  },

  async createApiKey(keyData: any) {
    const result = await sql`
      INSERT INTO api_keys (user_id, name, api_key, key_preview)
      VALUES (${keyData.user_id}, ${keyData.name}, ${keyData.api_key}, ${keyData.key_preview})
      RETURNING *
    `;
    return result[0];
  },

  async updateApiKeyLastUsed(apiKey: string) {
    await sql`
      UPDATE api_keys 
      SET last_used = NOW() 
      WHERE api_key = ${apiKey}
    `;
  },

  async deleteApiKey(id: string, userId: string) {
    await sql`
      UPDATE api_keys 
      SET is_active = false 
      WHERE id = ${id} AND user_id = ${userId}
    `;
  },

  // File Access Logs
  async logFileAccess(logData: any) {
    await sql`
      INSERT INTO file_access_logs (
        shared_file_id, ip_address, ip_hash, user_agent,
        download_successful, access_method
      ) VALUES (
        ${logData.shared_file_id}, ${logData.ip_address}, ${logData.ip_hash},
        ${logData.user_agent}, ${logData.download_successful}, ${logData.access_method}
      )
    `;
  },

  // User Profiles
  async getUserProfile(userId: string) {
    const result = await sql`
      SELECT * FROM user_profiles 
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return result[0] || null;
  },

  async createUserProfile(profileData: any) {
    const result = await sql`
      INSERT INTO user_profiles (user_id, email, full_name, avatar_url)
      VALUES (${profileData.user_id}, ${profileData.email}, ${profileData.full_name}, ${profileData.avatar_url})
      RETURNING *
    `;
    return result[0];
  },

  async updateUserProfile(userId: string, profileData: any) {
    await sql`
      UPDATE user_profiles 
      SET 
        email = ${profileData.email},
        full_name = ${profileData.full_name},
        avatar_url = ${profileData.avatar_url},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `;
  },

  // Rate Limiting
  async checkRateLimit(ipHash: string, endpoint: string, limit: number, windowMinutes: number) {
    // Clean up old entries
    await sql`
      DELETE FROM rate_limits 
      WHERE window_start < NOW() - INTERVAL '${windowMinutes} minutes'
    `;

    // Get current count
    const result = await sql`
      SELECT request_count FROM rate_limits 
      WHERE ip_hash = ${ipHash} AND endpoint = ${endpoint}
      AND window_start >= NOW() - INTERVAL '${windowMinutes} minutes'
      LIMIT 1
    `;

    if (result.length === 0) {
      // First request in window
      await sql`
        INSERT INTO rate_limits (ip_hash, endpoint, request_count, window_start)
        VALUES (${ipHash}, ${endpoint}, 1, NOW())
        ON CONFLICT (ip_hash, endpoint) 
        DO UPDATE SET request_count = 1, window_start = NOW()
      `;
      return { allowed: true, remaining: limit - 1 };
    }

    const currentCount = result[0].request_count;
    if (currentCount >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment count
    await sql`
      UPDATE rate_limits 
      SET request_count = request_count + 1
      WHERE ip_hash = ${ipHash} AND endpoint = ${endpoint}
    `;

    return { allowed: true, remaining: limit - currentCount - 1 };
  }
};

export default sql;
