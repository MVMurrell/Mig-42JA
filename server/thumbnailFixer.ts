import { db } from './db.js';
import { videos } from '../shared/schema.js';
import { eq, and, like } from 'drizzle-orm';

class ThumbnailFixer {
  async fixExistingThumbnails(): Promise<void> {
    console.log('🔧 Starting thumbnail fix for existing videos...');
    
    // Find all videos that have SVG fallback thumbnails but have Bunny video IDs
    const videosWithFallbackThumbnails = await db
      .select()
      .from(videos)
      .where(
        and(
          like(videos.thumbnailUrl, 'data:image/svg+xml%'),
          eq(videos.isActive, true)
        )
      );

    console.log(`Found ${videosWithFallbackThumbnails.length} videos with fallback thumbnails`);

    for (const video of videosWithFallbackThumbnails) {
      if (!video.bunnyVideoId) {
        console.log(`Skipping ${video.id} - no Bunny video ID`);
        continue;
      }

      try {
        console.log(`🔧 Fixing thumbnail for video ${video.id} (${video.title})`);
        const realThumbnail = await this.fetchBunnyThumbnail(video.bunnyVideoId);
        
        if (realThumbnail) {
          await db
            .update(videos)
            .set({ thumbnailUrl: realThumbnail })
            .where(eq(videos.id, video.id));
          
          console.log(`✅ Updated thumbnail for ${video.title}`);
        } else {
          console.log(`⚠️ Could not fetch thumbnail for ${video.title}`);
        }
      } catch (error) {
        console.error(`❌ Error fixing thumbnail for ${video.title}:`, error);
      }
    }

    console.log('🔧 Thumbnail fix completed');
  }

  private async fetchBunnyThumbnail(bunnyVideoId: string): Promise<string | null> {
    try {
      const thumbnailUrl = `https://vz-7c674c55-8ff.b-cdn.net/${bunnyVideoId}/thumbnail.jpg`;
      console.log(`Fetching Bunny.net thumbnail: ${thumbnailUrl}`);
      
      const response = await fetch(thumbnailUrl);
      if (response.ok) {
        const thumbnailBuffer = await response.arrayBuffer();
        const base64Thumbnail = `data:image/jpeg;base64,${Buffer.from(thumbnailBuffer).toString('base64')}`;
        console.log(`✅ Bunny.net thumbnail fetched for ${bunnyVideoId}`);
        return base64Thumbnail;
      } else {
        console.error(`Failed to fetch thumbnail: ${response.status} ${response.statusText}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching Bunny.net thumbnail for ${bunnyVideoId}:`, error);
      return null;
    }
  }

  async fixSingleVideo(videoId: string): Promise<boolean> {
    try {
      const video = await db
        .select()
        .from(videos)
        .where(eq(videos.id, videoId))
        .limit(1);

      if (video.length === 0) {
        console.error(`Video ${videoId} not found`);
        return false;
      }

      const videoData = video[0];
      if (!videoData.bunnyVideoId) {
        console.error(`Video ${videoId} has no Bunny video ID`);
        return false;
      }

      const realThumbnail = await this.fetchBunnyThumbnail(videoData.bunnyVideoId);
      if (realThumbnail) {
        await db
          .update(videos)
          .set({ thumbnailUrl: realThumbnail })
          .where(eq(videos.id, videoId));
        
        console.log(`✅ Updated thumbnail for video ${videoId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error fixing single video thumbnail:`, error);
      return false;
    }
  }
}

export const thumbnailFixer = new ThumbnailFixer();