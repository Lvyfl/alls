"use client";

// @ts-ignore - available at runtime
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
// @ts-ignore - available at runtime
import { useParams, useRouter } from "next/navigation";
import { useProgressStore } from "@/store/progress-store";
import { useStore } from "@/store";
import { useAuthStoreState } from "@/store/auth-store";
import { Student, Module, Progress, Activity, PredefinedActivity } from "@/types";
import { formatStudentName } from "@/utils/name-formatter";
// @ts-ignore - available at runtime
import Image from "next/image";
// @ts-ignore - available at runtime
import { shallow } from "zustand/shallow";

// Import static data directly as fallback
import studentsData from "@/data/students.json";
import progressData from "@/data/progress.json";
import modulesData from "@/data/modules.json";

const generateFallbackModuleId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `module-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeModuleRecord = (module: any): Module => {
  const resolvedId =
    module?._id?.toString?.() ||
    module?.id?.toString?.() ||
    generateFallbackModuleId();

  const levels = Array.isArray(module?.levels)
    ? module.levels
    : module?.levels
    ? [module.levels]
    : [];

  return {
    _id: resolvedId,
    title: module?.title || "",
    levels: levels
      .map((level: string) => String(level || "").trim())
      .filter(Boolean),
    predefinedActivities: Array.isArray(module?.predefinedActivities)
      ? module.predefinedActivities.map((activity: any) => ({
          name: activity?.name || "",
          type: (activity?.type as any) || "Assessment",
          total: Number(activity?.total) || 0,
          description: activity?.description || "",
        }))
      : [],
  };
};

const dedupeModulesById = (modules: Module[]): Module[] => {
  const lookup = new Map<string, Module>();
  modules.forEach((module) => {
    if (!module?._id) return;
    lookup.set(module._id, module);
  });
  return Array.from(lookup.values());
};

const filterModulesForProgram = (modules: Module[], program?: string | null, barangayId?: string | null) => {
  let filtered = modules;

  // Filter by barangayId: show modules for this barangay OR modules without barangayId (legacy/global)
  if (barangayId) {
    filtered = filtered.filter((module) =>
      !module.barangayId || module.barangayId === barangayId
    );
  }

  // Filter by program
  if (program) {
    const normalizedProgram = String(program).trim();
    filtered = filtered.filter((module) =>
      module.levels?.some(
        (level) => level === normalizedProgram || level === "All Programs"
      )
    );
  }

  return filtered;
};

type ModuleFormPayload = {
  title: string;
  levels: string[];
  predefinedActivities: PredefinedActivity[];
};

// Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActivityTable } from "@/components/progress/activity-table";
import { ActivityTableSkeleton } from "@/components/progress/activity-table-skeleton";
import { AddCustomModuleDialog } from "@/components/progress/add-custom-module-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
// @ts-ignore - available at runtime
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteProgress,
  fetchModules,
  fetchProgress,
  updateProgress,
  createProgress,
  fetchStudents as apiFetchStudents,
  createModule,
  updateModule,
  deleteModule as removeModule,
} from "@/services/api";
// @ts-ignore - types only in dev
import { set } from "zod";

// Custom hook to safely manage store subscriptions
function useStableStoreData() {
  const [storeData, setStoreData] = useState({
    modules: [] as Module[],
    loadModules: null as any,
    progress: [] as Progress[],
    loadProgress: null as any,
    progressLoading: false,
    students: [] as Student[],
    loadStudents: null as any,
  });

  const [progressStoreData, setProgressStoreData] = useState({
    getStudentByLrn: null as any,
    getFilteredStudents: null as any,
    updateActivity: null as any,
    deleteActivity: null as any,
    fetchStudents: null as any,
    fetchProgress: null as any,
  });

  const isInitialized = useRef(false);

  // Subscribe to main store once
  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      if (!isInitialized.current) {
        isInitialized.current = true;
      }

      setStoreData({
        modules: state.modules?.data || [],
        loadModules: null, // Remove action access since it's not available in types
        progress: state.progress?.data || [],
        loadProgress: null, // Remove action access since it's not available in types
        progressLoading: state.progress?.loading || false,
        // Add students data from main store
        students: state.students?.data || [],
        loadStudents: null, // Remove action access since it's not available in types
      });
    });

    return unsubscribe;
  }, []);

  // Subscribe to progress store once
  useEffect(() => {
    const unsubscribe = useProgressStore.subscribe((state) => {
      setProgressStoreData({
        getStudentByLrn: state.getStudentByLrn,
        getFilteredStudents: state.getFilteredStudents,
        updateActivity: state.updateActivity,
        deleteActivity: state.deleteActivity,
        fetchStudents: state.fetchStudents,
        fetchProgress: state.fetchProgress,
      });
    });

    return unsubscribe;
  }, []);

  return { ...storeData, ...progressStoreData };
}

function StudentActivitySummaryPageContent() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string; // This is the LRN

  // Use the stable store data hook to prevent infinite loops
  const {
    modules,
    loadModules,
    progress,
    loadProgress,
    progressLoading,
    students,
    loadStudents,
    getFilteredStudents,
    // updateActivity,
    // deleteActivity,
    fetchStudents,
  } = useStableStoreData();

  // Get barangays from progress store
  const { barangays } = useProgressStore();
  
  // Get user to access assigned barangay for module filtering
  const { user } = useAuthStoreState();

  // Create our own getStudentByLrn function using main store data with fallback
  const getStudentByLrn = useCallback(
    (lrn: string) => {
      // First try to find in store data
      let found = students.find((student) => student.lrn === lrn);

      // If not found in store, use static data as fallback
      if (!found) {
        found = studentsData.find((student) => student.lrn === lrn) as
          | Student
          | undefined;
      }

      return found;
    },
    [students]
  );

  // Local state
  const [student, setStudent] = useState<Student | null>(null);
  const [studentProgress, setStudentProgress] = useState<Progress[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [moduleDialogMode, setModuleDialogMode] = useState<"create" | "edit">("create");
  const [moduleBeingEdited, setModuleBeingEdited] = useState<Module | null>(null);
  const [modulePendingDeletion, setModulePendingDeletion] = useState<Module | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const displaySuccessMessage = useCallback((message: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessMessage(message);
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage("");
      successTimeoutRef.current = null;
    }, 3000);
  }, []);

  // Load data on mount with proper error handling - run once only
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsInitialLoading(true);

        // Load data from progress store (main store actions are not available)
        if (student) {
          const res = await fetchProgress(student.lrn);
          setStudentProgress(res);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [student]); // Run on student update

  // Get student data when studentId changes - with API fallback
  useEffect(() => {
    const loadStudent = async () => {
      if (!studentId) return;
      
      setIsInitialLoading(true);
      
      try {
        // First try to find in store
        let foundStudent: Student | null = null;
        
        if (getStudentByLrn) {
          foundStudent = getStudentByLrn(studentId) || null;
        }
        
        // If not found in store, try to fetch from API
        if (!foundStudent) {
          try {
            // Fetch directly from API
            const allStudents = await apiFetchStudents();
            foundStudent = allStudents.find((s) => s.lrn === studentId) || null;
            
            // If found, also ensure store is updated (but don't wait)
            if (fetchStudents && foundStudent) {
              fetchStudents().catch(err => console.error("Error updating store:", err));
            }
          } catch (error) {
            console.error("Error fetching students from API:", error);
          }
        }
        
        // Final fallback to static data
        if (!foundStudent) {
          const staticStudent = studentsData.find((s) => s.lrn === studentId) as any;
          if (staticStudent) {
            foundStudent = {
              ...staticStudent,
              _id: (staticStudent._id || staticStudent.lrn || `student-${Math.random()}`) as string
            } as Student;
          }
        }
        
        setStudent(foundStudent || null);
      } catch (error) {
        console.error("Error loading student:", error);
        setStudent(null);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadStudent();
  }, [studentId, getStudentByLrn, fetchStudents]); // Include fetchStudents - will use apiFetchStudents as fallback

  // Create stable empty arrays for memoization
  const emptyStudentProgress = useMemo(() => [], []);

  // Memoize student progress to prevent recalculation
  const studentProgressRecords = useMemo(async () => {
    if (student) {
      // First try store data
      const progressData = await fetchProgress(student.lrn);
      let progressRecords = progressData.filter((p) => p.studentId === student.lrn);

      return progressRecords;
    }
    return emptyStudentProgress;
  }, [student, progress, emptyStudentProgress]);

  // Load modules (static + API) once - filter by student's barangay
  useEffect(() => {
    const initializeModules = async () => {
      const fallbackModules = (modulesData as any[]).map(normalizeModuleRecord);
      setAllModules(fallbackModules);

      try {
        // Determine which barangayId to use for filtering:
        // 1. Student's barangay (if student is loaded)
        // 2. Admin's assigned barangay (if admin)
        // 3. null (get all modules)
        const barangayIdForFilter = student?.barangayId || 
          (user?.role === 'admin' ? user.assignedBarangayId : undefined);
        
        const apiModules = await fetchModules(barangayIdForFilter);
        if (apiModules && apiModules.length > 0) {
          setAllModules((prev) =>
            dedupeModulesById([
              ...prev,
              ...apiModules.map(normalizeModuleRecord),
            ])
          );
        }
      } catch (error) {
        console.error("Error loading modules:", error);
      }
    };

    initializeModules();
  }, [student?.barangayId, user?.role, user?.assignedBarangayId]);

  // Filter modules per student program and barangay
  useEffect(() => {
    if (!allModules.length) {
      setAvailableModules([]);
      return;
    }
    // Filter by both program and barangay
    const barangayId = student?.barangayId || 
      (user?.role === 'admin' ? user.assignedBarangayId : undefined);
    setAvailableModules(filterModulesForProgram(allModules, student?.program, barangayId));
  }, [allModules, student?.program, student?.barangayId, user?.role, user?.assignedBarangayId]);

  // Update state when data changes
  useEffect(() => {
    (async () => {
      const records = await studentProgressRecords;
      setStudentProgress(records);
    })();
  }, [studentProgressRecords]);

  // Ensure selected module stays in sync with available list
  useEffect(() => {
    if (availableModules.length === 0) {
      if (selectedModule) {
        setSelectedModule("");
      }
      return;
    }

    const exists = selectedModule
      ? availableModules.some((module) => module._id === selectedModule)
      : false;

    if (!selectedModule || !exists) {
      setSelectedModule(availableModules[0]._id);
    }
  }, [availableModules, selectedModule]);


  const selectedModuleData = useMemo(
    () => availableModules.find((module) => module._id === selectedModule) || null,
    [availableModules, selectedModule]
  );

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push("/progress");
  }, [router]);

  // Module dialog helpers
  const handleOpenModuleDialog = useCallback(
    (mode: "create" | "edit") => {
      if (mode === "edit" && !selectedModuleData) {
        return;
      }
      setModuleDialogMode(mode);
      setModuleBeingEdited(mode === "edit" ? selectedModuleData : null);
      setIsModuleDialogOpen(true);
    },
    [selectedModuleData]
  );

  const handleCreateModule = useCallback(
    async (moduleData: ModuleFormPayload) => {
      try {
        // Determine barangayId: use student's barangay or admin's assigned barangay
        const barangayId = student?.barangayId || 
          (user?.role === 'admin' ? user.assignedBarangayId : undefined);
        
        const modulePayload = {
          ...moduleData,
          barangayId: barangayId || undefined, // Only include if it exists
        };
        
        const createdModule = await createModule(modulePayload);
        const normalized = normalizeModuleRecord(createdModule);
        setAllModules((prev) => dedupeModulesById([...prev, normalized]));
        setSelectedModule(normalized._id);
        displaySuccessMessage(`Module "${moduleData.title}" added successfully.`);
      } catch (error) {
        console.error("Error creating custom module:", error);
        throw error instanceof Error ? error : new Error("Failed to create module");
      }
    },
    [displaySuccessMessage, student?.barangayId, user?.role, user?.assignedBarangayId]
  );

  const handleUpdateModule = useCallback(
    async (moduleId: string, moduleData: ModuleFormPayload) => {
      try {
        // Determine barangayId: use student's barangay or admin's assigned barangay
        // Note: For updates, we preserve the existing barangayId unless user is master_admin
        const barangayId = user?.role === 'master_admin' 
          ? (student?.barangayId || user.assignedBarangayId || undefined)
          : (student?.barangayId || user?.assignedBarangayId || undefined);
        
        const modulePayload = {
          ...moduleData,
          barangayId: barangayId || undefined, // Only include if it exists
        };
        
        const updatedModule = await updateModule(moduleId, modulePayload);
        const normalized = normalizeModuleRecord(updatedModule);
        setAllModules((prev) =>
          dedupeModulesById(
            prev.map((module) => (module._id === moduleId ? normalized : module))
          )
        );
        displaySuccessMessage(`Module "${moduleData.title}" updated successfully.`);
      } catch (error) {
        console.error("Error updating module:", error);
        throw error instanceof Error ? error : new Error("Failed to update module");
      }
    },
    [displaySuccessMessage, student?.barangayId, user?.role, user?.assignedBarangayId]
  );

  const handleConfirmModuleDeletion = useCallback(async () => {
    if (!modulePendingDeletion?._id) return;
    setIsDeletingModule(true);
    try {
      await removeModule(modulePendingDeletion._id);
      setAllModules((prev) =>
        prev.filter((module) => module._id !== modulePendingDeletion._id)
      );
      displaySuccessMessage(`Module "${modulePendingDeletion.title}" deleted successfully.`);
      setModulePendingDeletion(null);
    } catch (error) {
      console.error("Error deleting module:", error);
      alert("Failed to delete module. Please try again.");
    } finally {
      setIsDeletingModule(false);
    }
  }, [modulePendingDeletion, displaySuccessMessage]);

  // Create stable empty array for navigation
  const emptyFilteredStudents = useMemo(() => [], []);

  // Memoize navigation info to prevent recalculation
  const navigationInfo = useMemo(() => {
    if (!getFilteredStudents)
      return {
        filteredStudents: emptyFilteredStudents,
        currentStudentIndex: -1,
        hasPrevious: false,
        hasNext: false,
      };

    const filteredStudents = getFilteredStudents();
    const currentStudentIndex = filteredStudents.findIndex(
      (s: Student) => s.lrn === studentId
    );
    return {
      filteredStudents,
      currentStudentIndex,
      hasPrevious: currentStudentIndex > 0,
      hasNext: currentStudentIndex < filteredStudents.length - 1,
    };
  }, [getFilteredStudents, studentId, emptyFilteredStudents]);

  const { filteredStudents, currentStudentIndex, hasPrevious, hasNext } =
    navigationInfo;

  // Handle student navigation with useCallback to prevent recreation
  const handlePreviousStudent = useCallback(() => {
    if (hasPrevious && !isNavigating) {
      setIsNavigating(true);
      const previousStudent = filteredStudents[currentStudentIndex - 1];
      router.push(`/progress/${previousStudent.lrn}`);
      // Reset navigation state after a short delay
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [
    hasPrevious,
    isNavigating,
    filteredStudents,
    currentStudentIndex,
    router,
  ]);

  const handleNextStudent = useCallback(() => {
    if (hasNext && !isNavigating) {
      setIsNavigating(true);
      const nextStudent = filteredStudents[currentStudentIndex + 1];
      router.push(`/progress/${nextStudent.lrn}`);
      // Reset navigation state after a short delay
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [hasNext, isNavigating, filteredStudents, currentStudentIndex, router]);

  // Handle keyboard navigation with memoized handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle navigation if no input/textarea is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePreviousStudent();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNextStudent();
      }
    },
    [handlePreviousStudent, handleNextStudent]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Activity handlers with useCallback to prevent recreation
  const handleActivityUpdate = useCallback(
    async (activityIndex: number, activity: Activity) => {
      try {
        if (!student) {
          alert("Student information not available.");
          return;
        }

        // Check if this is a new activity (activityIndex === -1)
        if (activityIndex === -1) {
          // Check if progress record exists for this module
          const existingProgress = studentProgress.find(p => p.moduleId === selectedModule);
          
          if (existingProgress) {
            // Add activity to existing progress record via API
            const baseUrl = ((globalThis as any).process?.env?.NEXT_PUBLIC_BASE_URL) || '';
            const res = await fetch(`${baseUrl}/api/progress`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: student.lrn,
                moduleId: selectedModule,
                activity: activity,
                action: 'add' // Indicate this is an add operation
              })
            });

            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || 'Failed to add activity');
            }
          } else {
            // Create new progress record with this activity
            const newProgress = {
              studentId: student.lrn,
              barangayId: student.barangayId,
              moduleId: selectedModule,
              activities: [activity]
            };
            
            await createProgress(newProgress as any);
          }
        } else {
          // Update existing activity
          await updateProgress(
            studentId,
            selectedModule,
            activityIndex,
            activity
          );
        }

        // Refresh progress data
        if (student) {
          const res = await fetchProgress(student.lrn);
          setStudentProgress(res);
        }
        displaySuccessMessage("Activity saved successfully!");
      } catch (error) {
        console.error("Error saving activity:", error);
        alert(`Failed to ${activityIndex === -1 ? 'add' : 'update'} activity. Please try again.`);
      }
    },
    [studentId, selectedModule, fetchProgress, student, studentProgress, displaySuccessMessage]
  );

  const handleActivityDelete = useCallback(
    async (activityIndex: number) => {
      try {
        await deleteProgress(studentId, selectedModule, activityIndex);
        // Refresh progress data from progress store
        if (student) {
          const res = await fetchProgress(student.lrn);
          setStudentProgress(res);
        }
        displaySuccessMessage("Activity deleted successfully!");
      } catch (error) {
        console.error("Error deleting activity:", error);
        alert("Failed to delete activity. Please try again.");
      }
    },
    [studentId, selectedModule, fetchProgress, student, displaySuccessMessage]
  );


  // Show loading state during initial data load
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg border-4 border-blue-600 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading student data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while initializing
  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Progress
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading student data...</p>
        </div>
      </div>
    );
  }

  // Show error state if student not found after loading
  if (!student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Progress
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Student not found.</p>
          <p className="text-sm text-gray-400 mt-2">LRN: {studentId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-slate-900 py-4">
      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-blue-600 dark:border-blue-500 mx-auto max-w-7xl">
        {/* Student Information Header */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 border-b-4 border-blue-600 dark:border-blue-500">
          <div className="bg-gray-100 dark:bg-slate-700 px-4 sm:px-6 py-4 sm:py-5 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              {/* Left side - Back button, navigation, and student info */}
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto flex-1 min-w-0">
                {/* Back Arrow */}
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  size="sm"
                  className="bg-red-800 dark:bg-red-900 text-white hover:bg-red-900 dark:hover:bg-red-800 p-2 rounded flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                {/* Student Image */}
                <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                  {student.image ? (
                    <Image
                      src={student.image}
                      alt={student.name}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  ) : null}
                  {/* Initials fallback */}
                  <span className="text-gray-600 dark:text-gray-300 font-bold text-sm sm:text-base">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </span>
                </div>

                {/* Student Details */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white uppercase truncate">
                    {student.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                    {student.lrn}
                  </p>
                </div>
              </div>

              {/* Right side - Program info */}
              <div className="text-left sm:text-right w-full sm:w-auto sm:flex-shrink-0 pl-14 sm:pl-0">
                <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">
                  {student.program}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="px-4 sm:px-6 pt-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded">
              ✓ {successMessage}
            </div>
          </div>
        )}

        {/* Modules Section */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-6">
          <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Modules
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleOpenModuleDialog("create")}
                variant="outline"
                size="sm"
                className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-500 dark:hover:bg-blue-600 border-blue-600 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-600 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Module</span>
              </Button>
              <Button
                onClick={() => handleOpenModuleDialog("edit")}
                variant="outline"
                size="sm"
                disabled={!selectedModuleData}
                className="bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-400 dark:hover:bg-amber-500 border-amber-500 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:border-gray-300 disabled:cursor-not-allowed"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit Module</span>
              </Button>
              <Button
                onClick={() => selectedModuleData && setModulePendingDeletion(selectedModuleData)}
                variant="outline"
                size="sm"
                disabled={!selectedModuleData}
                className="bg-red-600 dark:bg-red-700 text-white hover:bg-red-500 dark:hover:bg-red-600 border-red-600 dark:border-red-700 hover:border-red-500 dark:hover:border-red-600 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:border-gray-300 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Module</span>
              </Button>
            </div>
          </div>

          {/* Module Tabs */}
          {availableModules.length > 0 ? (
            <Tabs
              value={selectedModule}
              onValueChange={setSelectedModule}
              className="w-full"
            >
              <div className="border-b border-gray-300 dark:border-gray-600">
                {/* Responsive, wrapping module cards */}
                <TabsList className="w-full !bg-transparent !h-auto rounded-none p-0 flex flex-wrap gap-2 sm:gap-3 justify-start items-stretch">
                  {availableModules.map((module) => (
                    <TabsTrigger
                      key={module._id}
                      value={module._id}
                      className={`flex flex-col items-start justify-between text-left font-semibold whitespace-normal break-words
                        min-w-[160px] sm:min-w-[180px] md:min-w-[200px] max-w-full
                        px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border shadow-sm text-xs sm:text-sm md:text-base
                        transition-all duration-200
                        ${
                          selectedModule === module._id
                            ? "!bg-blue-600 dark:!bg-blue-700 !text-white border-blue-600 dark:border-blue-500 shadow-md scale-[1.01]"
                            : "bg-white dark:bg-slate-800 !text-gray-800 dark:!text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-400"
                        }`}
                    >
                      <span className="block leading-snug sm:leading-normal break-words line-clamp-2">
                        {module.title}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Module Content */}
              {availableModules.map((module) => {
                const moduleProgress = studentProgress.find(
                  (progressRecord) => progressRecord.moduleId === module._id
                );
                return (
                  <TabsContent key={module._id} value={module._id} className="mt-3 sm:mt-4">
                    <div className="p-0">
                      {progressLoading ? (
                        <ActivityTableSkeleton />
                      ) : (
                        <ActivityTable
                          activities={moduleProgress?.activities || []}
                          moduleTitle={module.title}
                          studentId={studentId}
                          moduleId={module._id}
                          onActivityUpdate={handleActivityUpdate}
                          onActivityDelete={handleActivityDelete}
                          // Student navigation props
                          currentStudentIndex={currentStudentIndex}
                          totalStudents={filteredStudents.length}
                          hasPrevious={hasPrevious}
                          hasNext={hasNext}
                          onPreviousStudent={handlePreviousStudent}
                          onNextStudent={handleNextStudent}
                          isNavigating={isNavigating}
                          // Predefined activities for quick add
                          predefinedActivities={module.predefinedActivities || []}
                          // Custom module handler
                          onAddCustomModule={() => handleOpenModuleDialog("create")}
                          userRole={user?.role}
                        />
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No modules available for this student's program.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Module Confirmation */}
      <Dialog
        open={!!modulePendingDeletion}
        onOpenChange={(open) => {
          if (!open) {
            setModulePendingDeletion(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] border-4 border-red-600 dark:border-red-500 bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-red-700 dark:text-red-300">Delete Module</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              This action cannot be undone. The module will be removed from the list for all students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>Module to delete:</p>
            <div className="p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700">
              <p className="font-semibold text-gray-900 dark:text-white">
                {modulePendingDeletion?.title || "No module selected"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Levels: {(modulePendingDeletion?.levels || []).join(", ") || "N/A"}
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModulePendingDeletion(null)}
              disabled={isDeletingModule}
              className="border-2 border-gray-300 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmModuleDeletion}
              disabled={isDeletingModule}
              className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 hover:border-red-700"
            >
              {isDeletingModule ? "Deleting..." : "Delete Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Module Dialog */}
      <AddCustomModuleDialog
        isOpen={isModuleDialogOpen}
        onClose={() => {
          setIsModuleDialogOpen(false);
          setModuleBeingEdited(null);
        }}
        student={student}
        mode={moduleDialogMode}
        moduleToEdit={moduleBeingEdited}
        onAddModule={handleCreateModule}
        onUpdateModule={handleUpdateModule}
      />
    </div>
  );
}

// Wrap with error boundary to handle any remaining issues
export default function StudentActivitySummaryPage() {
  return (
    <ErrorBoundary children={<StudentActivitySummaryPageContent />} />
  );
}
