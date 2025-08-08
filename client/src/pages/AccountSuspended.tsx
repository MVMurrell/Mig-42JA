import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { AlertTriangle, Calendar, Shield, ExternalLink } from "lucide-react";

interface SuspensionInfo {
  message: string;
  reason: string;
  suspendedUntil?: string;
  strikeCount?: number;
  totalViolations?: number;
}

export default function AccountSuspended() {
  // Try to get suspension details from localStorage if available
  const suspensionInfo: SuspensionInfo = JSON.parse(
    localStorage.getItem('suspensionInfo') || 
    '{"message":"Account suspended","reason":"Your account has been suspended due to violations"}'
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Indefinite';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysRemaining = (dateString?: string) => {
    if (!dateString) return null;
    const suspensionEnd = new Date(dateString);
    const now = new Date();
    const diffTime = suspensionEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining(suspensionInfo.suspendedUntil);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Account Suspended
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your account access has been temporarily restricted
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Suspension Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Reason</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {suspensionInfo.reason}
              </p>
            </div>

            {suspensionInfo.suspendedUntil && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Suspension Period</h3>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Until {formatDate(suspensionInfo.suspendedUntil)}
                  </span>
                </div>
                {daysRemaining !== null && (
                  <Badge variant={daysRemaining > 0 ? "destructive" : "default"}>
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Suspension expired'}
                  </Badge>
                )}
              </div>
            )}

            {(suspensionInfo.strikeCount || suspensionInfo.totalViolations) && (
              <div className="pt-4 border-t">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Account Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  {suspensionInfo.strikeCount && (
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {suspensionInfo.strikeCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Active Strikes
                      </div>
                    </div>
                  )}
                  {suspensionInfo.totalViolations && (
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {suspensionInfo.totalViolations}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Total Violations
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Wait for suspension to expire</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your account will be automatically reactivated when the suspension period ends.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Review community guidelines</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use this time to review our community standards to avoid future violations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Appeal if necessary</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If you believe this suspension was issued in error, you can contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Check if suspension has expired
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/api/auth/logout'}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For assistance, please contact our support team
          </p>
        </div>
      </div>
    </div>
  );
}