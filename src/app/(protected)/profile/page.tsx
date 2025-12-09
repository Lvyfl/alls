'use client';

import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, MapPin, Calendar, UserCircle, Upload, X, Camera } from 'lucide-react';
import { useStudentStore } from '@/store/student-store';
import { useEffect, useState, useRef } from 'react';
import { formatDate } from '@/utils/date-formatter';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.auth.user);
  const { barangays, fetchBarangays } = useStudentStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (barangays.length === 0) {
      fetchBarangays();
    }
  }, [barangays.length, fetchBarangays]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">No user information available</p>
        </div>
      </div>
    );
  }

  const formatDateWithFallback = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return formatDate(dateString);
  };

  const getBarangayName = (barangayId?: string) => {
    if (!barangayId) return 'Not assigned';
    // Try matching by _id first (MongoDB format), then by id (JSON format)
    const barangay = barangays.find((b) => b._id === barangayId || (b as any).id === barangayId);
    return barangay?.name || barangayId;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        try {
          const response = await fetch('/api/auth/profile-picture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user?._id,
              profilePicture: base64String,
            }),
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to upload profile picture');
          }

          // Update user in store and storage
          if (data.data && user) {
            const updatedUser = { ...user, profilePicture: data.data.profilePicture };

            // Update in Zustand store
            useAuthStore.setState((state) => {
              state.auth.user = updatedUser;
            });

            // Also update in localStorage/sessionStorage
            const userKey = 'als_user';
            if (typeof window !== 'undefined') {
              const storage = localStorage.getItem(userKey) ? window.localStorage : window.sessionStorage;
              storage.setItem(userKey, JSON.stringify(updatedUser));
            }
          }
        } catch (error) {
          console.error('Error uploading profile picture:', error);
          setUploadError(error instanceof Error ? error.message : 'Failed to upload profile picture');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      reader.onerror = () => {
        setUploadError('Failed to read image file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadError('Failed to process image file');
      setIsUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!user?._id) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch(`/api/auth/profile-picture?userId=${user._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove profile picture');
      }

      // Update user in store and storage
      if (user) {
        const updatedUser = { ...user };
        delete updatedUser.profilePicture;

        // Update in Zustand store
        useAuthStore.setState((state) => {
          state.auth.user = updatedUser;
        });

        // Also update in localStorage/sessionStorage
        const userKey = 'als_user';
        if (typeof window !== 'undefined') {
          const storage = localStorage.getItem(userKey) ? window.localStorage : window.sessionStorage;
          storage.setItem(userKey, JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Error removing profile picture:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500 lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {user.profilePicture ? (
                  <div className="relative">
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="h-32 w-32 rounded-full object-cover border-4 border-blue-600 dark:border-blue-500 shadow-lg"
                    />
                    <button
                      onClick={handleRemovePicture}
                      disabled={isUploading}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove profile picture"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full p-6 text-blue-900 dark:text-blue-100 shadow-lg">
                    <UserCircle className="h-16 w-16" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={user.profilePicture ? "Change profile picture" : "Upload profile picture"}
                >
                  {isUploading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900 dark:text-white">
                  {user.name || 'Staff Name'}
                </CardTitle>
                <div className="mt-2">
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className={`${user.role === 'admin'
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-600'
                      : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600'
                      }`}
                  >
                    {user.role === 'admin' ? 'Admin' : 'Teacher'}
                  </Badge>
                </div>
              </div>
              {uploadError && (
                <div className="text-sm text-red-600 dark:text-red-400 mt-2">
                  {uploadError}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Information Card */}
        <Card className="bg-white dark:bg-slate-800 border-4 border-blue-600 dark:border-blue-500 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Your account details and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{user.email}</p>
                </div>

                {(user.firstName || user.lastName) && (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                    <p className="text-base text-gray-900 dark:text-white">
                      {user.firstName || ''} {user.middleName || ''} {user.lastName || ''}
                    </p>
                  </div>
                )}

                {user.gender && (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</p>
                    <p className="text-base text-gray-900 dark:text-white capitalize">{user.gender}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Role
                  </p>
                  {user.role === 'admin' ? 'Admin' : 'Teacher'}
                </div>

                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Assigned Barangay
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {user.role === 'teacher' && user.assignedBarangayId
                      ? getBarangayName(user.assignedBarangayId)
                      : user.role === 'admin'
                        ? 'All Barangays'
                        : 'Not assigned'}
                  </p>
                </div>

                {user.birthday && (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Birthday
                    </p>
                    <p className="text-base text-gray-900 dark:text-white">{formatDateWithFallback(user.birthday)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Account Created
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{formatDateWithFallback(user.createdAt)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last Updated
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{formatDateWithFallback(user.updatedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

