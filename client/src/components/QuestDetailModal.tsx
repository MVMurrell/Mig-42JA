import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { Input } from '@/components/ui/input.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { MapPin, Users, Clock, Coins, MessageSquare, Send, Target, Calendar, Radar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient.ts';
import { useToast } from '@/hooks/use-toast.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import type { Quest } from '@shared/schema.ts';

interface QuestWithProgress extends Quest {
  participantCount: number;
  progressPercentage: number;
  isParticipating: boolean;
  timeRemaining: string;
  distanceFromUser?: number;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

interface QuestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: QuestWithProgress;
}

interface QuestParticipant {
  id: string;
  userId: string;
  hasPosted: boolean;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

interface QuestMessage {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

// Distance calculation function using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.756; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in miles
  return distance * 5280; // Convert to feet
}

export function QuestDetailModal({ isOpen, onClose, quest }: QuestDetailModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participants = [] } = useQuery<QuestParticipant[]>({
    queryKey: ['/api/quests', quest.id, 'participants'],
    enabled: isOpen,
  });

  const { data: messages = [] } = useQuery<QuestMessage[]>({
    queryKey: ['/api/quests', quest.id, 'messages'],
    enabled: isOpen && quest.isParticipating,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get user location and calculate distance to quest
  useEffect(() => {
    if (isOpen && quest.latitude && quest.longitude) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const questLat = parseFloat(quest.latitude);
            const questLng = parseFloat(quest.longitude);
            
            setUserLocation({ lat: userLat, lng: userLng });
            
            const distance = calculateDistance(userLat, userLng, questLat, questLng);
            setCalculatedDistance(distance);
          },
          (error) => {
            console.log('Error getting user location:', error);
            setCalculatedDistance(null);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      }
    }
  }, [isOpen, quest.latitude, quest.longitude]);

  // Removed join quest mutation - users participate by posting gems within radius

  const leaveQuestMutation = useMutation({
    mutationFn: async () => {
      console.log('Making API request to leave quest:', quest.id);
      const response = await apiRequest(`/api/quests/${quest.id}/leave`, 'DELETE');
      console.log('Leave quest API response:', response);
      return response;
    },
    onSuccess: (data: any) => {
      console.log('Leave quest success:', data);
      toast({
        title: "Left quest successfully",
        description: data.hadPostedGem ? "Your gem was removed from this quest." : "You are no longer participating in this quest.",
      });
      
      // Invalidate all quest-related queries by prefix matching
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === '/api/quests/active' || 
        query.queryKey[0] === '/api/quests/my-participations' ||
        (Array.isArray(query.queryKey) && query.queryKey[0] === '/api/quests')
      });
      
      setShowLeaveConfirmation(false);
      // Close the modal since user is no longer participating
      onClose();
    },
    onError: (error: any) => {
      console.error('Leave quest error:', error);
      toast({
        title: "Failed to leave quest",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setShowLeaveConfirmation(false);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest(`/api/quests/${quest.id}/messages`, 'POST', { message });
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/quests', quest.id, 'messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Removed handleJoinQuest - users participate by posting gems within radius

  const handleLeaveQuest = async () => {
    console.log('Leave quest button clicked for quest:', quest.id);
    // Check if user has posted a gem by checking their participation
    try {
      const response = await fetch('/api/auth/user');
      const currentUser = await response.json();
      const userParticipation = participants.find(p => p.userId === currentUser.id);
      const hasPostedGem = userParticipation?.hasPosted || false;
      
      if (hasPostedGem) {
        setShowLeaveConfirmation(true);
      } else {
        leaveQuestMutation.mutate();
      }
    } catch (error) {
      // If we can't check, just proceed with leave
      leaveQuestMutation.mutate();
    }
  };

  const handleConfirmLeave = () => {
    leaveQuestMutation.mutate();
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const isExpiring = new Date(quest.endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const isCompleted = quest.status === 'completed';
  const isFailed = quest.status === 'failed';
  const canJoin = quest.status === 'active' && !quest.isParticipating;
  
  console.log('QuestDetailModal render - canJoin:', canJoin, 'status:', quest.status, 'isParticipating:', quest.isParticipating);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 space-y-4 p-4 sm:p-6 pb-4">
          <div className="space-y-3">
            {/* Quest Image */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                {quest.imageUrl ? (
                  <img 
                    src={quest.imageUrl.startsWith('/uploads/quest-images/') 
                      ? quest.imageUrl.replace('/uploads/quest-images/', '/uploads/')
                      : quest.imageUrl
                    } 
                    alt={quest.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('Quest image failed to load:', quest.imageUrl);
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.textContent = quest.title.charAt(0).toUpperCase();
                        parent.className = 'text-white font-bold text-lg';
                      }
                    }}
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{quest.title.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white pr-4 text-center">
              {quest.title}
            </DialogTitle>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pr-4">
              {quest.description}
            </p>
            


            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant={quest.status === 'active' ? 'default' : 
                        quest.status === 'completed' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
              </Badge>
              {quest.isParticipating && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  Participating
                </Badge>
              )}
              {isExpiring && quest.status === 'active' && (
                <Badge variant="destructive" className="text-xs">
                  Ending Soon
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-4 sm:px-6">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="grid w-full flex-shrink-0 grid-cols-2">
              <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
              <TabsTrigger value="participants" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Participants ({participants.length})</span>
                <span className="sm:hidden">People ({participants.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Quest Details Tab */}
            <TabsContent value="details" className="flex-1 mt-4 overflow-hidden">
              <div className="h-full overflow-y-auto px-1">
                <div className="space-y-6 pb-6">
                {/* Progress Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span>Quest Progress</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Gems Posted</span>
                      <span className="font-medium">
                        {quest.participantCount}/{quest.requiredParticipants}
                      </span>
                    </div>
                    <Progress value={quest.progressPercentage} className="h-3" />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {quest.rewardPerParticipant} coins each
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Radar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {quest.radiusInFeet}ft radius
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {calculatedDistance !== null
                            ? calculatedDistance < 1000 
                              ? `${Math.round(calculatedDistance)} ft away`
                              : `${(calculatedDistance / 5280).toFixed(1)} mi away`
                            : 'Calculating distance...'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {quest.timeRemaining}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quest Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quest Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-gray-600 dark:text-gray-400">{quest.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Timeline
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>Started: {format(new Date(quest.startDate), 'PPp')}</p>
                          <p>Ends: {format(new Date(quest.endDate), 'PPp')}</p>
                          <p className={isExpiring ? 'text-red-600 font-medium' : ''}>
                            Time remaining: {quest.timeRemaining}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Quest Creator</h4>
                        <div className="flex items-center space-x-2">
                          {quest.creator?.profileImageUrl ? (
                            <img 
                              src={quest.creator.profileImageUrl} 
                              alt={`${quest.creator.firstName} ${quest.creator.lastName}`}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {quest.creator?.firstName?.[0]}{quest.creator?.lastName?.[0]}
                              </span>
                            </div>
                          )}
                          <span className="text-sm">
                            {quest.creator?.firstName} {quest.creator?.lastName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* How to Participate Section */}
                    {quest.status === 'active' && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-3 flex items-center">
                          <Target className="w-4 h-4 mr-2" />
                          How to Participate
                        </h4>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                            To join this quest:
                          </p>
                          <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
                            <li>Navigate to the quest location on the map</li>
                            <li>Get within the {quest.radiusInFeet}ft radius</li>
                            <li>Post a gem and select this quest from the visibility dropdown</li>
                            <li>Your participation will be automatically tracked!</li>
                          </ol>
                        </div>
                        
                        <Button 
                          onClick={() => {
                            // Navigate to home page and center map on quest
                            window.location.href = `/?questId=${quest.id}`;
                          }}
                          className="w-full mb-3"
                          size="lg"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          View Quest Location on Map
                        </Button>

                        {quest.isParticipating && (
                          <Button 
                            onClick={handleLeaveQuest}
                            disabled={leaveQuestMutation.isPending}
                            className="w-full"
                            size="lg"
                            variant="outline"
                          >
                            {leaveQuestMutation.isPending ? 'Leaving...' : 'Leave Quest'}
                          </Button>
                        )}
                      </div>
                    )}


                  </CardContent>
                </Card>
                

                </div>
              </div>
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="participants" className="flex-1 mt-4 overflow-hidden">
              <div className="h-full overflow-y-auto px-1">
                <div className="space-y-3 pb-6">
                {participants.length === 0 ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No participants yet. Be the first to join!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  participants.map((participant) => (
                    <Card key={participant.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          {participant.user.profileImageUrl ? (
                            <img 
                              src={participant.user.profileImageUrl} 
                              alt={`${participant.user.firstName} ${participant.user.lastName}`}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {participant.user.firstName?.[0]}{participant.user.lastName?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {participant.user.firstName} {participant.user.lastName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Joined {formatDistanceToNow(new Date(participant.joinedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {participant.hasPosted ? (
                            <Badge className="bg-green-100 text-green-800">
                              Posted
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                </div>
              </div>
            </TabsContent>

            {/* Chat Tab (only for participants) */}
            {quest.isParticipating && (
              <TabsContent value="chat" className="flex-1 mt-4 overflow-hidden">
                <div className="h-full overflow-y-auto px-1">
                  <div className="space-y-3 pb-6">
                    {messages.length === 0 ? (
                      <Card className="text-center py-8">
                        <CardContent>
                          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
                            No messages yet. Start the conversation!
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="flex space-x-3">
                          {message.user.profileImageUrl ? (
                            <img 
                              src={message.user.profileImageUrl} 
                              alt={`${message.user.firstName} ${message.user.lastName}`}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-gray-600">
                                {message.user.firstName?.[0]}{message.user.lastName?.[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium">
                                {message.user.firstName} {message.user.lastName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {message.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  
                  {/* Message Input */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        size="icon"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>

      {/* Leave Quest Confirmation Modal */}
      <AlertDialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Quest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this quest? Your gem that you posted to this quest will be deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLeaveConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmLeave}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Leave and Delete Gem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}