import { useEffect, useState, useRef, useCallback } from "react";
import { authService } from "@/services/auth-service";
import { PasswordResetRequest } from "@/types/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell } from "lucide-react";

interface PasswordResetNotificationsProps {
  isMasterAdmin: boolean;
  onPendingChange?: (hasPending: boolean) => void;
}

export function PasswordResetNotifications({
  isMasterAdmin,
  onPendingChange,
}: PasswordResetNotificationsProps) {
  const realtimeConfigured = Boolean(process.env.NEXT_PUBLIC_AUTHKEY?.trim());
  const isRealtimeEnabled = isMasterAdmin && realtimeConfigured;
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPendingCountRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

  const loadRequests = useCallback(async (silent = false) => {
    if (!isRealtimeEnabled) {
      setRequests([]);
      onPendingChange?.(false);
      return;
    }
    
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const data = await authService.fetchPasswordResetRequests();
      const pendingCount = data.filter(
        (req: PasswordResetRequest) => req.status === "pending"
      ).length;
      
      // Check if there are new pending requests
      const canUseNotifications =
        typeof window !== "undefined" && "Notification" in window;
      if (
        canUseNotifications &&
        !isInitialLoadRef.current &&
        pendingCount > previousPendingCountRef.current
      ) {
        // Show browser notification if permission granted
        if (window.Notification.permission === "granted") {
          new window.Notification("New Password Reset Request", {
            body: `You have ${pendingCount} pending password reset request${pendingCount > 1 ? 's' : ''} to review.`,
            icon: "/images/als_logo.png",
            tag: "password-reset-request",
          });
        }
      }
      
      previousPendingCountRef.current = pendingCount;
      isInitialLoadRef.current = false;
      
      setRequests(data);
      const hasPending = pendingCount > 0;
      setTimeout(() => onPendingChange?.(hasPending), 0);
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error ? err.message : "Failed to load notifications"
        );
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [isRealtimeEnabled, onPendingChange]);

  // Request notification permission on mount
  useEffect(() => {
    if (isRealtimeEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(console.error);
    }
  }, [isRealtimeEnabled]);

  // Initial load
  useEffect(() => {
    loadRequests();
  }, [isRealtimeEnabled, loadRequests]);

  // Set up real-time polling
  useEffect(() => {
    if (!isRealtimeEnabled) {
      // Clear polling if disabled
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    if (!isMasterAdmin) {
      // Clear polling if not master admin
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    // Start polling when page is visible
    const startPolling = () => {
      if (pollingIntervalRef.current) return; // Already polling
      
      setIsPolling(true);
      // Poll every 2 seconds for real-time updates
      pollingIntervalRef.current = setInterval(() => {
        loadRequests(true); // Silent polling
      }, 2000);
    };

    // Stop polling when page is hidden
    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        // Also load immediately when page becomes visible
        loadRequests();
      }
    };

    // Start polling if page is visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isMasterAdmin, isRealtimeEnabled, loadRequests]);

  const handleAction = async (requestId: string, action: "accept" | "reject") => {
    setUpdatingId(requestId);
    setError(null);
    try {
      const updated = await authService.updatePasswordResetRequest(
        requestId,
        action
      );
      setRequests((prev) => {
        const next = prev.map((req) =>
          req._id === requestId ? { ...req, ...updated } : req
        );
        const hasPending = next.some((req) => req.status === "pending");
        setTimeout(() => onPendingChange?.(hasPending), 0);
        return next;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update request"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isMasterAdmin) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Only the master admin can review password reset notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Please contact the master admin for password reset approvals.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!realtimeConfigured) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Password Reset Notifications
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Real-time login approval notifications are disabled because the master authentication key
            (`NEXT_PUBLIC_AUTHKEY`) is not configured. Admin management will continue to work with local data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Set the environment variable and redeploy once you are ready to enable live approvals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Password Reset Notifications
              {isPolling && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Review password reset requests from regular administrators. Updates automatically every 2 seconds.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-600 dark:text-gray-300">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading notifications...
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10 text-gray-600 dark:text-gray-300">
            No password reset notifications at the moment.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {request.email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Requested on {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    className={`${
                      request.status === "pending"
                        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                        : request.status === "accepted"
                        ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200"
                        : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200"
                    }`}
                  >
                    {request.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span>Role: Regular Admin</span>
                  {request.resolvedAt && (
                    <span>
                      Resolved: {new Date(request.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {request.status === "pending" && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      className="border-gray-300 dark:border-gray-600"
                      disabled={updatingId === request._id}
                      onClick={() => handleAction(request._id, "reject")}
                    >
                      {updatingId === request._id ? "Processing..." : "Reject"}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-600"
                      disabled={updatingId === request._id}
                      onClick={() => handleAction(request._id, "accept")}
                    >
                      {updatingId === request._id ? "Processing..." : "Accept Login"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

