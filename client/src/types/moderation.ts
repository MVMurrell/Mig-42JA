export interface ModerationStats {
  pending: number;
  flaggedComments: number;
  flaggedVideos: number;
  aiAppeals: number;
}

export interface VideoAppeal {
  id: string;
  video_title: string;
  original_flag_reason: string;
  appeal_message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  flagged_by_ai: boolean;
  flagged_by_user_id?: string;
}

export interface Moderator {
  id: string;
  email: string;
  role: string;
  granted_at: string;
}