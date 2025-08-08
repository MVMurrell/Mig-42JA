import { useState } from "react";
import { ArrowLeft, Search, Filter, User, Calendar, FileText, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { formatDistanceToNow } from "date-fns";

export default function ModerationDecisions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDecision, setFilterDecision] = useState("all");
  const [filterModerator, setFilterModerator] = useState("all");

  // Fetch moderation decision history
  const { data: decisions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/moderation/decisions', searchTerm, filterDecision, filterModerator],
    queryFn: async () => {
      const response = await apiRequest(`/api/moderation/decisions?search=${encodeURIComponent(searchTerm)}&decision=${filterDecision}&moderator=${filterModerator}`, 'GET');
      return await response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch moderator list for filter
  const { data: moderators = [] } = useQuery({
    queryKey: ['/api/moderation/moderators'],
    queryFn: async () => {
      const response = await apiRequest('/api/moderation/moderators', 'GET');
      return await response.json();
    },
  });

  // Ensure moderators is always an array
  const safeModerators = Array.isArray(moderators) ? moderators : [];

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'approve':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'reject':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getDecisionBadgeVariant = (decision: string) => {
    switch (decision) {
      case 'approve':
      case 'approved':
        return 'default';
      case 'reject':
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Filter decisions based on current filters
  const filteredDecisions = Array.isArray(decisions) ? decisions.filter((decision: any) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesTitle = (decision.contentTitle || decision.videoTitle || '').toLowerCase().includes(searchLower);
      const matchesReason = (decision.reason || '').toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesReason) return false;
    }
    
    // Decision filter
    if (filterDecision !== 'all' && decision.decision !== filterDecision) {
      return false;
    }
    
    // Moderator filter
    if (filterModerator !== 'all' && decision.moderatorId !== filterModerator) {
      return false;
    }
    
    return true;
  }) : [];



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          {/* Mobile: Stack vertically, Desktop: Side by side */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left section with back button and title */}
            <div className="flex items-center gap-3">
              <Link href="/content-moderation">
                <Button variant="ghost" size="sm" className="shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  Moderation Decision History
                </h1>
              </div>
            </div>
            
            {/* Right section with refresh button */}
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              className="self-start sm:self-center shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter Decisions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by content title or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterDecision} onValueChange={setFilterDecision}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Decisions</SelectItem>
                  <SelectItem value="approve">Approved</SelectItem>
                  <SelectItem value="reject">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterModerator} onValueChange={setFilterModerator}>
                <SelectTrigger>
                  <User className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by moderator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moderators</SelectItem>
                  {safeModerators.map((moderator: any) => (
                    <SelectItem key={moderator.id} value={moderator.id}>
                      {moderator.firstName} {moderator.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Decisions List */}
        <Card>
          <CardHeader>
            <CardTitle>Decision History ({filteredDecisions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                Loading decision history...
              </div>
            ) : filteredDecisions.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Decisions Found</h3>
                <p className="text-sm">
                  No moderation decisions match your current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDecisions.map((decision: any) => (
                  <div key={decision.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {/* Mobile: Stack everything vertically, Desktop: Side by side */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getDecisionIcon(decision.decision)}
                        <div className="flex-1 min-w-0">
                          {/* Title and badges - stack on very small screens */}
                          <div className="flex flex-col gap-2 mb-3">
                            <h3 className="font-medium text-gray-900 dark:text-white break-words">
                              {decision.contentTitle || decision.videoTitle || 'Content'}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={getDecisionBadgeVariant(decision.decision)}>
                                {decision.decision}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {decision.contentType || 'video'}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <strong>Reason:</strong> {decision.reason || decision.moderatorReason || 'No reason provided'}
                          </p>

                          {decision.originalFlagReason && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>Original Flag:</strong> {decision.originalFlagReason}
                            </p>
                          )}

                          {/* Metadata - stack on mobile for better readability */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="break-words">
                                {formatDistanceToNow(new Date(decision.createdAt || decision.decidedAt), { addSuffix: true })}
                              </span>
                            </div>
                            {decision.moderator && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span className="break-words">
                                  {decision.moderator.firstName} {decision.moderator.lastName}
                                </span>
                              </div>
                            )}
                            {decision.userId && (
                              <span className="break-all text-xs">User ID: {decision.userId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {(decision.strikeGiven || decision.consequence) && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          {decision.strikeGiven && (
                            <Badge variant="destructive" className="text-xs">
                              Strike Issued
                            </Badge>
                          )}
                          {decision.consequence && (
                            <Badge variant="secondary" className="text-xs">
                              {decision.consequence}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}