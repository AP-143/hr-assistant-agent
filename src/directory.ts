// Identity only; HR facts stay behind the MCP tools so the UI never touches them.
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
