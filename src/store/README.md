# ALS Student Tracker - Zustand Store Documentation

This document provides an overview of the Zustand store structure and API for the Alternative Learning System (ALS) Student Tracker application.

## Store Structure

The store is organized into four main slices:

1. **Students** - Manages student data and operations
2. **Barangays** - Manages barangay (location) data
3. **Modules** - Manages educational module data
4. **Progress** - Manages student progress records

Each slice has its own state and actions, following a consistent pattern for data management.

## Store Setup

The store is set up with the following middleware:

- **devtools** - For Redux DevTools integration
- **persist** - For persisting selected parts of the state
- **immer** - For immutable state updates

## API Reference

### Student Slice

#### State
- `data`: Array of all students
- `filteredData`: Array of filtered students based on current filters
- `filters`: Current filter criteria
- `statistics`: Calculated statistics about students
- `loading`: Loading state
- `error`: Error state

#### Actions
- `loadStudents()`: Load students from the API
- `setFilters(filters)`: Set filters and update filtered data
- `clearFilters()`: Clear all filters
- `createStudent(student)`: Create a new student
- `updateStudent(student)`: Update an existing student
- `deleteStudent(id)`: Delete a student

#### Usage Example
```typescript
import { useStore } from '@/store';

// Access student data
const students = useStore(state => state.students.filteredData);

// Load students
const loadStudents = useStore(state => state.students.loadStudents);
useEffect(() => {
  loadStudents();
}, [loadStudents]);

// Filter students
const setFilters = useStore(state => state.students.setFilters);
setFilters({ status: 'active', barangayId: 'barangay-1' });

// Create a student
const createStudent = useStore(state => state.students.createStudent);
createStudent({
  name: 'NEW STUDENT, Test',
  status: 'active',
  gender: 'male',
  address: 'Test Address',
  barangayId: 'barangay-1',
  program: 'A&E Elementary',
  enrollmentDate: '2024-09-01',
  modality: 'Face to Face',
  pisScore: null,
  assessment: 'Pending'
});
```

### Barangay Slice

#### State
- `data`: Array of all barangays
- `loading`: Loading state
- `error`: Error state

#### Actions
- `loadBarangays()`: Load barangays from the API
- `getBarangayById(id)`: Get a barangay by ID
- `getBarangayNameById(id)`: Get a barangay name by ID

#### Usage Example
```typescript
import { useStore } from '@/store';

// Access barangay data
const barangays = useStore(state => state.barangays.data);

// Load barangays
const loadBarangays = useStore(state => state.barangays.loadBarangays);
useEffect(() => {
  loadBarangays();
}, [loadBarangays]);

// Get barangay name
const getBarangayName = useStore(state => state.barangays.getBarangayNameById);
const barangayName = getBarangayName('barangay-1');
```

### Module Slice

#### State
- `data`: Array of all modules
- `loading`: Loading state
- `error`: Error state

#### Actions
- `loadModules()`: Load modules from the API
- `getModuleById(id)`: Get a module by ID
- `getModuleTitleById(id)`: Get a module title by ID
- `getModulesByProgram(program)`: Get modules by program

#### Usage Example
```typescript
import { useStore } from '@/store';

// Access module data
const modules = useStore(state => state.modules.data);

// Load modules
const loadModules = useStore(state => state.modules.loadModules);
useEffect(() => {
  loadModules();
}, [loadModules]);

// Get module title
const getModuleTitle = useStore(state => state.modules.getModuleTitleById);
const moduleTitle = getModuleTitle('module-1');

// Get modules for a program
const getModulesByProgram = useStore(state => state.modules.getModulesByProgram);
const elementaryModules = getModulesByProgram('A&E Elementary');
```

### Progress Slice

#### State
- `data`: Array of all progress records
- `filteredData`: Array of filtered progress records based on current filters
- `filters`: Current filter criteria
- `statistics`: Calculated statistics about progress
- `loading`: Loading state
- `error`: Error state

#### Actions
- `loadProgress()`: Load progress records from the API
- `setFilters(filters)`: Set filters and update filtered data
- `clearFilters()`: Clear all filters
- `createProgress(progress)`: Create a new progress record
- `updateProgress(progress)`: Update an existing progress record
- `deleteProgress(id)`: Delete a progress record
- `addActivity(progressId, activity)`: Add an activity to a progress record
- `updateActivity(progressId, index, activity)`: Update an activity in a progress record
- `removeActivity(progressId, index)`: Remove an activity from a progress record
- `getProgressByStudentId(studentId)`: Get progress records for a specific student
- `getStudentAverageScore(studentId)`: Calculate average score for a student

#### Usage Example
```typescript
import { useStore } from '@/store';

// Access progress data
const progressRecords = useStore(state => state.progress.filteredData);

// Load progress
const loadProgress = useStore(state => state.progress.loadProgress);
useEffect(() => {
  loadProgress();
}, [loadProgress]);

// Filter progress
const setFilters = useStore(state => state.progress.setFilters);
setFilters({ studentId: '109129090001', moduleId: 'module-1' });

// Add an activity
const addActivity = useStore(state => state.progress.addActivity);
addActivity('progress-1', {
  name: 'New Quiz',
  type: 'Quiz',
  score: 18,
  total: 20,
  date: '2024-09-15',
  remarks: 'Good work'
});

// Get student average score
const getAverage = useStore(state => state.progress.getStudentAverageScore);
const averageScore = getAverage('109129090001');
```

## Best Practices

1. **Use selectors** to access only the parts of the state you need
2. **Memoize complex selectors** for better performance
3. **Handle loading and error states** in your components
4. **Use the store actions** instead of modifying the state directly
5. **Keep components focused** on UI and delegate data management to the store

## Future Improvements

1. **Implement optimistic updates** for better UX
2. **Add more advanced filtering** capabilities
3. **Implement pagination** for large datasets
4. **Add real-time updates** when the backend is ready
5. **Implement more advanced statistics** and reporting features
