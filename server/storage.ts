import * as schema from "../shared/schema.ts";
import type {
  DBUserInsert,
  DBUserRow,
  DBVideoInsert,
  DBVideoRow,
  DBVideoCommentInsert,
  DBGroupInsert,
  DBGroupRow,
  DBGroupMembershipInsert,
  DBGroupMessageInsert,
  DBGroupMessageRow,
  DBGroupThreadInsert,
  DBGroupThreadRow,
  DBThreadMessageInsert,
  DBThreadMessageRow,
  DBModerationFlagInsert,
  DBModerationFlagRow,
  DBModeratorAccessInsert,
  DBModeratorAccessRow
} from "../shared/schema.ts";


// then use T.DBUserInsert, T.DBUserRow, etc.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, or, like, ilike, inArray, desc, sql, count, exists, isNotNull, ne, getTableColumns } from "drizzle-orm";
import { calculateLevelFromXP, calculateXPRequiredForLevel, checkLevelUp } from "@shared/xpSystem.ts";

// destructure whichever tables you actually use
const {
  users,
  videos,
  groups,
  videoLikes,
  videoComments,
  groupMemberships,
  userFollows,
  videoCollections,
  videoWatches,
  videoPurchases,
  videoActivations,
  groupMessages,
  groupThreads,
  threadMessages,
  userFollowNotifications,
  moderationFlags,
  moderationDecisions,
  moderatorAccess,
  violations,
  userStrikes,
  quests,
  payments,
} = schema;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });


export interface IStorage {
  // User operations (required for Auth0)
  getUser(id: string): Promise<DBUserRow | undefined>;
  getUserByEmail(email: string): Promise<DBUserRow | undefined>;
  getUserByUsername(username: string): Promise<DBUserRow | undefined>;
  createUser(user: { id: string; email: string; firstName: string; lastName: string; profileImageUrl?: string | null }): Promise<DBUserRow>;
  upsertUser(user: DBUserInsert): Promise<DBUserRow>;
  updateUserGemCoins(userId: string, coins: number): Promise<void>;
  updateUserProfilePicture(userId: string, imageData: string): Promise<void>;
  updateUserProfileImage(userId: string, imageUrl: string): Promise<void>;
  updateUserProfile(userId: string, updates: { firstName?: string; lastName?: string; bio?: string; username?: string }): Promise<void>;
  updateUserStripeCustomer(userId: string, stripeCustomerId: string): Promise<void>;
  updateUser(userId: string, updates: { gemCoins?: number; [key: string]: any }): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  awardCoins(userId: string, amount: number): Promise<void>;
  updateUserLanterns(userId: string, lanternAmount: number): Promise<void>;
  recordPayment(payment: { userId: string; stripePaymentIntentId: string; amount: number; currency: string; coinAmount: number; packagePrice: string; status: string }): Promise<void>;
  getPaymentByStripeId(stripePaymentIntentId: string): Promise<any | undefined>;
  
  // XP System operations
  awardXP(userId: string, xpAmount: number, activity: string): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number }>;
  updateUserXP(userId: string, currentXP: number, currentLevel: number): Promise<void>;
  getUserXPData(userId: string): Promise<{ currentXP: number; currentLevel: number } | undefined>;

  // Video operations
  createVideo(video: DBVideoInsert): Promise<DBVideoRow>;
  getVideos(limit?: number, offset?: number): Promise<DBVideoRow[]>;
  getVideosByLocation(lat: number, lng: number, radius: number, limit?: number): Promise<DBVideoRow[]>;
  getVideosByLocationForUser(lat: number, lng: number, radius: number, userId: string, limit?: number): Promise<DBVideoRow[]>;
  getVideosByLocationWithWatchStatus(lat: number, lng: number, radius: number, userId: string, limit?: number): Promise<any[]>;
  getVideosByGroup(groupId: string): Promise<DBVideoRow[]>;
  getVideosByUser(userId: string): Promise<DBVideoRow[]>;
  getVideosByUserWithProcessing(userId: string, includeProcessing: boolean): Promise<DBVideoRow[]>;
  isUserGroupMember(userId: string, groupId: string): Promise<boolean>;
  getVideoById(id: string): Promise<DBVideoRow | undefined>;
  incrementVideoViews(videoId: string): Promise<void>;
  markVideoAsWatched(userId: string, videoId: string): Promise<void>;
  deleteVideo(videoId: string): Promise<void>;
  flagVideo(videoId: string, userId: string): Promise<void>;
  
  // Video interactions
  likeVideo(userId: string, videoId: string): Promise<boolean>;
  unlikeVideo(userId: string, videoId: string): Promise<boolean>;
  isVideoLiked(userId: string, videoId: string): Promise<boolean>;
  addVideoComment(comment: DBVideoCommentInsert): Promise<void>;
  getVideoComments(videoId: string): Promise<Array<any>>;
  createVideoComment(comment: any): Promise<any>;
  updateVideoCommentStatus(commentId: number, status: string, flaggedReason?: string, audioFlagReason?: string): Promise<void>;
  updateVideoComment(commentId: number, updates: { comment: string }): Promise<void>;
  getUserVideoComments(userId: string): Promise<Array<any>>;
  
  // Video collections
  addToCollection(userId: string, videoId: string): Promise<void>;
  removeFromCollection(userId: string, videoId: string): Promise<void>;
  getUserCollections(userId: string): Promise<DBVideoRow[]>;
  getUserLikedVideos(userId: string): Promise<DBVideoRow[]>;
  getLikedVideosByUser(userId: string): Promise<DBVideoRow[]>;
  getSavedVideosByUser(userId: string): Promise<DBVideoRow[]>;
  
  // Video purchases (for remote access with coins)
  purchaseVideo(userId: string, videoId: string): Promise<void>;
  isVideoPurchased(userId: string, videoId: string): Promise<boolean>;
  
  // Group operations
  createGroup(group: DBGroupInsert): Promise<DBGroupRow>;
  getUserGroups(userId: string): Promise<Array<any>>;
  getGroup(id: string): Promise<DBGroupRow | undefined>;
  getGroupById(id: string): Promise<DBGroupRow | undefined>;
  getGroupByIdWithDistance(id: string, userLat: number, userLng: number): Promise<any>;
  getGroupsByLocation(lat: number, lng: number, radius: number, userId: string): Promise<Array<any>>;
  joinGroup(membership: DBGroupMembershipInsert): Promise<void>;
  leaveGroup(userId: string, groupId: string): Promise<void>;
  deleteGroup(groupId: string, userId: string): Promise<boolean>;
  updateGroup(groupId: string, updates: { name: string; description: string; isPublic: boolean; coverImageUrl: string | null }): Promise<DBGroupRow>;
  updateGroupPrivacy(groupId: string, userId: string, isPublic: boolean): Promise<boolean>;
  updateGroupCoverImage(groupId: string, userId: string, imageUrl: string): Promise<boolean>;
  getGroupMembershipStatus(userId: string, groupId: string): Promise<{ isMember: boolean; isOwner: boolean }>;
  getGroupMembers(groupId: string): Promise<Array<any>>;
  searchUsers(query: string, excludeUserId: string): Promise<Array<any>>;
  getUserById(userId: string): Promise<DBUserRow | undefined>;
  
  // Group messaging
  addGroupMessage(message: DBGroupMessageInsert): Promise<DBGroupMessageRow>;
  getGroupMessages(groupId: string, limit?: number): Promise<Array<any>>;
  
  // Thread operations
  createGroupThread(thread: DBGroupThreadInsert): Promise<DBGroupThreadRow>;
  getGroupThreads(groupId: string): Promise<Array<any>>;
  getGroupVideos(groupId: string, userId?: string): Promise<Array<any>>;
  getThreadById(threadId: string): Promise<DBGroupThreadRow | null>;
  updateThread(threadId: string, updates: { title: string; description: string | null }): Promise<DBGroupThreadRow>;
  deleteThread(threadId: string): Promise<void>;
  addThreadMessage(message: DBThreadMessageInsert): Promise<DBThreadMessageRow>;
  getThreadMessages(threadId: string, limit?: number): Promise<Array<any>>;
  updateThreadMessage(messageId: number, userId: string, content: string): Promise<void>;
  updateThreadMessageStatus(messageId: number, status: string, flaggedReason?: string | null, videoUrl?: string, thumbnailUrl?: string, bunnyVideoId?: string, audioFlagReason?: string): Promise<void>;
  migrateGroupMessagesToThread(groupId: string, threadId: string): Promise<void>;
  
  // User follows
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isUserFollowed(followerId: string, followingId: string): Promise<boolean>;
  getUserStats(userId: string): Promise<{ followers: number; following: number; likes: number }>;
  
  // User follow notifications
  updateFollowNotifications(followerId: string, followingId: string, enabled: boolean): Promise<void>;
  getFollowNotificationStatus(followerId: string, followingId: string): Promise<boolean>;
  
  // Other user profile data
  getOtherUserProfile(userId: string, viewerId: string): Promise<any>;
  getUserVideosWithDistance(userId: string, viewerLat: number, viewerLng: number, viewerId: string): Promise<any[]>;
  
  // Moderation operations
  createModerationFlag(flag: DBModerationFlagInsert): Promise<DBModerationFlagRow>;
  getModerationFlags(status?: string, contentType?: string, isAppeal?: boolean): Promise<Array<any>>;
  getModerationFlag(flagId: string): Promise<any>;
  updateModerationFlag(flagId: string, updates: Partial<DBModerationFlagRow>): Promise<void>;
  getVideoAppealById(appealId: string): Promise<any>;
  approveVideoAppeal(appealId: string, moderatorId: string, notes?: string): Promise<any>;
  rejectVideoAppeal(appealId: string, moderatorId: string, notes?: string): Promise<any>;
  getModerationStats(): Promise<{ pending: number; flaggedComments: number; flaggedVideos: number; aiAppeals: number }>;
  
  // Content flagging operations
  flagContent(contentType: string, contentId: string, flaggedByUserId: string, flagReason: string, customReason?: string): Promise<DBModerationFlagRow>;
  hideContentPendingModeration(contentType: string, contentId: string): Promise<void>;
  getContentOwner(contentType: string, contentId: string): Promise<string | null>;
  
  // Moderator access management
  addModeratorAccess(access: DBModeratorAccessInsert): Promise<DBModeratorAccessRow>;
  getModeratorAccess(): Promise<Array<DBModeratorAccessRow>>;
  removeModeratorAccess(accessId: string): Promise<void>;
  updateUserRole(userId: string, role: string): Promise<void>;
  activateModeratorAccess(email: string, userId: string): Promise<void>;
  
  // Moderation oversight
  getModerationDecisionHistory(filters: { search: string; decision: string; moderator: string }): Promise<any[]>;
  getModerators(): Promise<any[]>;
  
  // Thread message operations
  getThreadMessage(messageId: number): Promise<any>;
  deleteThreadMessage(messageId: number, userId: string): Promise<void>;
  
  // Group member management operations
  getGroupMembers(groupId: string): Promise<Array<any>>;
  searchUsers(query: string, excludeUserId: string): Promise<Array<any>>;
  getUserById(userId: string): Promise<DBUserRow | undefined>;
  
  // Search operations
  searchVideosByContent(query: string): Promise<DBVideoRow[]>;
}


export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<DBUserRow | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<DBUserRow | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<DBUserRow | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: { id: string; email: string; firstName: string; lastName: string; profileImageUrl?: string | null }): Promise<DBUserRow> {
    // Generate username from first and last name
    let baseUsername = '';
    if (userData.firstName && userData.lastName) {
      baseUsername = `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase()}`;
    } else if (userData.firstName) {
      baseUsername = userData.firstName.toLowerCase();
    } else if (userData.email) {
      baseUsername = userData.email.split('@')[0];
    } else {
      baseUsername = 'user';
    }
    
    // Remove any non-alphanumeric characters and ensure uniqueness
    baseUsername = baseUsername.replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;
    
    // Check for username uniqueness
    while (true) {
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUser.length === 0) {
        break;
      }
      
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const [user] = await db
      .insert(users)
      .values({
  id: userData.id,
  email: userData.email,
  firstName: userData.firstName,
  lastName: userData.lastName,
  profileImageUrl: userData.profileImageUrl,
  username,
  gemCoins: 10, // Starting gem coins for new users
  createdAt: new Date(),
  updatedAt: new Date(),
} as DBUserInsert)
      .returning();
    return user;
  }

  async upsertUser(userData: DBUserRow): Promise<DBUserRow> {
    try {
      // First try to find existing user by ID
      if (userData.id) {
        const existingUserById = await db
          .select()
          .from(users)
          .where(eq(users.id, userData.id))
          .limit(1);
          
        if (existingUserById.length > 0) {
          // User exists with this ID, update safely without changing ID
          const updateData = { ...userData };
          delete updateData.id; // Don't update the ID field
          
          // CRITICAL FIX: Don't overwrite existing profileImageUrl with null/empty/undefined values from auth claims
          if ((!updateData.profileImageUrl || updateData.profileImageUrl === undefined) && existingUserById[0].profileImageUrl) {
            delete updateData.profileImageUrl; // Keep existing uploaded profile image
            console.log("🔒 STORAGE: Preserving existing profile image during user upsert");
          }
          
          const [updatedUser] = await db
            .update(users)
            .set({
              ...updateData,
              updatedAt: new Date(),
            }as Partial<typeof users.$inferInsert>)
            .where(eq(users.id, userData.id))
            .returning();
          return updatedUser;
        }
      }
      
      // Check if user exists by email
      if (userData.email) {
        const existingUserByEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email))
          .limit(1);
          
        if (existingUserByEmail.length > 0) {
          // User exists with this email, update without changing ID
          const updateData = { ...userData };
          delete updateData.id; // Don't update the ID field
          
          // CRITICAL FIX: Don't overwrite existing profileImageUrl with null/empty/undefined values from auth claims
          if ((!updateData.profileImageUrl || updateData.profileImageUrl === undefined) && existingUserByEmail[0].profileImageUrl) {
            delete updateData.profileImageUrl; // Keep existing uploaded profile image
            console.log("🔒 STORAGE: Preserving existing profile image during user upsert (by email)");
          }
          
          const [updatedUser] = await db
            .update(users)
            .set({
              ...updateData,
              updatedAt: new Date(),
            }as Partial<typeof users.$inferInsert>)
            .where(eq(users.email, userData.email))
            .returning();
          return updatedUser;
        }
      }
      
      // No existing user found, create new one
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (error) {
      console.error('Error in upsertUser:', error);
      
      // If we get a foreign key constraint error, the user exists but we can't update safely
      if (error instanceof Error && error.message.includes('payments_user_id_users_id_fk')) {
        // Try to find and return the existing user
        if (userData.id) {
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.id, userData.id))
            .limit(1);
          if (existingUser.length > 0) {
            return existingUser[0];
          }
        }
      }
      
      // If we get a duplicate email error, try to update by email
      if (error instanceof Error && error.message.includes('users_email_unique')) {
        const [updatedUser] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          }as Partial<typeof users.$inferInsert>)
          .where(eq(users.email, userData.email!))
          .returning();
        return updatedUser;
      }
      
      // If we get a duplicate username error, try to update by username
      if (error instanceof Error && error.message.includes('users_username_unique')) {
        console.log('🔒 STORAGE: Duplicate username detected, attempting to update existing user');
        try {
          const updateData = { ...userData };
          delete updateData.id; // Don't update the ID field
          delete updateData.email; // Don't update email to avoid email constraint
          
          const [updatedUser] = await db
            .update(users)
            .set({
              ...updateData,
              updatedAt: new Date(),
            }as Partial<typeof users.$inferInsert>)
            .where(eq(users.username, userData.username!))
            .returning();
          return updatedUser;
        } catch (updateError) {
          console.log('🔒 STORAGE: Update by username failed, fetching existing user');
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.username, userData.username!))
            .limit(1);
          if (existingUser.length > 0) {
            return existingUser[0];
          }
        }
      }
      
      // If we get a primary key constraint error, the user already exists - just return them
      if (error instanceof Error && error.message.includes('users_pkey')) {
        console.log('🔒 STORAGE: User with this ID already exists, fetching existing user');
        if (userData.id) {
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.id, userData.id))
            .limit(1);
          if (existingUser.length > 0) {
            return existingUser[0];
          }
        }
      }
      
      throw error;
    }
  }

  async updateUserGemCoins(userId: string, coins: number): Promise<void> {
    await db
  .update(users)
  .set({ gemCoins: coins, updatedAt: new Date() } as Partial<typeof users.$inferInsert>)
  .where(eq(users.id, userId));
  }

  async updateUser(userId: string, updates: { gemCoins?: number; [key: string]: any }): Promise<void> {
    await db
  .update(users)
  .set({ ...updates, updatedAt: new Date() } as Partial<typeof users.$inferInsert>)
  .where(eq(users.id, userId));
  }

  async updateUserProfilePicture(userId: string, imageData: string): Promise<void> {
    try {
      console.log("🖼️ STORAGE: Updating profile picture for user:", userId);
      console.log("🖼️ STORAGE: Image data preview:", imageData.substring(0, 100) + '...');
      console.log("🖼️ STORAGE: Image data length:", imageData.length);
      
      // First, verify user exists
      console.log("🔍 STORAGE: Checking if user exists before update...");
      const existingUser = await db
        .select({ id: users.id, profileImageUrl: users.profileImageUrl })
        .from(users)
        .where(eq(users.id, userId));
      
      console.log("🔍 STORAGE: User lookup result:", existingUser);
      
      if (existingUser.length === 0) {
        throw new Error(`No user found with ID: ${userId}`);
      }
      
      console.log("🔄 STORAGE: User exists, proceeding with update...");
      console.log("🔄 STORAGE: Current profileImageUrl:", existingUser[0].profileImageUrl);
      
      const result = await db
  .update(users)
  .set({ profileImageUrl: imageData, updatedAt: new Date() } as Partial<typeof users.$inferInsert>)
  .where(eq(users.id, userId))
  .returning({ id: users.id, profileImageUrl: users.profileImageUrl, updatedAt: users.updatedAt });

        
      console.log("🖼️ STORAGE: Profile picture update result:", result);
      console.log("🖼️ STORAGE: Updated rows count:", result.length);
      
      if (result.length === 0) {
        throw new Error(`Update operation returned no rows for user ID: ${userId}`);
      }
      
      console.log("✅ STORAGE: Update successful - new profileImageUrl:", result[0].profileImageUrl);
      console.log("✅ STORAGE: Update timestamp:", result[0].updatedAt);
      
      // Verify the update by querying again
      console.log("🔍 STORAGE: Verifying update with fresh query...");
      const verificationResult = await db
        .select({ id: users.id, profileImageUrl: users.profileImageUrl, updatedAt: users.updatedAt })
        .from(users)
        .where(eq(users.id, userId));
        
      console.log("🔍 STORAGE: Verification query result:", verificationResult);
      
      if (verificationResult[0]?.profileImageUrl !== imageData) {
        console.error("❌ STORAGE: Verification failed - update didn't persist!");
        console.error("❌ STORAGE: Expected:", imageData);
        console.error("❌ STORAGE: Actual:", verificationResult[0]?.profileImageUrl);
        throw new Error("Profile picture update failed to persist to database");
      }
      
      console.log("✅ STORAGE: Profile picture update verified and completed successfully");
    } catch (error) {
      console.error("🖼️ STORAGE ERROR: Failed to update profile picture:", error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: { firstName?: string; lastName?: string; bio?: string; username?: string; lanterns?: number; gemCoins?: number }): Promise<void> {
    console.log("📝 Updating user profile for:", userId, updates);
    
    const updateData: any = { updatedAt: new Date() };
    
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.lanterns !== undefined) updateData.lanterns = updates.lanterns;
    if (updates.gemCoins !== undefined) updateData.gemCoins = updates.gemCoins;
    
    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({ id: users.id, lanterns: users.lanterns, gemCoins: users.gemCoins });
      
    console.log("📝 Profile update completed:", result);
  }

  async updateUserProfileImage(userId: string, imageUrl: string): Promise<void> {
    try {
      console.log("🔄 STORAGE: Updating profile image URL for user:", userId);
      console.log("🔄 STORAGE: New image URL:", imageUrl);
      
      const result = await db
        .update(users)
        .set({ 
          profileImageUrl: imageUrl,
          updatedAt: new Date()
        } as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, userId))
        .returning({ id: users.id, profileImageUrl: users.profileImageUrl });
        
      if (result.length === 0) {
        throw new Error(`No user found with ID: ${userId}`);
      }
      
      console.log("✅ STORAGE: Profile image URL updated successfully");
    } catch (error) {
      console.error("❌ STORAGE ERROR: Failed to update profile image URL:", error);
      throw error;
    }
  }

  async updateUserStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
    console.log("💳 Updating Stripe customer ID for user:", userId);
    
    await db
      .update(users)
      .set({ 
        stripeCustomerId: stripeCustomerId,
        updatedAt: new Date()
      } as Partial<typeof users.$inferInsert>)
      .where(eq(users.id, userId));
      
    console.log("💳 Stripe customer ID update completed");
  }

  async deleteUser(userId: string): Promise<void> {
    console.log("🗑️ Deleting user and all associated data for:", userId);
    
    // Delete all user's videos (cascading deletes will handle related records)
    await db.delete(videos).where(eq(videos.userId, userId));
    
    // Delete all user's group memberships
    await db.delete(groupMemberships).where(eq(groupMemberships.userId, userId));
    
    // Delete all user's follows (both following and followers)
    await db.delete(userFollows).where(or(
      eq(userFollows.followerId, userId),
      eq(userFollows.followingId, userId)
    ));
    
    // Delete all user's follow notifications
    await db.delete(userFollowNotifications).where(or(
      eq(userFollowNotifications.followerId, userId),
      eq(userFollowNotifications.followingId, userId)
    ));
    
    // Delete all user's video likes
    await db.delete(videoLikes).where(eq(videoLikes.userId, userId));
    
    // Delete all user's video comments
    await db.delete(videoComments).where(eq(videoComments.userId, userId));
    
    // Delete all user's video collections
    await db.delete(videoCollections).where(eq(videoCollections.userId, userId));
    
    // Delete all user's video watches
    await db.delete(videoWatches).where(eq(videoWatches.userId, userId));
    
    // Delete all user's video purchases
    await db.delete(videoPurchases).where(eq(videoPurchases.userId, userId));
    
    // Delete all user's video activations
    await db.delete(videoActivations).where(eq(videoActivations.userId, userId));
    
    // Delete all user's group messages
    await db.delete(groupMessages).where(eq(groupMessages.userId, userId));
    
    // Delete all user's thread messages
    await db.delete(threadMessages).where(eq(threadMessages.userId, userId));
    
    // Delete groups owned by the user
    await db.delete(groups).where(eq(groups.createdBy, userId));
    
    // Finally, delete the user record
    await db.delete(users).where(eq(users.id, userId));
    
    console.log("🗑️ User deletion completed for:", userId);
  }



  // Video operations
  async createVideo(video: DBVideoInsert): Promise<DBVideoRow> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async getVideos(limit = 50, offset = 0): Promise<DBVideoRow[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.isActive, true))
      .orderBy(desc(videos.createdAt))
      .limit(limit)
      .offset(offset);
  }


  async getVideosByLocation(lat: number, lng: number, radius: number, limit = 20): Promise<DBVideoRow[]> {
    // Simple distance calculation - in production would use PostGIS
    return await db
      .select(getTableColumns(videos)) 
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .where(and(
        eq(videos.isActive, true),
        eq(videos.visibility, "everyone"), // Only show public videos for location-based queries
        or(
          sql`${videos.flaggedReason} IS NULL`,
          sql`${videos.flaggedReason} != 'User deleted video'`
        )
      ))
      .orderBy(desc(videos.createdAt))
      .limit(limit);
  }

  async getVideosByLocationForUser(lat: number, lng: number, radius: number, userId: string, limit = 20): Promise<DBVideoRow[]> {
    // Get user's group memberships
    const userGroups = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));
    
    const userGroupIds = userGroups.map(g => g.groupId);
    
    // Get videos that are either public or in user's groups, including user profile images
    return await db
      .select(getTableColumns(videos)) 
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .where(and(
        eq(videos.isActive, true),
        or(
          eq(videos.visibility, "everyone"),
          and(
            like(videos.visibility, "group_%"),
            videos.groupId ? inArray(videos.groupId, userGroupIds) : sql`false`
          )
        )
      ))
      .orderBy(desc(videos.createdAt))
      .limit(limit);
  }

  async getVideosByLocationWithWatchStatus(lat: number, lng: number, radius: number, userId: string, limit = 20): Promise<any[]> {
    // Get user's group memberships first
    const userGroups = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));
    
    const userGroupIds = userGroups.map(g => g.groupId);
    
    // Get videos with watched status and following status for the specific user
    const results = await db
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        category: videos.category,
        latitude: videos.latitude,
        longitude: videos.longitude,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        userId: videos.userId,
        views: videos.views,
        likes: videos.likes,
        isActive: videos.isActive,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        duration: videos.duration,
        groupName: videos.groupName,
        visibility: videos.visibility,
        groupId: videos.groupId,
        userProfileImageUrl: users.profileImageUrl,
        userReadyPlayerMeAvatarUrl: users.readyPlayerMeAvatarUrl,
        watchedByUser: sql<boolean>`CASE WHEN ${videoWatches.userId} IS NOT NULL THEN true ELSE false END`.as('watchedByUser'),
        requiresCoin: sql<boolean>`false`.as('requiresCoin'),
        bunnyVideoId: videos.bunnyVideoId,
        processingStatus: videos.processingStatus,
        moderationResults: videos.moderationResults,
        flaggedReason: videos.flaggedReason,
        postTiming: videos.postTiming,
        customDateTime: videos.customDateTime,
        gcsProcessingUrl: videos.gcsProcessingUrl,
        bunnyStoragePath: videos.bunnyStoragePath,
        eventStartDate: videos.eventStartDate,
        eventStartTime: videos.eventStartTime,
        eventEndDate: videos.eventEndDate,
        eventEndTime: videos.eventEndTime,
        questId: videos.questId,
        isFromFollowedUser: sql<boolean>`CASE WHEN uf.following_id IS NOT NULL THEN true ELSE false END`.as('isFromFollowedUser')
      })
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .leftJoin(videoWatches, and(eq(videoWatches.videoId, videos.id), eq(videoWatches.userId, userId)))
      .leftJoin(sql`user_follows uf`, sql`uf.follower_id = ${userId} AND uf.following_id = ${videos.userId}`)
      .where(and(
        eq(videos.isActive, true),
        eq(videos.processingStatus, 'approved'),
        or(
          eq(videos.visibility, "everyone"),
          and(
            like(videos.visibility, "group_%"),
            videos.groupId ? inArray(videos.groupId, userGroupIds) : sql`false`
          ),
          // Include videos where visibility is set to a group ID (direct group ID matching)
          and(
            sql`${videos.visibility} IS NOT NULL`,
            sql`${videos.visibility} != 'everyone'`,
            sql`${videos.visibility} != ''`,
            inArray(videos.visibility, userGroupIds)
          ),
          // Include quest videos regardless of user's group membership
          like(videos.visibility, "quest_%")
        ),
        or(
          sql`${videos.flaggedReason} IS NULL`,
          sql`${videos.flaggedReason} != 'User deleted video'`
        ),
        // Only include videos with proper Bunny.net storage
        or(
          and(
            sql`${videos.bunnyVideoId} IS NOT NULL`,
            sql`${videos.bunnyVideoId} != ''`
          ),
          and(
            sql`${videos.videoUrl} IS NOT NULL`,
            sql`${videos.videoUrl} != ''`,
            like(videos.videoUrl, '/api/videos/bunny-proxy/%')
          )
        ),
        // Add geographic filtering
        sql`(6371 * acos(cos(radians(${lat})) * cos(radians(${videos.latitude}::float)) * cos(radians(${videos.longitude}::float) - radians(${lng})) + sin(radians(${lat})) * sin(radians(${videos.latitude}::float)))) <= ${radius / 1000}`,
        sql`${videos.latitude} IS NOT NULL`,
        sql`${videos.longitude} IS NOT NULL`
      ))
      .orderBy(desc(videos.createdAt))
      .limit(limit);
    
    return results;
  }

  async getVideosByUser(userId: string): Promise<DBVideoRow[]> {
    return await db
    .select(getTableColumns(videos)) 
      .from(videos)
      .where(and(eq(videos.userId, userId), eq(videos.isActive, true)))
      .orderBy(desc(videos.createdAt));
  }

  async getVideosByUserWithProcessing(userId: string, includeProcessing: boolean): Promise<DBVideoRow[]> {
    const whereConditions = [eq(videos.userId, userId)];
    
    if (!includeProcessing) {
      // For other users, only show active videos
      whereConditions.push(eq(videos.isActive, true));
    } else {
      // For own profile, show processing videos but exclude explicitly deleted ones
      // We'll show videos that are either active OR have processing status (but not manually deleted)
      whereConditions.push(
        and(
          or(
            eq(videos.isActive, true),
            and(
              eq(videos.isActive, false),
              or(
                eq(videos.processingStatus, 'processing'),
                eq(videos.processingStatus, 'uploading'),
                eq(videos.processingStatus, 'uploaded'),
                eq(videos.processingStatus, 'pending'),
                eq(videos.processingStatus, 'failed'),
                eq(videos.processingStatus, 'rejected'),
                eq(videos.processingStatus, 'rejected_by_ai'),
                eq(videos.processingStatus, 'under_appeal'),
                eq(videos.processingStatus, 'flagged_by_user'),
                eq(videos.processingStatus, 'completed')
              )
            )
          ),
          // Exclude manually deleted videos
          or(
            sql`${videos.flaggedReason} IS NULL`,
            sql`${videos.flaggedReason} != 'User deleted video'`
          ),
          // Always exclude videos rejected by moderation - they should never appear in profiles
          sql`${videos.processingStatus} != 'rejected_by_moderation'`
        )
      );
    }
    
    return await db
    .select(getTableColumns(videos)) 
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(videos.createdAt));
  }

  async getVideoById(id: string): Promise<DBVideoRow | undefined> {
    const [video] = await db.select({
      id: videos.id,
      title: videos.title,
      description: videos.description,
      category: videos.category,
      latitude: videos.latitude,
      longitude: videos.longitude,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      userId: videos.userId,
      views: videos.views,
      likes: videos.likes,
      isActive: videos.isActive,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      duration: videos.duration,
      groupName: videos.groupName,
      visibility: videos.visibility,
      groupId: videos.groupId,
      bunnyVideoId: videos.bunnyVideoId,
      processingStatus: videos.processingStatus,
      moderationResults: videos.moderationResults,
      flaggedReason: videos.flaggedReason,
      postTiming: videos.postTiming,
      customDateTime: videos.customDateTime,
      eventStartDate: videos.eventStartDate,
      eventStartTime: videos.eventStartTime,
      eventEndDate: videos.eventEndDate,
      eventEndTime: videos.eventEndTime,
      gcsProcessingUrl: videos.gcsProcessingUrl,
      bunnyStoragePath: videos.bunnyStoragePath,
      audioModerationStatus: videos.audioModerationStatus,
      transcriptionText: videos.transcriptionText,
      extractedKeywords: videos.extractedKeywords,
      audioFlagReason: videos.audioFlagReason,
      playbackStatus: videos.playbackStatus,
      bunnyReviewVideoId: videos.bunnyReviewVideoId
    }as typeof video.$inferSelect).from(videos).where(eq(videos.id, id));
    
    return video;
  }

  async incrementVideoViews(videoId: string): Promise<void> {
    await db
      .update(videos)
      .set({ views: sql`${videos.views} + 1` }as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, videoId));
  }

  async  updateVideoProcessingStatus(id: DBVideoRow["id"], status: 'uploading'|'processing'|'failed'|'complete') {
  await db.update(videos)
    .set({ processingStatus: status } as Partial<typeof videos.$inferInsert>)
    .where(eq(videos.id, id));
}

  async markVideoAsWatched(userId: string, videoId: string): Promise<void> {
    console.log('🎬 STORAGE: Checking if video already watched - userId:', userId, 'videoId:', videoId);
    
    // Check if already watched
    const existingWatch = await db
      .select()
      .from(videoWatches)
      .where(and(eq(videoWatches.userId, userId), eq(videoWatches.videoId, videoId)))
      .limit(1);

    console.log('🎬 STORAGE: Existing watch record found:', existingWatch.length > 0);

    if (existingWatch.length === 0) {
      console.log('🎬 STORAGE: Inserting new watch record for video:', videoId, 'user:', userId);
      await db.insert(videoWatches).values({
        userId,
        videoId,
      });
      console.log('🎬 STORAGE: Successfully inserted watch record');
    } else {
      console.log('🎬 STORAGE: Video already marked as watched, skipping insert');
    }
  }

  async deleteVideo(videoId: string): Promise<void> {
    // First delete related records that reference this video
    await db.delete(videoWatches).where(eq(videoWatches.videoId, videoId));
    await db.delete(videoLikes).where(eq(videoLikes.videoId, videoId));
    await db.delete(videoCollections).where(eq(videoCollections.videoId, videoId));
    
    // Then delete the video record itself
    await db.delete(videos).where(eq(videos.id, videoId));
  }

  async softDeleteVideo(videoId: string): Promise<void> {
    await db
      .update(videos)
      .set({ 
        isActive: false,
        flaggedReason: 'User deleted video'
      }as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, videoId));
  }

  async flagVideo(videoId: string, userId: string): Promise<void> {
    // Mark video as flagged but keep it visible in profile with "under review" status
    await db
      .update(videos)
      .set({ 
        processingStatus: 'flagged_by_user',
        flaggedReason: 'User reported content',
        isActive: true // Keep video visible in profile but mark as under review
      }as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, videoId));
  }

  // Video interactions
  async likeVideo(userId: string, videoId: string): Promise<boolean> {
    try {
      await db.insert(videoLikes).values({ userId, videoId });
      await db
        .update(videos)
        .set({ likes: sql`${videos.likes} + 1` }as Partial<typeof videos.$inferInsert>)
        .where(eq(videos.id, videoId));
      return true;
    } catch {
      return false; // Already liked
    }
  }

  async unlikeVideo(userId: string, videoId: string): Promise<boolean> {
    const result = await db
      .delete(videoLikes)
      .where(and(eq(videoLikes.userId, userId), eq(videoLikes.videoId, videoId)));
    
    if ((result.rowCount ?? 0) > 0) {
      await db
        .update(videos)
        .set({ likes: sql`${videos.likes} - 1` }as Partial<typeof videos.$inferInsert>)
        .where(eq(videos.id, videoId));
      return true;
    }
    return false;
  }

  async isVideoLiked(userId: string, videoId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(videoLikes)
      .where(and(eq(videoLikes.userId, userId), eq(videoLikes.videoId, videoId)));
    return !!like;
  }

  async addVideoComment(comment: DBVideoCommentInsert): Promise<void> {
    await db.insert(videoComments).values(comment);
  }

  async getVideoComments(videoId: string): Promise<Array<any>> {
    console.log(`🔍 Getting comments for video ${videoId}`);
    
    // Get all comments - processing, approved, and rejected (for proper status display)
    const comments = await db
      .select({
        id: videoComments.id,
        userId: videoComments.userId,
        comment: videoComments.comment,
        commentType: videoComments.commentType,
        commentVideoUrl: videoComments.commentVideoUrl,
        bunnyVideoId: videoComments.bunnyVideoId,
        processingStatus: videoComments.processingStatus,
        flaggedReason: videoComments.flaggedReason,
        duration: videoComments.duration,
        createdAt: videoComments.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(videoComments)
      .innerJoin(users, eq(videoComments.userId, users.id))
      .where(eq(videoComments.videoId, videoId))
      .orderBy(desc(videoComments.createdAt));

    console.log(`🔍 Found ${comments.length} total comments, returning all for frontend filtering`);
    return comments;
  }

  async updateVideoCommentDuration(commentId: number, duration: number): Promise<void> {
    await db
      .update(videoComments)
      .set({ duration: duration }as Partial<typeof videoComments.$inferInsert>)
      .where(eq(videoComments.id, commentId));
    
    console.log(`Updated video comment ${commentId} duration to ${duration} seconds`);
  }

  async deleteVideoComment(commentId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(videoComments)
      .where(and(
        eq(videoComments.id, commentId),
        eq(videoComments.userId, userId)
      ))
      .returning({ id: videoComments.id });
    
    return result.length > 0;
  }

  async createVideoComment(comment: any): Promise<any> {
    const [newComment] = await db
      .insert(videoComments)
      .values(comment)
      .returning();
    
    // Fetch the complete comment with user data
    const [completeComment] = await db
      .select({
        id: videoComments.id,
        videoId: videoComments.videoId,
        userId: videoComments.userId,
        comment: videoComments.comment,
        commentType: videoComments.commentType,
        commentVideoUrl: videoComments.commentVideoUrl,
        bunnyVideoId: videoComments.bunnyVideoId,
        processingStatus: videoComments.processingStatus,
        flaggedReason: videoComments.flaggedReason,
        duration: videoComments.duration,
        createdAt: videoComments.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(videoComments)
      .innerJoin(users, eq(videoComments.userId, users.id))
      .where(eq(videoComments.id, newComment.id));
    
    return completeComment;
  }

  async updateVideoCommentStatus(commentId: number, status: string, flaggedReason?: string, audioFlagReason?: string): Promise<void> {
    await db
      .update(videoComments)
      .set({
        processingStatus: status,
        flaggedReason,
        audioFlagReason,
        updatedAt: new Date()
      }as Partial<typeof videoComments.$inferInsert>)
      .where(eq(videoComments.id, commentId));
  }

  async updateVideoCommentVideoUrl(commentId: number, videoUrl: string): Promise<void> {
    await db
      .update(videoComments)
      .set({
        commentVideoUrl: videoUrl,
        updatedAt: new Date()
      }as Partial<typeof videoComments.$inferInsert>)
      .where(eq(videoComments.id, commentId));
  }

  async getVideoCommentById(commentId: number): Promise<any> {
    const [comment] = await db
      .select({
        id: videoComments.id,
        videoId: videoComments.videoId,
        userId: videoComments.userId,
        comment: videoComments.comment,
        commentType: videoComments.commentType,
        commentVideoUrl: videoComments.commentVideoUrl,
        bunnyVideoId: videoComments.bunnyVideoId,
        processingStatus: videoComments.processingStatus,
        flaggedReason: videoComments.flaggedReason,
        duration: videoComments.duration,
        createdAt: videoComments.createdAt,
      }as typeof comment.$inferSelect)
      .from(videoComments)
      .where(eq(videoComments.id, commentId));
    
    return comment;
  }

  async updateVideoCommentAfterProcessing(commentId: number, updates: {
    processingStatus: string;
    commentVideoUrl: string | null;
    bunnyVideoId: string | null;
    flaggedReason: string | null;
  }): Promise<void> {
    await db
      .update(videoComments)
      .set({
        processingStatus: updates.processingStatus,
        commentVideoUrl: updates.commentVideoUrl,
        bunnyVideoId: updates.bunnyVideoId,
        flaggedReason: updates.flaggedReason,
        updatedAt: new Date()
      }as Partial<typeof videoComments.$inferInsert>)
      .where(eq(videoComments.id, commentId));
    
    console.log(`Updated video comment ${commentId} after processing: ${updates.processingStatus}`);
  }

  async updateVideoComment(commentId: number, updates: { comment: string }): Promise<void> {
    await db
      .update(videoComments)
      .set({
        comment: updates.comment,
        updatedAt: new Date()
      } as Partial<typeof videoComments.$inferInsert>)
      .where(eq(videoComments.id, commentId));
    
    console.log(`Updated video comment ${commentId} with new text`);
  }

  async getUserVideoComments(userId: string): Promise<Array<any>> {
    const result = await db
      .select({
        id: videoComments.id,
        userId: videoComments.userId,
        comment: videoComments.comment,
        commentType: videoComments.commentType,
        commentVideoUrl: videoComments.commentVideoUrl,
        bunnyVideoId: videoComments.bunnyVideoId,
        processingStatus: videoComments.processingStatus,
        flaggedReason: videoComments.flaggedReason,
        audioFlagReason: videoComments.audioFlagReason,
        duration: videoComments.duration,
        createdAt: videoComments.createdAt,
        updatedAt: videoComments.updatedAt,
        videoId: videoComments.videoId,
        video: {
          id: videos.id,
          title: videos.title,
          thumbnailUrl: videos.thumbnailUrl,
          videoUrl: videos.videoUrl
        }
      })
      .from(videoComments)
      .leftJoin(videos, eq(videoComments.videoId, videos.id))
      .where(eq(videoComments.userId, userId))
      .orderBy(desc(videoComments.createdAt));
    
    // Transform the data to include video information properly
    const transformedResults = result.map(comment => ({
      ...comment,
      title: comment.video?.title || 'Video Comment',
      thumbnailUrl: comment.video?.thumbnailUrl,
      videoUrl: comment.commentVideoUrl, // Use the comment video URL, not the original video URL
      isVideoComment: true, // Flag to identify this as a video comment
      isActive: true // Set as active since they're approved
    }));
    
    return transformedResults;
  }

  // Video collections
  async addToCollection(userId: string, videoId: string): Promise<void> {
    await db.insert(videoCollections).values({ userId, videoId });
  }

  async removeFromCollection(userId: string, videoId: string): Promise<void> {
    await db
      .delete(videoCollections)
      .where(and(eq(videoCollections.userId, userId), eq(videoCollections.videoId, videoId)));
  }

  async getLikedVideosByUser(userId: string): Promise<DBVideoRow[]> {
    return await db
      .select(getTableColumns(videos)) 
      .from(videos)
      .innerJoin(videoLikes, eq(videos.id, videoLikes.videoId))
      .where(and(
        eq(videoLikes.userId, userId),
        eq(videos.isActive, true)
      ))
      .orderBy(desc(videoLikes.createdAt));
  }

  async getSavedVideosByUser(userId: string): Promise<DBVideoRow[]> {
    return await db
     .select(getTableColumns(videos)) 
      .from(videos)
      .innerJoin(videoCollections, eq(videos.id, videoCollections.videoId))
      .where(and(
        eq(videoCollections.userId, userId),
        eq(videos.isActive, true)
      ))
      .orderBy(desc(videoCollections.createdAt));
  }

  async getUserCollections(userId: string): Promise<DBVideoRow[]> {
    return await db
      .select(getTableColumns(videos)) 
      .from(videoCollections)
      .innerJoin(videos, eq(videoCollections.videoId, videos.id))
      .where(eq(videoCollections.userId, userId))
      .orderBy(desc(videoCollections.createdAt));
  }

  async getUserLikedVideos(userId: string): Promise<DBVideoRow[]> {
    return await db
      .select(getTableColumns(videos)) 
      .from(videoLikes)
      .innerJoin(videos, eq(videoLikes.videoId, videos.id))
      .where(eq(videoLikes.userId, userId))
      .orderBy(desc(videoLikes.createdAt));
  }

  async getVideosByGroup(groupId: string): Promise<DBVideoRow[]> {
    return await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.isActive, true),
        eq(videos.groupId, groupId)
      ))
      .orderBy(desc(videos.createdAt));
  }

  async isUserGroupMember(userId: string, groupId: string): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(and(
        eq(groupMemberships.userId, userId),
        eq(groupMemberships.groupId, groupId)
      ));
    return !!membership;
  }

  // Video purchases (for remote access with coins)
  async purchaseVideo(userId: string, videoId: string): Promise<void> {
    await db.insert(videoPurchases).values({
      userId,
      videoId,
    });
  }

  async isVideoPurchased(userId: string, videoId: string): Promise<boolean> {
    const [purchase] = await db
      .select()
      .from(videoPurchases)
      .where(and(eq(videoPurchases.userId, userId), eq(videoPurchases.videoId, videoId)))
      .limit(1);
    
    return !!purchase;
  }

  // Video activations (videos discovered within 100ft radius - remain free forever)
  async activateVideo(userId: string, videoId: string, userLatitude: number, userLongitude: number): Promise<void> {
    // Check if already activated to avoid duplicates
    const [existing] = await db
      .select()
      .from(videoActivations)
      .where(and(eq(videoActivations.userId, userId), eq(videoActivations.videoId, videoId)))
      .limit(1);
    
    if (!existing) {
      await db.insert(videoActivations).values({
        userId,
        videoId,
        activationLatitude: userLatitude.toString(),
        activationLongitude: userLongitude.toString(),
      }as typeof videoActivations.$inferInsert);
    }
  }

  async isVideoActivated(userId: string, videoId: string): Promise<boolean> {
    const [activation] = await db
      .select()
      .from(videoActivations)
      .where(and(eq(videoActivations.userId, userId), eq(videoActivations.videoId, videoId)))
      .limit(1);
    
    return !!activation;
  }

  async getActivatedVideos(userId: string): Promise<any[]> {
    return await db
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        category: videos.category,
        latitude: videos.latitude,
        longitude: videos.longitude,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        userId: videos.userId,
        views: videos.views,
        likes: videos.likes,
        isActive: videos.isActive,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        duration: videos.duration,
        groupName: videos.groupName,
        visibility: videos.visibility,
        groupId: videos.groupId,
        userProfileImageUrl: users.profileImageUrl,
        activatedAt: videoActivations.activatedAt,
        activationLatitude: videoActivations.activationLatitude,
        activationLongitude: videoActivations.activationLongitude,
      })
      .from(videoActivations)
      .innerJoin(videos, eq(videoActivations.videoId, videos.id))
      .leftJoin(users, eq(videos.userId, users.id))
      .where(and(
        eq(videoActivations.userId, userId),
        eq(videos.isActive, true)
      ))
      .orderBy(desc(videoActivations.activatedAt));
  }

  // Group operations
  async createGroup(group: DBGroupInsert): Promise<DBGroupRow> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    
    // Add creator as owner
    await db.insert(groupMemberships).values({
      userId: group.createdBy,
      groupId: newGroup.id,
      role: "owner",
    }as typeof groupMemberships.$inferInsert);
    
    return newGroup;
  }

  async getUserGroups(userId: string): Promise<Array<any>> {
    const userGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        coverImageUrl: groups.coverImageUrl,
        isPublic: groups.isPublic,
        createdBy: groups.createdBy,
        createdAt: groups.createdAt,
        role: groupMemberships.role,
      })
      .from(groupMemberships)
      .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
      .where(eq(groupMemberships.userId, userId));

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(
      userGroups.map(async (group) => {
        const [memberCount] = await db
          .select({ count: count() })
          .from(groupMemberships)
          .where(eq(groupMemberships.groupId, group.id));

        return {
          ...group,
          memberCount: memberCount.count,
          isOwner: group.role === 'owner'
        };
      })
    );

    return groupsWithCounts;
  }

  async getGroup(id: string): Promise<DBGroupRow | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupById(id: string): Promise<DBGroupRow | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupByIdWithDistance(id: string, userLat: number, userLng: number): Promise<any> {
    // First get the basic group data
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    
    if (!group) {
      return null;
    }

    // Get member count
    const [memberCountResult] = await db
      .select({ count: count() })
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, id));

    // Calculate distance if group has location
    let distance = null;
    if (group.latitude && group.longitude) {
      const groupLat = parseFloat(group.latitude);
      const groupLng = parseFloat(group.longitude);
      
      // Haversine formula for distance calculation
      const R = 3959; // Earth's radius in miles
      const dLat = (groupLat - userLat) * Math.PI / 180;
      const dLng = (groupLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(groupLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distance = R * c;
    }

    return {
      ...group,
      memberCount: memberCountResult?.count || 0,
      distance
    };
  }

  async joinGroup(membership: schema.DBGroupMembershipRow): Promise<void> {
    await db.insert(groupMemberships).values(membership);
  }

  async getGroupsByLocation(lat: number, lng: number, radius: number, userId: string): Promise<Array<any>> {
    // Get all public groups within radius with distance calculation
    const publicGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        isPublic: groups.isPublic,
        createdBy: groups.createdBy,
        latitude: groups.latitude,
        longitude: groups.longitude,
        createdAt: groups.createdAt,
        coverImageUrl: groups.coverImageUrl,
        memberCount: sql<number>`count(${groupMemberships.userId})`.as('memberCount'),
        distance: sql<number>`
          3959 * acos(
            cos(radians(${lat})) * 
            cos(radians(cast(${groups.latitude} as decimal))) * 
            cos(radians(cast(${groups.longitude} as decimal)) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(cast(${groups.latitude} as decimal)))
          )
        `.as('distance'),
      })
      .from(groups)
      .leftJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
      .where(
        and(
          eq(groups.isPublic, true),
          sql`3959 * acos(
            cos(radians(${lat})) * 
            cos(radians(cast(${groups.latitude} as decimal))) * 
            cos(radians(cast(${groups.longitude} as decimal)) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(cast(${groups.latitude} as decimal)))
          ) <= ${radius}`
        )
      )
      .groupBy(groups.id)
      .orderBy(sql`distance ASC`);

    // Check which groups the user is already a member of and their roles
    const userMemberships = await db
      .select({ 
        groupId: groupMemberships.groupId,
        role: groupMemberships.role 
      })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));

    const memberGroupIds = new Set(userMemberships.map(m => m.groupId));
    const ownerGroupIds = new Set(
      userMemberships
        .filter(m => m.role === 'owner')
        .map(m => m.groupId)
    );

    return publicGroups.map(group => ({
      ...group,
      isMember: memberGroupIds.has(group.id),
      isOwner: ownerGroupIds.has(group.id),
    }));
  }

  async leaveGroup(userId: string, groupId: string): Promise<void> {
    await db
      .delete(groupMemberships)
      .where(and(eq(groupMemberships.userId, userId), eq(groupMemberships.groupId, groupId)));
  }

  async deleteGroup(groupId: string, userId: string): Promise<boolean> {
    // First verify the user is the owner
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group.length || group[0].createdBy !== userId) {
      return false; // Not authorized to delete
    }

    // Delete all memberships first
    await db
      .delete(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));

    // Then delete the group
    await db
      .delete(groups)
      .where(eq(groups.id, groupId));

    return true;
  }

  async updateGroup(groupId: string, updates: { name: string; description: string; isPublic: boolean; coverImageUrl: string | null }): Promise<DBGroupRow> {
    const [updatedGroup] = await db
      .update(groups)
      .set({
        name: updates.name,
        description: updates.description,
        isPublic: updates.isPublic,
        coverImageUrl: updates.coverImageUrl,
        updatedAt: new Date()
      }as Partial<typeof groups.$inferInsert>)
      .where(eq(groups.id, groupId))
      .returning();

    return updatedGroup;
  }

  async updateGroupPrivacy(groupId: string, userId: string, isPublic: boolean): Promise<boolean> {
    // Verify the user is the owner
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group.length || group[0].createdBy !== userId) {
      return false; // Not authorized to update
    }

    await db
      .update(groups)
      .set({ isPublic }as Partial<typeof groups.$inferInsert>)
      .where(eq(groups.id, groupId));

    return true;
  }

  async updateGroupCoverImage(groupId: string, userId: string, imageUrl: string): Promise<boolean> {
    // Verify the user is the owner
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group.length || group[0].createdBy !== userId) {
      return false; // Not authorized to update
    }

    await db
      .update(groups)
      .set({ coverImageUrl: imageUrl }as Partial<typeof groups.$inferInsert>)
      .where(eq(groups.id, groupId));

    return true;
  }

  async getGroupMembershipStatus(userId: string, groupId: string): Promise<{ isMember: boolean; isOwner: boolean }> {
    // Check if user has a membership record for this group
    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.userId, userId),
          eq(groupMemberships.groupId, groupId)
        )
      )
      .limit(1);

    if (!membership) {
      return { isMember: false, isOwner: false };
    }

    return {
      isMember: true,
      isOwner: membership.role === "owner"
    };
  }



  // Group messaging
  async addGroupMessage(message: DBGroupMessageInsert): Promise<DBGroupMessageRow> {
    const [newMessage] = await db
      .insert(groupMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getGroupMessages(groupId: string, limit = 50): Promise<Array<any>> {
    return await db
      .select({
        id: groupMessages.id,
        message: groupMessages.message,
        createdAt: groupMessages.createdAt,
        userId: groupMessages.userId,
        userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('userName'),
        userProfileImage: users.profileImageUrl,
      })
      .from(groupMessages)
      .leftJoin(users, eq(groupMessages.userId, users.id))
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(desc(groupMessages.createdAt))
      .limit(limit);
  }

  // Thread operations
  async createGroupThread(thread: DBGroupThreadInsert): Promise<DBGroupThreadRow> {
    const [newThread] = await db
      .insert(groupThreads)
      .values(thread)
      .returning();
    return newThread;
  }

  async getGroupVideos(groupId: string, userId?: string): Promise<Array<any>> {
    try {
      const result = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          category: videos.category,
          latitude: videos.latitude,
          longitude: videos.longitude,
          videoUrl: videos.videoUrl,
          thumbnailUrl: videos.thumbnailUrl,
          userId: videos.userId,
          views: videos.views,
          likes: videos.likes,
          createdAt: videos.createdAt,
          processingStatus: videos.processingStatus
        })
        .from(videos)
        .where(
          and(
            eq(videos.groupId, groupId),
            eq(videos.processingStatus, 'approved')
          )
        )
        .orderBy(desc(videos.createdAt));

      // Add watch status for each video if userId provided
      if (userId) {
        const videosWithWatchStatus = await Promise.all(
          result.map(async (video) => {
            const watchEntry = await db
              .select()
              .from(videoWatches)
              .where(
                and(
                  eq(videoWatches.userId, userId),
                  eq(videoWatches.videoId, video.id)
                )
              )
              .limit(1);

            return {
              ...video,
              watchedByUser: watchEntry.length > 0
            };
          })
        );
        return videosWithWatchStatus;
      }

      return result.map(video => ({
        ...video,
        watchedByUser: false
      }));
    } catch (error) {
      console.error('Error getting group videos:', error);
      return [];
    }
  }

  async getGroupThreads(groupId: string): Promise<Array<any>> {
    return await db
      .select({
        id: groupThreads.id,
        title: groupThreads.title,
        description: groupThreads.description,
        createdAt: groupThreads.createdAt,
        createdBy: groupThreads.createdBy,
        messageCount: sql<number>`COUNT(${threadMessages.id})`.as('messageCount'),
      })
      .from(groupThreads)
      .leftJoin(threadMessages, eq(groupThreads.id, threadMessages.threadId))
      .where(eq(groupThreads.groupId, groupId))
      .groupBy(
        groupThreads.id,
        groupThreads.title,
        groupThreads.description,
        groupThreads.createdAt,
        groupThreads.createdBy
      )
      .orderBy(desc(groupThreads.createdAt));
  }

  async getThreadById(threadId: string): Promise<DBGroupThreadRow | null> {
    const [thread] = await db
      .select()
      .from(groupThreads)
      .where(eq(groupThreads.id, threadId))
      .limit(1);
    return thread || null;
  }

  async updateThread(threadId: string, updates: { title: string; description: string | null }): Promise<DBGroupThreadRow> {
    const [updatedThread] = await db
      .update(groupThreads)
      .set({
        title: updates.title,
        description: updates.description,
        updatedAt: new Date(),
      }as Partial<typeof groupThreads.$inferInsert>)
      .where(eq(groupThreads.id, threadId))
      .returning();
    return updatedThread;
  }

  async deleteThread(threadId: string): Promise<void> {
    // Delete all messages in the thread first (cascade should handle this, but being explicit)
    await db.delete(threadMessages).where(eq(threadMessages.threadId, threadId));
    // Delete the thread
    await db.delete(groupThreads).where(eq(groupThreads.id, threadId));
  }

  async addThreadMessage(message: DBThreadMessageInsert): Promise<DBThreadMessageRow> {
    const [newMessage] = await db
      .insert(threadMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async createThreadMessage(message: DBThreadMessageInsert): Promise<DBThreadMessageRow> {
    const [newMessage] = await db
      .insert(threadMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async updateThreadMessage(messageId: number, userId: string, content: string): Promise<void> {
    // Verify the message exists and belongs to the user
    const [message] = await db
      .select()
      .from(threadMessages)
      .where(and(
        eq(threadMessages.id, messageId),
        eq(threadMessages.userId, userId)
      ))
      .limit(1);

    if (!message) {
      throw new Error("Thread message not found or access denied");
    }

    // Update the message content
    await db
      .update(threadMessages)
      .set({ 
        message: content,
        updatedAt: new Date()
      }as Partial<typeof threadMessages.$inferInsert>)
      .where(eq(threadMessages.id, messageId));
    
    console.log(`✏️ STORAGE: Thread message ${messageId} updated for user ${userId}`);
  }

  async updateThreadMessageDuration(messageId: number, duration: number): Promise<void> {
    await db
      .update(threadMessages)
      .set({ duration: duration.toString(), updatedAt: new Date() }as Partial<typeof threadMessages.$inferInsert>)
      .where(eq(threadMessages.id, messageId));
  }

  async updateThreadMessageStatus(messageId: number, status: string, flaggedReason?: string | null, videoUrl?: string, thumbnailUrl?: string, bunnyVideoId?: string, audioFlagReason?: string): Promise<void> {
    const updateData: any = { 
      processingStatus: status,
      updatedAt: new Date()
    };

    if (flaggedReason !== undefined) updateData.flaggedReason = flaggedReason;
    if (audioFlagReason !== undefined) updateData.audioFlagReason = audioFlagReason;
    if (videoUrl) updateData.videoUrl = videoUrl;
    if (bunnyVideoId) updateData.bunnyVideoId = bunnyVideoId;
    // Note: thumbnailUrl is not in threadMessages schema, skip it

    await db
      .update(threadMessages)
      .set(updateData)
      .where(eq(threadMessages.id, messageId));
  }

  async updateThreadMessageVideo(messageId: number, videoData: {
    videoUrl?: string;
    thumbnailUrl?: string;
    bunnyVideoId?: string;
    transcriptionText?: string;
    extractedKeywords?: string;
  }): Promise<void> {
    const updateData: any = {
      updatedAt: new Date()
    };

    if (videoData.videoUrl) updateData.videoUrl = videoData.videoUrl;
    if (videoData.bunnyVideoId) updateData.bunnyVideoId = videoData.bunnyVideoId;
    // Note: thumbnailUrl and transcriptionText are not in the threadMessages schema
    // Only update fields that exist in the table

    await db
      .update(threadMessages)
      .set(updateData)
      .where(eq(threadMessages.id, messageId));
  }

  async getThreadMessages(threadId: string, limit = 50): Promise<Array<any>> {
    return await db
      .select({
        id: threadMessages.id,
        message: threadMessages.message,
        messageType: threadMessages.messageType,
        videoUrl: threadMessages.videoUrl,
        bunnyVideoId: threadMessages.bunnyVideoId,
        processingStatus: threadMessages.processingStatus,
        flaggedReason: threadMessages.flaggedReason,
        duration: threadMessages.duration,
        createdAt: threadMessages.createdAt,
        userId: threadMessages.userId,
        userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('userName'),
        userProfileImage: users.profileImageUrl,
      })
      .from(threadMessages)
      .leftJoin(users, eq(threadMessages.userId, users.id))
      .where(eq(threadMessages.threadId, threadId))
      .orderBy(threadMessages.createdAt)
      .limit(limit);
  }

  async getThreadMessageById(messageId: number): Promise<DBThreadMessageRow | null> {
    const [message] = await db
      .select()
      .from(threadMessages)
      .where(eq(threadMessages.id, messageId))
      .limit(1);
    
    return message || null;
  }

  async migrateGroupMessagesToThread(groupId: string, threadId: string): Promise<void> {
    // Get all group messages for this group
    const messages = await db
      .select()
      .from(groupMessages)
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(groupMessages.createdAt);

    // Convert and insert them as thread messages
    for (const message of messages) {
      await db.insert(threadMessages).values({
        threadId,
        userId: message.userId,
        message: message.message,
        createdAt: message.createdAt,
      }as typeof threadMessages.$inferInsert);
    }

    // Delete the old group messages
    await db
      .delete(groupMessages)
      .where(eq(groupMessages.groupId, groupId));
  }

  // User follows
  async followUser(followerId: string, followingId: string): Promise<void> {
    await db.insert(userFollows).values({ followerId, followingId });
    // Default notifications to enabled when following a user
    await this.updateFollowNotifications(followerId, followingId, true);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
  }

  async isUserFollowed(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(userFollows)
      .where(and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      ));
    return !!result;
  }

  async getUserStats(userId: string): Promise<{ followers: number; following: number; likes: number }> {
    const [followersCount] = await db
      .select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));

    const [followingUsersCount] = await db
      .select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    const [groupMembershipsCount] = await db
      .select({ count: count() })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));

    const [likesCount] = await db
      .select({ count: sql<number>`sum(${videos.likes})` })
      .from(videos)
      .where(eq(videos.userId, userId));

    return {
      followers: followersCount.count,
      following: followingUsersCount.count + groupMembershipsCount.count,
      likes: likesCount.count || 0,
    };
  }

  async updateFollowNotifications(followerId: string, followingId: string, enabled: boolean): Promise<void> {
    // Check if notification record exists
    const [existing] = await db
      .select()
      .from(userFollowNotifications)
      .where(and(
        eq(userFollowNotifications.followerId, followerId),
        eq(userFollowNotifications.followingId, followingId)
      ));

    if (existing) {
      // Update existing record
      await db
        .update(userFollowNotifications)
        .set({
          notificationsEnabled: enabled,
          updatedAt: new Date(),
        }as Partial<typeof userFollowNotifications.$inferInsert>)
        .where(and(
          eq(userFollowNotifications.followerId, followerId),
          eq(userFollowNotifications.followingId, followingId)
        ));
    } else {
      // Insert new record
      await db
        .insert(userFollowNotifications)
        .values({
          followerId,
          followingId,
          notificationsEnabled: enabled,
        }as typeof userFollowNotifications.$inferInsert);
    }
  }

  async getFollowNotificationStatus(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(userFollowNotifications)
      .where(and(
        eq(userFollowNotifications.followerId, followerId),
        eq(userFollowNotifications.followingId, followingId)
      ));
    return result?.notificationsEnabled ?? true;
  }

  async getOtherUserProfile(userId: string, viewerId: string): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;

    const stats = await this.getUserStats(userId);
    const isFollowed = await this.isUserFollowed(viewerId, userId);
    const notificationsEnabled = isFollowed ? await this.getFollowNotificationStatus(viewerId, userId) : false;

    return {
      ...user,
      stats,
      isFollowed,
      notificationsEnabled,
    };
  }

  async getUserVideosWithDistance(userId: string, viewerLat: number, viewerLng: number, viewerId: string): Promise<any[]> {
    const userVideos = await db
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        category: videos.category,
        latitude: videos.latitude,
        longitude: videos.longitude,
        views: videos.views,
        likes: videos.likes,
        createdAt: videos.createdAt,
      })
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.createdAt));

    // Check which videos the viewer has watched
    const watchedVideos = await db
      .select({ videoId: videoWatches.videoId })
      .from(videoWatches)
      .where(eq(videoWatches.userId, viewerId));
    
    const watchedVideoIds = new Set(watchedVideos.map(w => w.videoId));

    return userVideos.map(video => {
      const lat = video.latitude ? parseFloat(video.latitude.toString()) : 0;
      const lng = video.longitude ? parseFloat(video.longitude.toString()) : 0;
      const distance = this.calculateDistance(viewerLat, viewerLng, lat, lng);
      const hasWatched = watchedVideoIds.has(video.id);
      
      return {
        ...video,
        distance,
        hasWatched,
      };
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convert to meters
  }

  // Moderation operations
  async createModerationFlag(flag: DBModerationFlagInsert): Promise<DBModerationFlagRow> {
    const [newFlag] = await db.insert(moderationFlags).values(flag).returning();
    return newFlag;
  }

  async getModerationFlags(status?: string, contentType?: string, isAppeal?: boolean): Promise<Array<any>> {
    let query = db
      .select({
        id: moderationFlags.id,
        contentType: moderationFlags.contentType,
        contentId: moderationFlags.contentId,
        flaggedByUserId: moderationFlags.flaggedByUserId,
        flaggedByAI: moderationFlags.flaggedByAI,
        reason: moderationFlags.reason,
        status: moderationFlags.status,
        moderatorId: moderationFlags.moderatorId,
        moderatorDecision: moderationFlags.moderatorDecision,
        isAppeal: moderationFlags.isAppeal,
        contentSnapshot: moderationFlags.contentSnapshot,
        contextUrl: moderationFlags.contextUrl,
        createdAt: moderationFlags.createdAt,
        decidedAt: moderationFlags.decidedAt,
        flaggedByUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(moderationFlags)
      .leftJoin(users, eq(moderationFlags.flaggedByUserId, users.id));

    const conditions = [];
    if (status) conditions.push(eq(moderationFlags.status, status));
    if (contentType) conditions.push(eq(moderationFlags.contentType, contentType));
    if (isAppeal !== undefined) conditions.push(eq(moderationFlags.isAppeal, isAppeal));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(moderationFlags.createdAt));
    }

    return await query.orderBy(desc(moderationFlags.createdAt));
  }

  async getModerationFlag(flagId: string): Promise<any> {
    const [flag] = await db
      .select({
        id: moderationFlags.id,
        contentType: moderationFlags.contentType,
        contentId: moderationFlags.contentId,
        flaggedByUserId: moderationFlags.flaggedByUserId,
        flaggedByAI: moderationFlags.flaggedByAI,
        reason: moderationFlags.reason,
        status: moderationFlags.status,
        moderatorId: moderationFlags.moderatorId,
        moderatorDecision: moderationFlags.moderatorDecision,
        isAppeal: moderationFlags.isAppeal,
        contentSnapshot: moderationFlags.contentSnapshot,
        contextUrl: moderationFlags.contextUrl,
        createdAt: moderationFlags.createdAt,
        decidedAt: moderationFlags.decidedAt,
        flaggedByUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(moderationFlags)
      .leftJoin(users, eq(moderationFlags.flaggedByUserId, users.id))
      .where(eq(moderationFlags.id, flagId));

    return flag;
  }

  async updateModerationFlag(flagId: string, updates: Partial<DBModerationFlagRow>): Promise<void> {
    // First get the flag to know what content type and ID it refers to
    const [flag] = await db
      .select()
      .from(moderationFlags)
      .where(eq(moderationFlags.id, flagId));

    if (!flag) {
      throw new Error("Flag not found");
    }

    // Update the flag with the moderation decision
    await db
      .update(moderationFlags)
      .set({ ...updates, decidedAt: new Date() }as Partial<typeof moderationFlags.$inferInsert>)
      .where(eq(moderationFlags.id, flagId));

    // If the flag is being approved, make the content visible again
    if (updates.status === 'approved') {
      await db
        .update(moderationFlags)
        .set({ contentHidden: false } as Partial<typeof moderationFlags.$inferInsert>)
        .where(eq(moderationFlags.id, flagId));

      // Also update the content itself based on type
      if (flag.contentType === 'video') {
        await db
          .update(videos)
          .set({ 
            processingStatus: 'completed',
            flaggedReason: null,
            updatedAt: new Date()
          } as Partial<typeof videos.$inferInsert>)
          .where(eq(videos.id, flag.contentId));
      }
    }
  }

  async getModerationStats(): Promise<{ pending: number; flaggedComments: number; flaggedVideos: number; aiAppeals: number }> {
    const [pendingCount] = await db
      .select({ count: count() })
      .from(moderationFlags)
      .where(eq(moderationFlags.status, 'pending'));

    const [commentCount] = await db
      .select({ count: count() })
      .from(moderationFlags)
      .where(and(
        eq(moderationFlags.contentType, 'comment'),
        eq(moderationFlags.status, 'pending')
      ));

    const [videoCount] = await db
      .select({ count: count() })
      .from(moderationFlags)
      .where(and(
        eq(moderationFlags.contentType, 'video'),
        eq(moderationFlags.status, 'pending')
      ));

    const [appealCount] = await db
      .select({ count: count() })
      .from(moderationFlags)
      .where(and(
        eq(moderationFlags.isAppeal, true),
        eq(moderationFlags.status, 'pending')
      ));

    return {
      pending: pendingCount.count,
      flaggedComments: commentCount.count,
      flaggedVideos: videoCount.count,
      aiAppeals: appealCount.count,
    };
  }

  // Moderator access management
  async addModeratorAccess(access: DBModeratorAccessInsert): Promise<DBModeratorAccessRow> {
    const [newAccess] = await db.insert(moderatorAccess).values(access).returning();
    return newAccess;
  }

  async getModeratorAccess(): Promise<Array<DBModeratorAccessRow>> {
    return await db
      .select()
      .from(moderatorAccess)
      .where(eq(moderatorAccess.status, 'active'))
      .orderBy(desc(moderatorAccess.createdAt));
  }

  async removeModeratorAccess(accessId: string): Promise<void> {
    await db
      .update(moderatorAccess)
      .set({ status: 'revoked' } as Partial<typeof moderatorAccess.$inferInsert>)
      .where(eq(moderatorAccess.id, accessId));
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role }as Partial<typeof users.$inferInsert>)
      .where(eq(users.id, userId));
  }

  async activateModeratorAccess(email: string, userId: string): Promise<void> {
    await db
      .update(moderatorAccess)
      .set({ 
        userId, 
        status: 'active',
        activatedAt: new Date()
      } as Partial<typeof moderatorAccess.$inferInsert>)
      .where(eq(moderatorAccess.email, email));
  }

  async checkModeratorAccess(userId: string): Promise<boolean> {
    const [userAccess] = await db
      .select()
      .from(moderatorAccess)
      .where(and(
        eq(moderatorAccess.userId, userId),
        eq(moderatorAccess.status, 'active')
      ));
    return !!userAccess;
  }

  async getVideoAppealById(appealId: string): Promise<any> {
    const [appeal] = await db
      .select({
        id: moderationFlags.id,
        content_id: moderationFlags.contentId,
        appeal_message: moderationFlags.reason,
        status: moderationFlags.status,
        created_at: moderationFlags.createdAt,
        decided_at: moderationFlags.decidedAt,
        moderation_notes: moderationFlags.moderatorDecision,
        video_title: videos.title,
        original_flag_reason: videos.flaggedReason,
        moderation_results: videos.moderationResults,
        audio_flag_reason: videos.audioFlagReason,
        gcs_processing_url: videos.gcsProcessingUrl,
        bunny_review_video_id: videos.bunnyReviewVideoId,
        processing_status: videos.processingStatus,
        flagged_by_ai: moderationFlags.flaggedByAI,
        flagged_by_user_id: moderationFlags.flaggedByUserId
      })
      .from(moderationFlags)
      .innerJoin(videos, eq(moderationFlags.contentId, videos.id))
      .where(eq(moderationFlags.id, appealId));

    if (appeal) {
      // Determine the AI flag reason based on available data
      let aiFlagReason = 'Content flagged by AI moderation system';
      
      // First priority: Use specific audio flag reason if available
      if (appeal.audio_flag_reason) {
        aiFlagReason = appeal.audio_flag_reason;
      } else if (appeal.moderation_results) {
        try {
          const moderationData = JSON.parse(appeal.moderation_results);
          if (moderationData.audioModeration === 'failed' || moderationData.audioModeration === 'error') {
            aiFlagReason = 'Inappropriate language detected';
          } else if (moderationData.videoModeration === false) {
            aiFlagReason = 'Explicit content detected by Google Cloud Video AI';
          } else if (moderationData.flagReason && !moderationData.flagReason.includes('undefined')) {
            aiFlagReason = moderationData.flagReason;
          }
        } catch (error) {
          // Keep default reason
        }
      }
      
      (appeal as any).ai_flag_reason = aiFlagReason;
    }

    return appeal;
  }

  async approveVideoAppeal(appealId: string, moderatorId: string, notes?: string): Promise<any> {
    const appeal = await this.getVideoAppealById(appealId);
    if (!appeal) {
      throw new Error("Appeal not found");
    }

await db.update(moderationFlags)
.set({
    status: 'approved',
    moderatorDecision: notes || 'Appeal approved',
    decidedAt: new Date()
} as Partial<DBModerationFlagInsert>)
.where(eq(moderationFlags.id, appealId));

    // Restore video to public status
   await db.update(videos)
.set({
    processingStatus: 'completed',
    flaggedReason: null,
    updatedAt: new Date()
} as Partial<DBVideoInsert>)
.where(eq(videos.id, appeal.content_id));

    return { appealId, status: 'approved', videoId: appeal.content_id };
  }

  async rejectVideoAppeal(appealId: string, moderatorId: string, notes?: string): Promise<any> {
    const appeal = await this.getVideoAppealById(appealId);
    if (!appeal) {
      throw new Error("Appeal not found");
    }

    // Update appeal status
    await db.update(moderationFlags)
      .set({
        status: 'rejected',
        moderatorDecision: notes || 'Appeal rejected',
        decidedAt: new Date()
      }as Partial<typeof moderationFlags.$inferInsert>)
      .where(eq(moderationFlags.id, appealId));

    // Mark video as permanently rejected
    await db.update(videos)
      .set({
        processingStatus: 'permanently_rejected',
        flaggedReason: `Appeal rejected: ${notes || 'No reason provided'}`,
        updatedAt: new Date()
      }as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, appeal.content_id));

    return { appealId, status: 'rejected', videoId: appeal.content_id };
  }

  // Content flagging operations
  async flagContent(contentType: string, contentId: string, flaggedByUserId: string, flagReason: string, customReason?: string): Promise<DBModerationFlagRow> {
    // Get content snapshot and owner for notification
    let contentSnapshot: any = {};
    let contentTitle = '';

    try {
      if (contentType === 'video') {
        const [video] = await db.select().from(videos).where(eq(videos.id, contentId));
        if (video) {
          contentSnapshot = { title: video.title, description: video.description };
          contentTitle = video.title;
        }
      } else if (contentType === 'comment' || contentType === 'video_comment') {
        // Check if this is a thread message first
        try {
          const [threadMessage] = await db.select().from(threadMessages).where(eq(threadMessages.id, parseInt(contentId)));
          if (threadMessage) {
            contentSnapshot = { 
              message: threadMessage.message, 
              messageType: threadMessage.messageType,
              videoUrl: threadMessage.videoUrl 
            };
            contentTitle = threadMessage.message || 'Video message';
          } else {
            // If not a thread message, try video comments
            const [comment] = await db.select().from(videoComments).where(eq(videoComments.id, parseInt(contentId)));
            if (comment) {
              contentSnapshot = { content: comment.comment, commentType: comment.commentType };
            }
          }
        } catch (error) {
          // If thread message lookup fails, try video comments
          const [comment] = await db.select().from(videoComments).where(eq(videoComments.id, parseInt(contentId)));
          if (comment) {
            contentSnapshot = { content: comment.comment, commentType: comment.commentType };
          }
        }
      }
    } catch (error) {
      console.error('Error getting content snapshot:', error);
    }

    // Create moderation flag
   const [flag] = await db
  .insert(moderationFlags)
  .values({
    contentType,
    contentId,
    flaggedByUserId,          // this is fine; schema has it
    flaggedByAI: false,
    flagReason,
    customReason: customReason ?? null,
    status: 'pending',
    contentSnapshot: contentSnapshot ?? null,
    contextUrl: `/content/${contentType}/${contentId}`,
    contentHidden: true,
    decidedAt: null,
  } as typeof moderationFlags.$inferInsert)  // ← use `as`, not `satisfies`
  .returning();
  
    // Hide the content immediately pending review
    await this.hideContentPendingModeration(contentType, contentId);

    console.log(`🚩 Content flagged: ${contentType} ${contentId} by user ${flaggedByUserId} for ${flagReason}`);

    return flag;
  }

  async hideContentPendingModeration(contentType: string, contentId: string): Promise<void> {
    try {
      if (contentType === 'video') {
        await db.update(videos)
          .set({ 
            processingStatus: 'flagged_pending_review',
            updatedAt: new Date()
          }as Partial<DBVideoInsert>)
          .where(eq(videos.id, contentId));
      } else if (contentType === 'comment') {
        // For comments, we'll add a flagged status field later
        // For now, we'll rely on the moderation flags table
        console.log(`Comment ${contentId} flagged - will be filtered in queries`);
      } else if (contentType === 'video_comment') {
        // Similar handling for video comments
        console.log(`Video comment ${contentId} flagged - will be filtered in queries`);
      }
    } catch (error) {
      console.error(`Error hiding ${contentType} ${contentId}:`, error);
    }
  }

  async getContentOwner(contentType: string, contentId: string): Promise<string | null> {
    try {
      if (contentType === 'video') {
        const [video] = await db.select({ userId: videos.userId }).from(videos).where(eq(videos.id, contentId));
        return video?.userId || null;
      } else if (contentType === 'comment') {
        const [comment] = await db.select({ userId: videoComments.userId }).from(videoComments).where(eq(videoComments.id, parseInt(contentId)));
        return comment?.userId || null;
      } else if (contentType === 'video_comment') {
        // Check if this is a thread message first
        try {
          const [threadMessage] = await db.select({ userId: threadMessages.userId }).from(threadMessages).where(eq(threadMessages.id, parseInt(contentId)));
          if (threadMessage) {
            return threadMessage.userId;
          }
        } catch (error) {
          // If not a thread message, try video comments
        }
        const [comment] = await db.select({ userId: videoComments.userId }).from(videoComments).where(eq(videoComments.id, parseInt(contentId)));
        return comment?.userId || null;
      }
      return null;
    } catch (error) {
      console.error(`Error getting owner for ${contentType} ${contentId}:`, error);
      return null;
    }
  }

  async logModerationDecision(
    contentType: string,
    contentId: string,
    decision: 'approved' | 'rejected',
    reason: string,
    moderatorId: string | null = null,
    decisionType: string = 'ai_moderation'
  ): Promise<void> {
    try {
      const { randomUUID } = await import('crypto');
      
      // Only log decisions for videos since moderation_decisions table is video-specific
      if (contentType === 'video') {
        await db.insert(moderationDecisions).values({
          id: randomUUID(),
          videoId: contentId,
          moderatorId: moderatorId,
          decision: decision,
          reason: reason,
          decisionType: decisionType,
          createdAt: new Date()
        } as typeof moderationDecisions.$inferInsert);
        
        console.log(`📝 Logged moderation decision: ${decision} for ${contentType} ${contentId} (${decisionType})`);
      } else {
        // For non-video content (like images), just log to console for now
        console.log(`📝 Moderation decision: ${decision} for ${contentType} - ${reason}`);
      }
    } catch (error) {
      console.error('Error logging moderation decision:', error);
    }
  }

  async getModerationDecisionHistory(filters: {
    search: string;
    decision: string;
    moderator: string;
  }): Promise<any[]> {
    try {
      const baseQuery = db
        .select({
          id: moderationDecisions.id,
          videoId: moderationDecisions.videoId,
          moderatorId: moderationDecisions.moderatorId,
          decision: moderationDecisions.decision,
          reason: moderationDecisions.reason,
          createdAt: moderationDecisions.createdAt,
          videoTitle: videos.title,
          videoDescription: videos.description,
          videoThumbnailUrl: videos.thumbnailUrl,
          videoUserId: videos.userId,
          moderatorFirstName: users.firstName,
          moderatorLastName: users.lastName,
          moderatorEmail: users.email,
        })
        .from(moderationDecisions)
        .leftJoin(videos, eq(moderationDecisions.videoId, videos.id))
        .leftJoin(users, eq(moderationDecisions.moderatorId, users.id));

      const conditions = [];

      // Filter by decision type
      if (filters.decision && filters.decision !== 'all') {
        conditions.push(eq(moderationDecisions.decision, filters.decision));
      }

      // Filter by moderator
      if (filters.moderator && filters.moderator !== 'all') {
        conditions.push(eq(moderationDecisions.moderatorId, filters.moderator));
      }

      // Search filter (search in video title, description, or reason)
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(videos.title, searchTerm),
            ilike(videos.description, searchTerm),
            ilike(moderationDecisions.reason, searchTerm)
          )
        );
      }

 const query =
  conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;

const rawDecisions = await query.orderBy(desc(moderationDecisions.createdAt));
      
      // Transform the flat structure to match frontend expectations
      const decisions = rawDecisions.map(decision => ({
        id: decision.id,
        videoId: decision.videoId,
        moderatorId: decision.moderatorId,
        decision: decision.decision,
        reason: decision.reason,
        createdAt: decision.createdAt,
        // Frontend compatibility - provide both nested and flat properties
        contentTitle: decision.videoTitle,
        videoTitle: decision.videoTitle,
        contentType: 'video',
        video: {
          id: decision.videoId,
          title: decision.videoTitle,
          description: decision.videoDescription,
          thumbnailUrl: decision.videoThumbnailUrl,
          userId: decision.videoUserId,
        },
        moderator: {
          id: decision.moderatorId,
          firstName: decision.moderatorFirstName,
          lastName: decision.moderatorLastName,
          email: decision.moderatorEmail,
        }
      }));
      
      console.log(`📋 Found ${decisions.length} moderation decisions`);
      return decisions;
    } catch (error) {
      console.error("Error fetching moderation decision history:", error);
      return [];
    }
  }

  async hasUserPostedVideos(userId: string): Promise<boolean> {
    try {
      const videoCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(videos)
        .where(and(
          eq(videos.userId, userId),
          eq(videos.isActive, true)
        ));
      
      return videoCount[0]?.count > 0;
    } catch (error) {
      console.error("Error checking if user has posted videos:", error);
      return false;
    }
  }

  async markCommunityGuidelinesAccepted(userId: string): Promise<void> {
    try {
      await db
        .update(users)
        .set({ 
          communityGuidelinesAcceptedAt: new Date(),
          updatedAt: new Date()
        }as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, userId));
      
      console.log(`✅ User ${userId} accepted community guidelines`);
    } catch (error) {
      console.error("Error marking community guidelines accepted:", error);
    }
  }

  async hasCommunityGuidelinesAccepted(userId: string): Promise<boolean> {
    try {
      const user = await db
        .select({ communityGuidelinesAcceptedAt: users.communityGuidelinesAcceptedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      return user[0]?.communityGuidelinesAcceptedAt !== null;
    } catch (error) {
      console.error("Error checking community guidelines acceptance:", error);
      return false;
    }
  }

  async getModerators(): Promise<any[]> {
    try {
      const moderators = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role
        })
        .from(users)
        .innerJoin(moderatorAccess, eq(users.id, moderatorAccess.userId))
        .where(eq(moderatorAccess.status, 'active'));

      return moderators;
    } catch (error) {
      console.error("Error fetching moderators:", error);
      return [];
    }
  }

  async createStrikeForRejection(userId: string, contentType: string, contentId: string, reason: string, moderatorId: string): Promise<void> {
    try {
      const { randomUUID } = await import('crypto');
      
      // Get or create user strike record
      const [existingStrike] = await db
        .select()
        .from(userStrikes)
        .where(eq(userStrikes.userId, userId));

      let newStrikeCount = 1;
      let newStatus = 'warning';
      let suspensionEnd = null;

      if (existingStrike) {
        newStrikeCount = (existingStrike.currentStrikes || 0) + 1;
        
        if (newStrikeCount === 1) {
          newStatus = 'warning';
        } else if (newStrikeCount === 2) {
          newStatus = 'suspended';
          suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        } else if (newStrikeCount === 3) {
          newStatus = 'suspended';
          suspensionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        } else {
          newStatus = 'banned';
          suspensionEnd = null;
        }

        await db.update(userStrikes)
          .set({
            currentStrikes: newStrikeCount,
            totalViolations: (existingStrike.totalViolations || 0) + 1,
            accountStatus: newStatus,
            suspensionEndDate: suspensionEnd,
            lastViolationDate: new Date(),
            updatedAt: new Date()
          }as Partial<typeof userStrikes.$inferInsert>)
          .where(eq(userStrikes.userId, userId));
      } else {
        await db.insert(userStrikes).values({
          id: randomUUID(),
          userId: userId,
          currentStrikes: 1,
          totalViolations: 1,
          accountStatus: 'warning',
          suspensionEndDate: null,
          lastViolationDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }as typeof userStrikes.$inferInsert);
      }

      // Create violation record
      await db.insert(violations).values({
        id: randomUUID(),
        userId: userId,
        contentType: contentType,
        contentId: contentId,
        violationType: 'content_violation',
        reason: reason,
        moderatorId: moderatorId,
        strikeNumber: newStrikeCount,
        consequence: newStatus === 'warning' ? 'warning' : newStatus === 'banned' ? 'ban' : 'suspension',
        suspensionDays: newStatus === 'suspended' ? (newStrikeCount === 2 ? 7 : 30) : null,
        createdAt: new Date()
      }as typeof violations.$inferInsert);

      console.log(`⚖️ STRIKE CREATED: User ${userId} received strike ${newStrikeCount} (${newStatus}) for ${contentType} rejection`);
    } catch (error) {
      console.error('Error creating strike for rejection:', error);
      throw error;
    }
  }

  async getThreadMessage(messageId: number) {
    const message = await db
      .select()
      .from(threadMessages)
      .where(eq(threadMessages.id, messageId))
      .limit(1);
    
    return message[0] || null;
  }

  async deleteThreadMessage(messageId: number, userId: string) {
    // First verify the message belongs to the user
    const message = await this.getThreadMessage(messageId);
    if (!message || message.userId !== userId) {
      throw new Error("Thread message not found or access denied");
    }

    // Delete the thread message
    await db
      .delete(threadMessages)
      .where(eq(threadMessages.id, messageId));
    
    console.log(`🗑️ STORAGE: Thread message ${messageId} deleted for user ${userId}`);
  }

  async deleteVideoByTitle(title: string, userId: string) {
    // Find and delete video records with the specified title for the user
    const deletedVideos = await db
      .delete(videos)
      .where(and(
        eq(videos.title, title),
        eq(videos.userId, userId)
      ))
      .returning();
    
    if (deletedVideos.length > 0) {
      console.log(`🗑️ STORAGE: Deleted ${deletedVideos.length} video record(s) with title "${title}" for user ${userId}`);
    }
    
    return deletedVideos;
  }

  async updateThreadMessageModerationResults(messageId: number, moderationResults: string) {
    await db
      .update(threadMessages)
      .set({ 
        moderationResults: moderationResults,
        updatedAt: new Date()
      }as Partial<typeof threadMessages.$inferInsert>)
      .where(eq(threadMessages.id, messageId));
    
    console.log(`🔍 STORAGE: Moderation results updated for thread message ${messageId}`);
  }

  async getProcessingVideos(userId: string): Promise<DBVideoRow[]> {
    return await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.userId, userId),
        eq(videos.processingStatus, 'processing')
      ))
      .orderBy(desc(videos.createdAt));
  }

  async updateVideoStatus(videoId: string, status: string, flaggedReason?: string, audioFlagReason?: string): Promise<void> {
    await db
      .update(videos)
      .set({
        processingStatus: status,
        flaggedReason,
        audioFlagReason,
        updatedAt: new Date()
      } as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, videoId));
  }

  // Group member management methods
  async getGroupMembers(groupId: string): Promise<Array<any>> {
    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, groupId))
      .orderBy(groupMemberships.joinedAt);
    
    return members;
  }

  async searchUsers(query: string, excludeUserId: string): Promise<Array<any>> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const searchResults = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email,
        profileImageUrl: users.profileImageUrl
      })
      .from(users)
      .where(
        and(
          ne(users.id, excludeUserId),
          or(
            sql`LOWER(${users.firstName}) LIKE ${searchTerm}`,
            sql`LOWER(${users.lastName}) LIKE ${searchTerm}`,
            sql`LOWER(${users.username}) LIKE ${searchTerm}`,
            sql`LOWER(${users.email}) LIKE ${searchTerm}`
          )
        )
      )
      .limit(20);
    
    return searchResults;
  }

  async getUserById(userId: string): Promise<DBUserRow | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  // Quest management methods
  async getActiveQuests(): Promise<any[]> {
    try {
      const activeQuests = await db
        .select({
          id: quests.id,
          creatorId: quests.creatorId,
          title: quests.title,
          description: quests.description,
          imageUrl: quests.imageUrl,
          latitude: quests.latitude,
          longitude: quests.longitude,
          radiusInFeet: quests.radiusInFeet,
          requiredParticipants: quests.requiredParticipants,
          rewardPerParticipant: quests.rewardPerParticipant,
          totalReward: quests.totalReward,
          startDate: quests.startDate,
          endDate: quests.endDate,
          status: quests.status,
          isActive: quests.isActive,
          createdAt: quests.createdAt,
          updatedAt: quests.updatedAt,
          // Creator information
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
          creatorUsername: users.username,
          creatorProfileImageUrl: users.profileImageUrl
        })
        .from(quests)
        .innerJoin(users, eq(quests.creatorId, users.id))
        .where(and(
          eq(quests.isActive, true),
          eq(quests.status, 'active'),
          sql`${quests.endDate} > NOW()`
        ))
        .orderBy(desc(quests.createdAt));

      // Transform data to include creator object
      const questsWithCreator = activeQuests.map(quest => ({
        ...quest,
        creator: {
          id: quest.creatorId,
          firstName: quest.creatorFirstName,
          lastName: quest.creatorLastName,
          username: quest.creatorUsername,
          profileImageUrl: quest.creatorProfileImageUrl
        }
      }));

      console.log('📊 QUEST STORAGE: Retrieved', questsWithCreator.length, 'active quests with creator info');
      return questsWithCreator;
    } catch (error) {
      console.error("Error fetching active quests:", error);
      return [];
    }
  }

  async createQuest(questData: any): Promise<string> {
    try {
      const [newQuest] = await db
        .insert(quests)
        .values(questData)
        .returning({ id: quests.id });

      console.log('✅ QUEST STORAGE: Created quest', newQuest.id);
      return newQuest.id;
    } catch (error) {
      console.error("Error creating quest:", error);
      throw error;
    }
  }

  async searchVideosByContent(query: string): Promise<DBVideoRow[]> {
    try {
      // Search videos where the extracted keywords contain the search query
      // This searches the transcribed audio content from AI moderation
      const searchTerm = "%" + query.toLowerCase() + "%";
      
      return await db
        .select(getTableColumns(videos)) 
        .from(videos)
        .leftJoin(users, eq(videos.userId, users.id))
        .where(
          and(
            eq(videos.isActive, true),
            eq(videos.processingStatus, 'approved'),
            or(
              // Search in title and description
              ilike(videos.title, searchTerm),
              ilike(videos.description, searchTerm),
              // Search in video transcripts (speech-to-text content)
              ilike(videos.transcriptionText, searchTerm)
            )
          )
        )
        .orderBy(desc(videos.createdAt))
        .limit(50);
    } catch (error) {
      console.error("Error searching videos by content:", error);
      return [];
    }
  }

  async awardCoins(userId: string, amount: number): Promise<void> {
    console.log("💰 Awarding", amount, "coins to user:", userId);
    
    await db
      .update(users)
      .set({ 
        gemCoins: sql`${users.gemCoins} + ${amount}`,
        updatedAt: new Date()
      }as Partial<typeof users.$inferInsert>)
      .where(eq(users.id, userId));
      
    console.log("💰 Coins awarded successfully");
  }

  async recordPayment(payment: { userId: string; stripePaymentIntentId: string; amount: number; currency: string; coinAmount: number; packagePrice: string; status: string }): Promise<void> {
    console.log("💳 Recording payment:", payment.stripePaymentIntentId);
    
    await db.insert(payments).values({
      userId: payment.userId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
      coinAmount: payment.coinAmount,
      status: payment.status,
      completedAt: payment.status === 'completed' ? new Date() : null
    }as typeof payments.$inferInsert);
    
    console.log("💳 Payment recorded successfully");
  }

  async getPaymentByStripeId(stripePaymentIntentId: string): Promise<any | undefined> {
    console.log("💳 Looking up payment by Stripe ID:", stripePaymentIntentId);
    
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
      .limit(1);
      
    return payment[0];
  }

  async getVideoAppeals(): Promise<any[]> {
    try {
      console.log("🎬 STORAGE: Fetching video appeals from moderation flags");
      
      const appeals = await db
        .select({
          id: moderationFlags.id,
          videoId: moderationFlags.contentId,
          userId: moderationFlags.flaggedByUserId,
          appealStatus: moderationFlags.status,
          appealMessage: moderationFlags.reason,
          createdAt: moderationFlags.createdAt,
          decidedAt: moderationFlags.decidedAt,
          moderatorDecision: moderationFlags.moderatorDecision,
          video_title: videos.title,
          original_flag_reason: videos.flaggedReason,
          moderation_results: videos.moderationResults,
          audio_flag_reason: videos.audioFlagReason,
          processing_status: videos.processingStatus,
          flagged_by_ai: moderationFlags.flaggedByAI,
          flagged_by_user_id: moderationFlags.flaggedByUserId
        })
        .from(moderationFlags)
        .innerJoin(videos, eq(moderationFlags.contentId, videos.id))
        .where(and(
          eq(moderationFlags.contentType, 'video'),
          eq(moderationFlags.isAppeal, true)
        ))
        .orderBy(desc(moderationFlags.createdAt));

      console.log(`🎬 STORAGE: Found ${appeals.length} video appeals`);
      return appeals;
    } catch (error) {
      console.error("Error fetching video appeals:", error);
      return [];
    }
  }

  // Lantern methods
  async updateUserLanterns(userId: string, lanternCount: number): Promise<void> {
    await db
      .update(users)
      .set({ lanterns: lanternCount, updatedAt: new Date() }as Partial<typeof users.$inferInsert>)
      .where(eq(users.id, userId));
    
    console.log(`🏮 STORAGE: Updated lanterns for user ${userId} to ${lanternCount}`);
  }



  // XP System Implementation
  async awardXP(userId: string, xpAmount: number, activity: string): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number }> {
    try {
      // Get current user XP data
      const [currentUser] = await db
        .select({ currentXP: users.currentXP, currentLevel: users.currentLevel })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser) {
        throw new Error("User not found");
      }

      const oldXP = currentUser.currentXP || 0;
      const oldLevel = currentUser.currentLevel || 1;
      const newXP = oldXP + xpAmount;
      
      // SEQUENTIAL LEVEL ADVANCEMENT: Only advance one level at a time
      let finalLevel = oldLevel;
      let leveledUp = false;
      
      // Check if user can level up (only advance by 1 level maximum)
      const nextLevelXPRequired = calculateXPRequiredForLevel(oldLevel + 1);
      if (newXP >= nextLevelXPRequired) {
        finalLevel = oldLevel + 1;
        leveledUp = true;
        console.log(`🎉 LEVEL UP: User ${userId} advanced from level ${oldLevel} to level ${finalLevel}!`);
      }
      
      const nextLevelXP = calculateXPRequiredForLevel(finalLevel + 1);

      // Update user XP and levelrm -rf .git
      await db
        .update(users)
        .set({
          currentXP: newXP,
          currentLevel: finalLevel,
          updatedAt: new Date()
        }as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, userId));

      console.log(`🌟 XP AWARD: User ${userId} gained ${xpAmount} XP for ${activity} (${oldXP} → ${newXP})`);

      return {
        leveledUp: leveledUp,
        oldLevel: oldLevel,
        newLevel: finalLevel,
        currentXP: newXP,
        nextLevelXP: nextLevelXP
      };
    } catch (error) {
      console.error("Error awarding XP:", error);
      throw error;
    }
  }

  async updateUserXP(userId: string, currentXP: number, currentLevel: number): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          currentXP: currentXP,
          currentLevel: currentLevel,
          updatedAt: new Date()
        }as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("Error updating user XP:", error);
      throw error;
    }
  }

  async getUserXPData(userId: string): Promise<{ currentXP: number; currentLevel: number } | undefined> {
    try {
      const [user] = await db
        .select({ currentXP: users.currentXP, currentLevel: users.currentLevel })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user ? { 
        currentXP: user.currentXP || 0, 
        currentLevel: user.currentLevel || 1 
      } : undefined;
    } catch (error) {
      console.error("Error fetching user XP data:", error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();

