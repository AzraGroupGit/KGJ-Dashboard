// types/layout.ts

export interface MenuItem {
  name: string;
  icon: string;
  href?: string;
  submenu?: MenuItem[];
}

export interface CollapseState {
  [key: string]: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  link: string | null;
  created_at: string;
}
