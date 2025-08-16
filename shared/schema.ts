// TEMP DEBUG TEST


import { z } from "zod";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, eq, and } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const processingStatusEnum = pgEnum("processing_status", [
  "uploading",
  "processing",
  "pending_moderation",
  "approved",
  "rejected",
  "failed", 
  'under_appeal',
  'flagged_by_user',
  'completed',
  'rejected_by_ai',
  'uploaded',
  'pending',
]);
// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  // email: varchar("email").unique(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  readyPlayerMeAvatarUrl: varchar("ready_player_me_avatar_url"), // Ready Player Me 2D avatar URL
  username: varchar("username").unique(),
  bio: text("bio"),
  gemCoins: integer("gem_coins").default(0),
  lanterns: integer("lanterns").default(5), // New users start with 5 lanterns
  currentXP: integer("current_xp").default(0), // Current XP points
  currentLevel: integer("current_level").default(0), // Current level (starts at 0 - "Noob!")
  // add near other columns
  passwordHash: varchar("password_hash"),        // nullable for existing rows; we'll require it for new signups
  // shared/schema.ts (users)
  stripeCustomerId: varchar("stripe_customer_id").unique(), // nullable by default; safe for users without Stripe

  role: varchar("role").default("user"), // user, moderator, admin
  strikes: integer("strikes").default(0), // Content moderation strikes
  communityGuidelinesAcceptedAt: timestamp("community_guidelines_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
console.log("users table init check:", users);


// Videos table
export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  category: varchar("category", { length: 50 }).notNull(),
  groupName: varchar("group_name", { length: 100 }),
  visibility: varchar("visibility", { length: 50 }).default("everyone"), // everyone, group_id
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
  questId: uuid("quest_id").references(() => quests.id, { onDelete: "cascade" }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  description: text("description"),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  duration: decimal("duration", { precision: 8, scale: 3 }), // in seconds with millisecond precision
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  bunnyVideoId: varchar("bunny_video_id"), // Bunny.net CDN video ID for streaming
  playbackStatus: varchar("playback_status", { length: 30 }).default("published"), // published, bunny_upload_failed, bunny_link_broken, unavailable
  moderationResults: text("moderation_results"), // JSON with Google Video AI results
  flaggedReason: text("flagged_reason"), // Reason if flagged
  gcsProcessingUrl: text("gcs_processing_url"), // GCS URL during processing
  bunnyStoragePath: text("bunny_storage_path"), // Bunny.net storage path if flagged
  bunnyReviewVideoId: varchar("bunny_review_video_id"), // Temporary Bunny.net video ID for moderation review
  transcriptionText: text("transcription_text"), // Full transcribed text from audio
  originalFilename: text("original_filename"),
  processingStatus: processingStatusEnum("processing_status").notNull().default("uploading"),
  audioModerationStatus: varchar("audio_moderation_status", { length: 20 }).default("pending"), // pending, passed, failed, error
  audioFlagReason: text("audio_flag_reason"), // Specific reason if audio moderation fails
  extractedKeywords: jsonb("extracted_keywords"), // Array of extracted keywords for search
  postTiming: varchar("post_timing", { length: 20 }).default("now"), // now, custom
  customDateTime: timestamp("custom_date_time"), // Custom post time if scheduled
  eventStartDate: varchar("event_start_date"), // Event start date (YYYY-MM-DD format)
  eventStartTime: varchar("event_start_time"), // Event start time (HH:MM format)
  eventEndDate: varchar("event_end_date"), // Event end date (YYYY-MM-DD format, optional)
  eventEndTime: varchar("event_end_time"), // Event end time (HH:MM format, optional)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Video likes table
export const videoLikes = pgTable("video_likes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video comments table
export const videoComments = pgTable("video_comments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  comment: text("comment"), // Text comment (optional if video comment, null for video-only comments)
  commentVideoId: uuid("comment_video_id"), // Reference to video used as comment
  commentVideoUrl: text("comment_video_url"), // Direct URL to video comment
  thumbnailUrl: text("thumbnail_url"), // Thumbnail URL for video comments
  bunnyVideoId: varchar("bunny_video_id"), // Bunny.net video ID for video comments
  commentType: varchar("comment_type", { length: 10 }).default("text"), // text, video
  processingStatus: varchar("processing_status", { length: 30 }).default("approved"), // processing, approved, flagged, rejected_by_moderation
  flaggedReason: text("flagged_reason"), // Reason if flagged
  moderationResults: text("moderation_results"), // JSON with moderation results
  audioFlagReason: text("audio_flag_reason"), // Audio-specific moderation flags
  duration: decimal("duration", { precision: 5, scale: 2 }), // Video duration in seconds (max 30s)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Groups table
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group memberships table
export const groupMemberships = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// User followers table
export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// User video collections (bookmarks)
export const videoCollections = pgTable("video_collections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video watch history
export const videoWatches = pgTable("video_watches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  watchedAt: timestamp("watched_at").defaultNow(),
});

// Video purchases (for remote access with coins)
export const videoPurchases = pgTable("video_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

// Video activations (videos discovered within 100ft radius - remain free forever)
export const videoActivations = pgTable("video_activations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  activatedAt: timestamp("activated_at").defaultNow(),
  activationLatitude: decimal("activation_latitude", { precision: 10, scale: 8 }),
  activationLongitude: decimal("activation_longitude", { precision: 11, scale: 8 }),
});

// Group threads table
export const groupThreads = pgTable("group_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Thread messages table
export const threadMessages = pgTable("thread_messages", {
  id: serial("id").primaryKey(),
  threadId: uuid("thread_id").notNull().references(() => groupThreads.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message"), // Text message (optional if video message, null for video-only messages)
  messageType: varchar("message_type", { length: 10 }).default("text"), // text, video
  videoUrl: text("video_url"), // Direct URL to video message
  bunnyVideoId: varchar("bunny_video_id"), // Bunny.net video ID for video messages
  processingStatus: varchar("processing_status", { length: 30 }).default("approved"), // processing, approved, flagged, rejected_by_moderation
  flaggedReason: text("flagged_reason"), // Reason if flagged
  moderationResults: text("moderation_results"), // JSON with moderation results
  audioFlagReason: text("audio_flag_reason"), // Audio-specific moderation flags
  duration: decimal("duration", { precision: 5, scale: 2 }), // Video duration in seconds (max 30s)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group messages table (keeping for backward compatibility)
export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User follow notifications preferences
export const userFollowNotifications = pgTable("user_follow_notifications", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quest tables
export const quests = pgTable("quests", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radiusInFeet: integer("radius_in_feet").notNull(), // 10-1000 feet
  requiredParticipants: integer("required_participants").notNull(),
  rewardPerParticipant: integer("reward_per_participant").notNull(), // Jem coins
  totalReward: integer("total_reward").notNull(), // Total coins put up by creator
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, completed, failed, cancelled
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const questParticipants = pgTable("quest_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
  hasPosted: boolean("has_posted").default(false),
  videoId: uuid("video_id").references(() => videos.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  rewardPaid: boolean("reward_paid").default(false),
});

export const questMessages = pgTable("quest_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video playback error logging
export const videoPlaybackErrors = pgTable("video_playback_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  videoUrl: text("video_url").notNull(),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
  resolved: boolean("resolved").default(false),
});

// Payments table for coin purchases
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(), // Amount in cents (USD)
  coinAmount: integer("coin_amount").notNull(), // Number of Jem coins purchased
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, failed, refunded
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Daily login tracking for coin rewards
export const dailyLogins = pgTable("daily_logins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  loginDate: timestamp("login_date").notNull(), // Date of login (normalized to start of day)
  coinsAwarded: integer("coins_awarded").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Location tracking for distance-based coin rewards
export const userLocationHistory = pgTable("user_location_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // GPS accuracy in meters
  speed: decimal("speed", { precision: 8, scale: 2 }), // Speed in meters per second
  heading: decimal("heading", { precision: 6, scale: 2 }), // Direction in degrees
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // Altitude in meters
  movementType: varchar("movement_type", { length: 20 }), // walking, cycling, driving, stationary
  isValidForRewards: boolean("is_valid_for_rewards").default(true), // False if speed indicates driving
  timestamp: timestamp("timestamp").defaultNow(),
});

// Distance milestones and coin rewards
export const distanceRewards = pgTable("distance_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }).notNull(), // Total distance in miles
  rewardType: varchar("reward_type", { length: 20 }).notNull(), // daily_distance, milestone_5, milestone_10, milestone_20
  coinsAwarded: integer("coins_awarded").notNull(),
  dateEarned: timestamp("date_earned").defaultNow(),
  sessionStartTime: timestamp("session_start_time").notNull(), // When tracking session started
  sessionEndTime: timestamp("session_end_time").notNull(), // When reward was earned
});

// User activity sessions for coin earning
export const activitySessions = pgTable("activity_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionStart: timestamp("session_start").notNull(),
  sessionEnd: timestamp("session_end"),
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }).default("0"), // Distance in miles
  avgSpeed: decimal("avg_speed", { precision: 8, scale: 2 }), // Average speed in mph
  movementType: varchar("movement_type", { length: 20 }), // predominant movement type
  coinsEarned: integer("coins_earned").default(0),
  isActive: boolean("is_active").default(true), // False when session ends
  lastLocationUpdate: timestamp("last_location_update").defaultNow(),
});

// Moderation tables
export const moderationFlags = pgTable("moderation_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentType: varchar("content_type").notNull(), // video, comment, video_comment, quest_message, jem
  contentId: text("content_id").notNull(), // ID of the flagged content (can be UUID or integer)
  flaggedByUserId: varchar("flagged_by_user_id").references(() => users.id, { onDelete: "set null" }), // null for AI flags
  flaggedByAI: boolean("flagged_by_ai").default(false),
  reason: text("reason"), // AI reason or user report reason
  flagReason: varchar("flag_reason"), // Structured reason: hate_speech, harassment, violence, etc.
  customReason: text("custom_reason"), // For "other" category
  status: varchar("status").default("pending"), // pending, approved, rejected
  moderatorId: varchar("moderator_id").references(() => users.id, { onDelete: "set null" }),
  moderatorDecision: text("moderator_decision"), // Reason for approval/rejection
  isAppeal: boolean("is_appeal").default(false), // If user appealed AI rejection
  contentSnapshot: jsonb("content_snapshot"), // Store content data for reference
  contextUrl: text("context_url"), // Link to where content appears in app
  contentHidden: boolean("content_hidden").default(false), // If content is hidden pending review
  createdAt: timestamp("created_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
});

// Moderation decisions table
export const moderationDecisions = pgTable("moderation_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  moderatorId: varchar("moderator_id").references(() => users.id, { onDelete: "cascade" }), // Allow null for AI decisions
  decision: varchar("decision").notNull(), // approve, reject
  reason: text("reason"),
  decisionType: varchar("decision_type"), // ai_moderation, human_review, appeal
  createdAt: timestamp("created_at").defaultNow(),
});

// User notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // video_like, video_comment, video_comment_video, comment, new_collector, group_invitation, gem_nearby, content_flagged_user, content_flagged_ai, content_deleted_comment, content_deleted_video_comment, content_deleted_thread_message, content_deleted_thread_video, thread_message_flagged
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"), // Link to content or action
  relatedUserId: varchar("related_user_id").references(() => users.id, { onDelete: "set null" }), // User who triggered notification
  relatedVideoId: uuid("related_video_id").references(() => videos.id, { onDelete: "set null" }), // Related video
  relatedGroupId: uuid("related_group_id").references(() => groups.id, { onDelete: "set null" }), // Related group
  relatedThreadId: uuid("related_thread_id").references(() => groupThreads.id, { onDelete: "set null" }), // Related thread
  relatedContentId: text("related_content_id"), // ID of related content (comment, etc.)
  relatedContentType: varchar("related_content_type"), // video_comment, thread_message, group_message
  thumbnailUrl: text("thumbnail_url"), // Image for notification
  latitude: decimal("latitude", { precision: 10, scale: 8 }), // For location-based notifications
  longitude: decimal("longitude", { precision: 11, scale: 8 }), // For location-based notifications
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User notification preferences table
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  allNotifications: boolean("all_notifications").default(true),
  videoLikes: boolean("video_likes").default(true),
  videoComments: boolean("video_comments").default(true),
  videoCommentVideos: boolean("video_comment_videos").default(true),
  comments: boolean("comments").default(true),
  newCollectors: boolean("new_collectors").default(true),
  groupInvitations: boolean("group_invitations").default(true),
  gemNearby: boolean("gem_nearby").default(true),
  // Content moderation notifications cannot be disabled
  contentFlaggedUser: boolean("content_flagged_user").default(true),
  contentFlaggedAi: boolean("content_flagged_ai").default(true),
  contentDeletedComment: boolean("content_deleted_comment").default(true),
  contentDeletedVideoComment: boolean("content_deleted_video_comment").default(true),
  contentDeletedThreadMessage: boolean("content_deleted_thread_message").default(true),
  contentDeletedThreadVideo: boolean("content_deleted_thread_video").default(true),
  threadMessageFlagged: boolean("thread_message_flagged").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  // Individual push notification preferences for each type
  pushVideoLikes: boolean("push_video_likes").default(true),
  pushVideoComments: boolean("push_video_comments").default(true),
  pushVideoCommentVideos: boolean("push_video_comment_videos").default(true),
  pushComments: boolean("push_comments").default(true),
  pushNewCollectors: boolean("push_new_collectors").default(true),
  pushGroupInvitations: boolean("push_group_invitations").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moderatorAccess = pgTable("moderator_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // null if they don't have account yet
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status").default("pending"), // pending, active, revoked
  createdAt: timestamp("created_at").defaultNow(),
  activatedAt: timestamp("activated_at"),
});

// Strike system tables
export const userStrikes = pgTable("user_strikes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentStrikes: integer("current_strikes").default(0), // 0, 1, 2, 3+
  totalViolations: integer("total_violations").default(0), // Total lifetime violations
  accountStatus: varchar("account_status").default("active"), // active, warning, suspended, banned
  suspensionEndDate: timestamp("suspension_end_date"), // When suspension ends (null if not suspended)
  lastViolationDate: timestamp("last_violation_date"), // Last time they got a strike
  bannedDate: timestamp("banned_date"), // When account was permanently banned
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const violations = pgTable("violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentType: varchar("content_type").notNull(), // video, comment, video_comment
  contentId: text("content_id").notNull(), // ID of the violated content
  violationType: varchar("violation_type").notNull(), // hate_speech, harassment, violence, spam, etc.
  description: text("description"), // Human readable description of violation
  strikeNumber: integer("strike_number").notNull(), // 1st, 2nd, 3rd strike
  consequence: varchar("consequence").notNull(), // warning, suspension, ban
  suspensionDays: integer("suspension_days"), // How many days suspended (if applicable)
  moderatorId: varchar("moderator_id").notNull().references(() => users.id, { onDelete: "set null" }),
  moderatorNotes: text("moderator_notes"), // Internal notes from moderator
  appealStatus: varchar("appeal_status").default("none"), // none, pending, approved, rejected
  appealSubmittedAt: timestamp("appeal_submitted_at"),
  appealResolvedAt: timestamp("appeal_resolved_at"),
  appealDecision: text("appeal_decision"), // Reason for appeal decision
  createdAt: timestamp("created_at").defaultNow(),
});

// Treasure Chest System
export const treasureChests = pgTable("treasure_chests", {
  id: uuid("id").primaryKey().defaultRandom(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  coinReward: integer("coin_reward").notNull(), // 5, 10, 20, 40, 100
  difficulty: varchar("difficulty").notNull(), // easy, medium, hard, very_hard, extreme
  spawnedAt: timestamp("spawned_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // When chest disappears
  isActive: boolean("is_active").default(true),
  isCollected: boolean("is_collected").default(false),
  collectedBy: varchar("collected_by").references(() => users.id, { onDelete: "set null" }),
  collectedAt: timestamp("collected_at"),
  nearestVideoId: uuid("nearest_video_id").references(() => videos.id, { onDelete: "cascade" }), // Video it spawned near
  nearestVideoDistance: decimal("nearest_video_distance", { precision: 8, scale: 2 }), // Distance to nearest video in miles
  createdAt: timestamp("created_at").defaultNow(),
});

export const treasureChestCollections = pgTable("treasure_chest_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chestId: uuid("chest_id").notNull().references(() => treasureChests.id, { onDelete: "cascade" }),
  coinReward: integer("coin_reward").notNull(),
  collectionLatitude: decimal("collection_latitude", { precision: 10, scale: 8 }).notNull(),
  collectionLongitude: decimal("collection_longitude", { precision: 11, scale: 8 }).notNull(),
  distanceFromChest: decimal("distance_from_chest", { precision: 8, scale: 2 }).notNull(), // In feet
  collectedAt: timestamp("collected_at").defaultNow(),
});

export const treasureChestLocations = pgTable("treasure_chest_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  lastSpawnedAt: timestamp("last_spawned_at"),
  spawnCount: integer("spawn_count").default(0), // How many times spawned here
  dailySpawnCount: integer("daily_spawn_count").default(0), // Spawns today
  lastSpawnDate: varchar("last_spawn_date"), // YYYY-MM-DD format
  nearestVideoId: uuid("nearest_video_id").references(() => videos.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mystery boxes table - similar to treasure chests but with multi-reward system
export const mysteryBoxes = pgTable("mystery_boxes", {
  id: uuid("id").primaryKey().defaultRandom(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  coinReward: integer("coin_reward").notNull(), // 1-10 coins
  xpReward: integer("xp_reward").notNull(), // 1-20 XP
  lanternReward: integer("lantern_reward").notNull(), // 1-10 lanterns
  rarity: varchar("rarity").notNull(), // common, rare, epic, legendary
  spawnedAt: timestamp("spawned_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Shorter availability than treasure chests
  isActive: boolean("is_active").default(true),
  isCollected: boolean("is_collected").default(false),
  collectedBy: varchar("collected_by").references(() => users.id, { onDelete: "set null" }),
  collectedAt: timestamp("collected_at"),
  nearestVideoId: uuid("nearest_video_id").references(() => videos.id, { onDelete: "cascade" }),
  nearestVideoDistance: decimal("nearest_video_distance", { precision: 8, scale: 2 }), // Distance to nearest video in miles
  createdAt: timestamp("created_at").defaultNow(),
});

export const mysteryBoxCollections = pgTable("mystery_box_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  boxId: uuid("box_id").notNull().references(() => mysteryBoxes.id, { onDelete: "cascade" }),
  coinReward: integer("coin_reward").notNull(),
  xpReward: integer("xp_reward").notNull(),
  lanternReward: integer("lantern_reward").notNull(),
  rarity: varchar("rarity").notNull(),
  collectionLatitude: decimal("collection_latitude", { precision: 10, scale: 8 }).notNull(),
  collectionLongitude: decimal("collection_longitude", { precision: 11, scale: 8 }).notNull(),
  distanceFromBox: decimal("distance_from_box", { precision: 8, scale: 2 }).notNull(), // In feet
  collectedAt: timestamp("collected_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  videos: many(videos),
  videoLikes: many(videoLikes),
  videoComments: many(videoComments),
  ownedGroups: many(groups),
  groupMemberships: many(groupMemberships),
  followers: many(userFollows, { relationName: "following" }),
  following: many(userFollows, { relationName: "follower" }),
  videoCollections: many(videoCollections),
  createdQuests: many(quests),
  questParticipations: many(questParticipants),
  questMessages: many(questMessages),
  payments: many(payments),
  strikeRecord: one(userStrikes),
  violations: many(violations),
  treasureChestCollections: many(treasureChestCollections),
  collectedTreasureChests: many(treasureChests),
}));

// Dragons table - cooperative challenge system
export const dragons = pgTable("dragons", {
  id: uuid("id").primaryKey().defaultRandom(),
  latitude: varchar("latitude").notNull(),
  longitude: varchar("longitude").notNull(),
  coinReward: integer("coin_reward").notNull(), // 100 or 200 coins
  totalHealth: integer("total_health").notNull(), // Same as coin reward (100 or 200)
  currentHealth: integer("current_health").notNull(), // Decreases with each video watch
  requiredVideosInRadius: integer("required_videos_in_radius").notNull().default(50), // Minimum 50 videos
  radiusMeters: decimal("radius_meters", { precision: 8, scale: 2 }).notNull().default("60.96"), // 200ft in meters
  spawnedAt: timestamp("spawned_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 24 hours from spawn
  isDefeated: boolean("is_defeated").default(false),
  defeatedAt: timestamp("defeated_at"),
  nearestVideoIds: jsonb("nearest_video_ids"), // Array of video IDs within radius
  videoCount: integer("video_count").notNull(), // Actual count of videos in radius
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dragon attacks table - tracks user contributions to dragon defeat
export const dragonAttacks = pgTable("dragon_attacks", {
  id: serial("id").primaryKey(),
  dragonId: varchar("dragon_id").notNull().references(() => dragons.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  damageDealt: integer("damage_dealt").notNull().default(1), // Each video watch = 1 damage
  attackedAt: timestamp("attacked_at").defaultNow(),
});

// Dragon rewards table - tracks coin distribution when dragon is defeated
export const dragonRewards = pgTable("dragon_rewards", {
  id: serial("id").primaryKey(),
  dragonId: varchar("dragon_id").notNull().references(() => dragons.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coinsEarned: integer("coins_earned").notNull(),
  damageContribution: integer("damage_contribution").notNull(), // How much damage this user dealt
  totalDamageDealt: integer("total_damage_dealt").notNull(), // Total damage across all users
  rewardedAt: timestamp("rewarded_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, { fields: [videos.userId], references: [users.id] }),
  likes: many(videoLikes),
  comments: many(videoComments),
  collections: many(videoCollections),
}));

export const videoLikesRelations = relations(videoLikes, ({ one }) => ({
  user: one(users, { fields: [videoLikes.userId], references: [users.id] }),
  video: one(videos, { fields: [videoLikes.videoId], references: [videos.id] }),
}));

export const videoCommentsRelations = relations(videoComments, ({ one }) => ({
  user: one(users, { fields: [videoComments.userId], references: [users.id] }),
  video: one(videos, { fields: [videoComments.videoId], references: [videos.id] }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, { fields: [groups.createdBy], references: [users.id] }),
  memberships: many(groupMemberships),
  messages: many(groupMessages),
}));

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  user: one(users, { fields: [groupMemberships.userId], references: [users.id] }),
  group: one(groups, { fields: [groupMemberships.groupId], references: [groups.id] }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, { fields: [userFollows.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [userFollows.followingId], references: [users.id], relationName: "following" }),
}));

export const videoCollectionsRelations = relations(videoCollections, ({ one }) => ({
  user: one(users, { fields: [videoCollections.userId], references: [users.id] }),
  video: one(videos, { fields: [videoCollections.videoId], references: [videos.id] }),
}));

export const videoWatchesRelations = relations(videoWatches, ({ one }) => ({
  user: one(users, { fields: [videoWatches.userId], references: [users.id] }),
  video: one(videos, { fields: [videoWatches.videoId], references: [videos.id] }),
}));

export const videoPurchasesRelations = relations(videoPurchases, ({ one }) => ({
  user: one(users, { fields: [videoPurchases.userId], references: [users.id] }),
  video: one(videos, { fields: [videoPurchases.videoId], references: [videos.id] }),
}));

export const groupThreadsRelations = relations(groupThreads, ({ one, many }) => ({
  group: one(groups, { fields: [groupThreads.groupId], references: [groups.id] }),
  creator: one(users, { fields: [groupThreads.createdBy], references: [users.id] }),
  messages: many(threadMessages),
}));

export const threadMessagesRelations = relations(threadMessages, ({ one }) => ({
  thread: one(groupThreads, { fields: [threadMessages.threadId], references: [groupThreads.id] }),
  user: one(users, { fields: [threadMessages.userId], references: [users.id] }),
}));

export const groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  user: one(users, { fields: [groupMessages.userId], references: [users.id] }),
  group: one(groups, { fields: [groupMessages.groupId], references: [groups.id] }),
}));

export const userFollowNotificationsRelations = relations(userFollowNotifications, ({ one }) => ({
  follower: one(users, { fields: [userFollowNotifications.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [userFollowNotifications.followingId], references: [users.id], relationName: "following" }),
}));

export const questsRelations = relations(quests, ({ one, many }) => ({
  creator: one(users, { fields: [quests.creatorId], references: [users.id] }),
  participants: many(questParticipants),
  messages: many(questMessages),
}));

export const questParticipantsRelations = relations(questParticipants, ({ one }) => ({
  quest: one(quests, { fields: [questParticipants.questId], references: [quests.id] }),
  user: one(users, { fields: [questParticipants.userId], references: [users.id] }),
  video: one(videos, { fields: [questParticipants.videoId], references: [videos.id] }),
}));

export const questMessagesRelations = relations(questMessages, ({ one }) => ({
  quest: one(quests, { fields: [questMessages.questId], references: [quests.id] }),
  user: one(users, { fields: [questMessages.userId], references: [users.id] }),
}));

export const videoPlaybackErrorsRelations = relations(videoPlaybackErrors, ({ one }) => ({
  video: one(videos, { fields: [videoPlaybackErrors.videoId], references: [videos.id] }),
  user: one(users, { fields: [videoPlaybackErrors.userId], references: [users.id] }),
}));

export const userStrikesRelations = relations(userStrikes, ({ one, many }) => ({
  user: one(users, { fields: [userStrikes.userId], references: [users.id] }),
  violations: many(violations),
}));

export const violationsRelations = relations(violations, ({ one }) => ({
  user: one(users, { fields: [violations.userId], references: [users.id] }),
  moderator: one(users, { fields: [violations.moderatorId], references: [users.id] }),
  userStrike: one(userStrikes, { fields: [violations.userId], references: [userStrikes.userId] }),
}));

export const treasureChestsRelations = relations(treasureChests, ({ one }) => ({
  collector: one(users, { fields: [treasureChests.collectedBy], references: [users.id] }),
  nearestVideo: one(videos, { fields: [treasureChests.nearestVideoId], references: [videos.id] }),
}));

export const treasureChestCollectionsRelations = relations(treasureChestCollections, ({ one }) => ({
  user: one(users, { fields: [treasureChestCollections.userId], references: [users.id] }),
  chest: one(treasureChests, { fields: [treasureChestCollections.chestId], references: [treasureChests.id] }),
}));

export const treasureChestLocationsRelations = relations(treasureChestLocations, ({ one }) => ({
  nearestVideo: one(videos, { fields: [treasureChestLocations.nearestVideoId], references: [videos.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  relatedUser: one(users, { fields: [notifications.relatedUserId], references: [users.id] }),
}));

// Insert schemas

export const insertUserSchema = z.object({
  id: z.string(), // required

  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  readyPlayerMeAvatarUrl: z.string().optional(),
  username: z.string().optional(),
  bio: z.string().optional(),

  gemCoins: z.number().default(0),
  lanterns: z.number().default(5),
  currentXP: z.number().default(0),
  currentLevel: z.number().default(0),

  stripeCustomerId: z.string().optional(),
  role: z.string().default("user"),
  strikes: z.number().default(0),

  communityGuidelinesAcceptedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});



export const insertVideoSchema = z.object({
  id: z.string().uuid().optional(), // defaultRandom
  userId: z.string(), // notNull
  title: z.string().max(255), // notNull
  description: z.string().optional(), // nullable
  videoUrl: z.string(), // notNull
  thumbnailUrl: z.string().optional(), // nullable
  category: z.string().max(50), // notNull
  groupName: z.string().max(100).optional(), // nullable
  visibility: z.string().max(50).default("everyone"), // default
  groupId: z.string().uuid().optional(), // nullable
  questId: z.string().uuid().optional(), // nullable
  latitude: z.number().optional(), // nullable decimal
  longitude: z.number().optional(), // nullable decimal
  duration: z.number().optional(), // nullable decimal
  views: z.number().default(0), // default
  likes: z.number().default(0), // default
  bunnyVideoId: z.string().optional(), // nullable
  processingStatus: z.string().max(30).default("processing"), // default
  playbackStatus: z.string().max(30).default("published"), // default
  moderationResults: z.string().optional(), // nullable
  flaggedReason: z.string().optional(), // nullable
  gcsProcessingUrl: z.string().optional(), // nullable
  bunnyStoragePath: z.string().optional(), // nullable
  bunnyReviewVideoId: z.string().optional(), // nullable
  transcriptionText: z.string().optional(), // nullable
  audioModerationStatus: z.string().max(20).default("pending"), // default
  audioFlagReason: z.string().optional(), // nullable
  extractedKeywords: z.any().optional(), // jsonb (can use z.array(z.string()) if structure is known)
  postTiming: z.string().max(20).default("now"), // default
  customDateTime: z.date().optional(), // nullable timestamp
  eventStartDate: z.string().optional(), // nullable
  eventStartTime: z.string().optional(), // nullable
  eventEndDate: z.string().optional(), // nullable
  eventEndTime: z.string().optional(), // nullable
  isActive: z.boolean().default(true), // default
  createdAt: z.date().optional(), // defaultNow
  updatedAt: z.date().optional(), // defaultNow
});



export const insertGroupSchema = z.object({
  id: z.string().uuid().optional(), // defaultRandom
  name: z.string().max(100),
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
  createdBy: z.string(), // foreign key to users.id
  isPublic: z.boolean().default(true),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  createdAt: z.date().optional(), // defaultNow
  updatedAt: z.date().optional(), // defaultNow
});

export const insertModerationDecisionSchema = z.object({
  id: z.string().uuid().optional(), // defaultRandom
  videoId: z.string().uuid(), // required
  moderatorId: z.string().uuid().optional(), // nullable foreign key (AI decisions allowed)
  decision: z.string(), // approve, reject
  reason: z.string().optional(),
  decisionType: z.string().optional(), // ai_moderation, human_review, appeal
  createdAt: z.date().optional(), // defaultNow
});


export const insertVideoLikeSchema = z.object({
  id: z.number().optional(), // serial, auto-generated
  userId: z.string(), // required
  videoId: z.string().uuid(), // required
  createdAt: z.date().optional(), // defaultNow
});



export const insertVideoCommentSchema = z.object({
  id: z.number().optional(), // serial, optional if handled by DB
  userId: z.string(),
  videoId: z.string().uuid(),
  comment: z.string().optional(),
  commentVideoId: z.string().uuid().optional(),
  commentVideoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  bunnyVideoId: z.string().optional(),
  commentType: z.string().max(10).default("text"),
  processingStatus: z.string().max(30).default("approved"),
  flaggedReason: z.string().optional(),
  moderationResults: z.string().optional(),
  audioFlagReason: z.string().optional(),
  duration: z.number().optional(), // nullable decimal
  createdAt: z.date().optional(), // defaultNow
  updatedAt: z.date().optional(), // defaultNow
});


export const insertGroupMembershipSchema = z.object({
  id: z.number().optional(), // serial, auto-incremented
  userId: z.string(), // required
  groupId: z.string().uuid(), // required
  role: z.string().max(20).default("member"), // default = "member"
  joinedAt: z.date().optional(), // defaultNow
});

export const insertUserFollowSchema = z.object({
  id: z.number().optional(), // serial, auto-incremented
  followerId: z.string(), // required
  followingId: z.string(), // required
  createdAt: z.date().optional(), // defaultNow
});

export const insertVideoCollectionSchema = z.object({
  id: z.number().optional(), // serial, auto-incremented
  userId: z.string(), // required
  videoId: z.string().uuid(), // required
  createdAt: z.date().optional(), // defaultNow
});

export const insertGroupThreadSchema = z.object({
  id: z.string().uuid().optional(),
  groupId: z.string().uuid(),
  title: z.string().max(255),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});


export const insertThreadMessageSchema = z.object({
  id: z.number().optional(),
  threadId: z.string().uuid(),
  userId: z.string(),
  message: z.string().optional(),
  messageType: z.string().max(10).default("text"),
  videoUrl: z.string().optional(),
  bunnyVideoId: z.string().optional(),
  processingStatus: z.string().max(30).default("approved"),
  flaggedReason: z.string().optional(),
  moderationResults: z.string().optional(),
  audioFlagReason: z.string().optional(),
  duration: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});


export const insertGroupMessageSchema = z.object({
  id: z.number().optional(),
  groupId: z.string().uuid(),
  userId: z.string(),
  message: z.string(),
  createdAt: z.date().optional(),
});


export const insertVideoPurchaseSchema = z.object({
  id: z.number().optional(),
  userId: z.string(),
  videoId: z.string().uuid(),
  purchasedAt: z.date().optional(),
});


export const insertVideoActivationSchema = z.object({
  id: z.number().optional(),
  userId: z.string(),
  videoId: z.string().uuid(),
  activatedAt: z.date().optional(),
  activationLatitude: z.number().optional(),
  activationLongitude: z.number().optional(),
});



export const insertQuestSchema = z.object({
  id: z.string().uuid().optional(), // defaultRandom
  creatorId: z.string(), // required
  title: z.string().max(255),
  description: z.string(),
  imageUrl: z.string().optional(),
  latitude: z.number(), // required decimal
  longitude: z.number(), // required decimal
  radiusInFeet: z.number(), // required
  requiredParticipants: z.number(), // required
  rewardPerParticipant: z.number(), // required
  totalReward: z.number(), // required
  startDate: z.date(), // required
  endDate: z.date(), // required
  status: z.string().max(20).default("active"), // default
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(), // defaultNow
  updatedAt: z.date().optional(), // defaultNow
});


export const insertQuestParticipantSchema = z.object({
  id: z.string().uuid().optional(),
  questId: z.string().uuid(),
  userId: z.string(),
  joinedAt: z.date().optional(),
  hasPosted: z.boolean().default(false),
  videoId: z.string().uuid().optional(),
  completedAt: z.date().optional(),
  rewardPaid: z.boolean().default(false),
});


export const insertQuestMessageSchema = z.object({
  id: z.string().uuid().optional(),
  questId: z.string().uuid(),
  userId: z.string(),
  message: z.string(),
  createdAt: z.date().optional(),
});


export const insertPaymentSchema = z.object({
  id: z.string().uuid().optional(),

  userId: z.string(),
  stripePaymentIntentId: z.string(),
  amount: z.number(),
  coinAmount: z.number(),

  status: z.string().max(20).default("pending"),
  currency: z.string().max(3).default("usd"),

  createdAt: z.date().optional(),
  completedAt: z.date().optional(),
});

export const insertUserStrikeSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string(),

  currentStrikes: z.number().default(0),
  totalViolations: z.number().default(0),
  accountStatus: z.string().default("active"),

  suspensionEndDate: z.date().optional(),
  lastViolationDate: z.date().optional(),
  bannedDate: z.date().optional(),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertViolationSchema = z.object({
  userId: z.string(),
  contentType: z.string(),
  contentId: z.string(),
  violationType: z.string(),
  description: z.string(),
  strikeNumber: z.number().int(),
  consequence: z.string(),
  suspensionDays: z.number().int().optional(),
  moderatorId: z.string(),
  moderatorNotes: z.string(),
  appealStatus: z.string(),
  appealSubmittedAt: z.date().optional(),
  appealResolvedAt: z.date().optional(),
  appealDecision: z.string(),
  createdAt: z.date().optional(),
});



export const insertVideoPlaybackErrorSchema = z.object({
  id: z.string().uuid().optional(),
  videoId: z.string().uuid(),
  userId: z.string().optional(),
  videoUrl: z.string(),
  errorCode: z.string().max(50).optional(),
  errorMessage: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date().optional(),
  resolved: z.boolean().default(false),
});


export const insertNotificationSchema = z.object({
  userId: z.string(), // required
  type: z.string(), // required
  title: z.string(), // required
  message: z.string(), // required

  actionUrl: z.string().optional(),
  relatedUserId: z.string().optional(),
  relatedVideoId: z.string().uuid().optional(),
  relatedGroupId: z.string().uuid().optional(),
  relatedThreadId: z.string().uuid().optional(),
  relatedContentId: z.string().optional(),
  relatedContentType: z.string().optional(),
  thumbnailUrl: z.string().optional(),

  latitude: z.number().optional(),
  longitude: z.number().optional(),

  isRead: z.boolean().default(false),
  createdAt: z.date().optional(),
});


export const insertUserNotificationPreferencesSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string(),

  // Global toggles
  allNotifications: z.boolean().default(true),
  videoLikes: z.boolean().default(true),
  videoComments: z.boolean().default(true),
  videoCommentVideos: z.boolean().default(true),
  comments: z.boolean().default(true),
  newCollectors: z.boolean().default(true),
  groupInvitations: z.boolean().default(true),
  gemNearby: z.boolean().default(true),

  // Moderation-related (non-disableable, but still stored)
  contentFlaggedUser: z.boolean().default(true),
  contentFlaggedAi: z.boolean().default(true),
  contentDeletedComment: z.boolean().default(true),
  contentDeletedVideoComment: z.boolean().default(true),
  contentDeletedThreadMessage: z.boolean().default(true),
  contentDeletedThreadVideo: z.boolean().default(true),
  threadMessageFlagged: z.boolean().default(true),

  // Push master toggle
  pushNotifications: z.boolean().default(false),

  // Push-type-specific toggles
  pushVideoLikes: z.boolean().default(true),
  pushVideoComments: z.boolean().default(true),
  pushVideoCommentVideos: z.boolean().default(true),
  pushComments: z.boolean().default(true),
  pushNewCollectors: z.boolean().default(true),
  pushGroupInvitations: z.boolean().default(true),

  // Metadata
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Coin earning schemas
export const insertDailyLoginSchema = z.object({
  id: z.string().uuid().optional(), // defaultRandom
  userId: z.string(),
  loginDate: z.date(),
  coinsAwarded: z.number().default(1),
  createdAt: z.date().optional(),
});


export const insertUserLocationHistorySchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  altitude: z.number().optional(),
  movementType: z.string().max(20).optional(),
  isValidForRewards: z.boolean().default(true),
  timestamp: z.date().optional(),
});

export const insertDistanceRewardSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string(),
  totalDistance: z.number(),
  rewardType: z.string().max(20),
  coinsAwarded: z.number(),
  dateEarned: z.date().optional(),
  sessionStartTime: z.date(),
  sessionEndTime: z.date(),
});


export const insertActivitySessionSchema = z.object({
  userId: z.string().min(1),
  sessionStart: z.date(),
  sessionEnd: z.date().nullable().optional(),
  totalDistance: z.string(), // decimals come back as strings from pg
  avgSpeed: z.string(),
  movementType: z.string().max(20),
  coinsEarned: z.number().int(),
  isActive: z.boolean(),
  lastLocationUpdate: z.date(),
});



// Treasure chest schemas
export const insertTreasureChestSchema = z.object({
  id: z.string().uuid().optional(),
  latitude: z.number(),
  longitude: z.number(),
  coinReward: z.number(),
  difficulty: z.string(),
  spawnedAt: z.date().optional(),
  expiresAt: z.date(),
  isActive: z.boolean().default(true),
  isCollected: z.boolean().default(false),
  collectedBy: z.string().optional(),
  collectedAt: z.date().optional(),
  nearestVideoId: z.string().uuid().optional(),
  nearestVideoDistance: z.number().optional(),
  createdAt: z.date().optional(),
});


export const insertTreasureChestCollectionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string(),
  chestId: z.string().uuid(),
  coinReward: z.number(),
  collectionLatitude: z.number(),
  collectionLongitude: z.number(),
  distanceFromChest: z.number(),
  collectedAt: z.date().optional(),
});


export const insertTreasureChestLocationSchema = z.object({
  id: z.string().uuid().optional(),
  latitude: z.number(),
  longitude: z.number(),
  lastSpawnedAt: z.date().optional(),
  spawnCount: z.number().default(0),
  dailySpawnCount: z.number().default(0),
  lastSpawnDate: z.string().optional(),
  nearestVideoId: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});


// Dragon schemas
export const insertDragonSchema = z.object({
  latitude: z.string().min(1),
  longitude: z.string().min(1),
  coinReward: z.number().int(),
  totalHealth: z.number().int(),
  currentHealth: z.number().int(),
  requiredVideosInRadius: z.number().int(),
  radiusMeters: z.string(),
  spawnedAt: z.date().optional(),
  expiresAt: z.date(),
  isDefeated: z.boolean(),
  defeatedAt: z.date().nullable().optional(),
  nearestVideoIds: z.array(z.string()).optional(),
  videoCount: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.date().optional(),
});


export const insertDragonAttackSchema = z.object({
  dragonId: z.string(),
  userId: z.string(),
  videoId: z.string(),
  damageDealt: z.number().int(),
  attackedAt: z.date().optional(),
});


export const insertDragonRewardSchema = z.object({
  dragonId: z.string(),
  userId: z.string(),
  coinsEarned: z.number().int(),
  damageContribution: z.number().int(),
  totalDamageDealt: z.number().int(),
  rewardedAt: z.date().optional(),
});

// Moderation types
export const insertModerationFlagSchema = z.object({
  id: z.string().uuid().optional(),
  contentType: z.string(),
  contentId: z.string(),
  flaggedByUserId: z.string().optional(),
  flaggedByAI: z.boolean().default(false),
  reason: z.string().optional(),
  flagReason: z.string().optional(),
  customReason: z.string().optional(),
  status: z.string().default("pending"),
  moderatorId: z.string().optional(),
  moderatorDecision: z.string().optional(),
  isAppeal: z.boolean().default(false),
  contentSnapshot: z.any().optional(),
  contextUrl: z.string().optional(),
  contentHidden: z.boolean().default(false),
  createdAt: z.date().optional(),
  decidedAt: z.date().optional(),
});


export const insertModeratorAccessSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string(),
  userId: z.string().optional(),
  invitedBy: z.string(),
  status: z.string().default("pending"),
  createdAt: z.date().optional(),
  activatedAt: z.date().optional(),
});




// Types
export type DBUserInsert = typeof users.$inferInsert;
export type DBUserRow =  typeof users.$inferSelect;

export type DBVideoInsert = typeof videos.$inferInsert;
export type DBVideoRow = typeof videos.$inferSelect;

export type DBGroupInsert = typeof groups.$inferInsert;
export type DBGroupRow = typeof groups.$inferSelect;

export type DBVideoLikeInsert = typeof videoLikes.$inferInsert;
export type DBVideoLikeRow = typeof videoLikes.$inferSelect;

export type DBVideoCommentInsert = typeof videoComments.$inferInsert;
export type DBVideoCommentRow = typeof videoComments.$inferSelect;

export type DBGroupMembershipInsert = typeof groupMemberships.$inferInsert;
export type DBGroupMembershipRow = typeof groupMemberships.$inferSelect;

export type DBUserFollowInsert = typeof userFollows.$inferInsert;
export type DBUserFollowRow = typeof userFollows.$inferSelect;

export type DBVideoCollectionInsert = typeof videoCollections.$inferInsert;
export type DBVideoCollectionRow = typeof videoCollections.$inferSelect;

export type DBGroupThreadInsert = typeof groupThreads.$inferInsert;
export type DBGroupThreadRow = typeof groupThreads.$inferSelect;

export type DBThreadMessageInsert = typeof threadMessages.$inferInsert;
export type DBThreadMessageRow = typeof threadMessages.$inferSelect;

export type DBGroupMessageInsert = typeof groupMessages.$inferInsert;
export type DBGroupMessageRow = typeof groupMessages.$inferSelect;

export type DBVideoPurchaseInsert = typeof videoPurchases.$inferInsert;
export type DBVideoPurchaseRow = typeof videoPurchases.$inferSelect;

export type DBVideoActivationInsert = typeof videoActivations.$inferInsert;
export type DBVideoActivationRow = typeof videoActivations.$inferSelect;

export type DBQuestInsert = typeof quests.$inferInsert;
export type DBQuestRow = typeof quests.$inferSelect;

export type DBQuestParticipantInsert = typeof questParticipants.$inferInsert;
export type DBQuestParticipantRow = typeof questParticipants.$inferSelect;

export type DBQuestMessageInsert = typeof questMessages.$inferInsert;
export type DBQuestMessageRow = typeof questMessages.$inferSelect;

// Treasure chest types
export type DBTreasureChestInsert = typeof treasureChests.$inferInsert;
export type DBTreasureChestRow = typeof treasureChests.$inferSelect;

export type DBTreasureChestCollectionInsert = typeof treasureChestCollections.$inferInsert;
export type DBTreasureChestCollectionRow = typeof treasureChestCollections.$inferSelect;

export type DBTreasureChestLocationInsert = typeof treasureChestLocations.$inferInsert;
export type DBTreasureChestLocationRow = typeof treasureChestLocations.$inferSelect;

export type DBModerationFlagInsert = typeof moderationFlags.$inferInsert;
export type DBModerationFlagRow = typeof moderationFlags.$inferSelect;

export type DBModeratorAccessInsert = typeof moderatorAccess.$inferInsert;
export type DBModeratorAccessRow = typeof moderatorAccess.$inferSelect;

export type DBUserStrikeInsert = typeof userStrikes.$inferInsert;
export type DBUserStrikeRow = typeof userStrikes.$inferSelect;

export type DBNotificationInsert = typeof notifications.$inferInsert;
export type DBNotificationRow = typeof notifications.$inferSelect;

export type DBUserNotificationPreferencesInsert = typeof userNotificationPreferences.$inferInsert;
export type DBUserNotificationPreferencesRow = typeof userNotificationPreferences.$inferSelect;

// Coin earning types
export type DBDailyLoginInsert = typeof dailyLogins.$inferInsert;
export type DBDailyLoginRow = typeof dailyLogins.$inferSelect;

export type DBUserLocationHistoryInsert = typeof userLocationHistory.$inferInsert;
export type DBUserLocationHistoryRow = typeof userLocationHistory.$inferSelect;

export type DBDistanceRewardInsert = typeof distanceRewards.$inferInsert;
export type DBDistanceRewardRow = typeof distanceRewards.$inferSelect;

export type DBActivitySessionInsert = typeof activitySessions.$inferInsert;
export type DBActivitySessionRow = typeof activitySessions.$inferSelect;

// Dragon types
export type DBDragonInsert = typeof dragons.$inferInsert;
export type DBDragonRow = typeof dragons.$inferSelect;

export type DBDragonAttackInsert = typeof dragonAttacks.$inferInsert;
export type DBDragonAttackRow = typeof dragonAttacks.$inferSelect;

export type DBDragonRewardInsert = typeof dragonRewards.$inferInsert;
export type DBDragonRewardRow = typeof dragonRewards.$inferSelect;

export type DBViolationInsert = typeof violations.$inferInsert;
export type DBViolationRow = typeof violations.$inferSelect;

export type DBModerationDecisionsInsert = typeof moderationDecisions.$inferInsert;
export type DBModerationDecisionsRow = typeof moderationDecisions.$inferSelect; 

// export type User = typeof users.$inferSelect;
// export type UserInsert = typeof users.$inferInsert;

// export type Notification = typeof notifications.$inferSelect;
// export type NotificationInsert = typeof notifications.$inferInsert;

// export type Quest = typeof quests.$inferSelect;
// export type QuestInsert = typeof quests.$inferInsert;



// import type {
// 	DBGroupInsert,
// 	DBGroupRow,
// 	DBVideoLikeInsert,
// 	DBVideoLikeRow,
// 	DBVideoCommentInsert,
// 	DBVideoCommentRow,
// 	DBGroupMembershipInsert,
// 	DBGroupMembershipRow,
// 	DBUserFollowInsert,
// 	DBUserFollowRow,
// 	DBVideoCollectionInsert,
// 	DBVideoCollectionRow,
// 	DBGroupThreadInsert,
// 	DBGroupThreadRow,
// 	DBThreadMessageInsert,
// 	DBThreadMessageRow,
// 	DBGroupMessageInsert,
// 	DBGroupMessageRow,
// 	DBVideoPurchaseInsert,
// 	DBVideoPurchaseRow,
// 	DBVideoActivationInsert,
// 	DBVideoActivationRow,
// 	DBQuestInsert,
// 	DBQuestRow,
// 	DBQuestParticipantInsert,
// 	DBQuestParticipantRow,
// 	DBQuestMessageInsert,
// 	DBQuestMessageRow,
// 	DBTreasureChestInsert,
// 	DBTreasureChestRow,
// 	DBTreasureChestCollectionInsert,
// 	DBTreasureChestCollectionRow,
// 	DBTreasureChestLocationInsert,
// 	DBTreasureChestLocationRow,
// 	DBModerationFlagInsert,
// 	DBModerationFlagRow,
// 	DBModeratorAccessInsert,
// 	DBModeratorAccessRow,
// 	DBUserStrikeInsert,
// 	DBUserStrikeRow,
// 	DBNotificationInsert,
// 	DBNotificationRow,
// 	DBUserNotificationPreferencesInsert,
// 	DBUserNotificationPreferencesRow,
// 	DBDailyLoginInsert,
// 	DBDailyLoginRow,
// 	DBUserLocationHistoryInsert,
// 	DBUserLocationHistoryRow,
// 	DBDistanceRewardInsert,
// 	DBDistanceRewardRow,
// 	DBActivitySessionInsert,
// 	DBActivitySessionRow,
// 	DBDragonInsert,
// 	DBDragonRow,
// 	DBDragonAttackInsert,
// 	DBDragonAttackRow,
// 	DBDragonRewardInsert,
// 	DBDragonRewardRow,
// 	DBViolationInsert,
// 	DBViolationRow
// } from "@/db/dbTypes";
