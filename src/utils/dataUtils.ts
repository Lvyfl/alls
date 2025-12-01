import { 
  Student, 
  StudentFilters, 
  Progress, 
  ProgressFilters,
  StudentStatistics,
  ProgressStatistics,
  Activity,
  ActivityType
} from '@/types';

// Student Filtering Functions
export const filterStudents = (students: Student[], filters: StudentFilters): Student[] => {
  return students.filter(student => {
    // Filter by name (case-insensitive partial match)
    if (filters.name && !student.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    // Filter by status
    if (filters.status && student.status !== filters.status) {
      return false;
    }
    
    // Filter by barangay
    if (filters.barangayId && student.barangayId !== filters.barangayId) {
      return false;
    }
    
    // Filter by program
    if (filters.program && student.program !== filters.program) {
      return false;
    }
    
    // Filter by gender
    if (filters.gender && student.gender !== filters.gender) {
      return false;
    }
    
    return true;
  });
};

// Progress Filtering Functions
export const filterProgress = (progressRecords: Progress[], filters: ProgressFilters): Progress[] => {
  return progressRecords.filter(progress => {
    // Filter by student ID
    if (filters.studentId && progress.studentId !== filters.studentId) {
      return false;
    }
    
    // Filter by barangay ID
    if (filters.barangayId && progress.barangayId !== filters.barangayId) {
      return false;
    }
    
    // Filter by module ID
    if (filters.moduleId && progress.moduleId !== filters.moduleId) {
      return false;
    }
    
    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      const hasActivitiesInDateRange = progress.activities.some(activity => {
        const activityDate = new Date(activity.date);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (activityDate < fromDate) {
            return false;
          }
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          if (activityDate > toDate) {
            return false;
          }
        }
        
        return true;
      });
      
      if (!hasActivitiesInDateRange) {
        return false;
      }
    }
    
    return true;
  });
};

// Statistics Calculation Functions
export const calculateStudentStatistics = (students: Student[]): StudentStatistics => {
  const activeStudents = students.filter(student => student.status === 'active').length;
  const maleCount = students.filter(student => student.gender === 'male').length;
  
  // Program distribution
  const programDistribution: Record<string, number> = {};
  students.forEach(student => {
    const program = student.program;
    programDistribution[program] = (programDistribution[program] || 0) + 1;
  });
  
  // Barangay distribution
  const barangayDistribution: Record<string, number> = {};
  students.forEach(student => {
    const barangayId = student.barangayId;
    barangayDistribution[barangayId] = (barangayDistribution[barangayId] || 0) + 1;
  });
  
  return {
    totalStudents: students.length,
    activeStudents,
    inactiveStudents: students.length - activeStudents,
    maleCount,
    femaleCount: students.length - maleCount,
    programDistribution,
    barangayDistribution
  };
};

export const calculateProgressStatistics = (progressRecords: Progress[]): ProgressStatistics => {
  // Flatten all activities
  const allActivities: Activity[] = progressRecords.flatMap(record => record.activities);
  
  // Calculate average score
  const totalScorePercentage = allActivities.reduce((sum, activity) => {
    return sum + (activity.score / activity.total * 100);
  }, 0);
  
  const averageScore = allActivities.length > 0 
    ? totalScorePercentage / allActivities.length 
    : 0;
  
  // Calculate completion rate (activities with score >= 75% of total)
  const completedActivities = allActivities.filter(activity => 
    (activity.score / activity.total) >= 0.75
  ).length;
  
  const completionRate = allActivities.length > 0 
    ? (completedActivities / allActivities.length) * 100 
    : 0;
  
  // Module distribution
  const moduleDistribution: Record<string, number> = {};
  progressRecords.forEach(record => {
    const moduleId = record.moduleId;
    moduleDistribution[moduleId] = (moduleDistribution[moduleId] || 0) + 1;
  });
  
  // Activity type distribution
  const activityTypeDistribution: Record<ActivityType, number> = {
    'Assessment': 0,
    'Quiz': 0,
    'Assignment': 0,
    'Activity': 0,
    'Project': 0,
    'Participation': 0,
    "Examination": 0
  };
  
  allActivities.forEach(activity => {
    activityTypeDistribution[activity.type] += 1;
  });
  
  return {
    averageScore,
    completionRate,
    moduleDistribution,
    activityTypeDistribution
  };
};
