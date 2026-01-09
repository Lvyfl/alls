'use client';

import { useState, useEffect } from 'react';
import { Student, Progress } from '@/types';
import { formatStudentName } from '@/utils/name-formatter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Loader2, Eye, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/date-formatter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ViewLearnersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleTitle: string;
  moduleLevels: string[];
  moduleBarangayId?: string;
  moduleBarangayIds?: string[];
  barangayFilter?: string;
  students: Student[];
  barangays?: Array<{ _id: string; name: string }>;
  userName?: string;
  userRole?: 'admin' | 'teacher';
  userBarangayId?: string;
}

// Helper function to convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

export function ViewLearnersDialog({
  isOpen,
  onClose,
  moduleId,
  moduleTitle,
  moduleLevels,
  moduleBarangayId,
  moduleBarangayIds,
  barangayFilter,
  students,
  barangays = [],
  userName = 'Unknown User',
  userRole = 'teacher',
  userBarangayId,
}: ViewLearnersDialogProps) {
  const [learners, setLearners] = useState<Array<{
    student: Student;
    progress: Progress | null;
    hasProgress: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewStudent, setPreviewStudent] = useState<{
    student: Student;
    progress: Progress | null;
  } | null>(null);

  useEffect(() => {
    if (isOpen && moduleId) {
      loadLearners();
    } else {
      setLearners([]);
      setError(null);
    }
  }, [isOpen, moduleId, moduleLevels, moduleBarangayId, moduleBarangayIds, barangayFilter]);

  const loadLearners = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, filter students who should have this module based on program and barangay
      const eligibleStudents = students.filter(student => {
        // IMPORTANT: Teachers can only see students from their assigned barangay
        // Only admins can see students from all barangays
        if (userRole === 'teacher' && userBarangayId) {
          if (student.barangayId !== userBarangayId) {
            return false;
          }
        }

        // Check if student's program matches module's levels
        const programMatches = moduleLevels.some(
          level => level === student.program || level === "All Programs"
        );

        if (!programMatches) return false;

        // Filter by module's assigned barangay(s) first - this takes priority
        // If module has barangayIds array, check if student's barangay is in the array
        if (moduleBarangayIds && moduleBarangayIds.length > 0) {
          return moduleBarangayIds.includes(student.barangayId);
        }
        
        // If module has single barangayId, check if student's barangay matches
        if (moduleBarangayId) {
          return student.barangayId === moduleBarangayId;
        }
        
        // Module is global (no barangay assignment) - apply page's barangay filter
        if (barangayFilter && barangayFilter !== 'all') {
          return student.barangayId === barangayFilter;
        }
        
        // Global module with no filter - show all students with matching program
        return true;
      });

      // Fetch progress records for this module
      let moduleProgress: Progress[] = [];
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/progress?moduleId=${encodeURIComponent(moduleId)}`,
          {
            method: "GET",
          }
        );

        if (res.ok) {
          moduleProgress = await res.json();
        }
      } catch (err) {
        console.warn('Error fetching progress records:', err);
        // Continue even if progress fetch fails
      }

      // Create a map of studentId to progress for quick lookup
      const progressMap = new Map<string, Progress>();
      moduleProgress.forEach(progress => {
        progressMap.set(progress.studentId, progress);
      });

      // Combine eligible students with their progress records (or null if no progress)
      const learnersList = eligibleStudents.map(student => {
        const progress = progressMap.get(student.lrn) || null;
        return {
          student,
          progress,
          hasProgress: progress !== null,
        };
      });

      // Sort: students with progress first, then by name
      learnersList.sort((a, b) => {
        if (a.hasProgress !== b.hasProgress) {
          return a.hasProgress ? -1 : 1;
        }
        return a.student.name.localeCompare(b.student.name);
      });

      setLearners(learnersList);
    } catch (err) {
      console.error('Error loading learners:', err);
      setError('Failed to load learners. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export learners report to PDF
  const handleExportPdf = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Try to add logos
    try {
      // Fetch and add DepEd logo (left)
      const depedLogoResponse = await fetch('/images/deped_logo.png');
      if (depedLogoResponse.ok) {
        const depedLogoBlob = await depedLogoResponse.blob();
        const depedLogoBase64 = await blobToBase64(depedLogoBlob);
        doc.addImage(`data:image/png;base64,${depedLogoBase64}`, 'PNG', 14, 5, 20, 20);
      }

      // Fetch and add ALS logo (right)
      const alsLogoResponse = await fetch('/images/als_logo.png');
      if (alsLogoResponse.ok) {
        const alsLogoBlob = await alsLogoResponse.blob();
        const alsLogoBase64 = await blobToBase64(alsLogoBlob);
        doc.addImage(`data:image/png;base64,${alsLogoBase64}`, 'PNG', pageWidth - 34, 5, 20, 20);
      }
    } catch (error) {
      console.warn('Could not load logos for PDF export:', error);
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 255);
    doc.text('MODULE LEARNERS REPORT', pageWidth / 2, 15, { align: 'center' });

    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('ALTERNATIVE LEARNING SYSTEM', pageWidth / 2, 22, { align: 'center' });

    // Module info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Module: ${moduleTitle}`, 14, 32);
    doc.setFontSize(10);
    doc.text(`Program Level(s): ${moduleLevels.join(', ')}`, 14, 39);
    doc.text(`Total Learners: ${learners.length}`, 14, 45);
    doc.text(`Learners with Progress: ${learners.filter(l => l.hasProgress).length}`, 14, 51);

    // Prepare table data
    const tableData = learners.map(({ student, progress, hasProgress }) => [
      student.lrn,
      formatStudentName(student.name),
      student.program,
      barangays.find(b => b._id === student.barangayId)?.name || 'N/A',
      hasProgress ? 'Yes' : 'No',
      hasProgress ? (progress?.activities?.length || 0).toString() : '0',
      hasProgress && progress?.activities ? 
        progress.activities.reduce((sum, a) => sum + (a.score || 0), 0).toString() : '0'
    ]);

    // Create table
    autoTable(doc, {
      startY: 57,
      head: [[
        'LRN',
        'Name',
        'Program',
        'Barangay',
        'Has Progress',
        'Activities',
        'Total Score'
      ]],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // Footer with export info
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Exported by: ${userName}`, 14, pageHeight - 10);
    doc.text(`Export Date: ${currentDate}`, 14, pageHeight - 5);

    // Save
    const filename = `Module_Learners_${moduleTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  // Export individual student progress to PDF
  const handleExportProgressPdf = async (student: Student, progress: Progress) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Try to add logos
    try {
      const depedLogoResponse = await fetch('/images/deped_logo.png');
      if (depedLogoResponse.ok) {
        const depedLogoBlob = await depedLogoResponse.blob();
        const depedLogoBase64 = await blobToBase64(depedLogoBlob);
        doc.addImage(`data:image/png;base64,${depedLogoBase64}`, 'PNG', 14, 5, 20, 20);
      }

      const alsLogoResponse = await fetch('/images/als_logo.png');
      if (alsLogoResponse.ok) {
        const alsLogoBlob = await alsLogoResponse.blob();
        const alsLogoBase64 = await blobToBase64(alsLogoBlob);
        doc.addImage(`data:image/png;base64,${alsLogoBase64}`, 'PNG', pageWidth - 34, 5, 20, 20);
      }
    } catch (error) {
      console.warn('Could not load logos for PDF export:', error);
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 255);
    doc.text('STUDENT PROGRESS REPORT', pageWidth / 2, 15, { align: 'center' });

    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('ALTERNATIVE LEARNING SYSTEM', pageWidth / 2, 22, { align: 'center' });

    // Student info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', 14, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${formatStudentName(student.name)}`, 14, 42);
    doc.text(`LRN: ${student.lrn}`, 14, 48);
    doc.text(`Program: ${student.program}`, 14, 54);
    doc.text(`Barangay: ${barangays.find(b => b._id === student.barangayId)?.name || 'N/A'}`, 14, 60);

    // Module info
    doc.setFont('helvetica', 'bold');
    doc.text('Module Information', 14, 72);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Module: ${moduleTitle}`, 14, 79);
    doc.text(`Program Level(s): ${moduleLevels.join(', ')}`, 14, 85);
    doc.text(`Total Activities: ${progress.activities?.length || 0}`, 14, 91);
    
    // Calculate total score
    const totalScore = progress.activities?.reduce((sum, a) => sum + (a.score || 0), 0) || 0;
    const totalPossible = progress.activities?.reduce((sum, a) => sum + (a.total || 0), 0) || 0;
    doc.text(`Total Score: ${totalScore} / ${totalPossible}`, 14, 97);

    // Activities table
    if (progress.activities && progress.activities.length > 0) {
      const tableData = progress.activities.map(activity => [
        activity.name,
        activity.type,
        activity.score?.toString() || '0',
        activity.total?.toString() || '0',
        formatDate(activity.date),
        activity.remarks || '-'
      ]);

      autoTable(doc, {
        startY: 105,
        head: [[
          'Activity',
          'Type',
          'Score',
          'Total',
          'Date',
          'Remarks'
        ]],
        body: tableData,
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 30 },
          5: { cellWidth: 45 },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer with export info
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Exported by: ${userName}`, 14, pageHeight - 10);
    doc.text(`Export Date: ${currentDate}`, 14, pageHeight - 5);

    // Save
    const safeName = student.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `Progress_${safeName}_${moduleTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Learners - {moduleTitle}
          </DialogTitle>
          <DialogDescription>
            List of all students assigned to this module (based on program level and barangay). Students with progress records are shown first.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading learners...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        ) : learners.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No learners found</p>
            <p className="text-sm mt-2">
              No students are assigned to this module based on program level and barangay.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-blue-600 dark:bg-blue-700">
                  <TableHead className="text-white font-bold min-w-[120px]">LRN</TableHead>
                  <TableHead className="text-white font-bold min-w-[200px]">Name</TableHead>
                  <TableHead className="text-white font-bold min-w-[150px]">Program</TableHead>
                  <TableHead className="text-white font-bold min-w-[150px]">Barangay</TableHead>
                  <TableHead className="text-white font-bold min-w-[180px]">Progress</TableHead>
                  <TableHead className="text-white font-bold min-w-[140px]">Activities Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.map(({ student, progress, hasProgress }) => (
                  <TableRow
                    key={student.lrn}
                    className={`hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                      !hasProgress ? 'opacity-75' : ''
                    }`}
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {student.lrn}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-white">
                      {formatStudentName(student.name)}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-white">
                      {student.program}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-white">
                      {barangays.find(b => b._id === student.barangayId)?.name || student.barangayId || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {/* Colored dot indicator */}
                        <div
                          className={`w-3 h-3 rounded-full ${
                            hasProgress
                              ? 'bg-green-500'
                              : 'bg-gray-400'
                          }`}
                          title={hasProgress ? 'Has Progress' : 'No Progress Yet'}
                        />
                        {hasProgress ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewStudent({ student, progress: progress! })}
                            className="h-7 px-2 text-xs border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Progress
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            No Progress Yet
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-white">
                      {hasProgress ? (progress?.activities?.length || 0) : 0} activities
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          {learners.length > 0 && (
            <Button
              onClick={handleExportPdf}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <Download className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </DialogContent>

      {/* Progress Preview Dialog */}
      {previewStudent && (
        <Dialog open={!!previewStudent} onOpenChange={(open) => !open && setPreviewStudent(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Progress Preview - {formatStudentName(previewStudent.student.name)}
              </DialogTitle>
              <DialogDescription>
                Activities completed for {moduleTitle}
              </DialogDescription>
            </DialogHeader>

            {previewStudent.progress && previewStudent.progress.activities && previewStudent.progress.activities.length > 0 ? (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="bg-blue-600 dark:bg-blue-700">
                        <TableHead className="text-white font-bold min-w-[200px]">Activity</TableHead>
                        <TableHead className="text-white font-bold min-w-[120px]">Type</TableHead>
                        <TableHead className="text-white font-bold min-w-[80px]">Score</TableHead>
                        <TableHead className="text-white font-bold min-w-[80px]">Total</TableHead>
                        <TableHead className="text-white font-bold min-w-[140px]">Date</TableHead>
                        <TableHead className="text-white font-bold min-w-[200px]">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewStudent.progress.activities.map((activity, idx) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            {activity.name}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {activity.type}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {activity.score}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {activity.total}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {formatDate(activity.date)}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {activity.remarks || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Total Activities:</span> {previewStudent.progress.activities.length}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No activities recorded yet.</p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              {previewStudent.progress && previewStudent.progress.activities && previewStudent.progress.activities.length > 0 && (
                <Button
                  onClick={() => handleExportProgressPdf(previewStudent.student, previewStudent.progress!)}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  <Download className="mr-2 h-4 w-4" /> Export to PDF
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setPreviewStudent(null)}
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
