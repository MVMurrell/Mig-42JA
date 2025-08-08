import React, { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Users, MapPin, Settings, MessageCircle, UserMinus, UserPlus, Play, Edit, Plus, Send, Smile, Trash2, VideoIcon, Video, AlertTriangle, MoreVertical, Flag, AlertCircle, X, Gem } from "lucide-react";
import FlagButton from "@/components/FlagButton.tsx";
import { apiRequest, queryClient } from "@/lib/queryClient.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu.tsx";
import { formatDistance } from "@/lib/distanceUtils.ts";
import { isUnauthorizedError } from "@/lib/authUtils.ts";
import GroupEditModal from "@/components/GroupEditModal.tsx";
import VideoMessageRecorder from "@/components/VideoMessageRecorder.tsx";
import VideoRejectionModal from "@/components/VideoRejectionModal.tsx";
import VideoPlayerModal from "@/components/VideoPlayerModal.tsx";
import VideoAnalysisModal from "@/components/VideoAnalysisModal.tsx";
import { VideoCommentPlayer } from "@/components/VideoPlayerModal.tsx";
import { AddMembersModal } from "@/components/AddMembersModal.tsx";

// Category gem icons for unwatched videos
import redIcon from "@assets/Property 1=Red.png";
import blueIcon from "@assets/Property 1=Blue.png";
import greenIcon from "@assets/Property 1=Green.png";
import orangeIcon from "@assets/Property 1=Orange.png";
import purpleIcon from "@assets/Purple_1749397661787.png";
import pinkIcon from "@assets/Property 1=Pink.png";
import yellowIcon from "@assets/Property 1=Yellow.png";
import blackIcon from "@assets/Black_1749397661786.png";
import aquaIcon from "@assets/Aqua_1749397661785.png";
import cobaltIcon from "@assets/Cobalt_1749397661786.png";
import lilacIcon from "@assets/Lilac_1749397661786.png";
import neonGreenIcon from "@assets/Neon Green_1749397661787.png";
import mintIcon from "@assets/Mint_1749397661787.png";

// Category icons mapping for gems
const categoryIcons: { [key: string]: string } = {
  Art: redIcon,
  Education: orangeIcon,
  Review: yellowIcon,
  Games: greenIcon,
  Events: blueIcon,
  Products: purpleIcon,
  Services: pinkIcon,
  Challenge: blackIcon,
  Chat: aquaIcon,
  FYI: cobaltIcon,
  Love: lilacIcon,
  Nature: neonGreenIcon,
  Coupon: mintIcon,
  Adventure: redIcon,
  Food: orangeIcon,
  Entertainment: purpleIcon,
  Sports: yellowIcon,
  Travel: blueIcon,
  Lifestyle: greenIcon,
  Fitness: orangeIcon,
  default: pinkIcon
};

interface GroupVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  latitude: string;
  longitude: string;
  thumbnailUrl?: string;
  userId: string;
  views: number;
  likes: number;
  createdAt: string;
  watchedByUser: boolean;
  distance?: number;
  userProfileImageUrl?: string;
}

interface GroupThread {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string;
  creatorName: string;
  creatorProfileImage: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  coverImageUrl?: string;
  createdBy: string;
  isPublic: boolean;
  memberCount: number;
  latitude: string;
  longitude: string;
  createdAt: string;
  updatedAt: string;
}

interface MembershipStatus {
  isMember: boolean;
  isOwner: boolean;
}

export default function GroupProfilePage() {
  const [, params] = useRoute("/group/:id");
  const [, setLocation] = useLocation();
  const groupId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"videos" | "threads">("videos");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [showEditThread, setShowEditThread] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [editingThread, setEditingThread] = useState<any>(null);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadDescription, setThreadDescription] = useState('');
  const [editThreadTitle, setEditThreadTitle] = useState('');
  const [editThreadDescription, setEditThreadDescription] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<any>(null);
  const [showThreadMessageRejectionModal, setShowThreadMessageRejectionModal] = useState(false);
  const [showThreadMessageAnalysisModal, setShowThreadMessageAnalysisModal] = useState(false);
  const [forceRenderCounter, setForceRenderCounter] = useState(0);
  const [showThreadVideoFullscreen, setShowThreadVideoFullscreen] = useState(false);
  const [selectedFullscreenThreadVideo, setSelectedFullscreenThreadVideo] = useState<any>(null);
  const [threadVideoQuality, setThreadVideoQuality] = useState('720p');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['720p']);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<any>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [threadVideoCurrentTime, setThreadVideoCurrentTime] = useState(0);
  const [threadVideoDuration, setThreadVideoDuration] = useState(0);
  const [isThreadVideoPlaying, setIsThreadVideoPlaying] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoForModal, setSelectedVideoForModal] = useState<any>(null);

  // Check for modal restoration on component mount and when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRestoreModal = urlParams.get('restoreAddMembers') === 'true';
    
    console.log('GroupProfile restoration check:', { 
      shouldRestoreModal, 
      url: window.location.href,
      currentModalState: showAddMembersModal
    });
    
    if (shouldRestoreModal) {
      try {
        const modalState = sessionStorage.getItem('addMembersModal');
        console.log('Found modal state in sessionStorage:', modalState);
        
        if (modalState) {
          const parsedState = JSON.parse(modalState);
          console.log('Parsed modal state:', parsedState);
          
          // Restore modal immediately
          setShowAddMembersModal(true);
          console.log('Modal restored and opened');
          
          // Clean up the URL parameter but keep the session storage for now
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          
          // Remove session storage after a short delay to ensure modal is fully restored
          setTimeout(() => {
            sessionStorage.removeItem('addMembersModal');
            console.log('Session storage cleaned up');
          }, 1000);
        } else {
          console.log('No modal state found in sessionStorage');
        }
      } catch (error) {
        console.error('Error restoring modal state:', error);
      }
    }
  }, [window.location.search]); // Watch for URL search parameter changes

  // No URL parameter handling needed with browser history approach

  // This useEffect moved below after groupThreads query declaration

  // Function to detect available video qualities
  const detectAvailableQualities = async (videoUrl: string) => {
    try {
      // Get the base URL without quality path
      const baseUrl = videoUrl.replace(/\/(240p|360p|480p|720p|1080p)\/video\.m3u8$/, '');
      
      // Fetch the master playlist to see what qualities are available
      const response = await fetch(baseUrl);
      if (!response.ok) return ['720p']; // fallback
      
      const playlist = await response.text();
      const qualities = [];
      
      // Parse the master playlist for available quality streams
      const lines = playlist.split('\n');
      for (const line of lines) {
        if (line.includes('/video.m3u8')) {
          const match = line.match(/(\d+p)\/video\.m3u8/);
          if (match) {
            qualities.push(match[1]);
          }
        }
      }
      
      // Sort qualities by resolution (lowest to highest)
      const sortOrder = ['240p', '360p', '480p', '720p', '1080p'];
      return qualities.sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));
    } catch (error) {
      console.error('Error detecting qualities:', error);
      return ['720p']; // fallback
    }
  };

  // Direct handler function without useCallback to prevent stale closures
  const handleThreadMessageClick = (message: any) => {
    console.log("handleThreadMessageClick called with:", message);
    // First set the selected message, then open modal
    setSelectedThreadMessage(message);
    // Use timeout to ensure state update completes before opening modal
    setTimeout(() => {
      setShowThreadMessageRejectionModal(true);
      setForceRenderCounter(prev => prev + 1); // Force re-render
    }, 0);
    console.log("State setters called for message:", message);
  };

  // Track state changes for debugging and force re-render
  useEffect(() => {
    console.log("🔄 State change detected - showThreadMessageRejectionModal:", showThreadMessageRejectionModal);
    console.log("🔄 State change detected - selectedThreadMessage:", selectedThreadMessage);
    
    // Force a micro-task to ensure modal gets updated props
    if (showThreadMessageRejectionModal && selectedThreadMessage) {
      setTimeout(() => {
        console.log("⏰ Delayed check - modal should be open now");
      }, 0);
    }
  }, [showThreadMessageRejectionModal, selectedThreadMessage]);

  // Detect available qualities when a thread video is selected for fullscreen
  useEffect(() => {
    if (selectedFullscreenThreadVideo && selectedFullscreenThreadVideo.videoUrl) {
      detectAvailableQualities(selectedFullscreenThreadVideo.videoUrl).then(qualities => {
        setAvailableQualities(qualities);
        // Reset to highest available quality or 720p if available
        const preferredQuality = qualities.includes('720p') ? '720p' : qualities[qualities.length - 1];
        setThreadVideoQuality(preferredQuality);
      });
    }
  }, [selectedFullscreenThreadVideo]);

  // Get user location for distance calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Group data query with distance calculation
  const { data: group, isLoading: isLoadingGroup } = useQuery<Group & { distance?: number }>({
    queryKey: [`/api/groups/${groupId}`, userLocation?.lat, userLocation?.lng],
    queryFn: () => {
      let url = `/api/groups/${groupId}`;
      if (userLocation) {
        url += `?lat=${userLocation.lat}&lng=${userLocation.lng}`;
      }
      return fetch(url).then(res => res.json());
    },
    enabled: !!groupId,
  });

  // Membership status query
  const { data: membershipStatus, refetch: refetchMembership } = useQuery<MembershipStatus>({
    queryKey: [`/api/groups/${groupId}/membership`],
    enabled: !!groupId && !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });



  // Group videos query
  const { data: groupVideos = [], isLoading: isLoadingVideos } = useQuery<GroupVideo[]>({
    queryKey: [`/api/groups/${groupId}/videos`],
    enabled: !!groupId,
  });

  // Group threads query
  const { data: groupThreads = [], isLoading: isLoadingThreads } = useQuery<GroupThread[]>({
    queryKey: [`/api/groups/${groupId}/threads`],
    enabled: !!groupId,
  });

  // Check for stored video comment context on component mount - moved here after groupThreads declaration
  useEffect(() => {
    let storedContext = sessionStorage.getItem('groupVideoCommentContext');
    
    // If sessionStorage context is missing, try localStorage backup
    if (!storedContext) {
      const backupContext = localStorage.getItem('groupVideoCommentContextBackup');
      if (backupContext) {
        console.log('🔄 Using backup context from localStorage');
        storedContext = backupContext;
        // Restore to sessionStorage
        sessionStorage.setItem('groupVideoCommentContext', backupContext);
      }
    }
    
    console.log('🔄 Checking for group video restoration context:', !!storedContext, groupThreads?.length, 'loading:', isLoadingThreads);
    
    if (storedContext && groupThreads && groupThreads.length > 0 && !isLoadingThreads) {
      try {
        const context = JSON.parse(storedContext);
        console.log('🔄 Attempting to restore group video context:', context);
        
        if (context.groupId === groupId && context.showVideoModal) {
          // Find the thread first
          const targetThread = groupThreads?.find(t => t.id === context.threadId);
          console.log('🔄 Available threads:', groupThreads.map(t => t.id));
          console.log('🔄 Looking for thread:', context.threadId);
          console.log('🔄 Found target thread:', !!targetThread, targetThread?.id);
          
          if (targetThread) {
            console.log('🔄 Setting selected thread and opening messaging');
            // Set selected thread to load messages
            setSelectedThread(targetThread);
            setShowMessaging(true);
            
            // Wait a bit for the thread to be set, then fetch messages
            setTimeout(() => {
              console.log('🔄 Fetching messages for thread:', targetThread.id);
              fetch(`/api/threads/${targetThread.id}/messages`)
                .then(res => {
                  if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                  }
                  return res.json();
                })
                .then(messages => {
                  console.log('🔄 Loaded messages for restoration:', messages.length);
                  console.log('🔄 Message IDs:', messages.map((m: any) => `${m.id} (${m.messageType})`));
                  console.log('🔄 Looking for message ID:', context.videoId);
                  
                  const targetMessage = messages.find((msg: any) => msg.id === context.videoId && msg.messageType === 'video');
                  console.log('🔄 Found target video message:', !!targetMessage, targetMessage?.id);
                  
                  if (targetMessage) {
                    console.log('🔄 Restoring video modal with message:', targetMessage);
                    setSelectedThreadMessage(targetMessage);
                    setSelectedFullscreenThreadVideo(targetMessage);
                    setShowThreadVideoFullscreen(true);
                    console.log('🔄 Successfully restored group thread video modal');
                  } else {
                    console.log('🔄 Target video message not found in messages');
                  }
                  
                  // Clear the stored context
                  sessionStorage.removeItem('groupVideoCommentContext');
                })
                .catch(error => {
                  console.error('🔄 Failed to load messages for restoration:', error);
                  sessionStorage.removeItem('groupVideoCommentContext');
                });
            }, 500);
          } else {
            console.log('🔄 Target thread not found, clearing context');
            sessionStorage.removeItem('groupVideoCommentContext');
            localStorage.removeItem('groupVideoCommentContextBackup');
          }
        }
      } catch (error) {
        console.error('Failed to parse stored group video comment context:', error);
        sessionStorage.removeItem('groupVideoCommentContext');
      }
    } else if (storedContext) {
      console.log('🔄 Context exists but threads not loaded yet, waiting...');
    }
  }, [groupId, groupThreads, isLoadingThreads]);

  // Handle video modal restoration from profile navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openVideoId = urlParams.get('openVideo');
    
    if (openVideoId && groupVideos?.length > 0) {
      console.log('Group: Restoring video modal for videoId:', openVideoId);
      
      // Find the video to open
      const videoToOpen = groupVideos.find((v: any) => v.id === openVideoId);
      if (videoToOpen) {
        // Clean up URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Open the video player modal
        setSelectedVideoForModal([videoToOpen]);
        setShowVideoModal(true);
      }
    }
  }, [groupVideos]);

  // Thread messages query with automatic polling for processing videos
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/threads", selectedThread?.id, "messages"],
    queryFn: () => {
      if (!selectedThread) throw new Error("No thread selected");
      return fetch(`/api/threads/${selectedThread.id}/messages`).then(res => res.json());
    },
    enabled: !!selectedThread && showMessaging,
    refetchInterval: (data) => {
      // Always poll every 5 seconds to catch status changes
      // This ensures users see final status updates without manual refresh
      if (!data || !Array.isArray(data)) return 5000;
      
      const hasProcessingVideos = data.some((msg: any) => 
        msg.messageType === 'video' && msg.processingStatus === 'processing'
      );
      
      // Poll more frequently (3s) when processing, less frequently (5s) otherwise
      return hasProcessingVideos ? 3000 : 5000;
    },
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the data
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/groups/${groupId}/join`, "POST");
    },
    onSuccess: async () => {
      toast({
        title: "Joined Group",
        description: "You have successfully joined the group!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/membership`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      await refetchMembership();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to join group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/groups/${groupId}/leave`, "DELETE");
    },
    onSuccess: async () => {
      toast({
        title: "Left Group",
        description: "You have left the group.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/membership`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      await refetchMembership();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to leave group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async ({ groupId, title, description }: { groupId: string; title: string; description: string }) => {
      return apiRequest(`/api/groups/${groupId}/threads`, "POST", { title, description });
    },
    onSuccess: () => {
      toast({ title: "Thread created successfully!" });
      setShowCreateThread(false);
      setThreadTitle("");
      setThreadDescription("");
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/threads`] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('403:')) {
        toast({
          title: "Permission Denied",
          description: "Only group members can create threads. Please join the group first.",
          variant: "destructive",
        });
      } else if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to create thread. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      return apiRequest(`/api/threads/${threadId}/messages`, "POST", { content });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread?.id, "messages"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const editThreadMutation = useMutation({
    mutationFn: async ({ threadId, title, description }: { threadId: string; title: string; description: string }) => {
      return apiRequest(`/api/threads/${threadId}`, "PATCH", { title, description });
    },
    onSuccess: () => {
      toast({ title: "Thread updated successfully!" });
      setShowEditThread(false);
      setEditingThread(null);
      setEditThreadTitle("");
      setEditThreadDescription("");
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/threads`] });
    }
  });

  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      return apiRequest(`/api/threads/${threadId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Thread deleted successfully!" });
      setShowMessaging(false);
      setSelectedThread(null);
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/threads`] });
    }
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      return apiRequest(`/api/thread-messages/${messageId}`, "PUT", { content });
    },
    onSuccess: () => {
      setEditingMessageId(null);
      setEditMessageText('');
      queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread?.id, "messages"] });
      toast({
        title: "Message updated",
        description: "Your message has been updated successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to update message. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/thread-messages/${messageId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread?.id, "messages"] });
      toast({
        title: "Message deleted",
        description: "Your message has been deleted.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete message. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleDeleteMessage = (message: any) => {
    setMessageToDelete(message);
    setShowDeleteMessageConfirm(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      deleteMessageMutation.mutate(messageToDelete.id);
    } finally {
      setShowDeleteMessageConfirm(false);
      setMessageToDelete(null);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !threadTitle.trim()) return;
    
    createThreadMutation.mutate({
      groupId,
      title: threadTitle,
      description: threadDescription
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !messageText.trim()) return;
    
    sendMessageMutation.mutate({
      threadId: selectedThread.id,
      content: messageText
    });
  };

  const handleEditThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThread || !editThreadTitle.trim()) return;
    
    editThreadMutation.mutate({
      threadId: editingThread.id,
      title: editThreadTitle,
      description: editThreadDescription
    });
  };

  const startEditThread = (thread: any) => {
    setEditingThread(thread);
    setEditThreadTitle(thread.title);
    setEditThreadDescription(thread.description || '');
    setShowEditThread(true);
  };

  const showDeleteConfirmation = (threadId: string) => {
    setThreadToDelete(threadId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteThread = () => {
    if (threadToDelete) {
      deleteThreadMutation.mutate(threadToDelete);
      setShowDeleteConfirm(false);
      setThreadToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setThreadToDelete(null);
  };

  // Delete thread message mutation
  const deleteThreadMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest(`/api/threads/messages/${messageId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Message Deleted",
        description: "The video message has been deleted.",
      });
      setSelectedThreadMessage(null);
      if (selectedThread) {
        queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread.id, "messages"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Appeal thread message mutation
  const appealThreadMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest(`/api/threads/messages/${messageId}/appeal`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Appeal Submitted",
        description: "Your appeal has been submitted for review.",
      });
      setSelectedThreadMessage(null);
      if (selectedThread) {
        queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread.id, "messages"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to submit appeal. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleVideoClick = (video: GroupVideo) => {
    // Navigate to map with target video
    setLocation(`/?target=${video.id}`);
  };

  // Effect to handle thread restoration from URL parameters
  useEffect(() => {
    if (groupThreads && groupThreads.length > 0 && !isLoadingThreads) {
      const urlParams = new URLSearchParams(window.location.search);
      const restoreThreadId = urlParams.get('restoreThread');
      
      if (restoreThreadId && !selectedThread && !showMessaging) {
        const threadToRestore = groupThreads.find((t: any) => t.id === restoreThreadId);
        if (threadToRestore) {
          console.log('Restoring thread from profile navigation:', threadToRestore.title);
          setSelectedThread(threadToRestore);
          setShowMessaging(true);
          
          // Clean up URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState(null, '', newUrl);
        } else {
          console.log('Thread not found for restoration:', restoreThreadId);
          // Clean up URL if thread not found
          const newUrl = window.location.pathname;
          window.history.replaceState(null, '', newUrl);
        }
      }
    }
  }, [groupThreads, isLoadingThreads, selectedThread, showMessaging]);

  if (!groupId) {
    return <div>Group not found</div>;
  }

  if (isLoadingGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!group) {
    return <div>Group not found</div>;
  }

  const isOwner = membershipStatus?.isOwner || false;
  const isMember = membershipStatus?.isMember || false;

  // Show messaging view when thread is selected
  if (showMessaging && selectedThread) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="flex items-center justify-between p-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="random-hover"
              onMouseEnter={(e) => {
                const colors = [
                  'hsl(0, 72%, 51%)',     // Jemzy Red
                  'hsl(24, 100%, 48%)',   // Jemzy Orange  
                  'hsl(207, 90%, 54%)',   // Jemzy Blue
                  'hsl(142, 71%, 45%)',   // Jemzy Green
                  'hsl(259, 53%, 70%)',   // Jemzy Purple
                  'hsl(45, 100%, 50%)',   // Jemzy Gold
                  'hsl(320, 70%, 55%)',   // Pink
                  'hsl(280, 65%, 60%)',   // Violet
                  'hsl(180, 70%, 50%)',   // Cyan
                  'hsl(50, 85%, 55%)',    // Bright Yellow
                  'hsl(15, 80%, 60%)',    // Coral
                  'hsl(270, 75%, 65%)',   // Magenta
                ];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                e.currentTarget.style.setProperty('--hover-color', randomColor);
              }}
              onClick={() => {
                setShowMessaging(false);
                setSelectedThread(null);
                // Clear rejection modal state when navigating back
                setShowThreadMessageRejectionModal(false);
                setSelectedThreadMessage(null);
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h1 className="text-lg font-semibold">{selectedThread.title}</h1>
              <p className="text-sm text-gray-500">{group?.name}</p>
            </div>
            <div className="w-10" />
          </div>
          {/* Thread Description */}
          {selectedThread.description && (
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-600">{selectedThread.description}</p>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex flex-col h-screen">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ paddingBottom: '80px' }}>
            {(messages as any[])?.length > 0 ? (
              (messages as any[]).map((message: any) => {
                return (
                  <div key={message.id} className="flex gap-3 group">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Thread message: Navigating to user profile:', message.userId);
                      
                      // Store current page and modal context for back navigation
                      sessionStorage.setItem('profileReferrer', JSON.stringify({
                        path: window.location.pathname + window.location.search,
                        source: 'group_thread_avatar',
                        modalContext: {
                          isInThread: !!selectedThread,
                          threadId: selectedThread?.id,
                          threadName: selectedThread?.name
                        }
                      }));
                      
                      if (message.userId === user?.id) {
                        window.location.href = '/profile';
                      } else {
                        window.location.href = `/profile/${message.userId}`;
                      }
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={message.userProfileImage || 'https://via.placeholder.com/32x32/e2e8f0/64748b?text=?'}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  </button>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Thread message: Navigating to user profile:', message.userId);
                          
                          // Store current page and modal context for back navigation
                          sessionStorage.setItem('profileReferrer', JSON.stringify({
                            path: window.location.pathname + window.location.search,
                            source: 'group_thread_username',
                            modalContext: {
                              isInThread: !!selectedThread,
                              threadId: selectedThread?.id,
                              threadName: selectedThread?.name
                            }
                          }));
                          
                          if (message.userId === user?.id) {
                            window.location.href = '/profile';
                          } else {
                            window.location.href = `/profile/${message.userId}`;
                          }
                        }}
                        className="font-medium text-sm hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {message.userName || 'Anonymous'}
                      </button>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Show video message if it's a video type */}
                    {message.messageType === 'video' && message.videoUrl && message.processingStatus === 'approved' ? (
                      <div className="mt-2">
                        <VideoCommentPlayer 
                          videoUrl={message.videoUrl}
                          duration={message.duration}
                          thumbnailUrl={message.thumbnailUrl}
                          commentData={message}
                          onFullscreen={() => {
                            console.log('Opening group thread video in fullscreen:', message.id);
                            setSelectedFullscreenThreadVideo(message);
                            setShowThreadVideoFullscreen(true);
                          }}
                        />
                      </div>
                    ) : message.messageType === 'video' && message.processingStatus === 'flagged' ? (
                      <div className="mt-2">
                        <div 
                          className="w-48 h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-red-200 cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleThreadMessageClick(message);
                          }}
                        >
                          <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                          <p className="text-xs text-red-600 text-center px-2">
                            Content flagged for review
                          </p>
                          {message.flaggedReason && (
                            <p className="text-xs text-gray-500 text-center px-2 mt-1">
                              {message.flaggedReason}
                            </p>
                          )}
                          <p className="text-xs text-blue-600 text-center px-2 mt-1">
                            Tap for details
                          </p>
                        </div>
                      </div>
                    ) : message.messageType === 'video' && ['processing', 'uploaded', 'pending', 'pending_ai_analysis', 'failed', 'rejected_by_moderation', 'rejected_by_ai', 'rejected', 'flagged', 'under_appeal'].includes(message.processingStatus) ? (
                      <div className="mt-2">
                        <div 
                          onClick={() => {
                            if (message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged' || message.processingStatus === 'failed') {
                              setSelectedThreadMessage(message);
                              setShowThreadMessageRejectionModal(true);
                            } else if (message.processingStatus === 'processing' || message.processingStatus === 'uploaded' || message.processingStatus === 'pending' || message.processingStatus === 'pending_ai_analysis') {
                              setSelectedThreadMessage(message);
                              setShowThreadMessageAnalysisModal(true);
                            }
                          }}
                          className={`w-48 h-32 rounded-lg overflow-hidden relative group border-2 cursor-pointer ${
                          message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged' || message.processingStatus === 'failed' ? 'bg-red-100 border-red-200 cursor-pointer hover:bg-red-50' : 
                          message.processingStatus === 'under_appeal' ? 'bg-blue-100 border-blue-200' :
                          // Check if processing has been stuck for too long (>10 minutes)
                          (message.processingStatus === 'processing' || message.processingStatus === 'uploaded' || message.processingStatus === 'pending' || message.processingStatus === 'pending_ai_analysis') && 
                          new Date().getTime() - new Date(message.createdAt).getTime() > 600000 ? 'bg-orange-100 border-orange-200' :
                          'bg-blue-100 border-blue-200'
                        } ${(message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged' || message.processingStatus === 'failed' || message.processingStatus === 'processing' || message.processingStatus === 'uploaded' || message.processingStatus === 'pending' || message.processingStatus === 'pending_ai_analysis') ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
                        {(message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged') && (
                          <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
                            <p className="text-xs text-red-600 text-center px-2">
                              Tap for details
                            </p>
                          </div>
                        )}
                          <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${
                            message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged' ? 'bg-gradient-to-br from-red-200 to-red-300' :
                            message.processingStatus === 'failed' ? 'bg-gradient-to-br from-red-200 to-red-300' :
                            message.processingStatus === 'under_appeal' ? 'bg-gradient-to-br from-blue-200 to-blue-300' :
                            // Check if processing has been stuck for too long (>10 minutes)
                            (message.processingStatus === 'processing' || message.processingStatus === 'uploaded' || message.processingStatus === 'pending' || message.processingStatus === 'pending_ai_analysis') && 
                            new Date().getTime() - new Date(message.createdAt).getTime() > 600000 ? 'bg-gradient-to-br from-orange-200 to-orange-300' :
                            'bg-gradient-to-br from-blue-200 to-blue-300'
                          }`}>
                            <Video className={`w-8 h-8 mb-3 ${
                              message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged' ? 'text-red-600' :
                              message.processingStatus === 'failed' ? 'text-red-600' :
                              message.processingStatus === 'under_appeal' ? 'text-blue-600 animate-pulse' :
                              // Check if processing has been stuck for too long (>10 minutes)
                              (message.processingStatus === 'processing' || message.processingStatus === 'uploaded' || message.processingStatus === 'pending' || message.processingStatus === 'pending_ai_analysis') && 
                              new Date().getTime() - new Date(message.createdAt).getTime() > 600000 ? 'text-orange-600 animate-bounce' :
                              'text-blue-600 animate-spin'
                            }`} />
                            
                            <div className="text-center">
                              <div className={`text-sm font-medium mb-1 ${
                                message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged' ? 'text-red-700' :
                                message.processingStatus === 'failed' ? 'text-red-700' :
                                message.processingStatus === 'under_appeal' ? 'text-blue-700' :
                                // Check if processing has been stuck for too long (>10 minutes)
                                (message.processingStatus === 'processing' || message.processingStatus === 'uploaded' || message.processingStatus === 'pending' || message.processingStatus === 'pending_ai_analysis') && 
                                new Date().getTime() - new Date(message.createdAt).getTime() > 600000 ? 'text-orange-700' :
                                'text-blue-700'
                              }`}>
                                {(() => {
                                  if (message.processingStatus === 'processing') {
                                    return 'Processing';
                                  } else if (message.processingStatus === 'uploaded') {
                                    return 'Analyzing';
                                  } else if (message.processingStatus === 'pending') {
                                    return 'Reviewing';
                                  } else if (message.processingStatus === 'pending_ai_analysis') {
                                    return 'AI Analyzing';
                                  } else if (message.processingStatus === 'failed') {
                                    return 'Failed';
                                  } else if (message.processingStatus === 'rejected_by_moderation') {
                                    return 'Rejected';
                                  } else if (message.processingStatus === 'rejected_by_ai') {
                                    return 'AI Flagged';
                                  } else if (message.processingStatus === 'rejected') {
                                    return 'Rejected';
                                  } else if (message.processingStatus === 'flagged') {
                                    return 'Under Review';
                                  } else if (message.processingStatus === 'under_appeal') {
                                    return 'Appeal Pending';
                                  } else {
                                    return 'Processing';
                                  }
                                })()}
                              </div>
                              
                              <div className={`text-xs ${
                                message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged' ? 'text-red-600' :
                                message.processingStatus === 'failed' ? 'text-red-600' :
                                message.processingStatus === 'under_appeal' ? 'text-blue-600' :
                                // Check if processing has been stuck for too long (>10 minutes)
                                (message.processingStatus === 'processing' || message.processingStatus === 'uploaded' || message.processingStatus === 'pending') && 
                                new Date().getTime() - new Date(message.createdAt).getTime() > 600000 ? 'text-orange-600' :
                                'text-blue-600'
                              }`}>
                                {(() => {
                                  if (message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'rejected_by_ai' || message.processingStatus === 'rejected' || message.processingStatus === 'flagged') {
                                    return 'Tap for details';
                                  } else if (message.processingStatus === 'failed') {
                                    return 'Tap for details';
                                  } else if (message.processingStatus === 'under_appeal') {
                                    return 'In review';
                                  } else {
                                    const minutesElapsed = Math.floor((new Date().getTime() - new Date(message.createdAt).getTime()) / 60000);
                                    if (minutesElapsed > 10) {
                                      return `${minutesElapsed}m elapsed`;
                                    }
                                    return 'Please wait';
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : message.messageType === 'video' && message.processingStatus === 'approved' && !message.videoUrl ? (
                      <div className="mt-2 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                          <div>
                            <p className="text-sm text-red-700 font-medium">Broken video message</p>
                            <p className="text-xs text-red-600">Video processing failed</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-100"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/thread-messages/${message.id}`, {
                                method: 'DELETE'
                              });
                              if (response.ok) {
                                queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread.id, "messages"] });
                              }
                            } catch (error) {
                              console.error('Error deleting broken message:', error);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        {editingMessageId === message.id ? (
                          <div className="flex-1">
                            <Input
                              value={editMessageText}
                              onChange={(e) => setEditMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (editMessageText.trim()) {
                                    editMessageMutation.mutate({
                                      messageId: message.id,
                                      content: editMessageText.trim()
                                    });
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingMessageId(null);
                                  setEditMessageText('');
                                }
                              }}
                              className="text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (editMessageText.trim()) {
                                    editMessageMutation.mutate({
                                      messageId: message.id,
                                      content: editMessageText.trim()
                                    });
                                  }
                                }}
                                disabled={editMessageMutation.isPending || !editMessageText.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditMessageText('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : message.messageType === 'text' && (message.message || message.content) ? (
                          <>
                            <p className="text-sm text-gray-700 flex-1">{message.message || message.content}</p>
                            {message.userId === user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingMessageId(message.id);
                                      setEditMessageText(message.message || '');
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteMessage(message)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </>
                        ) : !message.message && !message.content && message.messageType !== 'video' ? (
                          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <AlertTriangle className="w-5 h-5 text-gray-500 mr-2" />
                              <div>
                                <p className="text-sm text-gray-700 font-medium">Empty message</p>
                                <p className="text-xs text-gray-600">This message has no content</p>
                              </div>
                            </div>
                            {message.userId === user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-600 border-gray-300 hover:bg-gray-100"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/thread-messages/${message.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (response.ok) {
                                      queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread.id, "messages"] });
                                    }
                                  } catch (error) {
                                    console.error('Error deleting empty message:', error);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            )}
          </div>

          {/* Fixed Message Input at Bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
            <div className="max-w-md mx-auto">
              {isMember ? (
                <form onSubmit={handleSendMessage}>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => setShowVideoRecorder(true)}
                    >
                      <VideoIcon className="w-4 h-4" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="px-2"
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-2" side="top">
                        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                          {/* Smileys & Emotion */}
                          {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              className="p-1 hover:bg-gray-100 rounded text-lg"
                              onClick={() => setMessageText(prev => prev + emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                          {/* Hearts & Symbols */}
                          {['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💖', '💗', '💘', '💝', '💞', '💟', '💌', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              className="p-1 hover:bg-gray-100 rounded text-lg"
                              onClick={() => setMessageText(prev => prev + emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                          {/* Objects & Activities */}
                          {['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🪘', '🥁', '🎹', '🎷', '🎺', '🎸', '🪕', '🎻'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              className="p-1 hover:bg-gray-100 rounded text-lg"
                              onClick={() => setMessageText(prev => prev + emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-3 px-4 bg-gray-50 border rounded-lg">
                  <p className="text-sm text-gray-600 mb-3">
                    Join {group?.name} to participate in this conversation
                  </p>
                  <Button
                    onClick={() => joinGroupMutation.mutate()}
                    disabled={joinGroupMutation.isPending}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {joinGroupMutation.isPending ? 'Joining...' : 'Join Group'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Message Recorder */}
        <VideoMessageRecorder
          isOpen={showVideoRecorder}
          onClose={() => setShowVideoRecorder(false)}
          threadId={selectedThread.id}
          onMessageSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread.id, "messages"] });
          }}
        />

        {/* Thread Message Rejection Modal - For messaging view */}
        {selectedThreadMessage && (
          <VideoRejectionModal
            isOpen={showThreadMessageRejectionModal}
            onClose={() => {
              console.log("Modal onClose called");
              setShowThreadMessageRejectionModal(false);
              setSelectedThreadMessage(null);
            }}
            comment={selectedThreadMessage}
            isComment={true}
            isThreadMessage={true}
            threadId={selectedThread?.id}
          />
        )}

        {/* Thread Message Analysis Modal - For messaging view */}
        <VideoAnalysisModal
          isOpen={showThreadMessageAnalysisModal}
          onClose={() => {
            setShowThreadMessageAnalysisModal(false);
            setSelectedThreadMessage(null);
          }}
          message={selectedThreadMessage}
          threadId={selectedThread?.id}
          user={user}
        />

        {/* Delete Message Confirmation Modal - For messaging view */}
        {showDeleteMessageConfirm && messageToDelete && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Message
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteMessageConfirm(false);
                    setMessageToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteMessage}
                  disabled={deleteMessageMutation.isPending}
                >
                  {deleteMessageMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Thread Video Fullscreen Modal - For messaging view */}
        {showThreadVideoFullscreen && selectedFullscreenThreadVideo && (
          <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowThreadVideoFullscreen(false);
                setSelectedFullscreenThreadVideo(null);
              }}
              className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
              aria-label="Close fullscreen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Fullscreen Video Player */}
            <div 
              className="relative w-full h-full flex items-center justify-center cursor-pointer fullscreen-thread-video"
              onClick={(e) => {
                // Only handle clicks on the video container itself, not on overlays
                if (e.target === e.currentTarget) {
                  const videoElement = document.querySelector('.fullscreen-thread-video video') as HTMLVideoElement;
                  if (videoElement) {
                    if (videoElement.paused) {
                      videoElement.play();
                    } else {
                      videoElement.pause();
                    }
                  }
                }
              }}
            >
              <VideoCommentPlayer 
                key={`${selectedFullscreenThreadVideo.id}-${threadVideoQuality}`}
                videoUrl={`${selectedFullscreenThreadVideo.videoUrl}/${threadVideoQuality}/video.m3u8`}
                duration={selectedFullscreenThreadVideo.duration}
                thumbnailUrl={selectedFullscreenThreadVideo.thumbnailUrl}
                commentData={selectedFullscreenThreadVideo}
                isFullscreen={true}
                onTimeUpdate={(currentTime, duration, isPlaying) => {
                  setThreadVideoCurrentTime(currentTime);
                  setThreadVideoDuration(duration);
                  setIsThreadVideoPlaying(isPlaying);
                }}
              />
            </div>

            {/* Profile Info Overlay - Top Left */}
            <div 
              className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 max-w-xs cursor-pointer hover:bg-black/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedFullscreenThreadVideo.userId) {
                  // Navigate to profile - use browser navigation to maintain history stack
                  console.log('Group thread video: Navigating to profile page');
                  
                  // Store current page and modal context for back navigation
                  sessionStorage.setItem('profileReferrer', JSON.stringify({
                    path: window.location.pathname + window.location.search,
                    source: 'group_thread_fullscreen_video',
                    modalContext: {
                      isInThread: !!selectedThread,
                      threadId: selectedThread?.id,
                      threadName: selectedThread?.name
                    }
                  }));
                  
                  if (selectedFullscreenThreadVideo.userId === user?.id) {
                    window.location.href = '/profile';
                  } else {
                    window.location.href = `/profile/${selectedFullscreenThreadVideo.userId}`;
                  }
                }
              }}
            >
              <div className="flex items-center space-x-3">
                {selectedFullscreenThreadVideo.userProfileImage ? (
                  <img 
                    src={selectedFullscreenThreadVideo.userProfileImage} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                    {selectedFullscreenThreadVideo.userName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate hover:underline">
                    {selectedFullscreenThreadVideo.userName || 'Anonymous'}
                  </p>
                  <p className="text-gray-300 text-xs">
                    {new Date(selectedFullscreenThreadVideo.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedFullscreenThreadVideo.message && (
                <p className="text-gray-200 text-xs mt-2 line-clamp-2">
                  {selectedFullscreenThreadVideo.message}
                </p>
              )}
            </div>

            {/* Video Controls/Scrubber - Bottom */}
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center space-x-3 text-white">
                {/* Current Time */}
                <span className="text-xs font-mono min-w-[35px]">
                  {Math.floor(threadVideoCurrentTime / 60)}:{String(Math.floor(threadVideoCurrentTime % 60)).padStart(2, '0')}
                </span>
                
                {/* Progress Bar */}
                <div className="flex-1 h-1 bg-gray-600 rounded-full cursor-pointer relative">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-150"
                    style={{ width: `${threadVideoDuration > 0 ? (threadVideoCurrentTime / threadVideoDuration) * 100 : 0}%` }}
                  />
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-150"
                    style={{ left: `${threadVideoDuration > 0 ? (threadVideoCurrentTime / threadVideoDuration) * 100 : 0}%`, marginLeft: '-6px' }}
                  />
                </div>
                
                {/* Total Duration */}
                <span className="text-xs font-mono min-w-[35px]">
                  {Math.floor(threadVideoDuration / 60)}:{String(Math.floor(threadVideoDuration % 60)).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Three-dot overflow menu positioned on the screen - Bottom Right */}
            <div className="fixed bottom-20 right-6 z-[9999]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className="w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center cursor-pointer shadow-lg border border-white/20 relative"
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      minWidth: '48px',
                      minHeight: '48px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      pointerEvents: 'auto',
                      userSelect: 'none',
                      position: 'relative',
                      zIndex: 9999
                    }}
                    onClick={(e) => {
                      console.log('Thread video three-dot button clicked!', e);
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical 
                      className="w-6 h-6" 
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[10000]">
                  {/* Flag option - only show for videos not owned by current user */}
                  {user && selectedFullscreenThreadVideo.userId !== user.id && (
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <FlagButton
                          contentType="video_comment"
                          contentId={selectedFullscreenThreadVideo?.id?.toString() || ''}
                          contentTitle={selectedFullscreenThreadVideo?.message || 'Thread Video'}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 p-0 h-auto"
                        />
                      </div>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Only show separator if flag option is visible */}
                  {user && selectedFullscreenThreadVideo.userId !== user.id && (
                    <DropdownMenuSeparator />
                  )}
                  
                  {/* Video quality options */}
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm font-medium text-gray-900 cursor-default">
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Quality
                    </div>
                    <span className="text-xs text-gray-500">{threadVideoQuality}</span>
                  </div>
                  
                  {availableQualities.map((quality) => (
                    <DropdownMenuItem 
                      key={quality}
                      onClick={() => {
                        if (availableQualities.includes(quality)) {
                          setThreadVideoQuality(quality);
                        }
                      }} 
                      className="pl-8"
                    >
                      {threadVideoQuality === quality && '✓ '}{quality}{quality === '720p' ? ' (Default)' : ''}
                    </DropdownMenuItem>
                  ))}
                  
                  {/* Delete option - only show for message owner */}
                  {user && selectedFullscreenThreadVideo.userId === user.id && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={async () => {
                          console.log('Delete thread video:', selectedFullscreenThreadVideo.id);
                          try {
                            const response = await fetch(`/api/thread-messages/${selectedFullscreenThreadVideo.id}`, {
                              method: 'DELETE',
                            });
                            
                            if (response.ok) {
                              // Close fullscreen and refresh messages
                              setSelectedFullscreenThreadVideo(null);
                              
                              // Refresh the thread messages
                              queryClient.invalidateQueries({ queryKey: [`/api/threads/${groupId}/messages`] });
                              
                              toast({
                                title: "Success",
                                description: "Video message deleted successfully",
                              });
                            } else {
                              throw new Error('Failed to delete message');
                            }
                          } catch (error) {
                            console.error('Error deleting thread message:', error);
                            toast({
                              title: "Error",
                              description: "Failed to delete video message",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Comment
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="random-hover"
            onMouseEnter={(e) => {
              const colors = [
                'hsl(0, 72%, 51%)',     // Jemzy Red
                'hsl(24, 100%, 48%)',   // Jemzy Orange  
                'hsl(207, 90%, 54%)',   // Jemzy Blue
                'hsl(142, 71%, 45%)',   // Jemzy Green
                'hsl(259, 53%, 70%)',   // Jemzy Purple
                'hsl(45, 100%, 50%)',   // Jemzy Gold
                'hsl(320, 70%, 55%)',   // Pink
                'hsl(280, 65%, 60%)',   // Violet
                'hsl(180, 70%, 50%)',   // Cyan
                'hsl(50, 85%, 55%)',    // Bright Yellow
                'hsl(15, 80%, 60%)',    // Coral
                'hsl(270, 75%, 65%)',   // Magenta
              ];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              e.currentTarget.style.setProperty('--hover-color', randomColor);
            }}
            onClick={() => setLocation("/groups")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Group Profile</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Group Info */}
      <div className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-shrink-0 self-center sm:self-start">
            {group.coverImageUrl ? (
              <img
                src={group.coverImageUrl}
                alt={group.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header with title and badges */}
            <div className="text-center sm:text-left">
              <h2 className="text-lg sm:text-xl font-bold truncate">{group.name}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                {isOwner && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                    Owner
                  </Badge>
                )}
                {!group.isPublic && (
                  <Badge variant="outline" className="border-gray-300 text-xs">
                    Private
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 mt-3 text-center sm:text-left text-sm sm:text-base">{group.description}</p>

            {/* Stats */}
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{group.memberCount} members</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{group.distance ? `${formatDistance(group.distance, 'miles')} away` : 'Location-based'}</span>
              </div>
            </div>

            {/* Action Buttons - Below stats, inline side by side */}
            <div className="flex justify-center sm:justify-start gap-2 mt-4">
              {isOwner ? (
                <>
                  {!group.isPublic && (
                    <Button 
                      onClick={() => setShowAddMembersModal(true)} 
                      size="sm"
                      variant="outline"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Manage Members
                    </Button>
                  )}
                  <Button 
                    onClick={() => setShowEditModal(true)} 
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Group
                  </Button>
                </>
              ) : isMember ? (
                <Button
                  variant="outline"
                  onClick={() => leaveGroupMutation.mutate()}
                  disabled={leaveGroupMutation.isPending}
                  size="sm"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Leave
                </Button>
              ) : (
                <Button
                  onClick={() => joinGroupMutation.mutate()}
                  disabled={joinGroupMutation.isPending}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition-colors ${
              activeTab === "videos"
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Videos ({groupVideos.length})
          </button>
          <button
            onClick={() => setActiveTab("threads")}
            className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition-colors ${
              activeTab === "threads"
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Threads ({groupThreads.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "videos" && (
          <div>
            {isLoadingVideos ? (
              <div className="text-center py-8 text-gray-500">Loading videos...</div>
            ) : groupVideos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {groupVideos.map((video: GroupVideo) => {
                  const categoryColors: { [key: string]: string } = {
                    Adventure: "bg-red-500",
                    Food: "bg-orange-500",
                    Nature: "bg-green-500",
                    Culture: "bg-blue-500",
                    Entertainment: "bg-purple-500",
                    Sports: "bg-yellow-500",
                    Education: "bg-pink-500",
                  };

                  return (
                    <div
                      key={video.id}
                      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => {
                        // If it's the user's own video, open it in fullscreen directly
                        if (video.userId === user?.id) {
                          // Open video player modal directly for own videos
                          setSelectedVideoForModal([{
                            ...video,
                            videoUrl: `/api/videos/bunny-proxy/${video.id}`,
                            user: {
                              id: user.id,
                              firstName: user.firstName,
                              lastName: user.lastName,
                              profileImageUrl: user.profileImageUrl
                            }
                          }]);
                          setShowVideoModal(true);
                        } else {
                          // For other users' videos, check if watched
                          if (video.watchedByUser) {
                            // For watched videos, open video player
                            setSelectedVideoForModal([{
                              ...video,
                              videoUrl: `/api/videos/bunny-proxy/${video.id}`,
                              user: {
                                id: video.userId,
                                firstName: 'User',
                                lastName: '',
                                profileImageUrl: video.userProfileImageUrl
                              }
                            }]);
                            setShowVideoModal(true);
                          } else {
                            // For unwatched videos, navigate to map and highlight the gem
                            const targetVideoId = video.id;
                            setLocation(`/?highlightVideo=${targetVideoId}`);
                          }
                        }
                      }}
                    >
                      {video.userId !== user?.id && !video.watchedByUser ? (
                        // Show gem icon for unwatched videos from other users
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center">
                          <img
                            src={categoryIcons[video.category] || categoryIcons.default}
                            alt={video.category}
                            className="w-12 h-12"
                          />
                        </div>
                      ) : video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all" />

                      {/* Play button or distance indicator for unwatched videos */}
                      {video.userId !== user?.id && !video.watchedByUser ? (
                        // Show distance for unwatched gem videos
                        <div className="absolute bottom-2 left-2 right-2 text-center">
                          <div className="bg-black bg-opacity-50 rounded px-2 py-1">
                            <span className="text-white text-xs font-medium">
                              {video.distance ? formatDistance(video.distance) : 'Distance unknown'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Show play button for watchable videos
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-gray-800 ml-1" />
                          </div>
                        </div>
                      )}

                      {/* Category badge */}
                      <div className="absolute top-2 left-2">
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium text-white ${
                            categoryColors[video.category] || "bg-gray-500"
                          }`}
                        >
                          {video.category}
                        </div>
                      </div>



                      {/* Video info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                        <h3 className="text-white font-medium text-sm line-clamp-2">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-300">
                          <span>{video.views} views</span>
                          <span>•</span>
                          <span>{video.likes} likes</span>
                          {video.distance && (
                            <>
                              <span>•</span>
                              <span>{formatDistance(video.distance)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No videos have been shared in this group yet.</p>
                {isMember && (
                  <p className="text-sm mt-1">Be the first to share a video!</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "threads" && (
          <div>
            {/* Create Thread Button */}
            {isMember && (
              <div className="mb-4">
                <Button
                  onClick={() => setShowCreateThread(true)}
                  className="w-full bg-red-500 hover:bg-red-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Thread
                </Button>
              </div>
            )}

            {/* Create Thread Form */}
            {showCreateThread && (
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <form onSubmit={handleCreateThread} className="space-y-3">
                  <Input
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                    placeholder="Thread title..."
                    className="w-full"
                  />
                  <Textarea
                    value={threadDescription}
                    onChange={(e) => setThreadDescription(e.target.value)}
                    placeholder="What would you like to discuss? (optional)"
                    className="w-full"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!threadTitle.trim() || createThreadMutation.isPending}
                      size="sm"
                    >
                      Create Thread
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateThread(false);
                        setThreadTitle("");
                        setThreadDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Threads List */}
            {isLoadingThreads ? (
              <div className="text-center py-8 text-gray-500">Loading threads...</div>
            ) : groupThreads.length > 0 ? (
              <div className="space-y-3">
                {groupThreads.map((thread: GroupThread) => (
                  <div 
                    key={thread.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedThread(thread);
                          setShowMessaging(true);
                          // Clear rejection modal state when opening messaging
                          setShowThreadMessageRejectionModal(false);
                          setSelectedThreadMessage(null);
                        }}
                      >
                        <h3 className="font-medium">{thread.title}</h3>
                        {thread.description && (
                          <p className="text-sm text-gray-600 mt-1">{thread.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{thread.messageCount || 0} messages</span>
                          {thread.lastMessageAt && (
                            <span>{new Date(thread.lastMessageAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Edit button - show if user created the thread */}
                        {user?.id === thread.createdBy && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditThread(thread);
                            }}
                            className="p-1 h-auto"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Button>
                        )}
                        {/* Delete button - show if user created the thread OR is group owner */}
                        {(user?.id === thread.createdBy || isOwner) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              showDeleteConfirmation(thread.id);
                            }}
                            className="p-1 h-auto"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                        <MessageCircle className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No discussion threads yet.</p>
                {isMember && (
                  <p className="text-sm mt-1">Start a conversation!</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Popover */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-bold mb-3 text-center">Delete Thread</h2>
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to delete this thread? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteThread}
                disabled={deleteThreadMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {deleteThreadMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
              <Button
                onClick={cancelDelete}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Thread Modal */}
      {showEditThread && editingThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Edit Thread</h2>
            <form onSubmit={handleEditThread} className="space-y-4">
              <div>
                <label htmlFor="editTitle" className="block text-sm font-medium mb-1">
                  Title *
                </label>
                <Input
                  id="editTitle"
                  value={editThreadTitle}
                  onChange={(e) => setEditThreadTitle(e.target.value)}
                  placeholder="Thread title"
                  required
                />
              </div>
              <div>
                <label htmlFor="editDescription" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  id="editDescription"
                  value={editThreadDescription}
                  onChange={(e) => setEditThreadDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  size="sm"
                  disabled={editThreadMutation.isPending}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {editThreadMutation.isPending ? "Updating..." : "Update Thread"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEditThread(false);
                    setEditingThread(null);
                    setEditThreadTitle("");
                    setEditThreadDescription("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      {showEditModal && group && (
        <GroupEditModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
          }}
        />
      )}

      {/* Thread Message Rejection Modal - Conditional Rendering */}
      {selectedThreadMessage && (
        <VideoRejectionModal
          isOpen={showThreadMessageRejectionModal}
          onClose={() => {
            console.log("Modal onClose called");
            setShowThreadMessageRejectionModal(false);
            setSelectedThreadMessage(null);
          }}
          comment={selectedThreadMessage}
          isComment={true}
          isThreadMessage={true}
          threadId={selectedThread?.id}
        />
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && group && (
        <AddMembersModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          group={group}
        />
      )}

      {/* Video Player Modal */}
      {showVideoModal && selectedVideoForModal && (
        <VideoPlayerModal
          videos={selectedVideoForModal}
          initialIndex={0}
          onClose={() => {
            setShowVideoModal(false);
            setSelectedVideoForModal(null);
          }}
          onNavigateToMap={() => {
            setShowVideoModal(false);
            setSelectedVideoForModal(null);
            setLocation('/');
          }}
          onNavigateToProfile={() => {
            // Store video modal context for back navigation
            const videoModalContext = {
              page: 'group-profile',
              modalType: 'videoPlayer',
              videoId: selectedVideoForModal?.[0]?.id,
              videoTitle: selectedVideoForModal?.[0]?.title,
              returnPath: location,
              groupId: groupId
            };
            sessionStorage.setItem('videoModalContext', JSON.stringify(videoModalContext));
            
            setShowVideoModal(false);
            setSelectedVideoForModal(null);
            // Navigate to profile with openVideo parameter for restoration
            setLocation(`/profile?openVideo=${selectedVideoForModal?.[0]?.id}&returnToGroup=${groupId}`);
          }}
        />
      )}

    </div>
  );
}