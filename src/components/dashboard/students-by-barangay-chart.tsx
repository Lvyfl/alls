'use client';

import { useMemo } from 'react';
import { Student, Barangay } from '@/types';

interface StudentsByBarangayChartProps {
  students: Student[];
  barangays: Barangay[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function StudentsByBarangayChart({ students, barangays }: StudentsByBarangayChartProps) {
  const { chartData, totalStudents } = useMemo(() => {
    const data = barangays.map(barangay => ({
      name: barangay.name,
      value: students.filter(student => student.barangayId === barangay._id).length
    })).filter(item => item.value > 0);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    return { chartData: data, totalStudents: total };
  }, [students, barangays]);

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">No student data available for the chart.</div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 sm:border-4 border-blue-600 p-4 sm:p-6">
      <div className="text-center">
        <h3 className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">Enrollment Overview</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Distribution of students across barangays</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{totalStudents} Total Students</p>
      </div>
      
      {/* Legend section */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Barangays</h4>
        <div className="grid grid-cols-3 gap-4">
          {chartData.map((entry, index) => (
            <div key={entry.name} className="flex items-center space-x-3 p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div 
                className="w-4 h-4 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block truncate">{entry.name}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {entry.value} student{entry.value !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0 ml-2">
                    {((entry.value / totalStudents) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {chartData.slice(0, 3).map((entry, index) => (
          <div key={entry.name} className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-600">
            <div 
              className="w-3 h-3 rounded-full mx-auto mb-2" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{entry.name}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{entry.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
