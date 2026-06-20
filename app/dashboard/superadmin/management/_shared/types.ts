// Shared types for superadmin management pages

export interface ProgressRow {
  is_completed: boolean;
  completed_at: string | null;
  status: string | null;
  admin_notes: string | null;
  notes: string | null;
  kendala: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  sort_order?: number;
  progress: ProgressRow[] | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  items: TaskItem[] | null;
}

export interface ManagerData {
  id: string;
  full_name: string;
  username?: string;
  role_name: string;
  tasks: Task[];
}

export interface DashboardStats {
  totalManagers: number;
  totalTasks: number;
  completedTasks: number;
  totalItems: number;
  completionRate: number;
  thisWeekDone: number;
  atRiskManagers: number;
}

export interface ManagerStats {
  manager: ManagerData;
  done: number;
  total: number;
  rate: number;
}

export interface InsightCardData {
  type: "trend" | "alert" | "achievement";
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

export interface HistoryEntry {
  manager: string;
  managerId: string;
  role: string;
  item: string;
  task: string;
  status: string;
  completed_at: string;
  notes: string | null;
  kendala: string | null;
  admin_notes: string | null;
  managerRate: number;
  managerDone: number;
  managerTotal: number;
}
