CREATE TYPE "public"."processing_status" AS ENUM('uploading', 'processing', 'pending_moderation', 'approved', 'rejected', 'failed', 'under_appeal', 'flagged_by_user', 'completed', 'rejected_by_ai', 'uploaded', 'pending');--> statement-breakpoint
CREATE TABLE "activity_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_start" timestamp NOT NULL,
	"session_end" timestamp,
	"total_distance" numeric(10, 2) DEFAULT '0',
	"avg_speed" numeric(8, 2),
	"movement_type" varchar(20),
	"coins_earned" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"last_location_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_logins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"login_date" timestamp NOT NULL,
	"coins_awarded" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "distance_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"total_distance" numeric(10, 2) NOT NULL,
	"reward_type" varchar(20) NOT NULL,
	"coins_awarded" integer NOT NULL,
	"date_earned" timestamp DEFAULT now(),
	"session_start_time" timestamp NOT NULL,
	"session_end_time" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dragon_attacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"dragon_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" uuid NOT NULL,
	"damage_dealt" integer DEFAULT 1 NOT NULL,
	"attacked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dragon_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"dragon_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"coins_earned" integer NOT NULL,
	"damage_contribution" integer NOT NULL,
	"total_damage_dealt" integer NOT NULL,
	"rewarded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dragons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latitude" varchar NOT NULL,
	"longitude" varchar NOT NULL,
	"coin_reward" integer NOT NULL,
	"total_health" integer NOT NULL,
	"current_health" integer NOT NULL,
	"required_videos_in_radius" integer DEFAULT 50 NOT NULL,
	"radius_meters" numeric(8, 2) DEFAULT '60.96' NOT NULL,
	"spawned_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"is_defeated" boolean DEFAULT false,
	"defeated_at" timestamp,
	"nearest_video_ids" jsonb,
	"video_count" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"group_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"cover_image_url" text,
	"created_by" varchar NOT NULL,
	"is_public" boolean DEFAULT true,
	"latitude" varchar,
	"longitude" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"moderator_id" varchar,
	"decision" varchar NOT NULL,
	"reason" text,
	"decision_type" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar NOT NULL,
	"content_id" text NOT NULL,
	"flagged_by_user_id" varchar,
	"flagged_by_ai" boolean DEFAULT false,
	"reason" text,
	"flag_reason" varchar,
	"custom_reason" text,
	"status" varchar DEFAULT 'pending',
	"moderator_id" varchar,
	"moderator_decision" text,
	"is_appeal" boolean DEFAULT false,
	"content_snapshot" jsonb,
	"context_url" text,
	"content_hidden" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"decided_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "moderator_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"user_id" varchar,
	"invited_by" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"activated_at" timestamp,
	CONSTRAINT "moderator_access_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "mystery_box_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"box_id" uuid NOT NULL,
	"coin_reward" integer NOT NULL,
	"xp_reward" integer NOT NULL,
	"lantern_reward" integer NOT NULL,
	"rarity" varchar NOT NULL,
	"collection_latitude" numeric(10, 8) NOT NULL,
	"collection_longitude" numeric(11, 8) NOT NULL,
	"distance_from_box" numeric(8, 2) NOT NULL,
	"collected_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mystery_boxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"coin_reward" integer NOT NULL,
	"xp_reward" integer NOT NULL,
	"lantern_reward" integer NOT NULL,
	"rarity" varchar NOT NULL,
	"spawned_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_collected" boolean DEFAULT false,
	"collected_by" varchar,
	"collected_at" timestamp,
	"nearest_video_id" uuid,
	"nearest_video_distance" numeric(8, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"related_user_id" varchar,
	"related_video_id" uuid,
	"related_group_id" uuid,
	"related_thread_id" uuid,
	"related_content_id" text,
	"related_content_type" varchar,
	"thumbnail_url" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"stripe_payment_intent_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"coin_amount" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "quest_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quest_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"has_posted" boolean DEFAULT false,
	"video_id" uuid,
	"completed_at" timestamp,
	"reward_paid" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"radius_in_feet" integer NOT NULL,
	"required_participants" integer NOT NULL,
	"reward_per_participant" integer NOT NULL,
	"total_reward" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text,
	"message_type" varchar(10) DEFAULT 'text',
	"video_url" text,
	"bunny_video_id" varchar,
	"processing_status" varchar(30) DEFAULT 'approved',
	"flagged_reason" text,
	"moderation_results" text,
	"audio_flag_reason" text,
	"duration" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "treasure_chest_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"chest_id" uuid NOT NULL,
	"coin_reward" integer NOT NULL,
	"collection_latitude" numeric(10, 8) NOT NULL,
	"collection_longitude" numeric(11, 8) NOT NULL,
	"distance_from_chest" numeric(8, 2) NOT NULL,
	"collected_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "treasure_chest_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"last_spawned_at" timestamp,
	"spawn_count" integer DEFAULT 0,
	"daily_spawn_count" integer DEFAULT 0,
	"last_spawn_date" varchar,
	"nearest_video_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "treasure_chests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"coin_reward" integer NOT NULL,
	"difficulty" varchar NOT NULL,
	"spawned_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_collected" boolean DEFAULT false,
	"collected_by" varchar,
	"collected_at" timestamp,
	"nearest_video_id" uuid,
	"nearest_video_distance" numeric(8, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_follow_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" varchar NOT NULL,
	"following_id" varchar NOT NULL,
	"notifications_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" varchar NOT NULL,
	"following_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_location_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"accuracy" numeric(8, 2),
	"speed" numeric(8, 2),
	"heading" numeric(6, 2),
	"altitude" numeric(8, 2),
	"movement_type" varchar(20),
	"is_valid_for_rewards" boolean DEFAULT true,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"all_notifications" boolean DEFAULT true,
	"video_likes" boolean DEFAULT true,
	"video_comments" boolean DEFAULT true,
	"video_comment_videos" boolean DEFAULT true,
	"comments" boolean DEFAULT true,
	"new_collectors" boolean DEFAULT true,
	"group_invitations" boolean DEFAULT true,
	"gem_nearby" boolean DEFAULT true,
	"content_flagged_user" boolean DEFAULT true,
	"content_flagged_ai" boolean DEFAULT true,
	"content_deleted_comment" boolean DEFAULT true,
	"content_deleted_video_comment" boolean DEFAULT true,
	"content_deleted_thread_message" boolean DEFAULT true,
	"content_deleted_thread_video" boolean DEFAULT true,
	"thread_message_flagged" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT false,
	"push_video_likes" boolean DEFAULT true,
	"push_video_comments" boolean DEFAULT true,
	"push_video_comment_videos" boolean DEFAULT true,
	"push_comments" boolean DEFAULT true,
	"push_new_collectors" boolean DEFAULT true,
	"push_group_invitations" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_strikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"current_strikes" integer DEFAULT 0,
	"total_violations" integer DEFAULT 0,
	"account_status" varchar DEFAULT 'active',
	"suspension_end_date" timestamp,
	"last_violation_date" timestamp,
	"banned_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"ready_player_me_avatar_url" varchar,
	"username" varchar,
	"bio" text,
	"gem_coins" integer DEFAULT 0,
	"lanterns" integer DEFAULT 5,
	"current_xp" integer DEFAULT 0,
	"current_level" integer DEFAULT 0,
	"password_hash" varchar,
	"stripe_customer_id" varchar,
	"role" varchar DEFAULT 'user',
	"strikes" integer DEFAULT 0,
	"community_guidelines_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "video_activations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" uuid NOT NULL,
	"activated_at" timestamp DEFAULT now(),
	"activation_latitude" numeric(10, 8),
	"activation_longitude" numeric(11, 8)
);
--> statement-breakpoint
CREATE TABLE "video_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" uuid NOT NULL,
	"comment" text,
	"comment_video_id" uuid,
	"comment_video_url" text,
	"thumbnail_url" text,
	"bunny_video_id" varchar,
	"comment_type" varchar(10) DEFAULT 'text',
	"processing_status" varchar(30) DEFAULT 'approved',
	"flagged_reason" text,
	"moderation_results" text,
	"audio_flag_reason" text,
	"duration" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_playback_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"user_id" varchar,
	"video_url" text NOT NULL,
	"error_code" varchar(50),
	"error_message" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now(),
	"resolved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "video_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" uuid NOT NULL,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_watches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" uuid NOT NULL,
	"watched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"category" varchar(50) NOT NULL,
	"group_name" varchar(100),
	"visibility" varchar(50) DEFAULT 'everyone',
	"group_id" uuid,
	"quest_id" uuid,
	"latitude" numeric(10, 8),
	"description" text,
	"longitude" numeric(11, 8),
	"duration" numeric(8, 3),
	"views" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"bunny_video_id" varchar,
	"playback_status" varchar(30) DEFAULT 'published',
	"moderation_results" text,
	"flagged_reason" text,
	"gcs_processing_url" text,
	"bunny_storage_path" text,
	"bunny_review_video_id" varchar,
	"transcription_text" text,
	"original_filename" text,
	"processing_status" "processing_status" DEFAULT 'uploading' NOT NULL,
	"audio_moderation_status" varchar(20) DEFAULT 'pending',
	"audio_flag_reason" text,
	"extracted_keywords" jsonb,
	"post_timing" varchar(20) DEFAULT 'now',
	"custom_date_time" timestamp,
	"event_start_date" varchar,
	"event_start_time" varchar,
	"event_end_date" varchar,
	"event_end_time" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_type" varchar NOT NULL,
	"content_id" text NOT NULL,
	"violation_type" varchar NOT NULL,
	"description" text,
	"strike_number" integer NOT NULL,
	"consequence" varchar NOT NULL,
	"suspension_days" integer,
	"moderator_id" varchar NOT NULL,
	"moderator_notes" text,
	"appeal_status" varchar DEFAULT 'none',
	"appeal_submitted_at" timestamp,
	"appeal_resolved_at" timestamp,
	"appeal_decision" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logins" ADD CONSTRAINT "daily_logins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distance_rewards" ADD CONSTRAINT "distance_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dragon_attacks" ADD CONSTRAINT "dragon_attacks_dragon_id_dragons_id_fk" FOREIGN KEY ("dragon_id") REFERENCES "public"."dragons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dragon_attacks" ADD CONSTRAINT "dragon_attacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dragon_attacks" ADD CONSTRAINT "dragon_attacks_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dragon_rewards" ADD CONSTRAINT "dragon_rewards_dragon_id_dragons_id_fk" FOREIGN KEY ("dragon_id") REFERENCES "public"."dragons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dragon_rewards" ADD CONSTRAINT "dragon_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_threads" ADD CONSTRAINT "group_threads_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_threads" ADD CONSTRAINT "group_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_flagged_by_user_id_users_id_fk" FOREIGN KEY ("flagged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_access" ADD CONSTRAINT "moderator_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_access" ADD CONSTRAINT "moderator_access_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mystery_box_collections" ADD CONSTRAINT "mystery_box_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mystery_box_collections" ADD CONSTRAINT "mystery_box_collections_box_id_mystery_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."mystery_boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mystery_boxes" ADD CONSTRAINT "mystery_boxes_collected_by_users_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mystery_boxes" ADD CONSTRAINT "mystery_boxes_nearest_video_id_videos_id_fk" FOREIGN KEY ("nearest_video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_video_id_videos_id_fk" FOREIGN KEY ("related_video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_group_id_groups_id_fk" FOREIGN KEY ("related_group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_thread_id_group_threads_id_fk" FOREIGN KEY ("related_thread_id") REFERENCES "public"."group_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_messages" ADD CONSTRAINT "quest_messages_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_messages" ADD CONSTRAINT "quest_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_participants" ADD CONSTRAINT "quest_participants_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_participants" ADD CONSTRAINT "quest_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_participants" ADD CONSTRAINT "quest_participants_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_thread_id_group_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."group_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasure_chest_collections" ADD CONSTRAINT "treasure_chest_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasure_chest_collections" ADD CONSTRAINT "treasure_chest_collections_chest_id_treasure_chests_id_fk" FOREIGN KEY ("chest_id") REFERENCES "public"."treasure_chests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasure_chest_locations" ADD CONSTRAINT "treasure_chest_locations_nearest_video_id_videos_id_fk" FOREIGN KEY ("nearest_video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasure_chests" ADD CONSTRAINT "treasure_chests_collected_by_users_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasure_chests" ADD CONSTRAINT "treasure_chests_nearest_video_id_videos_id_fk" FOREIGN KEY ("nearest_video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow_notifications" ADD CONSTRAINT "user_follow_notifications_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow_notifications" ADD CONSTRAINT "user_follow_notifications_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_location_history" ADD CONSTRAINT "user_location_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_activations" ADD CONSTRAINT "video_activations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_activations" ADD CONSTRAINT "video_activations_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_collections" ADD CONSTRAINT "video_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_collections" ADD CONSTRAINT "video_collections_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_playback_errors" ADD CONSTRAINT "video_playback_errors_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_playback_errors" ADD CONSTRAINT "video_playback_errors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_purchases" ADD CONSTRAINT "video_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_purchases" ADD CONSTRAINT "video_purchases_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_watches" ADD CONSTRAINT "video_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_watches" ADD CONSTRAINT "video_watches_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");