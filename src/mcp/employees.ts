import { directory } from "../directory.js";

// Dummy in-memory HR data. A real deployment would query the HRIS database.
export interface Employee {
  id: string;
  name: string;
  title: string;
  managerId: string | null;
  leaveBalanceDays: number;
  leaveTakenDays: number;
}

const hrFacts: Record<string, Pick<Employee, "managerId" | "leaveBalanceDays" | "leaveTakenDays">> = {
  E001: { managerId: null, leaveBalanceDays: 9, leaveTakenDays: 3 },
  E002: { managerId: "E001", leaveBalanceDays: 7, leaveTakenDays: 5 },
  E003: { managerId: "E002", leaveBalanceDays: 12, leaveTakenDays: 0 },
  E004: { managerId: "E002", leaveBalanceDays: 4, leaveTakenDays: 8 },
  E005: { managerId: "E002", leaveBalanceDays: 10, leaveTakenDays: 2 },
  E006: { managerId: "E001", leaveBalanceDays: 6, leaveTakenDays: 6 },
};

export const employees: Employee[] = directory.map((person) => ({ ...person, ...hrFacts[person.id] }));

export function findEmployee(id: string): Employee | undefined {
  return employees.find((e) => e.id === id.trim().toUpperCase());
}
