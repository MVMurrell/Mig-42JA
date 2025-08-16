import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from "node:path";

export class BunnyService {
  private apiKey: string;
  private libraryId: string;
  private cdnHostname: string;
  private moderationLibraryId: string;
  private moderationCdnHostname: string;

  constructor() {
    this.apiKey = process.env.BUNNY_API_KEY!;
    this.libraryId = process.env.BUNNY_LIBRARY_ID!;
    this.cdnHostname = process.env.BUNNY_CDN_HOSTNAME!;
    
    // Use same library for moderation if separate one not configured
    this.moderationLibraryId = process.env.BUNNY_MODERATION_LIBRARY_ID || this.libraryId;
    this.moderationCdnHostname = process.env.BUNNY_MODERATION_CDN_HOSTNAME || this.cdnHostname;

    if (!this.apiKey || !this.libraryId || !this.cdnHostname) {
      throw new Error('Missing Bunny.net configuration');
    }

    console.log('Bunny.net Stream configured:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length,
      libraryId: this.libraryId,
      cdnHostname: this.cdnHostname,
      moderationLibraryId: this.moderationLibraryId,
      moderationCdnHostname: this.moderationCdnHostname,
      usingSeperateModerationStorage: this.moderationLibraryId !== this.libraryId
    });
  }

  async uploadVideo(videoBuffer: Buffer, originalName?: string): Promise<{videoUrl: string, thumbnailUrl: string, videoId: string}> {
    // Use the same method as uploadVideoFromBase64 for consistency
    const base64Data = `data:video/webm;base64,${videoBuffer.toString('base64')}`;
    const videoId = await this.uploadVideoFromBase64(base64Data);
    
    // Return the expected object structure
    return {
      videoUrl: `/api/videos/bunny-proxy/${videoId}`,
      thumbnailUrl: `https://${this.cdnHostname}/${videoId}/thumbnail.jpg`,
      videoId: videoId
    };
  }

  private async transcodeWebmToMp4(inputPath: string, outputPath: string, duration?: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Comprehensive FFmpeg command for maximum compatibility and reliability
      // This rebuilds the video structure from scratch to ensure perfect browser playback
      const ffmpegArgs = [
        '-err_detect', 'ignore_err',
        '-fflags', '+genpts+discardcorrupt+igndts+ignidx',
        '-analyzeduration', '100M',
        '-probesize', '100M',
        '-max_muxing_queue_size', '9999',
        '-i', inputPath
      ];
      
      // Add duration override if provided to fix corrupted metadata (e.g., Infinity duration)
      if (duration && duration > 0) {
        ffmpegArgs.push('-t', duration.toString());
        console.log(`Overriding corrupted duration metadata with: ${duration} seconds`);
      }
      
      // Add remaining FFmpeg arguments
      ffmpegArgs.push(
        // Video codec settings
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.0',
        // Audio codec settings
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-strict', 'experimental',
        // MP4 optimization
        '-movflags', 'faststart',
        '-threads', '0',
        '-y',
        outputPath
      );

      console.log('Starting deep transcoding to rebuild video structure:', ffmpegArgs.join(' '));

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stdout = '';
      let stderr = '';

      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg stdout:\n${stdout}`);
        console.log(`FFmpeg stderr:\n${stderr}`);
        
        if (code === 0) {
          console.log('Deep transcoding completed successfully - video rebuilt with standard structure');
          resolve(true);
        } else {
          console.error(`FFmpeg transcoding failed with code ${code}:`, stderr);
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('FFmpeg process error:', err);
        reject(new Error(`FFmpeg failed to start: ${err.message}`));
      });

      // Add timeout to prevent hanging processes
      setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        reject(new Error('FFmpeg timed out after 120 seconds'));
      }, 120000);
    });
  }

  async uploadVideoFromBase64(base64Data: string, duration?: number): Promise<string> {
    // Extract content from data URL
    const commaIndex = base64Data.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Invalid base64 data format');
    }

    const header = base64Data.substring(0, commaIndex);
    const content = base64Data.substring(commaIndex + 1);
    
    // Determine MIME type
    const mimeMatch = header.match(/data:([^;]+)/);
    const originalMimeType = mimeMatch ? mimeMatch[1] : 'video/webm';
    
    let videoBuffer: Buffer;
    try {
      videoBuffer = Buffer.from(content, 'base64');
      
      // Validate buffer and data integrity
      if (videoBuffer.length === 0) {
        throw new Error('Empty video buffer after base64 decode');
      }
      
      // Validate WebM structure with flexible header checking
      if (originalMimeType.includes('webm')) {
        const webmHeader = videoBuffer.subarray(0, 8);
        console.log('WebM header bytes:', webmHeader.toString('hex'));
        
        // Check for EBML header signature (more flexible approach)
        // WebM files should start with EBML element ID (0x1A45DFA3)
        const hasEBMLSignature = videoBuffer.indexOf(Buffer.from([0x1A, 0x45, 0xDF, 0xA3])) >= 0 && 
                                videoBuffer.indexOf(Buffer.from([0x1A, 0x45, 0xDF, 0xA3])) < 16;
        
        if (!hasEBMLSignature) {
          console.warn('WebM EBML signature not found in expected location, but proceeding with upload');
          // Don't throw error - let Bunny.net handle validation
        } else {
          console.log('WebM EBML signature found - structure appears valid');
        }
      }
      
    } catch (bufferError) {
      throw new Error(`Video data validation failed: ${bufferError instanceof Error ? bufferError.message : 'Unknown validation error'}`);
    }

    // Validate MP4 structure
    const isValidMP4 = this.validateMP4Structure(videoBuffer);
    
    console.log('Processing video for Bunny.net upload:', {
      libraryId: this.libraryId,
      bufferSize: videoBuffer.length,
      originalMimeType,
      apiKeyLength: this.apiKey.length,
      isValidMP4: isValidMP4,
      bufferHeader: videoBuffer.subarray(0, 32).toString('hex')
    });

    let tempInputPath = '';
    let tempOutputPath = '';
    let finalVideoBuffer = videoBuffer;
    let finalMimeType = originalMimeType;

    try {
      // Always transcode browser recordings to ensure Bunny.net compatibility
      // Browser MP4 often uses incompatible codecs (AVC1+Opus instead of H.264+AAC)
      if (originalMimeType.includes('webm') || originalMimeType.includes('mp4')) {
        console.log(`Browser video detected (${originalMimeType}), transcoding to Bunny.net-compatible MP4`);
        
        const inputExt = originalMimeType.includes('webm') ? 'webm' : 'mp4';
        tempInputPath = join('/tmp', `input_${randomUUID()}.${inputExt}`);
        tempOutputPath = join('/tmp', `output_${randomUUID()}.mp4`);

        // Save original video to temp file with enhanced error handling
        await writeFile(tempInputPath, videoBuffer);
        console.log(`Saved ${videoBuffer.length} bytes to ${tempInputPath}`);
        
        // Verify file was written correctly
        const { stat } = await import('fs/promises');
        const fileStats = await stat(tempInputPath);
        console.log(`File verification: ${fileStats.size} bytes on disk`);
        
        if (fileStats.size !== videoBuffer.length) {
          throw new Error(`File size mismatch: expected ${videoBuffer.length}, got ${fileStats.size}`);
        }

        // Attempt transcoding to Bunny.net-compatible MP4 (H.264 + AAC)
        console.log('Starting transcoding process...');
        try {
          await this.transcodeWebmToMp4(tempInputPath, tempOutputPath, duration);

          // Read transcoded MP4
          finalVideoBuffer = await readFile(tempOutputPath);
          finalMimeType = 'video/mp4';

          console.log('Transcoding completed:', {
            originalFormat: originalMimeType,
            originalSize: videoBuffer.length,
            transcodedSize: finalVideoBuffer.length,
            newMimeType: finalMimeType
          });
        } catch (transcodeError: any) {
          console.warn('Local transcoding failed, uploading original WebM to Bunny.net for processing:', transcodeError.message);
          console.log('Bunny.net will handle the video processing and transcoding');
          // Keep original buffer and MIME type - let Bunny.net handle the problematic WebM
          finalVideoBuffer = videoBuffer;
          finalMimeType = originalMimeType;
        }
      } else {
        console.log('Non-browser format detected, uploading directly');
      }

      // COMPREHENSIVE BUNNY.NET DIAGNOSTICS
      console.log(`=== BUNNY.NET UPLOAD DIAGNOSTICS ===`);
      console.log(`Final video buffer size: ${finalVideoBuffer.length} bytes`);
      console.log(`Final MIME type: ${finalMimeType}`);
      console.log(`Original video buffer size: ${videoBuffer.length} bytes`);
      console.log(`Original MIME type: ${originalMimeType}`);

      // Step 1: Create video object
      const createUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos`;
      console.log(`Creating video at: ${createUrl}`);
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Video ${Date.now()}`
        }),
      });

      console.log(`Create response status: ${createResponse.status} ${createResponse.statusText}`);
      console.log(`Create response headers:`, Object.fromEntries(createResponse.headers.entries()));

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(`Create response error body: ${errorText}`);
        throw new Error(`Failed to create video in Bunny.net: ${createResponse.status} ${createResponse.statusText} - ${errorText}`);
      }

      const createResult = await createResponse.json();
      const videoId = createResult.guid;
      console.log('Video created with ID:', videoId);
      console.log('Full create response:', JSON.stringify(createResult, null, 2));

      // Step 2: Upload video file with enhanced diagnostics
      const uploadUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      console.log(`Uploading to: ${uploadUrl}`);
      console.log(`Upload buffer size (final check): ${finalVideoBuffer.length} bytes`);
      console.log(`Upload content type: ${finalMimeType}`);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': finalMimeType,
        },
        body: new Uint8Array(finalVideoBuffer),
      });

      console.log(`Upload response status: ${uploadResponse.status} ${uploadResponse.statusText}`);
      console.log(`Upload response headers:`, Object.fromEntries(uploadResponse.headers.entries()));

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`Upload response error body: ${errorText}`);
        throw new Error(`Failed to upload video to Bunny.net: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      const uploadResponseText = await uploadResponse.text();
      console.log(`Upload response body: ${uploadResponseText}`);

      const cdnUrl = `https://${this.cdnHostname}/${videoId}/playlist.m3u8`;
      console.log('Video uploaded successfully to:', cdnUrl);
      return videoId;

    } finally {
      // Clean up temporary files
      if (tempInputPath) {
        try {
          await unlink(tempInputPath);
          console.log('Cleaned up temp input file');
        } catch (err) {
          console.warn('Failed to clean up temp input file:', err);
        }
      }
      if (tempOutputPath) {
        try {
          await unlink(tempOutputPath);
          console.log('Cleaned up temp output file');
        } catch (err) {
          console.warn('Failed to clean up temp output file:', err);
        }
      }
    }
  }

  private validateMP4Structure(buffer: Buffer): boolean {
    try {
      if (buffer.length < 8) return false;
      
      // Check for ftyp box (file type box) which should be near the beginning
      const header = buffer.subarray(0, Math.min(buffer.length, 64));
      const headerHex = header.toString('hex');
      
      // Look for ftyp signature (66747970 in hex)
      const hasFtyp = headerHex.includes('66747970');
      
      // Look for moov atom signature (6d6f6f76 in hex) in the first part of the file
      const searchLength = Math.min(buffer.length, 1024);
      const searchSection = buffer.subarray(0, searchLength).toString('hex');
      const hasMoov = searchSection.includes('6d6f6f76');
      
      console.log('MP4 validation:', {
        bufferSize: buffer.length,
        hasFtyp,
        hasMoov,
        headerStart: headerHex.substring(0, 32)
      });
      
      return hasFtyp; // At minimum we need ftyp box
    } catch (error) {
      console.warn('MP4 validation error:', error);
      return false;
    }
  }

  private getFileExtension(filename?: string): string | null {
    if (!filename) return null;
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1) : null;
  }

  async uploadVideoForReview(videoBuffer: Buffer, videoId: string): Promise<string> {
    console.log(`Uploading video ${videoId} to moderation zone`);
    
    try {
      const base64Data = `data:video/webm;base64,${videoBuffer.toString('base64')}`;
      const bunnyVideoId = await this.uploadVideoToModerationZone(base64Data);
      console.log(`Video ${videoId} uploaded to moderation zone with Bunny ID: ${bunnyVideoId}`);
      return bunnyVideoId;
    } catch (error) {
      console.error(`Failed to upload video ${videoId} for review:`, error);
      throw error;
    }
  }

  async uploadVideoToModerationZone(base64Data: string, duration?: number): Promise<string> {
    const [, mimeType, base64Content] = base64Data.match(/^data:([^;]+);base64,(.+)$/) || [];
    if (!mimeType || !base64Content) {
      throw new Error('Invalid base64 data format');
    }

    const videoBuffer = Buffer.from(base64Content, 'base64');
    let finalVideoBuffer = videoBuffer;
    let finalMimeType = mimeType;

    // Handle WebM transcoding if needed
    if (mimeType.includes('webm')) {
      const tempInputPath = join('/tmp', `input_${randomUUID()}.webm`);
      const tempOutputPath = join('/tmp', `output_${randomUUID()}.mp4`);

      try {
        await writeFile(tempInputPath, videoBuffer);
        await this.transcodeWebmToMp4(tempInputPath, tempOutputPath, duration);
        finalVideoBuffer = await readFile(tempOutputPath);
        finalMimeType = 'video/mp4';
        
        await unlink(tempInputPath).catch(() => {});
        await unlink(tempOutputPath).catch(() => {});
      } catch (transcodeError) {
        finalVideoBuffer = videoBuffer;
        finalMimeType = mimeType;
        await unlink(tempInputPath).catch(() => {});
        await unlink(tempOutputPath).catch(() => {});
      }
    }

    // Create video in moderation library
    const createUrl = `https://video.bunnycdn.com/library/${this.moderationLibraryId}/videos`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'AccessKey': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Moderation Review ${Date.now()}`
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create video in moderation zone: ${createResponse.status} - ${errorText}`);
    }

    const createResult = await createResponse.json();
    const videoId = createResult.guid;
    
    // Upload video file to moderation library
    const uploadUrl = `https://video.bunnycdn.com/library/${this.moderationLibraryId}/videos/${videoId}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': this.apiKey,
        'Content-Type': finalMimeType,
      },
      body: finalVideoBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload video to moderation zone: ${uploadResponse.status} - ${errorText}`);
    }

    return videoId;
  }

  getStreamUrl(fileName: string): string {
    // Return a proxy URL through our server since Bunny.net requires authentication
    return `/api/videos/bunny-proxy/${fileName}`;
  }

  async getVideoMetadata(videoId: string): Promise<{ duration?: number; status?: string }> {
    try {
      const metadataUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      console.log(`Fetching video metadata from: ${metadataUrl}`);
      
      const response = await fetch(metadataUrl, {
        method: 'GET',
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch video metadata: ${response.status} ${response.statusText}`);
        return {};
      }

      const metadata = await response.json();
      console.log('Video metadata response:', {
        videoId,
        duration: metadata.length,
        status: metadata.status,
        metaTitle: metadata.metaTitle
      });

      return {
        duration: metadata.length ? parseFloat(metadata.length) : undefined,
        status: metadata.status
      };
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      return {};
    }
  }

  getReviewStreamUrl(fileName: string): string {
    // Return HLS playlist URL for streaming
    return `https://${this.moderationCdnHostname}/${fileName}/playlist.m3u8`;
  }

  async deleteVideo(videoId: string): Promise<void> {
    console.log(`🗑️ BUNNY DELETE: Deleting video ${videoId} from Bunny.net`);
    
    const deleteUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
    
    try {
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.apiKey,
        },
      });

      console.log(`🗑️ BUNNY DELETE: Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🗑️ BUNNY DELETE ERROR: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Failed to delete video from Bunny.net: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`🗑️ BUNNY DELETE: Successfully deleted video ${videoId} from Bunny.net`);
    } catch (error: any) {
      console.error(`🗑️ BUNNY DELETE ERROR: Failed to delete video ${videoId}:`, error);
      throw error;
    }
  }
}

export const bunnyService = new BunnyService();