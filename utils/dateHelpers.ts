/**
 * Calculates the "Financial Reference Month" based on the rule:
 * Starts on the 16th of current month, ends 15th of next.
 * 
 * Logic:
 * If Day >= 16: Reference is Next Month.
 * If Day < 16: Reference is Current Month.
 * 
 * Example: 
 * Jan 17, 2024 -> February 2024
 * Jan 10, 2024 -> January 2024
 */
export const getFinancialMonth = (dateStr: string): string => {
  const date = new Date(dateStr);
  // Fix timezone offset issues by treating input as raw YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // JavaScript month is 0-indexed (0=Jan, 1=Feb)
  // Logic inputs are 1-based.
  
  let targetYear = year;
  let targetMonth = month; // 1-12

  if (day >= 16) {
    targetMonth = month + 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear = year + 1;
    }
  }

  // Format YYYY-MM
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const formatDateBr = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

export const getMonthName = (yyyy_mm: string) => {
  const [year, month] = yyyy_mm.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

/**
 * Projects a date forward by N months
 */
export const addMonths = (dateStr: string, monthsToAdd: number): string => {
  const date = new Date(dateStr);
  
  // Robust string manipulation to avoid timezone jumps
  let [y, m, day] = dateStr.split('-').map(Number);
  
  let nextMonth = m + monthsToAdd;
  let nextYear = y;

  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear++;
  }
  
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Navigates reference month string (YYYY-MM) by N months
 */
export const navigateMonth = (yyyy_mm: string, monthsToAdd: number): string => {
  const [year, month] = yyyy_mm.split('-').map(Number);
  let newMonth = month + monthsToAdd;
  let newYear = year;

  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  } else if (newMonth < 1) {
    newMonth = 12;
    newYear--;
  }

  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
};

// --- Real Calendar Helpers ---

/**
 * Returns number of days in a specific month/year
 * month is 1-based (1=Jan, 12=Dec)
 */
export const getDaysInMonth = (year: number, month: number): number => {
  // Day 0 of the next month is the last day of the current month
  return new Date(year, month, 0).getDate();
};

/**
 * Returns the day of the week (0=Sun, 6=Sat) for the 1st of the month
 * month is 1-based
 */
export const getFirstDayOfWeek = (year: number, month: number): number => {
  return new Date(year, month - 1, 1).getDay();
};