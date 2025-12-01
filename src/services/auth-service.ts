import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from "@/types/auth";

// Constants for localStorage keys
const USER_STORAGE_KEY = "als_user";
const TOKEN_STORAGE_KEY = "als_token";
const USERS_STORAGE_KEY = "als_users";
const USER_ROLE_KEY = "als_user_role";
const ASSIGNED_BARANGAY_KEY = "als_assigned_barangay";

// In-memory fallback for when storage is blocked
let memoryStorage: Record<string, string> = {};

const DEFAULT_TIMESTAMP = new Date("2024-01-01T00:00:00.000Z").toISOString();

const DEFAULT_USERS: User[] = [
  {
    _id: "64b6f4e5c8a1b2c3d4e5f678",
    email: "master@example.com",
    password: "MasterAdmin123!",
    initialPassword: "MasterAdmin123!",
    name: "Master Admin",
    firstName: "Master",
    lastName: "Admin",
    role: "master_admin",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    _id: "64b6f4e5c8a1b2c3d4e5f679",
    email: "regular@example.com",
    password: "RegularAdmin123!",
    initialPassword: "RegularAdmin123!",
    name: "Regular Admin",
    firstName: "Regular",
    lastName: "Admin",
    role: "admin",
    assignedBarangayId: "",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

class AuthService {
  /**
   *
   * @param credentials User login credentials
   * @returns Promise with auth response containing user and token
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const url = `${baseUrl}/api/auth/login`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password || "",
        allowPasswordBypass: credentials.allowPasswordBypass ?? false,
      }),
    });

    // Check if response is ok before parsing JSON
    if (!res.ok) {
      // Try to get error message from response
      let errorMessage = "Login failed";
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response is not JSON (e.g., HTML error page), use status text
        errorMessage = res.statusText || `Server error (${res.status})`;
      }
      throw new Error(errorMessage);
    }

    let response = await res.json();

    if (!response.success) {
      throw new Error(response.error || "Login failed");
    }

    let user: User = response.data;

    // Generate a mock token
    const token = `mock-jwt-token-${Date.now()}`;

    // Optimize storage operations by batching them
    const storageType = credentials.rememberMe
      ? "localStorage"
      : "sessionStorage";
    const cookieMaxAge = credentials.rememberMe ? "; max-age=2592000" : ""; // 30 days if remember me

    // Store user data using safe methods
    this.safeSetItem(USER_STORAGE_KEY, JSON.stringify(user), storageType);
    this.safeSetItem(TOKEN_STORAGE_KEY, token, storageType);
    this.safeSetItem(USER_ROLE_KEY, user.role, storageType);

    if (user.assignedBarangayId) {
      this.safeSetItem(
        ASSIGNED_BARANGAY_KEY,
        user.assignedBarangayId,
        storageType
      );
    }

    // Set cookies for middleware access (must be set individually)
    document.cookie = `${TOKEN_STORAGE_KEY}=${token}; path=/${cookieMaxAge}`;
    document.cookie = `${USER_ROLE_KEY}=${user.role}; path=/${cookieMaxAge}`;

    if (user.assignedBarangayId) {
      document.cookie = `${ASSIGNED_BARANGAY_KEY}=${user.assignedBarangayId}; path=/${cookieMaxAge}`;
    }

    return { user, token };
  }

  /**
   * Simulates a registration API call
   *
   * @param userData User registration data
   * @returns Promise with auth response containing user and token
   */
  async register(userData: RegisterCredentials): Promise<void> {
    const users = await this.getStoredUsers();

    // Check if email already exists
    if (users.some((u) => u.email === userData.email)) {
      throw new Error("Email already in use");
    }

    const now = new Date().toISOString();

    // Payload that goes to the API (no _id so MongoDB can generate ObjectId)
    const apiPayload: Omit<User, "_id"> = {
      email: userData.email,
      password: userData.password,
      name: `${userData.lastName}, ${userData.firstName} ${
        userData.middleName || ""
      }`.trim(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      middleName: userData.middleName,
      gender: userData.gender,
      birthday: userData.birthday,
      role: userData.role || "admin",
      assignedBarangayId: userData.assignedBarangayId,
      createdAt: now,
      updatedAt: now,
    };

    const localUser: User = {
      _id: this.generateObjectId(),
      ...apiPayload,
      initialPassword: userData.password,
    };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const url = `${baseUrl}/api/auth/register`;

    const attemptRemoteRegistration = async (): Promise<boolean> => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiPayload),
        });

        if (!res.ok) {
          let errorMessage = "Registration failed";
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = res.statusText || `Server error (${res.status})`;
          }

          // Propagate validation errors but allow fallback on server failures
          if (res.status >= 400 && res.status < 500) {
            throw new Error(errorMessage);
          }

          console.warn("Registration API unavailable, using local fallback:", errorMessage);
          return false;
        }

        const response = await res.json();

        if (!response.success) {
          console.warn("Registration API returned failure, using local fallback:", response.error);
          return false;
        }

        return true;
      } catch (error) {
        console.warn("Registration request failed, using local fallback:", error);
        return false;
      }
    };

    const remoteSuccess = await attemptRemoteRegistration();

    // Always persist locally so Admin Management works offline / without auth key
    this.upsertLocalUser(localUser);

    if (!remoteSuccess) {
      // Remote sync failed but local data is saved, so exit gracefully
      return;
    }
  }

  async logout(): Promise<void> {
    this.safeRemoveItem(USER_STORAGE_KEY);
    this.safeRemoveItem(TOKEN_STORAGE_KEY);
    this.safeRemoveItem(USER_ROLE_KEY);
    this.safeRemoveItem(ASSIGNED_BARANGAY_KEY);

    // Clear cookies
    document.cookie = `${TOKEN_STORAGE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${USER_ROLE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${ASSIGNED_BARANGAY_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * Gets the current authenticated user
   *
   * @returns The current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    try {
      // Try localStorage first, then sessionStorage
      const userJson = this.safeGetItem(USER_STORAGE_KEY);

      if (!userJson) {
        return null;
      }

      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Gets the current authentication token
   *
   * @returns The current token or null if not authenticated
   */
  getToken(): string | null {
    try {
      // Try localStorage first, then sessionStorage
      return this.safeGetItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  /**
   * Checks if the user is authenticated
   *
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  // Cache for stored users to avoid repeated parsing
  private cachedUsers: User[] | null = null;

  private getAuthKey(): string | null {
    const authKey = process.env.NEXT_PUBLIC_AUTHKEY;
    if (!authKey || !authKey.trim()) {
      return null;
    }
    return authKey;
  }

  private shouldUseRemoteAdminApi(): boolean {
    return !!this.getAuthKey();
  }

  private generateObjectId(): string {
    const bytes =
      typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint8Array(12))
        : Array.from({ length: 12 }, () => Math.floor(Math.random() * 256));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  private normalizeUser(user: any): User {
    const normalizedId =
      typeof user._id === "string"
        ? user._id
        : user._id?.$oid ?? (user._id?.toString ? user._id.toString() : this.generateObjectId());

    return {
      ...user,
      _id: normalizedId,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    };
  }

  private persistLocalUsers(users: User[]): void {
    const cloned = users.map((user) => ({ ...user }));
    this.safeSetItem(USERS_STORAGE_KEY, JSON.stringify(cloned), "localStorage");
  }

  private loadLocalUsers(): User[] {
    try {
      const stored = this.safeGetItem(USERS_STORAGE_KEY, "localStorage");
      if (stored) {
        const parsed = JSON.parse(stored) as User[];
        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn("Error parsing locally stored users, reseeding defaults:", error);
    }
    const seeded = DEFAULT_USERS.map((user) => ({ ...user }));
    this.persistLocalUsers(seeded);
    return seeded;
  }

  private upsertLocalUser(user: User): void {
    const users = this.loadLocalUsers();
    const index = users.findIndex((item) => item._id === user._id);
    const updatedUser = { ...user };

    if (index >= 0) {
      users[index] = { ...users[index], ...updatedUser, updatedAt: new Date().toISOString() };
    } else {
      users.push(updatedUser);
    }

    this.persistLocalUsers(users);
    this.cachedUsers = users;
  }

  private deleteLocalUser(userId: string): boolean {
    const users = this.loadLocalUsers();
    const filtered = users.filter((user) => user._id !== userId);
    if (filtered.length === users.length) {
      return false;
    }
    this.persistLocalUsers(filtered);
    this.cachedUsers = filtered;
    return true;
  }

  /**
   * Helper method to get stored users with caching for better performance
   *
   * @returns Array of stored users
   */
  async getStoredUsers(): Promise<User[]> {
    // Return cached users immediately if available to avoid extra parsing/network
    if (this.cachedUsers && this.cachedUsers.length) {
      return this.cachedUsers;
    }

    const useRemote = this.shouldUseRemoteAdminApi();
    if (!useRemote) {
      const localUsers = this.loadLocalUsers();
      this.cachedUsers = localUsers;
      return localUsers;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${baseUrl}/api/auth/users`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authKey: this.getAuthKey() }),
      });

      if (!res.ok) {
        console.error(`Failed to fetch users: ${res.status} ${res.statusText}`);
        const localUsers = this.loadLocalUsers();
        this.cachedUsers = localUsers;
        return localUsers;
      }

      const response = await res.json();

      const users = Array.isArray(response.data)
        ? response.data.map((user: any) => this.normalizeUser(user))
        : [];

      this.cachedUsers = users;
      this.persistLocalUsers(users);
      return users;
    } catch (error) {
      console.error("Error getting stored users:", error);
      const localUsers = this.loadLocalUsers();
      this.cachedUsers = localUsers;
      return localUsers;
    }
  }

  /**
   * Updates a user in the stored users list
   *
   * @param updatedUser Partial user data to update
   * @returns True if update was successful, false otherwise
   */
  async updateStoredUser(updatedUser: Partial<User>): Promise<boolean> {
    if (!updatedUser._id) {
      throw new Error("User ID is required for updates");
    }

    const applyLocalUpdate = () => {
      const users = this.loadLocalUsers();
      const index = users.findIndex((user) => user._id === updatedUser._id);
      if (index === -1) {
        throw new Error("User not found");
      }
      const mergedUser: User = {
        ...users[index],
        ...updatedUser,
        updatedAt: new Date().toISOString(),
      };

      if (mergedUser.firstName || mergedUser.lastName) {
        const first = mergedUser.firstName ?? "";
        const last = mergedUser.lastName ?? "";
        mergedUser.name = `${first}${last ? ` ${last}` : ""}`.trim() || mergedUser.name;
      }

      this.upsertLocalUser(mergedUser);
      return true;
    };

    if (!this.shouldUseRemoteAdminApi()) {
      return applyLocalUpdate();
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${baseUrl}/api/auth/users`;
      
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authKey: this.getAuthKey(),
          user: updatedUser,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Update failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = res.statusText || `Server error (${res.status})`;
        }
        console.warn("Falling back to local user update due to API error:", errorMessage);
        return applyLocalUpdate();
      }

      const response = await res.json();

      if (!response.success) {
        console.warn("Falling back to local user update due to API response:", response.error);
        return applyLocalUpdate();
      }

      const normalizedUser = this.normalizeUser(response.data);
      this.upsertLocalUser(normalizedUser);

      // Clear cache to force refresh on next fetch
      this.cachedUsers = null;

      return true;
    } catch (error) {
      console.error("Error updating stored users, applying local fallback:", error);
      return applyLocalUpdate();
    }
  }

  /**
   * Deletes a user from the stored users list
   *
   * @param userId ID of the user to delete
   * @returns True if deletion was successful, false otherwise
   */
  async deleteStoredUser(userId: string): Promise<boolean> {
    if (!userId) {
      throw new Error("User ID is required for deletion");
    }

    if (!this.shouldUseRemoteAdminApi()) {
      return this.deleteLocalUser(userId);
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${baseUrl}/api/auth/users`;
      
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authKey: this.getAuthKey(),
          user: { _id: userId },
        }),
      });

      if (!res.ok) {
        let errorMessage = "Delete failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = res.statusText || `Server error (${res.status})`;
        }
        console.warn("Falling back to local user deletion due to API error:", errorMessage);
        return this.deleteLocalUser(userId);
      }

      const response = await res.json();

      if (!response.success) {
        console.warn("Falling back to local user deletion due to API response:", response.error);
        return this.deleteLocalUser(userId);
      }

      this.deleteLocalUser(userId);
      return true;
    } catch (error) {
      console.error("Error deleting stored users, applying local fallback:", error);
      return this.deleteLocalUser(userId);
    }
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const url = `${baseUrl}/api/auth/password-reset/request`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const response = await res.json();
    if (!res.ok || !response.success) {
      throw new Error(response.error || "Failed to send request");
    }

    return { message: response.message };
  }

  async getPasswordResetStatus(email: string): Promise<{
    status: string;
    bypassApproved: boolean;
    bypassExpiresAt?: string | null;
  }> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const url = `${baseUrl}/api/auth/password-reset/status`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const response = await res.json();
    if (!res.ok || !response.success) {
      throw new Error(response.error || "Failed to get status");
    }

    return response.data;
  }

  async fetchPasswordResetRequests() {
    if (!this.shouldUseRemoteAdminApi()) {
      return [];
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const url = `${baseUrl}/api/auth/password-reset/requests`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authKey: this.getAuthKey() }),
    });

    const response = await res.json();
    if (!res.ok || !response.success) {
      throw new Error(response.error || "Failed to fetch requests");
    }

    return response.data;
  }

  async updatePasswordResetRequest(
    requestId: string,
    action: "accept" | "reject",
    resolvedBy?: string
  ) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const url = `${baseUrl}/api/auth/password-reset/requests`;

    if (!this.shouldUseRemoteAdminApi()) {
      throw new Error("Real-time login approvals are disabled. Set NEXT_PUBLIC_AUTHKEY to enable this feature.");
    }

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authKey: this.getAuthKey(),
        requestId,
        action,
        resolvedBy,
      }),
    });

    const response = await res.json();
    if (!res.ok || !response.success) {
      throw new Error(response.error || "Failed to update request");
    }

    return response.data;
  }
  /**
   * Safe method to get items from storage with fallback
   * @param key Storage key
   * @param preferredStorage Preferred storage type
   * @returns Value or null if not found or error
   */
  private safeGetItem(
    key: string,
    preferredStorage?: "localStorage" | "sessionStorage"
  ): string | null {
    try {
      // Try preferred storage first
      if (preferredStorage === "localStorage") {
        return localStorage.getItem(key);
      } else if (preferredStorage === "sessionStorage") {
        return sessionStorage.getItem(key);
      }

      // Try localStorage first, then sessionStorage
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (error) {
      console.warn(
        `Storage blocked for key ${key}, using memory fallback:`,
        error
      );
      // Fallback to memory storage
      return memoryStorage[key] || null;
    }
  }

  /**
   * Safe method to set items in storage with fallback
   * @param key Storage key
   * @param value Value to store
   * @param preferredStorage Preferred storage type
   */
  private safeSetItem(
    key: string,
    value: string,
    preferredStorage?: "localStorage" | "sessionStorage"
  ): void {
    try {
      if (preferredStorage === "localStorage") {
        localStorage.setItem(key, value);
      } else if (preferredStorage === "sessionStorage") {
        sessionStorage.setItem(key, value);
      } else {
        // Try localStorage first, fallback to sessionStorage
        try {
          localStorage.setItem(key, value);
        } catch (localError) {
          console.warn(
            "localStorage failed, trying sessionStorage:",
            localError
          );
          sessionStorage.setItem(key, value);
        }
      }
      // Also store in memory as backup
      memoryStorage[key] = value;
    } catch (error) {
      console.warn(
        `Storage blocked for key ${key}, using memory fallback:`,
        error
      );
      // Fallback to memory storage only
      memoryStorage[key] = value;
    }
  }

  /**
   * Safe method to remove items from storage
   * @param key Storage key
   */
  private safeRemoveItem(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing storage for key ${key}:`, error);
    }
    // Always remove from memory storage
    delete memoryStorage[key];
  }
}

// Export a singleton instance
export const authService = new AuthService();
