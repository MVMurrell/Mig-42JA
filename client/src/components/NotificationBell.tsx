import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth.ts";
import { Bell } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import type { Notification } from "@shared/schema.ts";

export function NotificationBell() {
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!user) {
    return null;
  }

  return (
    <Button asChild variant="ghost" size="sm" className="relative">
      <Link href="/notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs min-w-[20px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        <span className="sr-only">
          Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
        </span>
      </Link>
    </Button>
  );
}