export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SHIFT_OPTIONS = [
  { code: 'A', label: 'Shift A', start: '05:00', end: '14:00', hours: 8 },
  { code: 'B', label: 'Shift B', start: '13:00', end: '22:00', hours: 8 },
  { code: 'C', label: 'Shift C', start: '21:00', end: '06:00', hours: 8 },
  { code: 'AA', label: 'Shift AA', start: '08:00', end: '19:00', hours: 12 },
  { code: 'BB', label: 'Shift BB', start: '20:00', end: '07:00', hours: 12 }
];

export const DEFAULT_HALLS = [
  { id: 'H1', name: 'Hall 1', capacity: 50, color: 'blue' },
  { id: 'H2', name: 'Hall 2', capacity: 50, color: 'red' },
  { id: 'H3', name: 'Hall 3', capacity: 50, color: 'blue' },
  { id: 'H4', name: 'Hall 4', capacity: 50, color: 'red' }
];

export const DEFAULT_HR_CODES = ['123456', '222222', '654321'];
export const DEFAULT_USERS = [
  { username: 'user1', password: 'user123', role: 'USER' },
  { username: 'hr1', password: 'hr123', role: 'HR' },
  { username: 'admin1', password: 'admin123', role: 'ADMIN' }
];
export const DEFAULT_EMPLOYEES = [
 
];