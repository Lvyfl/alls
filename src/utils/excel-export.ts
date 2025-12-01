import * as XLSX from 'xlsx';
import { Student, Barangay, Progress, Module, Activity } from '@/types';
import { formatDateForExport } from './date-formatter';
import { formatStudentName } from '@/utils/name-formatter';

/**
 * Generate filename with consistent format: [Type]_[Date].xlsx
 * Date format: YYYY-MM-DD
 */
export function generateExportFilename(type: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return `${type}_${dateStr}.xlsx`;
}

/**
 * Get barangay name by ID
 */
function getBarangayName(barangayId: string, barangays: Barangay[]): string {
  const barangay = barangays.find(b => b._id === barangayId);
  return barangay?.name || 'Unknown Barangay';
}

/**
 * Export Student Masterlist to Excel
 */
export function exportStudentMasterlist(
  students: Student[],
  barangays: Barangay[]
): void {
  // Define column headers
  const headers = [
    'LRN',
    'Name',
    'Status',
    'Gender',
    'Address',
    'Barangay',
    'Program',
    'Enrollment Date',
    'Modality'
  ];

  // Prepare data rows
  const rows = students.map(student => [
    student.lrn,
    formatStudentName(student.name),
    student.status.toUpperCase(),
    student.gender.toUpperCase(),
    student.address,
    getBarangayName(student.barangayId, barangays),
    student.program,
    formatDateForExport(student.enrollmentDate),
    student.modality
  ]);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // LRN
    { wch: 30 }, // Name
    { wch: 12 }, // Status
    { wch: 10 }, // Gender
    { wch: 40 }, // Address
    { wch: 25 }, // Barangay
    { wch: 25 }, // Program
    { wch: 15 }, // Enrollment Date
    { wch: 15 }  // Modality
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Student Masterlist');

  // Generate filename and download
  const filename = generateExportFilename('Student_Masterlist');
  XLSX.writeFile(wb, filename);
}

/**
 * Export Student Score Summary to Excel
 */
export function exportStudentScoreSummary(
  student: Student,
  studentProgress: Progress[],
  modules: Module[],
  barangays: Barangay[]
): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Student Information
  const studentHeaders = ['Field', 'Value'];
  const studentData = [
    ['LRN', student.lrn],
    ['Name', formatStudentName(student.name)],
    ['Status', student.status.toUpperCase()],
    ['Gender', student.gender.toUpperCase()],
    ['Address', student.address],
    ['Barangay', getBarangayName(student.barangayId, barangays)],
    ['Program', student.program],
    ['Enrollment Date', formatDateForExport(student.enrollmentDate)],
    ['Modality', student.modality]
  ];

  const studentWs = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentData]);
  studentWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, studentWs, 'Student Information');

  // Sheet 2: Score Summary by Module
  // For each module, create a sheet with activities
  modules.forEach(module => {
    const moduleProgress = studentProgress.find(p => p.moduleId === module._id);
    const activities = moduleProgress?.activities || [];

    if (activities.length === 0) {
      // Still create a sheet even if no activities
      const emptyHeaders = ['Type of Activity', 'Score', 'Total', 'Date Taken', 'Remarks'];
      const emptyWs = XLSX.utils.aoa_to_sheet([emptyHeaders, ['No activities recorded']]);
      emptyWs['!cols'] = [
        { wch: 30 }, // Type of Activity
        { wch: 10 }, // Score
        { wch: 10 }, // Total
        { wch: 15 }, // Date Taken
        { wch: 40 }  // Remarks
      ];
      XLSX.utils.book_append_sheet(wb, emptyWs, module.title.substring(0, 31)); // Excel sheet name limit
    } else {
      const activityHeaders = ['Type of Activity', 'Score', 'Total', 'Date Taken', 'Remarks'];
      const activityRows = activities.map(activity => [
        `${activity.type}: ${activity.name}`,
        activity.score,
        activity.total,
        formatDateForExport(activity.date),
        activity.remarks || '-'
      ]);

      const activityWs = XLSX.utils.aoa_to_sheet([activityHeaders, ...activityRows]);
      activityWs['!cols'] = [
        { wch: 30 }, // Type of Activity
        { wch: 10 }, // Score
        { wch: 10 }, // Total
        { wch: 15 }, // Date Taken
        { wch: 40 }  // Remarks
      ];
      XLSX.utils.book_append_sheet(wb, activityWs, module.title.substring(0, 31)); // Excel sheet name limit
    }
  });

  // Generate filename and download
  const safeName = student.name.replace(/[^\w\s-]/g, '').substring(0, 30);
  const filename = generateExportFilename(`Student_Score_Summary_${safeName}`);
  XLSX.writeFile(wb, filename);
}

