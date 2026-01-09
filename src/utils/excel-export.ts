import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
 * Export Student Masterlist to Excel using the AF-3 template file
 * Loads the template from /templates/AF3_template.xls and populates with student data
 */
export async function exportStudentMasterlist(
  students: Student[],
  barangays: Barangay[],
  selectedBarangayId?: string | null
): Promise<void> {
  // Get current year for calendar year
  const currentYear = new Date().getFullYear();
  
  // Get selected barangay name
  const selectedBarangayName = selectedBarangayId 
    ? getBarangayName(selectedBarangayId, barangays) 
    : 'All Barangays';

  try {
    // Fetch the template file
    const templateResponse = await fetch('/templates/AF3_template.xls');
    if (!templateResponse.ok) {
      throw new Error('Template file not found');
    }
    
    const templateArrayBuffer = await templateResponse.arrayBuffer();
    
    // Read the template using xlsx library (supports .xls format)
    const templateWorkbook = XLSX.read(templateArrayBuffer, { type: 'array' });
    const sheetName = templateWorkbook.SheetNames[0];
    const templateSheet = templateWorkbook.Sheets[sheetName];
    
    // Get the range of the template
    const range = XLSX.utils.decode_range(templateSheet['!ref'] || 'A1');
    
    // Update dynamic fields in the template
    // Row 10 (0-indexed row 9): Calendar Year at column 48 (AW)
    const yearCell = XLSX.utils.encode_cell({ r: 9, c: 48 });
    templateSheet[yearCell] = { t: 'n', v: currentYear };
    
    // Row 12 (0-indexed row 11): Barangay at column 25 (Z)
    const barangayCell = XLSX.utils.encode_cell({ r: 11, c: 25 });
    templateSheet[barangayCell] = { t: 's', v: selectedBarangayName };

    // Calculate age from birthdate
    const calculateAge = (birthDate: string): number => {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    // Clear existing student data rows (starting from row 17, 0-indexed row 16)
    // First, find where data starts and clear old data
    const dataStartRow = 16; // Row 17 in Excel (0-indexed)
    
    // Add student data starting at row 17
    students.forEach((student, index) => {
      const rowIndex = dataStartRow + index;
      
      // Column 0 (A): LRN
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })] = { t: 's', v: student.lrn };
      
      // Column 3 (D): Name
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 3 })] = { t: 's', v: formatStudentName(student.name) };
      
      // Column 14 (O): Sex
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 14 })] = { t: 's', v: student.gender === 'male' ? 'M' : 'F' };
      
      // Column 17 (R): Birth Date
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 17 })] = { t: 's', v: formatDateForExport(student.birthDate || '') };
      
      // Column 20 (U): Age
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 20 })] = { t: 'n', v: student.birthDate ? calculateAge(student.birthDate) : '' };
      
      // Column 24 (Y): Date of First Attendance (Enrollment Date)
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 24 })] = { t: 's', v: formatDateForExport(student.enrollmentDate) };
      
      // Column 27 (AB): Program Enrolled
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 27 })] = { t: 's', v: student.program };
      
      // Column 37 (AL): PIS Score - empty
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 37 })] = { t: 's', v: '' };
      
      // Column 41 (AP): Non Formal Education (Modality)
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 41 })] = { t: 's', v: student.modality || '' };
      
      // Column 55 (BD): End of CY Status
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 55 })] = { t: 's', v: student.status.toUpperCase() };
      
      // Column 58 (BG): Remarks
      templateSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 58 })] = { t: 's', v: student.assessment || '' };
    });

    // Update the range to include new rows
    const newEndRow = dataStartRow + students.length;
    if (newEndRow > range.e.r) {
      range.e.r = newEndRow;
      templateSheet['!ref'] = XLSX.utils.encode_range(range);
    }

    // Generate filename
    const filename = generateExportFilename('AF3_Masterlist');

    // Write and download
    XLSX.writeFile(templateWorkbook, filename);
    
  } catch (error) {
    console.error('Error loading template, falling back to generated export:', error);
    // Fallback to generated export if template fails
    await exportStudentMasterlistFallback(students, barangays, selectedBarangayId);
  }
}

/**
 * Fallback export function if template loading fails
 */
async function exportStudentMasterlistFallback(
  students: Student[],
  barangays: Barangay[],
  selectedBarangayId?: string | null
): Promise<void> {
  const currentYear = new Date().getFullYear();
  const selectedBarangayName = selectedBarangayId 
    ? getBarangayName(selectedBarangayId, barangays) 
    : 'All Barangays';

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('AF-3');

  // Try to add logos
  try {
    const depedLogoResponse = await fetch('/images/deped_logo.png');
    if (depedLogoResponse.ok) {
      const depedLogoBlob = await depedLogoResponse.blob();
      const depedLogoBase64 = await blobToBase64(depedLogoBlob);
      const depedLogoId = workbook.addImage({ base64: depedLogoBase64, extension: 'png' });
      worksheet.addImage(depedLogoId, { tl: { col: 0, row: 0 }, ext: { width: 70, height: 70 } });
    }

    const alsLogoResponse = await fetch('/images/als_logo.png');
    if (alsLogoResponse.ok) {
      const alsLogoBlob = await alsLogoResponse.blob();
      const alsLogoBase64 = await blobToBase64(alsLogoBlob);
      const alsLogoId = workbook.addImage({ base64: alsLogoBase64, extension: 'png' });
      worksheet.addImage(alsLogoId, { tl: { col: 10, row: 0 }, ext: { width: 70, height: 70 } });
    }
  } catch (error) {
    console.warn('Could not load logos:', error);
  }

  // Add header rows
  for (let i = 0; i < 5; i++) worksheet.addRow([]);
  
  const titleRow = worksheet.addRow([]);
  worksheet.mergeCells('A6:K6');
  titleRow.getCell(1).value = 'ALTERNATIVE LEARNING SYSTEM';
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF0000FF' } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  const subtitleRow = worksheet.addRow([]);
  worksheet.mergeCells('A7:K7');
  subtitleRow.getCell(1).value = 'MASTERLIST OF ENROLLED LEARNERS WITH END OF PROGRAM/CY STATUS (AF-3)';
  subtitleRow.getCell(1).font = { bold: true, size: 11 };
  subtitleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.addRow([]);
  worksheet.addRow([]);

  // Row 10: District, Division, Region, Calendar Year
  worksheet.addRow([]);
  worksheet.getRow(10).getCell(1).value = 'District';
  worksheet.getRow(10).getCell(1).font = { bold: true, size: 9 };
  worksheet.getRow(10).getCell(3).value = 'ALFONSO';
  worksheet.getRow(10).getCell(3).border = { bottom: { style: 'thin' } };
  worksheet.getRow(10).getCell(5).value = 'Division';
  worksheet.getRow(10).getCell(5).font = { bold: true, size: 9 };
  worksheet.getRow(10).getCell(6).value = 'CAVITE';
  worksheet.getRow(10).getCell(6).border = { bottom: { style: 'thin' } };
  worksheet.getRow(10).getCell(7).value = 'Region';
  worksheet.getRow(10).getCell(7).font = { bold: true, size: 9 };
  worksheet.getRow(10).getCell(8).value = 'REGION IV-A (CALABARZON)';
  worksheet.getRow(10).getCell(8).border = { bottom: { style: 'thin' } };
  worksheet.getRow(10).getCell(10).value = 'Calendar Year';
  worksheet.getRow(10).getCell(10).font = { bold: true, size: 9 };
  worksheet.getRow(10).getCell(11).value = currentYear.toString();
  worksheet.getRow(10).getCell(11).border = { bottom: { style: 'thin' } };

  worksheet.addRow([]);

  // Row 12: Name of CLC, Type of CLC, Barangay, City/Municipality
  worksheet.addRow([]);
  worksheet.getRow(12).getCell(1).value = 'Name of CLC';
  worksheet.getRow(12).getCell(1).font = { bold: true, size: 9 };
  worksheet.getRow(12).getCell(3).value = 'PULO BRGY. HALL (11714264)';
  worksheet.getRow(12).getCell(3).border = { bottom: { style: 'thin' } };
  worksheet.getRow(12).getCell(5).value = 'Type of CLC';
  worksheet.getRow(12).getCell(5).font = { bold: true, size: 9 };
  worksheet.getRow(12).getCell(6).value = 'Type 1';
  worksheet.getRow(12).getCell(6).border = { bottom: { style: 'thin' } };
  worksheet.getRow(12).getCell(7).value = 'Barangay';
  worksheet.getRow(12).getCell(7).font = { bold: true, size: 9 };
  worksheet.getRow(12).getCell(8).value = selectedBarangayName;
  worksheet.getRow(12).getCell(8).border = { bottom: { style: 'thin' } };
  worksheet.getRow(12).getCell(10).value = 'City / Municipality';
  worksheet.getRow(12).getCell(10).font = { bold: true, size: 9 };
  worksheet.getRow(12).getCell(11).value = 'INDANG';
  worksheet.getRow(12).getCell(11).border = { bottom: { style: 'thin' } };

  worksheet.addRow([]);

  // Table headers
  const headerRow = worksheet.addRow([
    'LRN', 'NAME\n(Lastname, Firstname, Middlename, Ext)', 'Sex (M/F)',
    'BIRTH DATE\n(mm/dd/yyyy)', 'Age', 'Date of First Attendance',
    'PROGRAM ENROLLED', 'PIS Score', 'Non Formal Education',
    `End of CY${currentYear} STATUS`, 'Remarks'
  ]);
  
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });
  headerRow.height = 40;

  // Set column widths
  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 35;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 15;
  worksheet.getColumn(5).width = 8;
  worksheet.getColumn(6).width = 18;
  worksheet.getColumn(7).width = 20;
  worksheet.getColumn(8).width = 12;
  worksheet.getColumn(9).width = 18;
  worksheet.getColumn(10).width = 18;
  worksheet.getColumn(11).width = 20;

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  students.forEach(student => {
    const dataRow = worksheet.addRow([
      student.lrn, formatStudentName(student.name), student.gender === 'male' ? 'M' : 'F',
      formatDateForExport(student.birthDate || ''), student.birthDate ? calculateAge(student.birthDate) : '',
      formatDateForExport(student.enrollmentDate), student.program, '',
      student.modality || '', student.status.toUpperCase(), student.assessment || ''
    ]);
    dataRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.font = { size: 9 };
      cell.alignment = { vertical: 'middle' };
    });
  });

  const filename = generateExportFilename('AF3_Masterlist');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Helper function to convert Blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

/**
 * Generate PDF filename with consistent format: [Type]_[Date].pdf
 */
export function generatePdfFilename(type: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return `${type}_${dateStr}.pdf`;
}

/**
 * PDF Export Options interface
 */
export interface PdfExportOptions {
  district: string;
  clcName: string;
  division: string;
  clcType: string;
  region: string;
  exportedBy: string;
  exportDate: string;
}

/**
 * Export Student Masterlist to PDF
 * Format: AF-3 (MASTERLIST OF ENROLLED LEARNERS WITH END OF PROGRAM/CY STATUS)
 */
export async function exportStudentMasterlistPdf(
  students: Student[],
  barangays: Barangay[],
  selectedBarangayId?: string | null,
  options?: PdfExportOptions
): Promise<void> {
  const currentYear = new Date().getFullYear();
  const selectedBarangayName = selectedBarangayId 
    ? barangays.find(b => b._id === selectedBarangayId)?.name || 'All Barangays'
    : 'All Barangays';

  // Use provided options or defaults
  const district = options?.district || 'ALFONSO';
  const division = options?.division || 'CAVITE';
  const region = options?.region || 'REGION IV-A (CALABARZON)';
  const clcName = options?.clcName || 'PULO BRGY. HALL (11714264)';
  const clcType = options?.clcType || 'Type 1';
  const exportedBy = options?.exportedBy || '';
  const exportDate = options?.exportDate || new Date().toLocaleDateString();

  // Create PDF document (landscape for more columns)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Try to add logos
  try {
    // Fetch and add DepEd logo (left)
    const depedLogoResponse = await fetch('/images/deped_logo.png');
    if (depedLogoResponse.ok) {
      const depedLogoBlob = await depedLogoResponse.blob();
      const depedLogoBase64 = await blobToBase64(depedLogoBlob);
      doc.addImage(`data:image/png;base64,${depedLogoBase64}`, 'PNG', 10, 5, 20, 20);
    }

    // Fetch and add ALS logo (right)
    const alsLogoResponse = await fetch('/images/als_logo.png');
    if (alsLogoResponse.ok) {
      const alsLogoBlob = await alsLogoResponse.blob();
      const alsLogoBase64 = await blobToBase64(alsLogoBlob);
      doc.addImage(`data:image/png;base64,${alsLogoBase64}`, 'PNG', pageWidth - 30, 5, 20, 20);
    }
  } catch (error) {
    console.warn('Could not load logos for PDF export:', error);
  }

  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 255); // Blue
  doc.text('ALTERNATIVE LEARNING SYSTEM', pageWidth / 2, 12, { align: 'center' });

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // Black
  doc.text('MASTERLIST OF ENROLLED LEARNERS WITH END OF PROGRAM/CY STATUS (AF-3)', pageWidth / 2, 18, { align: 'center' });

  // Header info - Row 1
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('District:', 10, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(district, 28, 30);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Division:', 70, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(division, 88, 30);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Region:', 130, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(region, 148, 30);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Calendar Year:', 220, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(currentYear.toString(), 248, 30);

  // Header info - Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Name of CLC:', 10, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(clcName, 35, 36);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Type of CLC:', 100, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(clcType, 125, 36);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Barangay:', 150, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(selectedBarangayName, 172, 36);
  
  doc.setFont('helvetica', 'bold');
  doc.text('City/Municipality:', 220, 36);
  doc.setFont('helvetica', 'normal');
  doc.text('INDANG', 252, 36);

  // Calculate age from birthdate
  const calculateAge = (birthDate: string): number | string => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Prepare table data
  const tableData = students.map(student => [
    student.lrn,
    formatStudentName(student.name),
    student.gender === 'male' ? 'M' : 'F',
    formatDateForExport(student.birthDate || ''),
    calculateAge(student.birthDate || ''),
    formatDateForExport(student.enrollmentDate),
    student.program,
    student.modality || '',
    student.status.toUpperCase(),
    student.assessment || ''
  ]);

  // Create table
  autoTable(doc, {
    startY: 42,
    head: [[
      'LRN',
      'Name',
      'Sex',
      'Birth Date',
      'Age',
      'Date of First\nAttendance',
      'Program',
      'Modality',
      'Status',
      'Remarks'
    ]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [217, 225, 242], // Light blue
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 28 },  // LRN
      1: { cellWidth: 45 },  // Name
      2: { cellWidth: 10 },  // Sex
      3: { cellWidth: 22 },  // Birth Date
      4: { cellWidth: 12 },  // Age
      5: { cellWidth: 25 },  // Date of First Attendance
      6: { cellWidth: 30 },  // Program
      7: { cellWidth: 25 },  // Modality
      8: { cellWidth: 20 },  // Status
      9: { cellWidth: 40 },  // Remarks
    },
    margin: { left: 10, right: 10 },
  });

  // Add footer with export info
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100); // Gray
  doc.text(`Exported by: ${exportedBy}`, 10, pageHeight - 10);
  doc.text(`Export Date: ${exportDate}`, 10, pageHeight - 5);

  // Generate filename and save
  const filename = generatePdfFilename('AF3_Masterlist');
  doc.save(filename);
}

