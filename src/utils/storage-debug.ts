/**
 * Storage debugging utility to help identify browser extension interference
 */

export interface StorageTestResult {
  localStorage: {
    available: boolean;
    canWrite: boolean;
    canRead: boolean;
    error?: string;
  };
  sessionStorage: {
    available: boolean;
    canWrite: boolean;
    canRead: boolean;
    error?: string;
  };
  cookies: {
    available: boolean;
    canWrite: boolean;
    canRead: boolean;
    error?: string;
  };
}

/**
 * Test storage availability and functionality
 */
export function testStorageAvailability(): StorageTestResult {
  const result: StorageTestResult = {
    localStorage: {
      available: false,
      canWrite: false,
      canRead: false,
    },
    sessionStorage: {
      available: false,
      canWrite: false,
      canRead: false,
    },
    cookies: {
      available: false,
      canWrite: false,
      canRead: false,
    },
  };

  // Test localStorage
  try {
    result.localStorage.available = typeof localStorage !== 'undefined';
    if (result.localStorage.available) {
      const testKey = '__storage_test__';
      const testValue = 'test';
      
      // Test write
      localStorage.setItem(testKey, testValue);
      result.localStorage.canWrite = true;
      
      // Test read
      const readValue = localStorage.getItem(testKey);
      result.localStorage.canRead = readValue === testValue;
      
      // Cleanup
      localStorage.removeItem(testKey);
    }
  } catch (error) {
    result.localStorage.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test sessionStorage
  try {
    result.sessionStorage.available = typeof sessionStorage !== 'undefined';
    if (result.sessionStorage.available) {
      const testKey = '__storage_test__';
      const testValue = 'test';
      
      // Test write
      sessionStorage.setItem(testKey, testValue);
      result.sessionStorage.canWrite = true;
      
      // Test read
      const readValue = sessionStorage.getItem(testKey);
      result.sessionStorage.canRead = readValue === testValue;
      
      // Cleanup
      sessionStorage.removeItem(testKey);
    }
  } catch (error) {
    result.sessionStorage.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test cookies
  try {
    result.cookies.available = typeof document !== 'undefined' && typeof document.cookie !== 'undefined';
    if (result.cookies.available) {
      const testKey = '__cookie_test__';
      const testValue = 'test';
      
      // Test write
      document.cookie = `${testKey}=${testValue}; path=/`;
      result.cookies.canWrite = true;
      
      // Test read
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${testKey}=`))
        ?.split('=')[1];
      result.cookies.canRead = cookieValue === testValue;
      
      // Cleanup
      document.cookie = `${testKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  } catch (error) {
    result.cookies.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Log storage test results to console
 */
export function logStorageTestResults(): void {
  const results = testStorageAvailability();
  
  console.group('🔍 Storage Availability Test');
  
  console.log('📦 localStorage:', {
    available: results.localStorage.available,
    canWrite: results.localStorage.canWrite,
    canRead: results.localStorage.canRead,
    error: results.localStorage.error,
  });
  
  console.log('📦 sessionStorage:', {
    available: results.sessionStorage.available,
    canWrite: results.sessionStorage.canWrite,
    canRead: results.sessionStorage.canRead,
    error: results.sessionStorage.error,
  });
  
  console.log('🍪 cookies:', {
    available: results.cookies.available,
    canWrite: results.cookies.canWrite,
    canRead: results.cookies.canRead,
    error: results.cookies.error,
  });
  
  console.groupEnd();
  
  // Provide recommendations
  if (!results.localStorage.canWrite && !results.sessionStorage.canWrite) {
    console.warn('⚠️ Both localStorage and sessionStorage are blocked. This may be due to browser extensions or privacy settings.');
  }
  
  if (!results.cookies.canWrite) {
    console.warn('⚠️ Cookies are blocked. This may affect authentication.');
  }
}
