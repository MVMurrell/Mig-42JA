import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { basename } from "node:path";


export interface ImageUploadResult {
  success: boolean;
  url?: string;
  gcsPath?: string;
  error?: string;
}

export class ImageStorageService {
  private storage!: Storage;
  private bucketName: string = 'jemzy-images-storage';
  private initialized: boolean = false;

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      // Use secure content moderation credentials for image storage
      const contentCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
      
      if (!contentCredentials) {
        throw new Error('CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found');
      }

      const credentials = JSON.parse(contentCredentials);
      
      this.storage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id || 'steam-house-461401-t7'
      });
      
      // Ensure bucket exists with proper configuration
      await this.ensureBucketExists();
      
      this.initialized = true;
      console.log('Image Storage Service initialized with Google Cloud Storage');
    } catch (error) {
      console.error('Failed to initialize Image Storage Service:', error);
      this.initialized = false;
    }
  }

  private async ensureBucketExists() {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [exists] = await bucket.exists();
      
      if (!exists) {
        console.log(`Creating GCS bucket: ${this.bucketName}`);
        await this.storage.createBucket(this.bucketName, {
          location: 'US',
          storageClass: 'STANDARD',
          publicReadAccess: false,
          uniformBucketLevelAccess: true
        });
        console.log(`✅ Created GCS bucket: ${this.bucketName}`);
      } else {
        console.log(`✅ GCS bucket already exists: ${this.bucketName}`);
      }
    } catch (error) {
      console.error(`Failed to ensure bucket exists: ${this.bucketName}`, error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (!this.initialized) {
      await this.initializeStorage();
    }
    return this.initialized;
  }

  /**
   * Upload image to Google Cloud Storage
   * @param imageBuffer - The image file buffer
   * @param imageType - Type of image ('profile' or 'quest')
   * @param originalName - Original filename
   * @param userId - User ID for organizing files
   * @returns Upload result with GCS URL
   */
  async uploadImage(
    imageBuffer: Buffer,
    imageType: 'profile' | 'quest',
    originalName: string,
    userId: string
  ): Promise<ImageUploadResult> {
    try {
      if (!await this.ensureInitialized()) {
        return {
          success: false,
          error: 'Image storage service not initialized'
        };
      }

      // Generate unique filename with proper structure
      const fileId = randomUUID();
      const extension = path.extname(originalName) || '.jpg';
      const fileName = `${imageType}s/${userId}/${fileId}${extension}`;
      
      console.log(`📤 UPLOAD: Uploading ${imageType} image to GCS: ${fileName}`);
      
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);
      
      // Upload image with metadata
      await file.save(imageBuffer, {
        metadata: {
          contentType: this.getContentType(extension),
          metadata: {
            userId: userId,
            imageType: imageType,
            originalName: originalName,
            uploadedAt: new Date().toISOString()
          }
        },
        public: true, // Make profile images publicly accessible
        validation: 'crc32c'
      });
      
      // Make the file publicly readable
      await file.makePublic();
      
      // Generate permanent public URL (no expiration)
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
      
      console.log(`✅ UPLOAD: Successfully uploaded image to GCS: ${fileName}`);
      console.log(`🔗 PUBLIC URL: ${publicUrl}`);
      
      return {
        success: true,
        url: publicUrl,
        gcsPath: `gs://${this.bucketName}/${fileName}`
      };
      
    } catch (error) {
      console.error('Failed to upload image to GCS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Test access to an existing image and regenerate signed URL if needed
   */
  async regenerateSignedUrl(gcsPath: string): Promise<string | null> {
    try {
      if (!this.initialized) {
        await this.initializeStorage();
      }

      // Extract filename from GCS path
      const fileName = gcsPath.replace(`gs://${this.bucketName}/`, '');
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.error(`File does not exist: ${fileName}`);
        return null;
      }

      // Generate new signed URL with extended expiration
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        extensionHeaders: {},
        responseType: 'application/octet-stream'
      });

      console.log(`🔄 REGENERATED: New signed URL for ${fileName}`);
      return signedUrl;

    } catch (error) {
      console.error('Failed to regenerate signed URL:', error);
      return null;
    }
  }

  /**
   * Generate a new signed URL for an existing image
   * @param gcsPath - The GCS path (gs://bucket/path/to/file)
   * @returns Signed URL for accessing the image
   */
  async getSignedUrl(gcsPath: string): Promise<string | null> {
    try {
      if (!await this.ensureInitialized()) {
        console.error('Image storage service not initialized');
        return null;
      }

      // Extract bucket and file path from GCS path
      const pathMatch = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
      if (!pathMatch) {
        console.error('Invalid GCS path format:', gcsPath);
        return null;
      }

      const [, bucketName, encodedFilePath] = pathMatch;
      // Decode the file path to handle URL-encoded characters like %7C (pipe)
      const filePath = decodeURIComponent(encodedFilePath);
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);
      
      // Generate signed URL (valid for 1 hour)
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000
      });
      
      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }
  }

  /**
   * Delete an image from Google Cloud Storage
   * @param gcsPath - The GCS path to delete
   * @returns Success status
   */
  async deleteImage(gcsPath: string): Promise<boolean> {
    try {
      if (!await this.ensureInitialized()) {
        return false;
      }

      const pathMatch = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
      if (!pathMatch) {
        console.error('Invalid GCS path format:', gcsPath);
        return false;
      }

      const [, bucketName, filePath] = pathMatch;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);
      
      await file.delete();
      console.log(`🗑️ DELETED: Removed image from GCS: ${gcsPath}`);
      
      return true;
    } catch (error) {
      console.error('Failed to delete image from GCS:', error);
      return false;
    }
  }

  /**
   * List images for a specific user
   * @param userId - User ID to filter by
   * @param imageType - Optional filter by image type
   * @returns Array of image metadata
   */
  async listUserImages(userId: string, imageType?: 'profile' | 'quest'): Promise<any[]> {
    try {
      if (!await this.ensureInitialized()) {
        return [];
      }

      const bucket = this.storage.bucket(this.bucketName);
      const prefix = imageType ? `${imageType}s/${userId}/` : `${userId}/`;
      
      const [files] = await bucket.getFiles({ prefix });
      
      return files.map(file => ({
        name: file.name,
        gcsPath: `gs://${this.bucketName}/${file.name}`,
        metadata: file.metadata
      }));
    } catch (error) {
      console.error('Failed to list user images:', error);
      return [];
    }
  }

  private getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp'
    };
    
    return contentTypes[extension.toLowerCase()] || 'image/jpeg';
  }
}

// Export singleton instance
export const imageStorageService = new ImageStorageService();