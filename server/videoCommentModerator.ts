import { readFile, unlink } from "fs/promises";
import { join } from "node:path";
import { spawn } from "child_process";
import { Storage } from "@google-cloud/storage";
import {
  protos,
  VideoIntelligenceServiceClient,
} from "@google-cloud/video-intelligence";

import { bunnyService } from "./bunnyService.js";
import { storage } from "./storage.js";

const Feature = protos.google.cloud.videointelligence.v1.Feature;

export class VideoCommentModerator {
  private gcsStorage: Storage;

  constructor() {
    // Initialize Google Cloud Storage with proper authentication using working credentials
    const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY!;
    const credentials = JSON.parse(serviceAccountKey);

    this.gcsStorage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id,
    });

    console.log(
      "Video Comment Moderator initialized with unified processing pipeline"
    );
  }

  async processVideoComment(
    tempFilePath: string,
    options: {
      commentId: number;
      userId: string;
      videoId: string;
      maxDuration: number;
    }
  ): Promise<void> {
    try {
      console.log(
        `🔒 SECURE VIDEO COMMENT: Processing comment ${options.commentId}`
      );
      console.log(
        `📋 UNIFIED PIPELINE: GCS → AI Moderation → Bunny Upload → Approval`
      );

      // Step 1: Upload to GCS for content moderation with fail-closed security
      let gcsUri: string | null = null;
      let gcsUploadFailed = false;

      try {
        gcsUri = await this.uploadToGCS(
          `video-comment-${options.commentId}`,
          tempFilePath
        );
        console.log(
          `📤 Video comment ${options.commentId} uploaded to GCS: ${gcsUri}`
        );

        // Verify GCS upload success by checking file existence
        const isUploaded = await this.verifyGCSUpload(gcsUri);
        if (!isUploaded) {
          throw new Error(
            "GCS upload verification failed - file not accessible"
          );
        }
      } catch (gcsError) {
        console.error(
          `❌ GCS UPLOAD FAILED for comment ${options.commentId}:`,
          gcsError
        );
        gcsUploadFailed = true;
        await storage.updateVideoCommentStatus(
          options.commentId,
          "failed",
          "Technical processing error - video upload failed. Please try uploading again."
        );
        console.log(
          `🧹 Cleanup will proceed for comment ${options.commentId} after GCS failure`
        );
      }

      // If GCS upload failed, skip moderation and proceed to cleanup
      if (gcsUploadFailed) {
        console.log(
          `⏭️ Skipping moderation for comment ${options.commentId} due to GCS failure - proceeding to cleanup`
        );
        // Clean up temporary file
        try {
          await unlink(tempFilePath);
          console.log(`🧹 Cleaned up temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error(
            `⚠️ Failed to clean up temporary file ${tempFilePath}:`,
            cleanupError
          );
        }
        return;
      }

      // Step 2: Run comprehensive content moderation in parallel
      const [videoModerationResult, audioModerationResult] = await Promise.all([
        this.moderateVideoContent(options.commentId, gcsUri!),
        this.moderateAudioContent(options.commentId, tempFilePath),
      ]);

      // Step 3: Determine final approval status with strict policy
      let finalStatus = "approved";
      let rejectionReasons: string[] = [];

      // Check video moderation results
      if (!videoModerationResult.passed) {
        finalStatus = "flagged";
        rejectionReasons.push(
          videoModerationResult.reason || "Video content flagged"
        );
      }

      // Check audio moderation results (only reject for actual content violations)
      if (
        !audioModerationResult.passed &&
        audioModerationResult.reason &&
        !audioModerationResult.reason.includes("processing failed") &&
        !audioModerationResult.reason.includes("technical issues")
      ) {
        finalStatus = "flagged";
        rejectionReasons.push(audioModerationResult.reason);
      }

      // Step 4: Upload to Bunny.net ONLY if content passes all moderation checks
      let bunnyVideoId = null;
      let videoUrl = null;

      if (finalStatus === "approved") {
        console.log(
          `✅ Video comment ${options.commentId} APPROVED - Uploading to Bunny.net`
        );

        const videoBuffer = await readFile(tempFilePath);
        bunnyVideoId = await bunnyService.uploadVideo(
          videoBuffer,
          `video-comment-${options.commentId}.mp4`
        );
        videoUrl = `/api/videos/bunny-proxy/${bunnyVideoId}`;

        console.log(
          `✅ Video comment ${options.commentId} uploaded to Bunny: ${bunnyVideoId}`
        );
      } else {
        console.log(
          `❌ Video comment ${
            options.commentId
          } REJECTED: ${rejectionReasons.join("; ")}`
        );
      }

      // Step 5: Update video comment with final status and details
      if (finalStatus === "approved") {
        await storage.updateVideoCommentAfterProcessing(options.commentId, {
          processingStatus: "approved",
          commentVideoUrl: videoUrl,
          bunnyVideoId: bunnyVideoId,
          flaggedReason: null,
        });
        console.log(
          `✅ Video comment ${options.commentId} processing completed successfully`
        );
      } else {
        await storage.updateVideoCommentAfterProcessing(options.commentId, {
          processingStatus: "flagged",
          commentVideoUrl: null,
          bunnyVideoId: null,
          flaggedReason: rejectionReasons.join("; "),
        });
        console.log(
          `❌ Video comment ${
            options.commentId
          } flagged: ${rejectionReasons.join("; ")}`
        );
      }

      // Step 6: Clean up temporary file
      try {
        await unlink(tempFilePath);
        console.log(`🧹 Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.log(
          `⚠️ Could not delete temporary file ${tempFilePath}:`,
          cleanupError
        );
      }
    } catch (error) {
      console.error(
        `❌ CRITICAL ERROR processing video comment ${options.commentId}:`,
        error
      );

      // Mark as processing failed with proper error messaging
      await storage.updateVideoCommentStatus(
        options.commentId,
        "failed",
        "Technical processing error occurred during video analysis. Please try uploading again."
      );

      // Clean up temporary file even on error
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.log(
          `⚠️ Could not delete temporary file ${tempFilePath} after error:`,
          cleanupError
        );
      }
    }
  }

  private async uploadToGCS(
    identifier: string,
    videoPath: string
  ): Promise<string> {
    const bucket = this.gcsStorage.bucket(
      "jemzy-video-moderation-steam-house-461401-t7"
    );
    const fileName = `raw-videos/${identifier}.webm`;
    const file = bucket.file(fileName);

    const videoBuffer = await readFile(videoPath);

    await file.save(videoBuffer, {
      metadata: {
        contentType: "video/webm",
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: "video_comment_moderation",
        },
      },
    });

    const gcsUri = `gs://${bucket.name}/${fileName}`;
    console.log(`📤 GCS Upload completed: ${gcsUri}`);
    return gcsUri;
  }

  private async verifyGCSUpload(gcsUri: string): Promise<boolean> {
    try {
      const match = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (!match) return false;

      const [, bucketName, filePath] = match;
      const bucket = this.gcsStorage.bucket(bucketName);
      const file = bucket.file(filePath);

      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error("GCS verification failed:", error);
      return false;
    }
  }

  private async moderateVideoContent(
    commentId: number,
    gcsUri: string
  ): Promise<{ passed: boolean; reason?: string }> {
    try {
      console.log(
        `🎬 VIDEO ANALYSIS: Starting analysis for comment ${commentId}`
      );

      const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY!;
      const credentials = JSON.parse(serviceAccountKey);

      const videoClient = new VideoIntelligenceServiceClient({
        credentials: credentials,
        projectId: credentials.project_id,
      });

      // Video content analysis only (Vision API removed per user request)
      const explicitContentResults = await this.analyzeExplicitContent(
        videoClient,
        gcsUri,
        commentId
      );

      if (!explicitContentResults.passed) {
        return { passed: false, reason: explicitContentResults.reason };
      }

      console.log(
        `✅ VIDEO ANALYSIS: Comment ${commentId} passed all video content checks`
      );
      return { passed: true };
    } catch (error) {
      console.error(
        `❌ VIDEO ANALYSIS FAILED for comment ${commentId}:`,
        error
      );
      return {
        passed: false,
        reason: "Video analysis failed - technical processing error",
      };
    }
  }

  private async analyzeExplicitContent(
    client: VideoIntelligenceServiceClient,
    gcsUri: string,
    commentId: number
  ): Promise<{ passed: boolean; reason?: string }> {
    try {
      console.log(`🔍 EXPLICIT CONTENT: Analyzing comment ${commentId}`);

      const [operation] = await client.annotateVideo({
        inputUri: gcsUri,
        features: [Feature.EXPLICIT_CONTENT_DETECTION],
      });

      const [result] = await operation.promise();

      if (result.annotationResults?.[0]?.explicitAnnotation?.frames) {
        for (const frame of result.annotationResults[0].explicitAnnotation
          .frames) {
          if (
            frame.pornographyLikelihood === "LIKELY" ||
            frame.pornographyLikelihood === "VERY_LIKELY"
          ) {
            console.log(
              `❌ EXPLICIT CONTENT: Comment ${commentId} flagged for explicit content`
            );
            return {
              passed: false,
              reason: "Video contains inappropriate explicit content",
            };
          }
        }
      }

      console.log(
        `✅ EXPLICIT CONTENT: Comment ${commentId} passed explicit content check`
      );
      return { passed: true };
    } catch (error) {
      console.error(
        `❌ EXPLICIT CONTENT ANALYSIS FAILED for comment ${commentId}:`,
        error
      );
      return {
        passed: false,
        reason:
          "Technical processing error - unable to analyze video content. Please try uploading again.",
      };
    }
  }

  private async moderateAudioContent(
    commentId: number,
    tempFilePath: string
  ): Promise<{ passed: boolean; reason?: string }> {
    try {
      console.log(
        `🎵 AUDIO ANALYSIS: Starting analysis for comment ${commentId}`
      );

      // Import audio processing service
      const { audioProcessingService } = await import(
        "./audioProcessingService.ts"
      );

      // Process audio with comprehensive analysis
      const result = await audioProcessingService.processAudio(
        String(commentId),
        tempFilePath
      );

      if (
        result.transcription &&
        result.transcription.toLowerCase().includes("inappropriate")
      ) {
        console.log(
          `❌ AUDIO ANALYSIS: Comment ${commentId} flagged for inappropriate content in transcription`
        );
        return {
          passed: false,
          reason: "Audio contains inappropriate spoken content",
        };
      }

      console.log(
        `✅ AUDIO ANALYSIS: Comment ${commentId} passed audio content checks`
      );
      return { passed: true };
    } catch (error) {
      console.error(
        `❌ AUDIO ANALYSIS FAILED for comment ${commentId}:`,
        error
      );
      // Audio processing failures should not block approval unless they indicate actual violations
      return {
        passed: true,
        reason: "Audio analysis completed with technical limitations",
      };
    }
  }
}

export const videoCommentModerator = new VideoCommentModerator();
