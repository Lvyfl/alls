/**
 * Storage Service for ALS Student Tracker
 * Provides persistent data storage using localStorage with fallback mechanisms
 */

import { Student, Barangay, Module, Progress, Event } from '@/types';

// Storage keys
const STORAGE_KEYS = {
  STUDENTS: 'als-students-data',
  BARANGAYS: 'als-barangays-data',
  MODULES: 'als-modules-data',
  PROGRESS: 'als-progress-data',
  EVENTS: 'als-events-data',
  VERSION: 'als-data-version',
  LAST_SYNC: 'als-last-sync',
} as const;

// Current data version for migration purposes
const DATA_VERSION = '1.0.0';

// Storage interface
interface StorageData<T> {
  data: T[];
  version: string;
  lastModified: string;
  source: 'localStorage' | 'static' | 'api';
}

export class StorageService {
  /**
   * Generic method to save data to localStorage
   */
  private static saveToStorage<T>(key: string, data: T[]): void {
    try {
      const storageData: StorageData<T> = {
        data,
        version: DATA_VERSION,
        lastModified: new Date().toISOString(),
        source: 'localStorage',
      };
      
      localStorage.setItem(key, JSON.stringify(storageData));
      console.log(`💾 Saved ${data.length} items to ${key}`);
    } catch (error) {
      console.error(`❌ Failed to save data to ${key}:`, error);
      throw new Error(`Failed to save data to storage: ${error}`);
    }
  }

  /**
   * Generic method to load data from localStorage
   */
  private static loadFromStorage<T>(key: string): StorageData<T> | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const storageData: StorageData<T> = JSON.parse(stored);
      
      // Validate data structure
      if (!storageData.data || !Array.isArray(storageData.data)) {
        console.warn(`⚠️ Invalid data structure in ${key}, clearing...`);
        localStorage.removeItem(key);
        return null;
      }

      console.log(`📖 Loaded ${storageData.data.length} items from ${key} (${storageData.source})`);
      return storageData;
    } catch (error) {
      console.error(`❌ Failed to load data from ${key}:`, error);
      // Clear corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Check if we have persisted data for a given key
   */
  private static hasPersistedData(key: string): boolean {
    const data = this.loadFromStorage(key);
    return data !== null && data.data.length > 0;
  }

  // ==================== STUDENT METHODS ====================

  /**
   * Save students to localStorage
   */
  static saveStudents(students: Student[]): void {
    this.saveToStorage(STORAGE_KEYS.STUDENTS, students);
  }

  /**
   * Load students from localStorage
   */
  static loadStudents(): Student[] | null {
    const storageData = this.loadFromStorage<Student>(STORAGE_KEYS.STUDENTS);
    return storageData?.data || null;
  }

  /**
   * Add a new student to persisted data
   */
  static addStudent(student: Student): void {
    const existingStudents = this.loadStudents() || [];
    const updatedStudents = [...existingStudents, student];
    this.saveStudents(updatedStudents);
  }

  /**
   * Update an existing student in persisted data
   */
  static updateStudent(updatedStudent: Student): void {
    const existingStudents = this.loadStudents() || [];
    const updatedStudents = existingStudents.map(student =>
      student._id === updatedStudent._id ? updatedStudent : student
    );
    this.saveStudents(updatedStudents);
  }

  /**
   * Remove a student from persisted data
   */
  static removeStudent(studentId: string): void {
    const existingStudents = this.loadStudents() || [];
    const updatedStudents = existingStudents.filter(student => student._id !== studentId);
    this.saveStudents(updatedStudents);
  }

  /**
   * Check if we have persisted student data
   */
  static hasStudentData(): boolean {
    return this.hasPersistedData(STORAGE_KEYS.STUDENTS);
  }

  // ==================== BARANGAY METHODS ====================

  /**
   * Save barangays to localStorage
   */
  static saveBarangays(barangays: Barangay[]): void {
    this.saveToStorage(STORAGE_KEYS.BARANGAYS, barangays);
  }

  /**
   * Load barangays from localStorage
   */
  static loadBarangays(): Barangay[] | null {
    const storageData = this.loadFromStorage<Barangay>(STORAGE_KEYS.BARANGAYS);
    return storageData?.data || null;
  }

  /**
   * Check if we have persisted barangay data
   */
  static hasBarangayData(): boolean {
    return this.hasPersistedData(STORAGE_KEYS.BARANGAYS);
  }

  // ==================== PROGRESS METHODS ====================

  /**
   * Save progress to localStorage
   */
  static saveProgress(progress: Progress[]): void {
    this.saveToStorage(STORAGE_KEYS.PROGRESS, progress);
  }

  /**
   * Load progress from localStorage
   */
  static loadProgress(): Progress[] | null {
    const storageData = this.loadFromStorage<Progress>(STORAGE_KEYS.PROGRESS);
    return storageData?.data || null;
  }

  /**
   * Add a new progress record to persisted data
   */
  static addProgress(progress: Progress): void {
    const existingProgress = this.loadProgress() || [];
    const updatedProgress = [...existingProgress, progress];
    this.saveProgress(updatedProgress);
  }

  /**
   * Update an existing progress record in persisted data
   */
  static updateProgress(updatedProgress: Progress): void {
    const existingProgress = this.loadProgress() || [];
    const updatedProgressList = existingProgress.map(progress =>
      progress._id === updatedProgress._id ? updatedProgress : progress
    );
    this.saveProgress(updatedProgressList);
  }

  /**
   * Remove a progress record from persisted data
   */
  static removeProgress(progressId: string): void {
    const existingProgress = this.loadProgress() || [];
    const updatedProgress = existingProgress.filter(progress => progress._id !== progressId);
    this.saveProgress(updatedProgress);
  }

  /**
   * Check if we have persisted progress data
   */
  static hasProgressData(): boolean {
    return this.hasPersistedData(STORAGE_KEYS.PROGRESS);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear all persisted data
   */
  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🧹 Cleared all persisted data');
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    students: number;
    barangays: number;
    progress: number;
    totalSize: number;
    lastSync: string | null;
  } {
    const students = this.loadStudents()?.length || 0;
    const barangays = this.loadBarangays()?.length || 0;
    const progress = this.loadProgress()?.length || 0;
    
    let totalSize = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) totalSize += item.length;
    });

    return {
      students,
      barangays,
      progress,
      totalSize,
      lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC),
    };
  }

  /**
   * Validate storage integrity
   */
  static validateStorage(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      // Check students data
      const students = this.loadStudents();
      if (students) {
        if (!Array.isArray(students)) {
          issues.push('Students data is not an array');
        } else if (students.length > 0) {
          const firstStudent = students[0];
          if (!firstStudent._id || !firstStudent.lrn || !firstStudent.name) {
            issues.push('Student data structure is invalid');
          }
        }
      }

      // Check barangays data
      const barangays = this.loadBarangays();
      if (barangays) {
        if (!Array.isArray(barangays)) {
          issues.push('Barangays data is not an array');
        } else if (barangays.length > 0) {
          const firstBarangay = barangays[0];
          if (!firstBarangay._id || !firstBarangay.name) {
            issues.push('Barangay data structure is invalid');
          }
        }
      }

    } catch (error) {
      issues.push(`Storage validation error: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).alsStorage = {
    stats: () => StorageService.getStorageStats(),
    clear: () => StorageService.clearAllData(),
    validate: () => StorageService.validateStorage(),
    students: () => StorageService.loadStudents(),
    barangays: () => StorageService.loadBarangays(),
    progress: () => StorageService.loadProgress(),
  };
  console.log('🛠️ Storage tools available at window.alsStorage');
}
