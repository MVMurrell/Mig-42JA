import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { MapPin, Clock, Users, Plus, ScrollText, Trophy, Coins, ArrowLeft, Info } from "lucide-react";
import { CreateQuestModal } from "@/components/CreateQuestModal.tsx";
import { QuestInfoModal } from "@/components/QuestInfoModal.tsx";
import { QuestDetailModal } from "@/components/QuestDetailModal.tsx";

export default function QuestPage() {
  const [activeTab, setActiveTab] = useState("discover");
  const [, setLocation] = useLocation();
  const [searchRadius, setSearchRadius] = useState("5");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch active quests
  const { data: activeQuests = [], isLoading: loadingActive } = useQuery({
    queryKey: ["/api/quests/active", searchRadius],
  });

  // Fetch user's participating quests
  const { data: myQuests = [], isLoading: loadingMy } = useQuery({
    queryKey: ["/api/quests/my-participations"],
  });

  const handleQuestClick = (quest: any) => {
    setSelectedQuest(quest);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div className="flex items-center space-x-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Quests</h1>
                <p className="text-sm text-gray-500">Location-based challenges</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoModal(true)}
                className="p-1 hover:bg-gray-100 rounded-full"
                title="Learn about Quests"
              >
                <Info className="w-5 h-5 text-gray-500 hover:text-blue-600" />
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-quests">My Quests</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Active Quests Nearby</h2>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <Select value={searchRadius} onValueChange={setSearchRadius}>
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="15">15 miles</SelectItem>
                    <SelectItem value="20">20 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="30">30 miles</SelectItem>
                    <SelectItem value="35">35 miles</SelectItem>
                    <SelectItem value="40">40 miles</SelectItem>
                    <SelectItem value="45">45 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingActive ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeQuests.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ScrollText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Quests</h3>
                  <p className="text-gray-500 mb-6">
                    There are no active quests in your area right now. Check back later or create your own!
                  </p>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Quest
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeQuests.map((quest: any) => (
                  <QuestCard key={quest.id} quest={quest} onQuestClick={handleQuestClick} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-quests" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Participating Quests</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{myQuests.length} active</span>
              </div>
            </div>

            {loadingMy ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : myQuests.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Participating Quests</h3>
                  <p className="text-gray-500 mb-6">
                    You haven't joined any quests yet. Discover exciting challenges nearby!
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("discover")}
                  >
                    Discover Quests
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myQuests.map((quest: any) => (
                  <QuestCard key={quest.id} quest={quest} isParticipating={true} onQuestClick={handleQuestClick} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom spacing for navigation */}
      <div className="h-20"></div>

      {/* Create Quest Modal */}
      <CreateQuestModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userLocation={{ lat: 36.0571, lng: -94.1606 }}
      />

      {/* Quest Info Modal */}
      <QuestInfoModal 
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />

      {/* Quest Detail Modal */}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

function QuestCard({ quest, isParticipating = false, onQuestClick }: { quest: any; isParticipating?: boolean; onQuestClick?: (quest: any) => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="space-y-3">
          {/* Header with title and reward */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-3">
              <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                {quest.title || "Sample Quest"}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-1 text-yellow-600">
              <Coins className="w-4 h-4" />
              <span className="font-medium">{quest.rewardPerParticipant || 50}</span>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-500">
            {quest.description || "A location-based challenge for the community"}
          </p>
          
          {/* Stats and button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{quest.distanceFromUser ? `${Math.round(quest.distanceFromUser)} ft` : "0.2 mi"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{quest.participantCount || 0}/{quest.requiredParticipants || 10}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{quest.timeRemaining || "2 days left"}</span>
              </div>
            </div>
            
            {/* Details button */}
            <div className="flex-shrink-0">
              {isParticipating ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 border-green-600"
                  onClick={() => onQuestClick?.(quest)}
                >
                  Details
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => onQuestClick?.(quest)}
                >
                  Details
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}