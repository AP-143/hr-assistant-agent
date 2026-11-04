// Dummy in-memory HR data. A real deployment would query the HRIS database.
export interface Employee {
  id: string;
  name: string;
  title: string;
  managerId: string | null;
  leaveBalanceDays: number;
  leaveTakenDays: number;
}

export const employees: Employee[] = [
  { id: "E001", name: "Rina Wijaya", title: "Head of Engineering", managerId: null, leaveBalanceDays: 9, leaveTakenDays: 3 },
  { id: "E002", name: "Budi Santoso", title: "Engineering Manager", managerId: "E001", leaveBalanceDays: 7, leaveTakenDays: 5 },
  { id: "E003", name: "Sari Dewi", title: "Backend Engineer", managerId: "E002", leaveBalanceDays: 12, leaveTakenDays: 0 },
  { id: "E004", name: "Andi Pratama", title: "Frontend Engineer", managerId: "E002", leaveBalanceDays: 4, leaveTakenDays: 8 },
  { id: "E005", name: "Maya Lestari", title: "QA Engineer", managerId: "E002", leaveBalanceDays: 10, leaveTakenDays: 2 },
  { id: "E006", name: "Dimas Putra", title: "HR Generalist", managerId: "E001", leaveBalanceDays: 6, leaveTakenDays: 6 },
];

export function findEmployee(id: string): Employee | undefined {
  return employees.find((e) => e.id === id.trim().toUpperCase());
}
