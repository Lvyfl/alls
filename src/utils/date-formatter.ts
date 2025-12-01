/**
 * Unified date formatting utility
 * Format: "November 1, 2025"
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format date string to "November 1, 2025" format
 * @param dateString - Date string in any format (ISO, YYYY-MM-DD, etc.)
 * @returns Formatted date string or original string if invalid
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return '';
  }

  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }

    const month = MONTHS[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  } catch {
    return dateString; // Return original on error
  }
}

/**
 * Format date for Excel export (MM/DD/YYYY)
 * @param dateString - Date string in any format
 * @returns Formatted date string for Excel
 */
export function formatDateForExport(dateString: string | null | undefined): string {
  if (!dateString) {
    return '';
  }

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  } catch {
    return dateString;
  }
}

