'use client';
import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { type NavItem } from '@/components/dashboard/sidebar-nav';

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  displayName: string;
  role: string;
}

export default function AppShell({ children, navItems, displayName, role }: AppShellProps) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-64 bg-white shadow-md dark:bg-gray-800 hidden md:block">
        <Sidebar navItems={navItems} />
      </div>

      <div className="flex flex-col flex-1">
        <div className="bg-white shadow-md dark:bg-gray-800">
          <Topbar displayName={displayName} role={role} />
        </div>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
