import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar }  from '@/components/layout/TopBar';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="instructor-layout-root"
      className="flex min-h-screen h-screen bg-ink-50 overflow-hidden"
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main
          data-testid="instructor-layout-main"
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6"
        >
          <div className="max-w-5xl w-full min-w-0 mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
