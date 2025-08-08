import { db } from "./server/db.ts";
import { notifications, users, videos, groups, groupThreads } from "./shared/schema.ts";

async function createComprehensiveNotifications() {
  try {
    console.log("Creating comprehensive notification examples...");

    // Get user and content data for realistic notifications
    const [sampleUser] = await db.select().from(users).limit(1);
    const [sampleVideo] = await db.select().from(videos).limit(1);
    const [sampleGroup] = await db.select().from(groups).limit(1);
    const [sampleThread] = await db.select().from(groupThreads).limit(1);

    if (!sampleUser) {
      console.log("No users found. Creating sample user...");
      await db.insert(users).values({
        id: "sample-user-123",
        email: "sample@example.com",
        firstName: "Sample",
        lastName: "User",
        username: "sampleuser"
      });
    }

    const userId = sampleUser?.id || "sample-user-123";
    const videoId = sampleVideo?.id || null;
    const groupId = sampleGroup?.id || null;
    const threadId = sampleThread?.id || null;

    // Create all 14 notification types
    const notificationData = [
      // 1. Video Like
      {
        userId,
        type: "video_like",
        title: "New like on your video",
        message: "username1 liked your video 'Sample Video'.",
        relatedVideoId: videoId,
        relatedUserId: "user-liker-123",
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: videoId ? `/video/${videoId}` : null
      },
      
      // 2. Video Comment
      {
        userId,
        type: "video_comment", 
        title: "New comment on your video",
        message: "username3 commented: 'This reminds me of a silent film.'",
        relatedVideoId: videoId,
        relatedUserId: "user-commenter-456",
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: videoId ? `/video/${videoId}?focus=comments` : null
      },

      // 3. Video Comment (Video Response)
      {
        userId,
        type: "video_comment_video",
        title: "New video comment on your video", 
        message: "username4 added a video message to your Gem.",
        relatedVideoId: videoId,
        relatedUserId: "user-video-commenter-789",
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: videoId ? `/video/${videoId}` : null
      },

      // 4. Text Comment
      {
        userId,
        type: "comment",
        title: "Comment on your video",
        message: "username3 commented on your video 'Sample Video'.",
        relatedVideoId: videoId,
        relatedUserId: "user-commenter-456", 
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: videoId ? `/video/${videoId}?focus=comments` : null
      },

      // 5. New Collector
      {
        userId,
        type: "new_collector",
        title: "New collector",
        message: "username5 started collecting your gems.",
        relatedUserId: "user-collector-101",
        actionUrl: "/profile/user-collector-101"
      },

      // 6. Group Invitation
      {
        userId,
        type: "group_invitation",
        title: "Group invitation",
        message: "username13 added you to their group.",
        relatedGroupId: groupId,
        relatedUserId: "user-group-owner-202",
        actionUrl: groupId ? `/group/${groupId}` : "/groups"
      },

      // 7. Nearby Gem
      {
        userId,
        type: "gem_nearby",
        title: "Gem nearby",
        message: "A gem you collect is nearby. [username]'s gem is within 500ft of your current location.",
        relatedVideoId: videoId,
        relatedUserId: "user-nearby-303",
        latitude: "36.05720000",
        longitude: "-94.16060000",
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: "/?lat=36.05720000&lng=-94.16060000&zoom=18"
      },

      // 8. Content Flagged by User
      {
        userId,
        type: "content_flagged_user",
        title: "Your content was flagged",
        message: "Your video comment was flagged by another user. Your video is temporarily disabled for further review.",
        relatedVideoId: videoId,
        relatedContentType: "video_comment",
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: "/profile?tab=content"
      },

      // 9. Content Flagged by AI
      {
        userId,
        type: "content_flagged_ai", 
        title: "Your content was flagged",
        message: "'I hate to tell you buddy but your mother is a...' is temporarily disabled for further review.",
        relatedContentType: "comment",
        actionUrl: "/profile?tab=content"
      },

      // 10. Comment Deleted by Moderation
      {
        userId,
        type: "content_deleted_comment",
        title: "Content deleted",
        message: "'I hate to tell you buddy but your mother is a...' has been deleted. Repeat offenses can lead to account suspension or deletion.",
        relatedVideoId: videoId,
        relatedContentType: "comment",
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: videoId ? `/video/${videoId}` : "/profile?tab=content"
      },

      // 11. Video Comment Deleted by Moderation  
      {
        userId,
        type: "content_deleted_video_comment",
        title: "Video comment deleted",
        message: "Your video comment has been deleted by our content moderation team. Repeat offenses can lead to account suspension or deletion.",
        relatedVideoId: videoId,
        relatedContentType: "video_comment", 
        thumbnailUrl: sampleVideo?.thumbnailUrl || null,
        actionUrl: videoId ? `/video/${videoId}` : "/profile?tab=content"
      },

      // 12. Thread Message Deleted
      {
        userId,
        type: "content_deleted_thread_message",
        title: "Thread message deleted",
        message: "Your thread message has been deleted by our content moderation team. Repeat offenses can lead to account suspension or deletion.",
        relatedGroupId: groupId,
        relatedThreadId: threadId,
        relatedContentType: "thread_message",
        actionUrl: groupId && threadId ? `/group/${groupId}?thread=${threadId}` : "/groups"
      },

      // 13. Thread Video Deleted
      {
        userId,
        type: "content_deleted_thread_video", 
        title: "Thread video deleted",
        message: "Your thread video has been deleted by our content moderation team. Repeat offenses can lead to account suspension or deletion.",
        relatedGroupId: groupId,
        relatedThreadId: threadId,
        relatedContentType: "thread_video",
        actionUrl: groupId && threadId ? `/group/${groupId}?thread=${threadId}` : "/groups"
      },

      // 14. Thread Message Flagged
      {
        userId,
        type: "thread_message_flagged",
        title: "Thread message flagged", 
        message: "Your thread message was flagged by another user and is under review.",
        relatedGroupId: groupId,
        relatedThreadId: threadId,
        relatedContentType: "thread_message",
        actionUrl: "/profile?tab=content"
      }
    ];

    // Insert all notifications
    await db.insert(notifications).values(notificationData);
    
    console.log(`✅ Created ${notificationData.length} comprehensive notifications successfully`);
    console.log("Notification types created:");
    notificationData.forEach((n, i) => {
      console.log(`${i + 1}. ${n.type}: ${n.title}`);
    });
    
  } catch (error) {
    console.error("Error creating notifications:", error);
  }
}

createComprehensiveNotifications();