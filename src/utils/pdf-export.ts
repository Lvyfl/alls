import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Barangay } from '@/types';
import { formatDateForExport } from './date-formatter';
import { formatStudentName } from '@/utils/name-formatter';

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
