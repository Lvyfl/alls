'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStoreState } from '@/store/auth-store';
import { useStudentStore } from '@/store/student-store';
import { Module, PredefinedActivity } from '@/types';
import { fetchModules, createModule, updateModule, deleteModule } from '@/services/api';
import { AddCustomModuleDialog } from '@/components/progress/add-custom-module-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, BookOpen, Activity, Users, ArrowUpDown } from 'lucide-react';
import { ManageActivitiesDialog } from '@/components/modules/manage-activities-dialog';
import { ViewLearnersDialog } from '@/components/modules/view-learners-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ModuleFormValues {
  title: string;
  levels: string[];
  predefinedActivities: PredefinedActivity[];
  barangayIds?: string[];
}

// Helper function to normalize module records (same as student score summary)
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
        barangayId: activity?.barangayId || undefined,
      }))
      : [],
    barangayId: module?.barangayId,
    barangayIds: Array.isArray(module?.barangayIds) ? module.barangayIds : undefined,
    createdAt: module?.createdAt,
  };
};

// Helper function to dedupe modules by ID
const dedupeModulesById = (modules: Module[]): Module[] => {
  const lookup = new Map<string, Module>();
  modules.forEach((module) => {
    if (!module?._id) return;
    lookup.set(module._id, module);
  });
  return Array.from(lookup.values());
};

// Helper function to normalize level names for display
const normalizeLevelName = (level: string): string => {
  if (level === 'ALS Level 2' || level === 'ALS level 2') {
    return 'A&E Secondary';
  }
  return level;
};

// Helper function to check if a module is new (created within last 7 days)
const isModuleNew = (module: Module): boolean => {
  if (!module.createdAt) return false;
  try {
    const createdAt = new Date(module.createdAt);
    if (isNaN(createdAt.getTime())) return false;
    const now = new Date();
    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 0 && daysDiff <= 7;
  } catch (error) {
    return false;
  }
};

export default function ModulesPage() {
  const { user } = useAuthStoreState();
  const { barangays, fetchBarangays, students, fetchStudents } = useStudentStore();
  const studentsList = students.data || [];
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [moduleToEdit, setModuleToEdit] = useState<Module | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moduleForActivities, setModuleForActivities] = useState<Module | null>(null);
  const [isActivitiesDialogOpen, setIsActivitiesDialogOpen] = useState(false);
  const [moduleForLearners, setModuleForLearners] = useState<Module | null>(null);
  const [isLearnersDialogOpen, setIsLearnersDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'program'>('title');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [barangayFilter, setBarangayFilter] = useState<string>('all');

  // Available program levels
  const programLevels = [
    'Basic Literacy (BLP)',
    'A&E Elementary',
    'A&E Secondary'
  ];

  // Check if module is hard-coded (from JSON file)
  const isHardCodedModule = (module: Module) => {
    return typeof module._id === 'string' && module._id.startsWith('module-');
  };

  // Fetch barangays and students on mount
  useEffect(() => {
    if (barangays.length === 0) {
      fetchBarangays();
    }
    if (studentsList.length === 0) {
      fetchStudents();
    }
  }, [barangays.length, studentsList.length]);

  // Fetch modules from API only
  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      
      const barangayIdForFilter = user?.role === 'teacher' ? user.assignedBarangayId : undefined;
      const apiModules = await fetchModules(barangayIdForFilter);
      
      if (apiModules && apiModules.length > 0) {
        setModules(dedupeModulesById(apiModules.map(normalizeModuleRecord)));
      } else {
        setModules([]);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.assignedBarangayId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Get barangay name helper - supports both single barangayId and barangayIds array
  const getBarangayNames = (module: Module) => {
    // Check for barangayIds array first (new format)
    if (module.barangayIds && module.barangayIds.length > 0) {
      // If all barangays are selected, show "All Barangays"
      if (module.barangayIds.length === barangays.length) {
        return 'All Barangays';
      }
      const names = module.barangayIds
        .map((id) => barangays.find((b) => b._id === id)?.name)
        .filter(Boolean);
      return names.length > 0 ? names.join(', ') : 'Unknown';
    }
    // Fall back to single barangayId (legacy format)
    if (!module.barangayId) return 'All Barangays';
    const barangay = barangays.find((b) => b._id === module.barangayId);
    return barangay?.name || 'Unknown';
  };

  // Calculate learner count for a module based on program levels and barangay assignment
  const getLearnerCount = useCallback((module: Module): number => {
    return studentsList.filter(student => {
      // IMPORTANT: Teachers can only see students from their assigned barangay
      if (user?.role === 'teacher' && user?.assignedBarangayId) {
        if (student.barangayId !== user.assignedBarangayId) {
          return false;
        }
      }

      // For admins: Apply the page's barangay filter first if set
      if (user?.role === 'admin' && barangayFilter && barangayFilter !== 'all') {
        if (student.barangayId !== barangayFilter) {
          return false;
        }
      }

      // Check if student's program matches module's levels
      const programMatches = module.levels.some(
        level => level === student.program || level === "All Programs"
      );
      if (!programMatches) return false;

      // Filter by module's assigned barangay(s)
      if (module.barangayIds && Array.isArray(module.barangayIds) && module.barangayIds.length > 0) {
        return module.barangayIds.includes(student.barangayId);
      }
      if (module.barangayId) {
        return student.barangayId === module.barangayId;
      }

      // Global module - count all students with matching program
      return true;
    }).length;
  }, [studentsList, barangayFilter, user?.role, user?.assignedBarangayId]);

  // Handle create module
  const handleCreateModule = useCallback(
    async (moduleData: ModuleFormValues) => {
      try {
        const barangayId = user?.role === 'teacher' ? user.assignedBarangayId : undefined;
        const newModule = await createModule({
          ...moduleData,
          barangayId,
          barangayIds: moduleData.barangayIds, // Pass barangayIds array for multi-barangay support
        });
        await loadModules(); // Refresh the list
        setIsDialogOpen(false);
      } catch (error) {
        console.error('Error creating module:', error);
        throw error;
      }
    },
    [user?.role, user?.assignedBarangayId, loadModules]
  );

  // Handle update module
  const handleUpdateModule = useCallback(
    async (moduleId: string, moduleData: ModuleFormValues) => {
      try {
        // Don't override barangayId for teachers - let the API handle it
        // This prevents teachers from accidentally changing module ownership
        await updateModule(moduleId, {
          ...moduleData,
          barangayIds: moduleData.barangayIds, // Pass barangayIds array for multi-barangay support
        });
        await loadModules(); // Refresh the list
        setIsDialogOpen(false);
        setModuleToEdit(null);
      } catch (error) {
        console.error('Error updating module:', error);
        throw error;
      }
    },
    [loadModules]
  );

  // Handle save activities
  const handleSaveActivities = useCallback(
    async (activities: PredefinedActivity[]) => {
      if (!moduleForActivities) return;

      try {
        // Don't override barangayId - preserve existing module ownership
        await updateModule(moduleForActivities._id, {
          title: moduleForActivities.title,
          levels: moduleForActivities.levels,
          predefinedActivities: activities,
        });
        await loadModules(); // Refresh the list
      } catch (error) {
        console.error('Error saving activities:', error);
        throw error;
      }
    },
    [moduleForActivities, loadModules]
  );

  // Open activities dialog
  const handleOpenActivitiesDialog = (module: Module) => {
    setModuleForActivities(module);
    setIsActivitiesDialogOpen(true);
  };

  // Open learners dialog
  const handleOpenLearnersDialog = (module: Module) => {
    setModuleForLearners(module);
    setIsLearnersDialogOpen(true);
  };

  // Handle delete module
  const handleDeleteModule = useCallback(async () => {
    if (!moduleToDelete) return;

    try {
      setIsDeleting(true);
      await deleteModule(moduleToDelete._id);
      await loadModules(); // Refresh the list
      setModuleToDelete(null);
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [moduleToDelete, loadModules]);

  // Open create dialog
  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setModuleToEdit(null);
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEditDialog = (module: Module) => {
    setDialogMode('edit');
    setModuleToEdit(module);
    setIsDialogOpen(true);
  };

  // Filter modules based on user role, program, and barangay
  const filteredModules = useMemo(() => {
    let filtered = modules;

    // Filter by user role (barangay) - for teachers, only show their barangay's modules
    if (user?.role === 'teacher' && user?.assignedBarangayId) {
      filtered = filtered.filter(
        (module) =>
          !module.barangayId || module.barangayId === user.assignedBarangayId
      );
    }

    // Filter by program level
    if (programFilter !== 'all') {
      filtered = filtered.filter((module) => {
        return module.levels?.some(
          (level) => level === programFilter || level === 'All Programs'
        );
      });
    }

    // Filter by barangay (only for admins, teachers already filtered above)
    if (user?.role === 'admin' && barangayFilter !== 'all') {
      filtered = filtered.filter((module) => {
        const filterBarangayId = String(barangayFilter);
        
        // Check barangayIds array first (new format - supports multiple barangays)
        if (module.barangayIds && Array.isArray(module.barangayIds) && module.barangayIds.length > 0) {
          return module.barangayIds.some((id) => String(id) === filterBarangayId);
        }
        
        // Check single barangayId (legacy format)
        if (module.barangayId) {
          return String(module.barangayId) === filterBarangayId;
        }
        
        // Global modules (no barangayId/barangayIds) - hide when filtering by specific barangay
        return false;
      });
    }

    return filtered;
  }, [modules, user?.role, user?.assignedBarangayId, programFilter, barangayFilter]);

  // Sort modules based on selected sort option
  const sortedModules = useMemo(() => {
    const modulesCopy = [...filteredModules];
    
    if (sortBy === 'program') {
      return modulesCopy.sort((a, b) => {
        // Get the first program level for comparison (or empty string if none)
        const aFirstLevel = a.levels && a.levels.length > 0 ? a.levels[0] : '';
        const bFirstLevel = b.levels && b.levels.length > 0 ? b.levels[0] : '';
        
        // Sort by first program level, then by title if levels are the same
        const levelComparison = aFirstLevel.localeCompare(bFirstLevel);
        if (levelComparison !== 0) {
          return levelComparison;
        }
        return a.title.localeCompare(b.title);
      });
    } else {
      // Default: sort by title
      return modulesCopy.sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [filteredModules, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Module Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create, edit, and manage learning modules
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Button
            onClick={handleOpenCreateDialog}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Module
          </Button>
        )}
      </div>

      {/* Filter and Sort Options */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Program Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Program:
          </label>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Barangay Filter - Only show for admins */}
        {user?.role === 'admin' && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Barangay:
            </label>
            <Select value={barangayFilter} onValueChange={setBarangayFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select barangay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Barangays</SelectItem>
                {barangays.map((barangay) => (
                  <SelectItem key={barangay._id} value={String(barangay._id)}>
                    {barangay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sort Options */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Sort by:
          </label>
          <Select value={sortBy} onValueChange={(value: 'title' | 'program') => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="program">Program Level</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Modules Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-blue-600 dark:border-blue-500">
        <div className="p-1">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading modules...</div>
          ) : sortedModules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">No modules found</p>
              <p className="text-sm mt-2">
                {user?.role === 'admin' || user?.role === 'teacher'
                  ? 'Create your first module to get started.'
                  : 'No modules are available at this time.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-600 dark:bg-blue-700">
                    <TableHead className="text-white font-bold">Title</TableHead>
                    <TableHead className="text-white font-bold">Program Levels</TableHead>
                    <TableHead className="text-white font-bold">Activities</TableHead>
                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                      <TableHead className="text-white font-bold w-[180px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedModules.map((module) => (
                    <TableRow
                      key={module._id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          {module.title}
                          {isModuleNew(module) && (
                            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-2">
                              NEW
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-white">
                        <div className="flex flex-wrap gap-1">
                          {module.levels.map((level, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded"
                            >
                              {normalizeLevelName(level)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-white">
                        {module.predefinedActivities?.length || 0} activities
                      </TableCell>
                      {(user?.role === 'admin' || user?.role === 'teacher') && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenActivitiesDialog(module)}
                              className="border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="Add/Manage Activities"
                            >
                              <Activity className="h-4 w-4 mr-1" />
                              Activities
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenLearnersDialog(module)}
                              className="border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              title="View Learners"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Learners
                              <span className="ml-1.5 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                {getLearnerCount(module)}
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDialog(module)}
                              className="border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Edit module"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setModuleToDelete(module)}
                              className="border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete module"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Module Dialog */}
      <AddCustomModuleDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setModuleToEdit(null);
        }}
        student={null}
        mode={dialogMode}
        moduleToEdit={moduleToEdit}
        barangays={barangays}
        onAddModule={handleCreateModule}
        onUpdateModule={handleUpdateModule}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!moduleToDelete}
        onOpenChange={(open) => {
          if (!open) setModuleToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the module &quot;{moduleToDelete?.title}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModuleToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteModule}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Activities Dialog */}
      {moduleForActivities && (
        <ManageActivitiesDialog
          isOpen={isActivitiesDialogOpen}
          onClose={() => {
            setIsActivitiesDialogOpen(false);
            setModuleForActivities(null);
          }}
          activities={moduleForActivities.predefinedActivities || []}
          onSave={handleSaveActivities}
          moduleTitle={moduleForActivities.title}
          user={user}
        />
      )}

      {/* View Learners Dialog */}
      {moduleForLearners && (
        <ViewLearnersDialog
          isOpen={isLearnersDialogOpen}
          onClose={() => {
            setIsLearnersDialogOpen(false);
            setModuleForLearners(null);
          }}
          moduleId={moduleForLearners._id}
          moduleTitle={moduleForLearners.title}
          moduleLevels={moduleForLearners.levels}
          moduleBarangayId={moduleForLearners.barangayId}
          moduleBarangayIds={moduleForLearners.barangayIds}
          barangayFilter={barangayFilter}
          students={studentsList}
          barangays={barangays}
          userName={user?.name || user?.email || 'Unknown User'}
          userRole={user?.role as 'admin' | 'teacher'}
          userBarangayId={user?.assignedBarangayId}
        />
      )}
    </div>
  );
}
