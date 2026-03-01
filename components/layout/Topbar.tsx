'use client';

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { signOutAction } from "@/app/(dashboard)/actions";

interface TopbarProps {
    displayName: string;
    role: string;
}

export default function Topbar({ displayName, role }: TopbarProps) {
  return (
    <div className="p-4 flex justify-between items-center">
        <div>
            {/* Can be used for breadcrumbs or page title */}
        </div>
      <div className="flex items-center gap-3">
        <div className="dashboard-shell-usercard rounded-sm border border-slate-200/80 bg-white/90 px-3 py-2 text-right shadow-sm">
          <p className="dashboard-shell-userrole text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {role}
          </p>
          <p className="dashboard-shell-username max-w-52 truncate text-sm text-slate-700">
            {displayName}
          </p>
        </div>
        <form action={signOutAction}>
          <FormSubmitButton
            pendingLabel="Cerrando..."
            className="dashboard-shell-signout border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Cerrar sesion
          </FormSubmitButton>
        </form>
      </div>
    </div>
  );
}
