// client/src/pages/Settings.tsx
import { Link } from "wouter";
import { Bell, User, Shield, HelpCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export default function Settings() {
  const { user, login } = useAuth();

  // Local form state for email/password sign-in (only used if !user)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onLoginClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    void login(email.trim(), password);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Please log in to access settings</h1>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-3 text-left">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-md px-3 py-2 text-slate-900"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-md px-3 py-2 text-slate-900"
          />
          <Button onClick={onLoginClick} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    );
  }

  const settingsOptions = [
    {
      title: "Notification Settings",
      description: "Manage your notification preferences and alerts",
      icon: Bell,
      href: "/notification-settings",
      color: "text-blue-600",
    },
    {
      title: "Profile Settings",
      description: "Update your profile information and preferences",
      icon: User,
      href: "/profile",
      color: "text-green-600",
    },
    {
      title: "Privacy & Security",
      description: "Control your privacy settings and account security",
      icon: Shield,
      href: "#",
      color: "text-purple-600",
      disabled: true,
    },
    {
      title: "Help & Support",
      description: "Get help and contact our support team",
      icon: HelpCircle,
      href: "#",
      color: "text-orange-600",
      disabled: true,
    },
  ];

  // Be tolerant of optional fields on AppUser
  const first = (user as any)?.firstName ?? (user as any)?.givenName ?? "";
  const last = (user as any)?.lastName ?? (user as any)?.familyName ?? "";
  const createdAt =
    (user as any)?.createdAt ?? (user as any)?.created_at ?? undefined;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="space-y-4">
        {settingsOptions.map((option) => {
          const IconComponent = option.icon;

          if (option.disabled) {
            return (
              <Card key={option.title} className="opacity-50 cursor-not-allowed">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <IconComponent className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-400">{option.title}</h3>
                        <p className="text-sm text-gray-400">{option.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Coming soon</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Link key={option.title} href={option.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <IconComponent className={`h-6 w-6 ${option.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{option.title}</h3>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Account Information</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium">Name:</span>{" "}
            {first || last ? `${first} ${last}`.trim() : "—"}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-medium">Member since:</span>{" "}
            {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
