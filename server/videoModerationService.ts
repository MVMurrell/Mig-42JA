import {
  protos,
  VideoIntelligenceServiceClient,
} from "@google-cloud/video-intelligence";
const Feature = protos.google.cloud.videointelligence.v1.Feature;

export interface VideoModerationResult {
  approved: boolean;
  reason?: string;
  confidence?: number;
  detections?: any[];
  explicitContentFrames?: number;
  labels?: string[];
}

export class VideoModerationService {
  private client: VideoIntelligenceServiceClient;
  private projectId: string;

  constructor() {
    try {
      // Use content moderation credentials for video analysis
      const contentModerationCredentials =
        process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;

      if (!contentModerationCredentials) {
        throw new Error(
          "CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found - required for video content analysis"
        );
      }

      const credentials = JSON.parse(contentModerationCredentials);
      this.projectId = credentials.project_id || "steam-house-461401-t7";

      this.client = new VideoIntelligenceServiceClient({
        credentials: credentials,
        projectId: this.projectId,
      });

      console.log(
        "🔧 VIDEO-MODERATION: Initialized with CONTENT_MODERATION_WORKER credentials for video analysis"
      );
    } catch (error) {
      console.error(
        "❌ VIDEO-MODERATION: Failed to initialize Video Intelligence Service:",
        error
      );
      throw error;
    }
  }

  async analyzeVideoFromGCS(gcsUri: string): Promise<VideoModerationResult> {
    try {
      console.log(
        `🎬 VIDEO-MODERATION: Starting video content analysis for: ${gcsUri}`
      );

      // Use Video Intelligence Service Client to analyze video from GCS
      const [operation] = await this.client.annotateVideo({
        inputUri: gcsUri,
        features: [Feature.EXPLICIT_CONTENT_DETECTION, Feature.LABEL_DETECTION],
        videoContext: {
          explicitContentDetectionConfig: {
            model: "builtin/latest",
          },
        },
      });

      console.log(
        `⏳ VIDEO-MODERATION: Video analysis operation started, waiting for completion...`
      );

      // Wait for the operation to complete
      const [result] = await operation.promise();

      console.log(`✅ VIDEO-MODERATION: Video analysis completed`);

      return this.evaluateVideoResults(result);
    } catch (error) {
      console.error(`❌ VIDEO-MODERATION: Video analysis failed:`, error);

      // Fail-closed: reject video if analysis fails
      return {
        approved: false,
        reason: "Video content analysis failed - technical error",
        confidence: 0,
        detections: [],
      };
    }
  }

  private evaluateVideoResults(result: any): VideoModerationResult {
    console.log(`🔍 VIDEO-MODERATION: Evaluating video analysis results`);

    const annotationResults = result.annotationResults?.[0];
    if (!annotationResults) {
      console.log(
        `⚠️ VIDEO-MODERATION: No annotation results found - approving by default`
      );
      return {
        approved: true,
        reason: "No explicit content detected",
        confidence: 1.0,
        detections: [],
        explicitContentFrames: 0,
        labels: [],
      };
    }

    // Check explicit content detection
    const explicitAnnotation = annotationResults.explicitAnnotation;
    let explicitContentFrames = 0;
    let hasInappropriateContent = false;

    if (explicitAnnotation?.frames) {
      explicitContentFrames = explicitAnnotation.frames.length;

      for (const frame of explicitAnnotation.frames) {
        const likelihood = frame.pornographyLikelihood;
        // Only reject if frame has VERY_LIKELY pornography likelihood (reduces false positives)
        if (["VERY_LIKELY"].includes(likelihood)) {
          hasInappropriateContent = true;
          console.log(
            `🚨 VIDEO-MODERATION: Explicit content detected in frame - likelihood: ${likelihood}`
          );
          break;
        } else if (["LIKELY"].includes(likelihood)) {
          console.log(
            `⚠️ VIDEO-MODERATION: Possible content detected but allowing due to false positive reduction - likelihood: ${likelihood}`
          );
        }
      }
    }

    // Extract labels for additional context
    const labels =
      annotationResults.labelAnnotations?.map(
        (label: any) => label.entity.description
      ) || [];

    console.log(
      `📊 VIDEO-MODERATION: Analysis summary - Explicit frames: ${explicitContentFrames}, Inappropriate: ${hasInappropriateContent}, Labels: ${labels
        .slice(0, 5)
        .join(", ")}`
    );

    if (hasInappropriateContent) {
      return {
        approved: false,
        reason: "Explicit or inappropriate visual content detected",
        confidence: 0.95,
        detections: explicitAnnotation?.frames || [],
        explicitContentFrames,
        labels,
      };
    }

    return {
      approved: true,
      reason: "Video content passed visual moderation",
      confidence: 0.95,
      detections: [],
      explicitContentFrames,
      labels,
    };
  }
}

export const videoModerationService = new VideoModerationService();
