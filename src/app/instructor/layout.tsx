import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { cn } from '@/lib/utils';

export interface InstructorStatItem {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export function InstructorStatsGrid({
  items,
  className,
}: {
  items: InstructorStatItem[];
  className?: string;
}) {
  return (
    <div
      data-testid="instructor-stats-grid"
      className={cn(
        'grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8',
        className,
      )}
    >
      {items.map(({ icon, label, value }) => (
        <div key={label} className="card p-4 sm:p-5 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-saffron-50 flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            <p className="text-xs text-ink-400 truncate">{label}</p>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-ink-900 truncate">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="instructor-layout"
      className="flex min-h-screen h-screen w-full bg-ink-50 overflow-hidden"
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main
          data-testid="instructor-main"
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 sm:py-6 lg:p-6"
        >
          <div className="max-w-5xl w-full min-w-0 mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
