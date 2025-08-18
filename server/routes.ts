import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { setupAuth, isAuthenticated } from "./replitAuth.ts";
import { bunnyService } from "./bunnyService.ts";
import * as videoProcessor from "./simpleVideoProcessor.ts";
import { randomUUID } from "crypto";
import { writeFile, copyFile } from "fs/promises";
import { join } from "node:path";
import multer from "multer";
import { queueVideoProcessing } from "./simpleVideoProcessor.ts";
import {
  insertVideoSchema,
  DBVideoRow,
  // insertGroupSchema,
  // insertVideoCommentSchema,
  // insertVideoLikeSchema,
  // insertGroupMembershipSchema,
  // insertUserFollowSchema,
  // insertVideoCollectionSchema,
  // groupMemberships
} from "@shared/schema.ts";
// import { z } from "zod";
// import { db } from "./db.ts";
// import { eq, and } from "drizzle-orm";
import type { DBVideoInsert } from "../shared/schema.ts";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add comprehensive request logging middleware to track ALL requests
  app.use("/api", (req, res, next) => {
    if (req.originalUrl.includes("upload-binary")) {
      console.log(
        `🔍 BINARY UPLOAD: ${req.method} ${req.originalUrl} - Content-Type: ${req.headers["content-type"]}`
      );
      console.log(`🔍 BINARY UPLOAD: Headers:`, req.headers);
    }
    next();
  });

  // Add global request logging middleware to track all video-related requests
  app.use("/api/videos", (req, res, next) => {
    console.log(
      `🔍 GLOBAL: ${req.method} ${req.originalUrl} - Content-Type: ${req.headers["content-type"]}`
    );
    console.log(
      `🔍 GLOBAL: Body keys: ${req.body ? Object.keys(req.body) : "no body"}`
    );
    next();
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.patch("/api/users/:id/coins", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { coins } = req.body;

      if (userId !== req.params.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.updateUserGemCoins(userId, coins);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user coins:", error);
      res.status(500).json({ message: "Failed to update coins" });
    }
  });

  // Video streaming endpoint
  app.get("/api/videos/:id/stream", async (req, res) => {
    try {
      const video = await storage.getVideoById(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (!video.videoUrl) {
        return res.status(404).json({ message: "Video data not found" });
      }

      // Handle different video URL formats
      const videoData = video.videoUrl;

      // If it's an external URL (including Bunny.net CDN URLs), try to fetch it
      if (videoData.startsWith("http://") || videoData.startsWith("https://")) {
        try {
          const response = await fetch(videoData, {
            headers: {
              AccessKey: process.env.BUNNY_API_KEY || "",
              "User-Agent": "Jemzy-Video-Player/1.0",
            },
          });

          if (!response.ok) {
            console.error(
              `Failed to fetch video from Bunny.net: ${response.status} ${response.statusText}`
            );
            return res
              .status(404)
              .json({ message: "Video not available for streaming" });
          }

          // Set proper headers for video streaming
          res.setHeader(
            "Content-Type",
            response.headers.get("content-type") || "video/mp4"
          );
          res.setHeader(
            "Content-Length",
            response.headers.get("content-length") || "0"
          );
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Range");

          // Stream the video content
          const videoBuffer = await response.arrayBuffer();
          res.end(Buffer.from(videoBuffer));
          return;
        } catch (error) {
          console.error("Error fetching video from Bunny.net:", error);
          return res.status(500).json({ message: "Failed to stream video" });
        }
      }

      // Handle blob URLs (legacy format)
      if (videoData.startsWith("blob:")) {
        return res
          .status(404)
          .json({ message: "Video no longer available (legacy format)" });
      }

      // Must be base64 data URL
      if (!videoData.startsWith("data:video/")) {
        return res.status(400).json({ message: "Invalid video data format" });
      }

      // Extract MIME type and base64 content
      const commaIndex = videoData.indexOf(",");
      if (commaIndex === -1) {
        return res
          .status(400)
          .json({ message: "Invalid video data format - no comma separator" });
      }

      const header = videoData.substring(0, commaIndex);
      const content = videoData.substring(commaIndex + 1);
      const originalMimeType =
        header.match(/data:([^;]+)/)?.[1] || "video/webm";

      // Handle codec-specific MIME types for enhanced compatibility
      let mimeType = originalMimeType;
      if (originalMimeType === "video/mp4") {
        if (header.includes('codecs="avc1.42001E, mp4a.40.2"')) {
          // Fragmented MP4 with H.264 Baseline + AAC - optimal format
          mimeType = "video/mp4";
          console.log(
            "Detected fragmented MP4 with H.264/AAC - optimal compatibility"
          );
        } else if (
          header.includes("codecs=avc1,opus") ||
          header.includes("codecs=avc1,mp4a")
        ) {
          // Legacy MP4 formats - serve as generic MP4
          mimeType = "video/mp4";
          console.log("Detected legacy MP4 codecs, serving as generic MP4");
        } else if (header.includes("codecs=")) {
          // Strip any other codec information for maximum compatibility
          mimeType = "video/mp4";
          console.log("Stripping codec information from MP4 MIME type");
        }
      }

      console.log("Video streaming details:", {
        originalMimeType,
        finalMimeType: mimeType,
        hasCodecs: header.includes("codecs="),
        contentLength: content.length,
      });

      if (!content) {
        return res.status(400).json({ message: "No video content found" });
      }

      // Convert base64 to buffer with validation
      let videoBuffer: Buffer;
      try {
        videoBuffer = Buffer.from(content, "base64");

        // Validate buffer size
        if (videoBuffer.length === 0) {
          return res.status(400).json({ message: "Empty video buffer" });
        }

        console.log("Video buffer validation:", {
          size: videoBuffer.length,
          mimeType: mimeType,
          headerBytes: videoBuffer.subarray(0, 16).toString("hex"),
        });
      } catch (error) {
        console.error("Base64 decode error:", error);
        return res.status(400).json({ message: "Invalid video data encoding" });
      }

      // Set comprehensive headers for maximum video compatibility
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", videoBuffer.length.toString());
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-cache"); // Disable caching for testing
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Range, Content-Length"
      );

      // Essential headers for video streaming
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("X-Content-Type-Options", "nosniff");

      // Handle range requests for video seeking
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : videoBuffer.length - 1;
        const chunksize = end - start + 1;

        res.status(206);
        res.setHeader(
          "Content-Range",
          `bytes ${start}-${end}/${videoBuffer.length}`
        );
        res.setHeader("Content-Length", chunksize);
        res.end(videoBuffer.slice(start, end + 1));
      } else {
        res.end(videoBuffer);
      }
    } catch (error) {
      console.error("Error streaming video:", error);
      res.status(500).json({ message: "Failed to stream video" });
    }
  });

  app.post("/api/videos", isAuthenticated, async (req: any, res) => {
    try {
      console.log("🔍 MAIN VIDEO ENDPOINT: POST /api/videos called");
      console.log(
        "🔍 MAIN VIDEO ENDPOINT: Content-Type:",
        req.headers["content-type"]
      );
      console.log(
        "🔍 MAIN VIDEO ENDPOINT: Body keys:",
        Object.keys(req.body || {})
      );

      const userId = req.user.claims.sub;
      const videoData = { ...req.body, userId };

      // Generate unique video ID
      const videoId = randomUUID();

      // Handle video upload asynchronously
      if (videoData.videoUrl && videoData.videoUrl.startsWith("data:video/")) {
        console.log(`Starting asynchronous processing for video ${videoId}`);

        // Extract base64 content and save to temporary file
        const commaIndex = videoData.videoUrl.indexOf(",");
        if (commaIndex === -1) {
          return res.status(400).json({ message: "Invalid video data format" });
        }

        // Extract header and content type information
        const header = videoData.videoUrl.substring(0, commaIndex);
        const mimeMatch = header.match(/data:([^;]+)/);
        const detectedMimeType = mimeMatch ? mimeMatch[1] : "video/webm";

        const base64Content = videoData.videoUrl.substring(commaIndex + 1);
        const videoBuffer = Buffer.from(base64Content, "base64");

        // Determine correct file extension based on MIME type
        let fileExtension = ".webm"; // default fallback
        if (detectedMimeType.includes("mp4")) {
          fileExtension = ".mp4";
        } else if (detectedMimeType.includes("webm")) {
          fileExtension = ".webm";
        }

        const tempFilePath = join(
          "/tmp",
          `upload_${videoId}_${Date.now()}${fileExtension}`
        );
        console.log(
          `Detected MIME type: ${detectedMimeType}, using extension: ${fileExtension}`
        );

        // Save temporary file
        await writeFile(tempFilePath, videoBuffer);
        console.log(
          `Saved temporary video file: ${tempFilePath} (${videoBuffer.length} bytes)`
        );

        // Create persistent copy BEFORE processing
        const persistentFilePath = join(
          "/tmp",
          `video_${videoId}_${Date.now()}${fileExtension}`
        );
        await copyFile(tempFilePath, persistentFilePath);
        console.log(`Created persistent copy: ${persistentFilePath}`);

        // Create the video record in the database first
        const insertObj = {
          title: videoData.title ?? "Untitled Video",
          description: videoData.description ?? "",
          videoUrl: videoData.videoUrl, // ok to store data-url for now if that’s your model
          category: videoData.category ?? "general",
          visibility: videoData.visibility ?? "everyone",
          groupId: videoData.groupId ?? null,
          groupName: videoData.groupName ?? null,
          latitude: videoData.latitude ?? null,
          longitude: videoData.longitude ?? null,
          duration: videoData.duration ?? null,
          userId,
          processingStatus: "uploading",
        } as DBVideoInsert;

        const created = await storage.createVideo(insertObj);
        const dbId = created.id;

        console.log(
          `✅ DATABASE: Video ${videoId} created with status: uploading`
        );

        // Return immediately to frontend with video ID
        res.status(202).json({
          id: dbId,
          message: "Video upload started",
          status: "uploading",
        });

        try {
          // Process video asynchronously in the background
          queueVideoProcessing(persistentFilePath, videoId, {
            duration: videoData.duration ?? null,
            userId: req.user?.id, // if you have it
            originalFilename: videoData.originalFilename,
            metadata: {
              title: videoData.title ?? "Untitled Video",
              description: videoData.description ?? "",
              category: videoData.category ?? "general",
              visibility: videoData.visibility ?? "everyone",
              groupId: videoData.groupId ?? "",
              latitude: videoData.latitude ?? "",
              longitude: videoData.longitude ?? "",
              // anything else you want to pass through
            },
          });
          console.log(`📥 QUEUE: enqueued video ${videoId}`);
        } catch (err) {
          console.error("Failed to enqueue video:", err);
          // optional: mark failed immediatßely if enqueue itself blows up
          await storage.updateVideoProcessingStatus(videoId, "failed");
        }

        return; // Return early after starting async processing
      }

      // Handle non-video data uploads (metadata only)
      const result = insertVideoSchema.safeParse(videoData);
      if (!result.success) {
        console.error("Validation errors:", result.error.errors);
        return res.status(400).json({
          message: "Invalid video data",
          errors: result.error.errors,
        });
      }

      const newVideo = await storage.createVideo({
        ...result.data,
        id: videoId,
        userId: userId,
      } as DBVideoInsert);

      res.status(201).json(newVideo);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  // Continue with the rest of the routes...
  // The file will be continued with all other routes

  return createServer(app);
}
