// Who the demo employees are. Identity only: the HR facts about them (manager, leave balance)
// live behind the MCP tools, so code that only needs to know who someone is, such as the demo
// UI, does not touch HR data.
export interface DirectoryEntry {
  id: string;
  name: string;
  title: string;
}

export const directory: DirectoryEntry[] = [
  { id: "E001", name: "Rina Wijaya", title: "Head of Engineering" },
  { id: "E002", name: "Budi Santoso", title: "Engineering Manager" },
  { id: "E003", name: "Sari Dewi", title: "Backend Engineer" },
  { id: "E004", name: "Andi Pratama", title: "Frontend Engineer" },
  { id: "E005", name: "Maya Lestari", title: "QA Engineer" },
  { id: "E006", name: "Dimas Putra", title: "HR Generalist" },
];

export function findInDirectory(id: string): DirectoryEntry | undefined {
  return directory.find((e) => e.id === id.trim().toUpperCase());
}
