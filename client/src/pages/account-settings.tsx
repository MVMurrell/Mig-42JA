import { useLocation } from "wouter";
import { ArrowLeft, User, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth.ts";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleBack = () => {
    setLocation("/settings");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Please log in to access account settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold text-gray-900 dark:text-white pr-10">
          Account Settings
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Note about profile editing */}
        <Alert>
          <User className="h-4 w-4" />
          <AlertDescription>
            To edit your profile information (name, username, bio, photo), use the "Edit Profile" button on your profile page.
          </AlertDescription>
        </Alert>

        {/* Account Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Address
            </CardTitle>
            <CardDescription>
              Your email address is managed through Replit authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Current Email</Label>
                <Input
                  value={user.email || ""}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Email changes must be made through your Replit account settings. 
                  Visit <a href="https://replit.com/account" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">replit.com/account</a> to update your email address.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password
            </CardTitle>
            <CardDescription>
              Your password is managed through Replit authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Password changes must be made through your Replit account settings. 
                Visit <a href="https://replit.com/account" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">replit.com/account</a> to update your password.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Read-only information about your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>User ID</Label>
              <Input
                value={user.id || ""}
                disabled
                className="bg-gray-50 dark:bg-gray-800 font-mono text-sm"
              />
            </div>
            
            <div>
              <Label>Account Created</Label>
              <Input
                value={(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : "Unknown"}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>

            <div>
              <Label>Account Role</Label>
              <Input
                value={(user as any)?.role || "user"}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>

            {(user as any)?.gemCoins !== undefined && (
              <div>
                <Label>Gem Coins</Label>
                <Input
                  value={(user as any).gemCoins.toString()}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}