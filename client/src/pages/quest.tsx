import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { MapPin, Users, Clock, Coins, Plus, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateQuestModal } from '@/components/CreateQuestModal.tsx';
import { QuestDetailModal } from '@/components/QuestDetailModal.tsx';
import type { Quest } from '@shared/schema.ts';

interface QuestWithProgress extends Quest {
  participantCount: number;
  progressPercentage: number;
  isParticipating: boolean;
  timeRemaining: string;
  distanceFromUser?: number;
}

export default function QuestPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<QuestWithProgress | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: activeQuests = [], isLoading: loadingActive } = useQuery({
    queryKey: ['/api/quests/active'],
  });

  const { data: myQuests = [], isLoading: loadingMy } = useQuery({
    queryKey: ['/api/quests/my-participations'],
  });

  const handleQuestClick = (quest: QuestWithProgress) => {
    setSelectedQuest(quest);
    setShowDetailModal(true);
  };

  const QuestCard = ({ quest }: { quest: QuestWithProgress }) => {
    const isExpiring = new Date(quest.endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleQuestClick(quest)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{quest.title}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {quest.description}
              </CardDescription>
            </div>
            {quest.imageUrl && (
              <img 
                src={quest.imageUrl} 
                alt={quest.title}
                className="w-16 h-16 rounded-lg object-cover ml-3"
              />
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">
                {quest.participantCount}/{quest.requiredParticipants}
              </span>
            </div>
            <Progress value={quest.progressPercentage} className="h-2" />
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{quest.radiusInFeet}ft radius</span>
            </div>
            <div className="flex items-center space-x-1">
              <Coins className="w-4 h-4" />
              <span>{quest.rewardPerParticipant} coins</span>
            </div>
          </div>

          {/* Time and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-sm">
              <Clock className="w-4 h-4" />
              <span className={isExpiring ? 'text-red-600 font-medium' : 'text-gray-600'}>
                {quest.timeRemaining}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {quest.distanceFromUser !== undefined && (
                <Badge variant="outline" className="text-xs">
                  {quest.distanceFromUser < 1000 
                    ? `${Math.round(quest.distanceFromUser)}ft away`
                    : `${(quest.distanceFromUser / 5280).toFixed(1)}mi away`
                  }
                </Badge>
              )}
              {quest.isParticipating && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  Joined
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Quests
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Join location-based challenges and earn Jem coins
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quest</span>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Active Quests</span>
            </TabsTrigger>
            <TabsTrigger value="my" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>My Quests</span>
            </TabsTrigger>
          </TabsList>

          {/* Active Quests Tab */}
          <TabsContent value="active" className="mt-6">
            {loadingActive ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="flex justify-between mt-4">
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeQuests.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Active Quests
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Be the first to create a quest in your area!
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create Your First Quest
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeQuests.map((quest: QuestWithProgress) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Quests Tab */}
          <TabsContent value="my" className="mt-6">
            {loadingMy ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="flex justify-between mt-4">
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : myQuests.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Participating Quests
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Join a quest from the Active Quests tab to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myQuests.map((quest: QuestWithProgress) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateQuestModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      
      {selectedQuest && (
        <QuestDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedQuest(null);
          }}
          quest={selectedQuest}
        />
      )}
    </div>
  );
}