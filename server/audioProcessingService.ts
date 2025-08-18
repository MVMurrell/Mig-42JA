import { spawn } from "child_process";
import { join } from "node:path";
import { readFile, unlink, writeFile } from "fs/promises";
import { SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { contentModerationService } from "./contentModerationService.js";
const isEnabled = (v?: string) =>
  !["false", "0", "no", "off", ""].includes((v ?? "").trim().toLowerCase());
const AUDIO_ENABLED = isEnabled(process.env.ENABLE_AUDIO_TRANSCRIPTION);

const STT_ENABLED =
  (process.env.ENABLE_AUDIO_TRANSCRIPTION ?? "false") === "true";

interface AudioProcessingResult {
  success: boolean;
  transcription?: string;
  moderationStatus: "passed" | "failed" | "error";
  flagReason?: string;
  extractedKeywords: string[];
  error?: string;
  errorCategory?:
    | "technical"
    | "dependency"
    | "service"
    | "storage"
    | "network";
}

class AudioProcessingService {
  private speechClient: SpeechClient;
  private storage: Storage;
  // Note: The bucket name will be extracted from the GCS URI passed to processAudio()
  // This allows for flexibility to handle different buckets for different video types
  private gcsBucket: string = "jemzy-app-audio-to-text-transcriptions";

  // Configurable lists for content moderation and keyword extraction
  private badWordsBlacklist = [
    // Explicit profanity
    "fuck",
    "shit",
    "damn",
    "bitch",
    "asshole",
    "bastard",
    "cunt",
    "dickhead",
    // Hate speech indicators
    "nigger",
    "faggot",
    "retard",
    "spic",
    "chink",
    "kike",
    "wetback",
    // Violence indicators
    "kill yourself",
    "die bitch",
    "murder",
    "terrorist",
    "bomb threat",
    "school shooter",
    // Bullying indicators
    "loser",
    "worthless",
    "ugly bitch",
    "nobody likes you",
    "kill yourself",
    // Religious proselytizing indicators
    "accept jesus",
    "burn in hell",
    "god hates",
    "infidel",
    "convert or die",
  ];

  private topicKeywords = [
    // Lifestyle & Activities
    "coffee",
    "tea",
    "cooking",
    "baking",
    "recipe",
    "food",
    "restaurant",
    "dining",
    "fitness",
    "workout",
    "gym",
    "yoga",
    "running",
    "exercise",
    "health",
    "travel",
    "vacation",
    "trip",
    "adventure",
    "explore",
    "journey",
    "shopping",
    "fashion",
    "style",
    "outfit",
    "makeup",
    "beauty",

    // Nature & Outdoors
    "beach",
    "ocean",
    "sea",
    "waves",
    "sand",
    "sunset",
    "sunrise",
    "mountain",
    "hiking",
    "camping",
    "forest",
    "trees",
    "nature",
    "fishing",
    "hunting",
    "outdoor",
    "wildlife",
    "birds",
    "animals",
    "garden",
    "flowers",
    "plants",
    "gardening",
    "farming",

    // Urban & City
    "city",
    "urban",
    "downtown",
    "skyline",
    "building",
    "architecture",
    "street",
    "traffic",
    "public transport",
    "subway",
    "bus",
    "nightlife",
    "bar",
    "club",
    "party",
    "concert",
    "festival",

    // Sports & Recreation
    "football",
    "soccer",
    "basketball",
    "baseball",
    "tennis",
    "golf",
    "swimming",
    "cycling",
    "skateboarding",
    "surfing",
    "skiing",
    "game",
    "competition",
    "tournament",
    "sport",
    "team",

    // Technology & Innovation
    "technology",
    "tech",
    "computer",
    "smartphone",
    "app",
    "software",
    "artificial intelligence",
    "ai",
    "robot",
    "automation",
    "innovation",
    "startup",
    "entrepreneur",
    "business",
    "work",
    "office",

    // Arts & Culture
    "art",
    "painting",
    "drawing",
    "sculpture",
    "gallery",
    "museum",
    "music",
    "song",
    "dance",
    "performance",
    "theater",
    "movie",
    "book",
    "reading",
    "writing",
    "literature",
    "poetry",

    // Education & Learning
    "school",
    "university",
    "college",
    "education",
    "learning",
    "study",
    "teacher",
    "student",
    "class",
    "lesson",
    "tutorial",
    "knowledge",
  ];

  constructor() {
    if (!AUDIO_ENABLED) {
      console.log("⚙️ Audio Transcription: disabled via env");
    } else {
      const audioCredentials = process.env.AUDIO_TRANSCRIPTION_API_JUN_26_2025;
      if (!audioCredentials)
        throw new Error(
          "AUDIO_TRANSCRIPTION_API_JUN_26_2025 credentials not found"
        );
      const credentials = JSON.parse(audioCredentials);
      this.speechClient = new SpeechClient({
        credentials,
        projectId: credentials.project_id,
      });
      this.storage = new Storage({
        credentials,
        projectId: credentials.project_id,
      });
      console.log("✅ Audio Processing Service initialized");
    }
  }

  async processAudio(
    videoId: string,
    gcsVideoUri: string
  ): Promise<AudioProcessingResult> {
    if (process.env.ENABLE_AUDIO_TRANSCRIPTION !== "true") {
      return {
        success: true,
        transcription: "",
        extractedKeywords: [],
        moderationStatus: "passed", // stays within your existing status values
        // flagReason is optional in your type, so we simply omit it here
      };
    }
    console.log(
      `🎵 AUDIO: Starting audio processing for video ${videoId} from GCS: ${gcsVideoUri}`
    );

    // Use the provided GCS URI directly instead of reconstructing it
    // This supports both main videos (raw-videos/{videoId}.webm) and thread videos (raw-videos/thread-msg-{messageId}.webm)
    const actualGcsUri = gcsVideoUri;
    console.log(`🎵 AUDIO: Using provided GCS URI: ${actualGcsUri}`);

    let tempAudioPath: string | null = null;
    let tempVideoPath: string | null = null;

    try {
      // Step 1: Transcribe audio directly from GCS video file using Speech-to-Text
      console.log(
        `🎵 AUDIO: Starting transcription with Speech-to-Text API directly from GCS`
      );
      const transcription = await this.transcribeAudioFromGCS(actualGcsUri);

      if (!transcription) {
        console.error(
          `🚨 CRITICAL SECURITY: No transcription result for ${videoId} - file missing or inaccessible - REJECTING`
        );
        return {
          success: false,
          transcription: "",
          moderationStatus: "failed",
          flagReason:
            "SECURITY: Video file missing or inaccessible - content rejected for safety",
          extractedKeywords: [],
          error:
            "Video file not found in storage - security policy requires rejection",
        };
      }

      console.log(
        `🎵 AUDIO: Transcription completed: ${transcription.substring(
          0,
          100
        )}...`
      );

      // Step 2: Perform content moderation on transcription
      const moderationResult = await this.moderateAudioContent(transcription);

      // Step 3: Extract keywords for search functionality
      const keywords = this.extractKeywords(transcription);

      console.log(
        `🎵 AUDIO: Moderation status: ${
          moderationResult.status
        }, Keywords: ${keywords.join(", ")}`
      );

      return {
        success: true,
        transcription,
        moderationStatus: moderationResult.status,
        flagReason: moderationResult.reason,
        extractedKeywords: keywords,
      };
    } catch (error) {
      console.error(`🎵 AUDIO: ❌ Processing failed for ${videoId}:`, error);

      // Categorize error types for better user feedback and more specific handling
      let errorCategory:
        | "technical"
        | "dependency"
        | "service"
        | "storage"
        | "network" = "technical";
      let friendlyMessage = "AI moderation system error";
      let flagReason = "AI moderation system error";

      if (error instanceof Error) {
        console.error(`🎵 AUDIO: Error analysis:`, {
          message: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 500),
        });

        if (
          error.message.includes("File not found") ||
          error.message.includes("NOT_FOUND")
        ) {
          errorCategory = "storage";
          friendlyMessage = "Video file not found in storage system";
          flagReason =
            "Video file missing from storage - cannot analyze audio content";
        } else if (
          error.message.includes("PERMISSION_DENIED") ||
          error.message.includes("permission")
        ) {
          errorCategory = "service";
          friendlyMessage = "AI service access denied - authentication issue";
          flagReason =
            "AI service authentication failed - cannot analyze audio content";
        } else if (
          error.message.includes("Cannot access video file") ||
          error.message.includes("storage")
        ) {
          errorCategory = "storage";
          friendlyMessage = "Cannot access video file in storage system";
          flagReason =
            "Video file inaccessible in storage - cannot analyze audio content";
        } else if (
          error.message.includes("Google Cloud") ||
          error.message.includes("Speech-to-Text") ||
          error.message.includes("Speech API")
        ) {
          errorCategory = "service";
          friendlyMessage =
            "AI speech analysis service temporarily unavailable";
          flagReason =
            "AI speech analysis service unavailable - cannot analyze audio content";
        } else if (error.message.includes("FFmpeg")) {
          errorCategory = "dependency";
          friendlyMessage = "Audio processing dependency not available";
          flagReason =
            "Audio processing tools unavailable - cannot analyze audio content";
        } else if (
          error.message.includes("network") ||
          error.message.includes("timeout") ||
          error.message.includes("DEADLINE_EXCEEDED")
        ) {
          errorCategory = "network";
          friendlyMessage = "Network timeout during AI processing";
          flagReason =
            "Network timeout during AI analysis - cannot analyze audio content";
        } else if (
          error.message.includes("quota") ||
          error.message.includes("RESOURCE_EXHAUSTED")
        ) {
          errorCategory = "service";
          friendlyMessage = "AI service quota exceeded";
          flagReason =
            "AI service quota exceeded - cannot analyze audio content";
        }

        console.error(
          `🎵 AUDIO: Categorized as ${errorCategory}: ${friendlyMessage}`
        );
      }

      // Return standardized error result that follows fail-closed security policy
      return {
        success: false,
        moderationStatus: "error",
        flagReason: flagReason,
        extractedKeywords: [],
        error: `${friendlyMessage}${
          error instanceof Error ? ": " + error.message : ""
        }`,
        errorCategory,
      };
    } finally {
      // Cleanup temporary files
      await this.cleanup(tempAudioPath, tempVideoPath, null);
    }
  }

  private async downloadVideoFromGCS(
    gcsVideoUri: string,
    videoId: string
  ): Promise<string> {
    const tempVideoPath = join(process.cwd(), "temp", `${videoId}_video.webm`);

    // Ensure temp directory exists
    const tempDir = join(process.cwd(), "temp");
    const fs = require("fs");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      console.log(`🎵 AUDIO: Downloading video from GCS: ${gcsVideoUri}`);

      // Extract bucket and file path from GCS URI
      const gcsPath = gcsVideoUri.replace("gs://", "");
      const [bucketName, ...pathParts] = gcsPath.split("/");
      const filePath = pathParts.join("/");

      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      await file.download({ destination: tempVideoPath });
      console.log(
        `🎵 AUDIO: Video downloaded successfully to: ${tempVideoPath}`
      );

      return tempVideoPath;
    } catch (error) {
      console.error(`🎵 AUDIO: Failed to download video from GCS:`, error);
      throw new Error(
        `Failed to download video from GCS: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async downloadVideoFromBunny(
    videoId: string,
    bunnyVideoId: string
  ): Promise<string> {
    const tempVideoPath = join("/tmp", `${videoId}_temp.mp4`);
    const videoUrl = `https://vz-7c674c55-8ff.b-cdn.net/${bunnyVideoId}/original`;

    console.log(`🎵 AUDIO: Downloading video from ${videoUrl}`);

    const https = await import("https");
    const fs = await import("fs");

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempVideoPath);

      https
        .get(videoUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to download video: HTTP ${response.statusCode}`)
            );
            return;
          }

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            console.log(
              `🎵 AUDIO: Video downloaded successfully to ${tempVideoPath}`
            );
            resolve(tempVideoPath);
          });

          file.on("error", (error) => {
            fs.unlinkSync(tempVideoPath);
            reject(error);
          });
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  private async extractAudio(
    videoId: string,
    videoFilePath: string
  ): Promise<string> {
    const tempAudioPath = join("/tmp", `${videoId}_audio.flac`);

    // First, verify input file exists and get its detailed stats
    console.log(`🎵 AUDIO: === DIAGNOSTIC INFO FOR ${videoId} ===`);
    try {
      const fs = await import("fs/promises");
      const stats = await fs.stat(videoFilePath);
      console.log(`🎵 AUDIO: Input video file - Path: ${videoFilePath}`);
      console.log(`🎵 AUDIO: Input video file - Size: ${stats.size} bytes`);
      console.log(`🎵 AUDIO: Input video file - Modified: ${stats.mtime}`);
      console.log(
        `🎵 AUDIO: Input video file - Permissions: ${stats.mode.toString(8)}`
      );

      if (stats.size === 0) {
        throw new Error("CRITICAL: Input video file is empty (0 bytes)");
      }
      if (stats.size < 1000) {
        console.warn(
          `🎵 AUDIO: WARNING: Input video file is very small (${stats.size} bytes) - may be corrupted`
        );
      }
    } catch (statError) {
      console.error(
        `🎵 AUDIO: CRITICAL: Cannot access input video file:`,
        statError
      );
      throw new Error(
        `Input video file not accessible: ${
          statError instanceof Error ? statError.message : "Unknown error"
        }`
      );
    }

    // Run ffprobe to analyze the input file structure in detail
    console.log(`🎵 AUDIO: Running ffprobe to analyze input file structure`);
    try {
      await new Promise<void>((resolve, reject) => {
        let probeOutput = "";
        let probeError = "";

        const ffprobe = spawn("ffprobe", [
          "-v",
          "error",
          "-show_format",
          "-show_streams",
          "-of",
          "json",
          videoFilePath,
        ]);

        ffprobe.stdout.on("data", (data) => {
          probeOutput += data.toString();
        });

        ffprobe.stderr.on("data", (data) => {
          probeError += data.toString();
        });

        ffprobe.on("close", (code) => {
          if (code === 0) {
            console.log(`🎵 AUDIO: === FFPROBE ANALYSIS COMPLETE ===`);
            try {
              const probeData = JSON.parse(probeOutput);
              console.log(
                `🎵 AUDIO: Format: ${
                  probeData.format?.format_name || "unknown"
                }`
              );
              console.log(
                `🎵 AUDIO: Duration: ${
                  probeData.format?.duration || "unknown"
                } seconds`
              );
              console.log(
                `🎵 AUDIO: Bitrate: ${
                  probeData.format?.bit_rate || "unknown"
                } bps`
              );

              const audioStreams =
                probeData.streams?.filter(
                  (s: any) => s.codec_type === "audio"
                ) || [];
              console.log(
                `🎵 AUDIO: Audio streams found: ${audioStreams.length}`
              );
              audioStreams.forEach((stream: any, index: number) => {
                console.log(
                  `🎵 AUDIO: Audio stream ${index}: codec=${stream.codec_name}, channels=${stream.channels}, sample_rate=${stream.sample_rate}`
                );
              });

              if (audioStreams.length === 0) {
                console.warn(
                  `🎵 AUDIO: WARNING: No audio streams detected in video file`
                );
              }
            } catch (parseError) {
              console.log(`🎵 AUDIO: ffprobe raw output: ${probeOutput}`);
            }
            resolve();
          } else {
            console.error(
              `🎵 AUDIO: ffprobe failed with code ${code}:`,
              probeError
            );
            reject(new Error(`ffprobe failed: ${probeError}`));
          }
        });

        ffprobe.on("error", (error) => {
          console.error(`🎵 AUDIO: ffprobe spawn error:`, error);
          reject(error);
        });
      });
    } catch (probeError) {
      console.error(
        `🎵 AUDIO: File analysis failed, but proceeding with extraction:`,
        probeError
      );
    }

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        "-i",
        videoFilePath, // Input video file
        "-vn", // Disable video
        "-acodec",
        "flac", // Use FLAC codec (recommended by Google)
        "-ar",
        "16000", // 16kHz sample rate
        "-ac",
        "1", // Mono channel
        "-y", // Overwrite output file
        tempAudioPath,
      ];

      console.log(`🎵 AUDIO: === STARTING FFMPEG EXTRACTION ===`);
      console.log(
        `🎵 AUDIO: Full FFmpeg command: ffmpeg ${ffmpegArgs.join(" ")}`
      );
      console.log(`🎵 AUDIO: Working directory: ${process.cwd()}`);
      console.log(`🎵 AUDIO: Output path: ${tempAudioPath}`);

      let stderrOutput = "";
      let stdoutOutput = "";

      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      // Capture all output for comprehensive debugging
      ffmpeg.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdoutOutput += chunk;
        console.log(`🎵 AUDIO: FFmpeg stdout: ${chunk.trim()}`);
      });

      ffmpeg.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderrOutput += chunk;
        console.log(`🎵 AUDIO: FFmpeg stderr: ${chunk.trim()}`);
      });

      ffmpeg.on("close", (code) => {
        console.log(`🎵 AUDIO: === FFMPEG EXTRACTION COMPLETED ===`);
        console.log(`🎵 AUDIO: FFmpeg exit code: ${code}`);
        console.log(`🎵 AUDIO: === COMPLETE STDOUT OUTPUT ===`);
        console.log(stdoutOutput || "(no stdout output)");
        console.log(`🎵 AUDIO: === COMPLETE STDERR OUTPUT ===`);
        console.log(stderrOutput || "(no stderr output)");
        console.log(`🎵 AUDIO: === END FFMPEG OUTPUT ===`);

        if (code === 0) {
          console.log(
            `🎵 AUDIO: SUCCESS: FFmpeg extraction completed for ${videoId}`
          );
          resolve(tempAudioPath);
        } else {
          console.error(
            `🎵 AUDIO: FAILURE: FFmpeg failed with exit code ${code}`
          );

          // Provide the complete diagnostic information
          const diagnosticInfo = {
            exitCode: code,
            inputFile: videoFilePath,
            outputFile: tempAudioPath,
            command: `ffmpeg ${ffmpegArgs.join(" ")}`,
            stderr: stderrOutput,
            stdout: stdoutOutput,
          };

          console.error(
            `🎵 AUDIO: COMPLETE DIAGNOSTIC INFO:`,
            JSON.stringify(diagnosticInfo, null, 2)
          );

          reject(
            new Error(
              `FFmpeg audio extraction failed with exit code ${code}. STDERR: ${stderrOutput}. STDOUT: ${stdoutOutput}`
            )
          );
        }
      });

      ffmpeg.on("error", (spawnError) => {
        console.error(
          `🎵 AUDIO: CRITICAL: FFmpeg process spawn failed:`,
          spawnError
        );

        if (spawnError.message.includes("ENOENT")) {
          reject(
            new Error(
              "CRITICAL: FFmpeg executable not found. ENOENT error indicates FFmpeg is not installed or not in system PATH."
            )
          );
        } else {
          reject(
            new Error(
              `CRITICAL: FFmpeg process spawn failed: ${spawnError.message}`
            )
          );
        }
      });
    });
  }

  private async extractAudioFromVideoFile(
    videoId: string,
    videoFilePath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempAudioPath = join(
        process.cwd(),
        "temp",
        `${videoId}_audio.flac`
      );

      // Ensure temp directory exists
      const tempDir = join(process.cwd(), "temp");
      const fs = require("fs");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const ffmpegArgs = [
        "-i",
        videoFilePath,
        "-vn", // No video
        "-acodec",
        "flac", // Audio codec
        "-ar",
        "16000", // Sample rate for Speech-to-Text
        "-ac",
        "1", // Mono channel
        "-y", // Overwrite output files
        tempAudioPath,
      ];

      console.log(
        `🎵 AUDIO: Extracting audio with FFmpeg: ffmpeg ${ffmpegArgs.join(" ")}`
      );

      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log(
            `🎵 AUDIO: Audio extraction successful: ${tempAudioPath}`
          );
          resolve(tempAudioPath);
        } else {
          console.error(`🎵 AUDIO: FFmpeg failed with exit code ${code}`);
          reject(new Error(`Audio extraction failed with exit code ${code}`));
        }
      });

      ffmpeg.on("error", (error) => {
        console.error(`🎵 AUDIO: FFmpeg process error:`, error);
        reject(new Error(`FFmpeg process failed: ${error.message}`));
      });
    });
  }

  private async uploadAudioToGCS(
    videoId: string,
    audioFilePath: string
  ): Promise<string> {
    const audioFileName = `audio-processing/${videoId}_audio.flac`;
    const file = this.storage.bucket(this.gcsBucket).file(audioFileName);

    // Read the audio file and upload to GCS
    const audioBuffer = await readFile(audioFilePath);
    await file.save(audioBuffer, {
      metadata: {
        contentType: "audio/flac",
      },
    });

    console.log(
      `🎵 AUDIO: Uploaded audio to GCS: gs://${this.gcsBucket}/${audioFileName}`
    );
    return `gs://${this.gcsBucket}/${audioFileName}`;
  }

  private async transcribeAudioFromGCS(
    gcsVideoUri: string
  ): Promise<string | null> {
    // Use Long Running Recognition for videos
    // WebM videos need specific handling with correct encoding
    console.log(
      `🎵 AUDIO: Using Long Running Recognition for video: ${gcsVideoUri}`
    );

    try {
      // First, verify the file exists in GCS by attempting to access it
      console.log(`🎵 AUDIO: Verifying GCS file accessibility...`);
      const gcsPath = gcsVideoUri.replace("gs://", "");
      const [bucketName, ...pathParts] = gcsPath.split("/");
      const filePath = pathParts.join("/");

      console.log(`🎵 AUDIO: Bucket: ${bucketName}, File path: ${filePath}`);

      try {
        const file = this.storage.bucket(bucketName).file(filePath);
        const [exists] = await file.exists();

        if (!exists) {
          console.error(
            `🎵 AUDIO: CRITICAL ERROR - File does not exist in GCS: ${gcsVideoUri}`
          );
          throw new Error(
            `File not found in Google Cloud Storage: ${gcsVideoUri}`
          );
        }

        console.log(
          `🎵 AUDIO: ✅ File exists in GCS, proceeding with transcription`
        );
      } catch (storageError) {
        console.error(
          `🎵 AUDIO: CRITICAL ERROR - Cannot access GCS bucket/file:`,
          storageError
        );
        throw new Error(
          `Cannot access video file in storage: ${
            storageError instanceof Error
              ? storageError.message
              : "Unknown storage error"
          }`
        );
      }

      const request = {
        config: {
          encoding: "WEBM_OPUS" as any,
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: "latest_long",
          useEnhanced: true,
          audioChannelCount: 1, // Mono
          sampleRateHertz: 48000, // WebM Opus standard sample rate
        },
        audio: {
          uri: gcsVideoUri,
        },
      };

      console.log(
        `🎵 AUDIO: Starting Long Running Recognition with Google Cloud Speech API...`
      );
      console.log(
        `🎵 AUDIO: Request config:`,
        JSON.stringify(request.config, null, 2)
      );

      const [operation] = await this.speechClient.longRunningRecognize(request);
      console.log(
        `🎵 AUDIO: Operation created successfully, operation name: ${operation.name}`
      );

      console.log(
        `🎵 AUDIO: Waiting for Long Running Recognition to complete...`
      );
      const [response] = await operation.promise();

      console.log(
        `🎵 AUDIO: ✅ Long Running Recognition completed successfully`
      );

      if (!response.results || response.results.length === 0) {
        console.log(`🎵 AUDIO: No speech detected in video (empty results)`);
        return ""; // Return empty string instead of null for cleaner handling
      }

      const transcription = response.results
        .map((result: any) => result.alternatives?.[0]?.transcript || "")
        .join(" ")
        .trim();

      console.log(`🎵 AUDIO: ✅ Transcription completed successfully`);
      console.log(
        `🎵 AUDIO: Transcription length: ${transcription.length} characters`
      );
      console.log(
        `🎵 AUDIO: Transcription preview: ${transcription.substring(0, 100)}...`
      );

      return transcription || "";
    } catch (error) {
      console.error(
        `🎵 AUDIO: ❌ Long Running Recognition failed with error:`,
        error
      );

      if (error instanceof Error) {
        console.error(`🎵 AUDIO: Error details:`, {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });

        // Analyze error type for better debugging
        if (error.message.includes("PERMISSION_DENIED")) {
          console.error(
            `🎵 AUDIO: 🔐 PERMISSION ERROR - Check Google Cloud credentials and IAM permissions`
          );
          throw new Error(
            "Google Cloud Speech API permission denied - check service account credentials"
          );
        } else if (error.message.includes("NOT_FOUND")) {
          console.error(
            `🎵 AUDIO: 📁 FILE NOT FOUND ERROR - Video file missing from storage`
          );
          throw new Error(
            `Video file not found in Google Cloud Storage: ${gcsVideoUri}`
          );
        } else if (error.message.includes("INVALID_ARGUMENT")) {
          console.error(
            `🎵 AUDIO: ⚙️ CONFIGURATION ERROR - Invalid Speech API request parameters`
          );
          throw new Error("Invalid audio format or Speech API configuration");
        } else if (error.message.includes("RESOURCE_EXHAUSTED")) {
          console.error(`🎵 AUDIO: 📊 QUOTA ERROR - Speech API quota exceeded`);
          throw new Error("Google Cloud Speech API quota exceeded");
        }
      }

      // Fallback: Try to extract and upload audio separately for transcription
      console.log(
        `🎵 AUDIO: 🔄 Attempting fallback method - extracting audio from video`
      );
      return await this.transcribeUsingAudioExtraction(gcsVideoUri);
    }
  }

  private async transcribeUsingAudioExtraction(
    gcsVideoUri: string
  ): Promise<string | null> {
    console.log(
      `🎵 AUDIO: Fallback method - downloading video and extracting audio`
    );

    let tempVideoPath: string | null = null;
    let tempAudioPath: string | null = null;

    try {
      // Extract video ID from GCS URI
      const videoId =
        gcsVideoUri.split("/").pop()?.replace(".webm", "") || "unknown";

      // Download video from GCS
      tempVideoPath = await this.downloadVideoFromGCS(gcsVideoUri, videoId);

      // Extract audio using FFmpeg
      tempAudioPath = await this.extractAudio(videoId, tempVideoPath);

      // Upload extracted audio to GCS
      const audioGcsUri = await this.uploadAudioToGCS(videoId, tempAudioPath);

      // Transcribe the extracted audio
      const request = {
        config: {
          encoding: "FLAC" as any,
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: "latest_long",
          useEnhanced: true,
          sampleRateHertz: 16000,
          audioChannelCount: 1,
        },
        audio: {
          uri: audioGcsUri,
        },
      };

      console.log(
        `🎵 AUDIO: Starting Long Running Recognition for extracted audio`
      );
      const [operation] = await this.speechClient.longRunningRecognize(request);
      const [response] = await operation.promise();

      if (!response.results || response.results.length === 0) {
        console.log(`🎵 AUDIO: No speech detected in extracted audio`);
        return null;
      }

      const transcription = response.results
        .map((result: any) => result.alternatives?.[0]?.transcript || "")
        .join(" ")
        .trim();

      console.log(
        `🎵 AUDIO: Audio extraction transcription successful, length: ${transcription.length} chars`
      );
      return transcription || null;
    } catch (error) {
      console.error(
        `🎵 AUDIO: Audio extraction fallback failed:`,
        error instanceof Error ? error.message : "Unknown error"
      );
      return null;
    } finally {
      // Cleanup temporary files
      if (tempVideoPath) {
        try {
          const fs = await import("fs/promises");
          await fs.unlink(tempVideoPath);
        } catch (cleanupError) {
          console.warn(
            `🎵 AUDIO: Failed to cleanup temp video file: ${tempVideoPath}`
          );
        }
      }
      if (tempAudioPath) {
        try {
          const fs = await import("fs/promises");
          await fs.unlink(tempAudioPath);
        } catch (cleanupError) {
          console.warn(
            `🎵 AUDIO: Failed to cleanup temp audio file: ${tempAudioPath}`
          );
        }
      }
    }
  }

  private async moderateAudioContent(
    transcription: string
  ): Promise<{ status: "passed" | "failed"; reason?: string }> {
    try {
      console.log(
        `🎵 AUDIO: Moderating transcription with Google Cloud Natural Language API`
      );

      // First check our custom blacklist for immediate flags
      const blacklistCheck = this.basicModerationFallback(transcription);
      if (blacklistCheck.status === "failed") {
        console.log(
          `🎵 AUDIO: Video rejected by custom blacklist: ${blacklistCheck.reason}`
        );
        return blacklistCheck;
      }

      // Then use Google Cloud Natural Language API for comprehensive content moderation
      const moderationResult = await contentModerationService.moderateText(
        transcription,
        "video"
      );

      if (!moderationResult.isApproved) {
        console.log(
          `🎵 AUDIO: Video rejected by Natural Language API: ${moderationResult.reason}`
        );
        return {
          status: "failed",
          reason:
            moderationResult.reason || "Content violates community guidelines",
        };
      }

      console.log(
        `🎵 AUDIO: Video approved by both custom blacklist and Natural Language API (toxicity score: ${
          moderationResult.toxicityScore?.toFixed(3) || "N/A"
        })`
      );
      return { status: "passed" };
    } catch (error) {
      console.error(
        `🎵 AUDIO: Error during Natural Language API moderation:`,
        error
      );

      // Fallback to basic moderation if API fails
      console.log(`🎵 AUDIO: Falling back to basic content moderation`);
      return this.basicModerationFallback(transcription);
    }
  }

  private basicModerationFallback(transcription: string): {
    status: "passed" | "failed";
    reason?: string;
  } {
    const normalizedText = transcription.toLowerCase();

    // Basic inappropriate keywords check
    const criticalKeywords = [
      "fuck",
      "shit",
      "bitch",
      "nigger",
      "faggot",
      "kill yourself",
      "terrorist",
      "bomb",
      "school shooter",
      "hate",
      "murder",
      "buck",
      "fck",
      "sh1t",
      "b1tch",
      "damn",
      "hell",
    ];

    for (const keyword of criticalKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        console.log(`🎵 AUDIO: Flagged by basic moderation: "${keyword}"`);
        return {
          status: "failed",
          reason: `Inappropriate content detected`,
        };
      }
    }

    console.log(`🎵 AUDIO: Content moderation passed`);
    return { status: "passed" };
  }

  private extractKeywords(transcription: string): string[] {
    const normalizedText = transcription.toLowerCase();
    const foundKeywords: string[] = [];

    // Extract exact keyword matches
    for (const keyword of this.topicKeywords) {
      const keywordLower = keyword.toLowerCase();
      if (normalizedText.includes(keywordLower)) {
        if (!foundKeywords.includes(keyword)) {
          foundKeywords.push(keyword);
        }
      }
    }

    // Basic stemming for common variations
    const stemmedChecks = [
      { pattern: /\bfishing|\bfished|\bfish\b/i, keyword: "fishing" },
      { pattern: /\bcooking|\bcooked|\bcook\b/i, keyword: "cooking" },
      { pattern: /\btravel|\btraveling|\btraveled\b/i, keyword: "travel" },
      { pattern: /\bhiking|\bhiked|\bhike\b/i, keyword: "hiking" },
      { pattern: /\bswimming|\bswam|\bswim\b/i, keyword: "swimming" },
      { pattern: /\bgaming|\bgamed|\bgame\b/i, keyword: "game" },
    ];

    for (const check of stemmedChecks) {
      if (
        check.pattern.test(transcription) &&
        !foundKeywords.includes(check.keyword)
      ) {
        foundKeywords.push(check.keyword);
      }
    }

    console.log(
      `🎵 AUDIO: Extracted ${
        foundKeywords.length
      } keywords: ${foundKeywords.join(", ")}`
    );
    return foundKeywords;
  }

  // Process audio from a local video file (for thread messages)
  async processLocalVideo(
    videoPath: string,
    options: {
      contentType: string;
      contentId: string;
      userId: string;
      maxDuration: number;
    }
  ): Promise<{
    approved: boolean;
    reason?: string;
    transcription?: string;
    extractedKeywords?: string[];
  }> {
    console.log(`🎵 AUDIO: Processing local video file: ${videoPath}`);

    let tempAudioPath: string | null = null;
    let gcsAudioUri: string | null = null;

    try {
      // Step 1: Extract audio from video file
      tempAudioPath = await this.extractAudioFromVideoFile(
        options.contentId,
        videoPath
      );
      console.log(`🎵 AUDIO: Audio extracted to: ${tempAudioPath}`);

      // Step 2: Upload audio to GCS for Speech-to-Text processing
      if (tempAudioPath) {
        gcsAudioUri = await this.uploadAudioToGCS(
          options.contentId,
          tempAudioPath
        );
        console.log(`🎵 AUDIO: Audio uploaded to GCS: ${gcsAudioUri}`);
      } else {
        throw new Error("Audio extraction failed");
      }

      // Step 3: Transcribe audio using Speech-to-Text API
      const transcription = await this.transcribeAudioFromGCS(gcsAudioUri);

      if (!transcription) {
        console.log(
          `🎵 AUDIO: No transcription result for ${options.contentId} - likely no speech detected`
        );
        return {
          approved: true,
          transcription: "",
          extractedKeywords: [],
        };
      }

      console.log(
        `🎵 AUDIO: Transcription completed: ${transcription.substring(
          0,
          100
        )}...`
      );

      // Step 4: Perform content moderation on transcription
      const moderationResult = await this.moderateAudioContent(transcription);

      // Step 5: Extract keywords for search functionality
      const keywords = this.extractKeywords(transcription);

      console.log(
        `🎵 AUDIO: Moderation status: ${
          moderationResult.status
        }, Keywords: ${keywords.join(", ")}`
      );

      return {
        approved: moderationResult.status === "passed",
        reason: moderationResult.reason,
        transcription,
        extractedKeywords: keywords,
      };
    } catch (error) {
      console.error(
        `🎵 AUDIO: Local video processing failed for ${options.contentId}:`,
        error
      );
      return {
        approved: false,
        reason: "Audio processing failed",
      };
    } finally {
      // Cleanup temporary files
      await this.cleanup(tempAudioPath, null, gcsAudioUri);
    }
  }

  private async cleanup(
    tempAudioPath: string | null,
    tempVideoPath: string | null,
    gcsAudioUri: string | null
  ): Promise<void> {
    // Clean up temporary video file
    if (tempVideoPath) {
      try {
        await unlink(tempVideoPath);
        console.log(`🎵 AUDIO: Cleaned up temp video file: ${tempVideoPath}`);
      } catch (error) {
        console.warn(`🎵 AUDIO: Failed to cleanup temp video file:`, error);
      }
    }
    // Clean up temporary audio file
    if (tempAudioPath) {
      try {
        await unlink(tempAudioPath);
        console.log(`🎵 AUDIO: Cleaned up temp audio file: ${tempAudioPath}`);
      } catch (error) {
        console.warn(`🎵 AUDIO: Failed to cleanup temp audio file:`, error);
      }
    }

    // Clean up GCS audio file
    if (gcsAudioUri) {
      try {
        const fileName = gcsAudioUri.replace(`gs://${this.gcsBucket}/`, "");
        await this.storage.bucket(this.gcsBucket).file(fileName).delete();
        console.log(`🎵 AUDIO: Cleaned up GCS audio file: ${fileName}`);
      } catch (error) {
        console.warn(`🎵 AUDIO: Failed to cleanup GCS audio file:`, error);
      }
    }
  }
}

export const audioProcessingService = new AudioProcessingService();
