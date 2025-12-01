'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginLog } from '@/types/auth';
import { Monitor, Smartphone, Tablet, Clock, Globe } from 'lucide-react';
import moment from 'moment';

interface LoginHistoryProps {
  userId: string;
}

export function LoginHistory({ userId }: LoginHistoryProps) {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoginHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/auth/login-history?userId=${userId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch login history');
        }

        setLoginLogs(data.data || []);
      } catch (err) {
        console.error('Error fetching login history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load login history');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchLoginHistory();
    }
  }, [userId]);

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (device.toLowerCase().includes('tablet')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return moment(dateString).format('MMM DD, YYYY');
  };

  const formatTime = (dateString: string) => {
    return moment(dateString).format('hh:mm A');
  };

  const isToday = (dateString: string) => {
    return moment(dateString).isSame(moment(), 'day');
  };

  const isYesterday = (dateString: string) => {
    return moment(dateString).isSame(moment().subtract(1, 'day'), 'day');
  };

  const getDateLabel = (dateString: string) => {
    if (isToday(dateString)) {
      return 'Today';
    } else if (isYesterday(dateString)) {
      return 'Yesterday';
    }
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Login History</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            View your recent login activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-600 dark:text-gray-300">
            Loading login history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Login History</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            View your recent login activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Login History
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300">
          View your recent login activity and device information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loginLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-300">
            No login history available yet. Your login activity will appear here.
          </div>
        ) : (
          <div className="space-y-4">
            {loginLogs.map((log) => (
              <div
                key={log._id}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 text-blue-600 dark:text-blue-400">
                      {getDeviceIcon(log.device)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {log.device}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          • {log.browser}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {log.os}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{getDateLabel(log.loginAt)} at {formatTime(log.loginAt)}</span>
                        </div>
                        {log.ipAddress && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>{log.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

