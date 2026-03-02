import { SidebarNav } from "@/components/dashboard/sidebar-nav";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: "home" | "roles" | "users" | "workers" | "notifications" | "audit" | "documents";
};

type SidebarProps = {
  items: NavItem[];
};

export function Sidebar({ items }: SidebarProps) {
  return (
    <div className="h-full px-3 py-5">
      <div className="mb-2 px-3">
        <p className="dashboard-shell-navtitle text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Navegacion
        </p>
      </div>
      <SidebarNav items={items} />
    </div>
  );
}
