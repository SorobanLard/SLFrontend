'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Plus,
  Users,
  DollarSign,
  BookOpen,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { usersApi } from '@/lib/api/services';
import { CourseCard } from '@/components/courses/CourseCard';
import {
  formatRangeLabel,
  rangeForPreset,
  type RevenueDateRange,
} from '@/components/instructor/RevenueDateRangePicker';
import { courseStatusBadge, formatUsdc } from '@/lib/utils';
import type { Course } from '@/types';

const RevenueChart = dynamic(
  () => import('@/components/instructor/RevenueChart').then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => <div className="h-[350px] w-full animate-pulse rounded-xl bg-ink-50" />,
  },
);

const RevenueDateRangePicker = dynamic(
  () => import('@/components/instructor/RevenueDateRangePicker').then((m) => m.RevenueDateRangePicker),
  { loading: () => <div className="h-8 w-40 animate-pulse rounded-lg bg-ink-100" /> },
);

export default function InstructorDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [dateRange, setDateRange] = useState<RevenueDateRange>(() => rangeForPreset('12m'));
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);

  useEffect(() => {
    Promise.all([usersApi.getInstructorStats()])
      .then(([s]) => {
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setRevenueLoading(true);
    const timer = setTimeout(() => {
      const data = generateRevenueData(dateRange.from, dateRange.to);
      setRevenueData(data);

      const today = new Date();
      const currentMonth = data.find((d) => {
        const date = new Date(d.date);
        return (
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        );
      });
      setThisMonthRevenue(currentMonth?.revenue || 0);

      const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
      setPendingPayout(Math.round(totalRevenue * 0.15));

      setRevenueLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [dateRange.from, dateRange.to]);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="section-heading">Instructor Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/instructor/promo-codes"
            className="btn-secondary flex items-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            Promo Codes
          </Link>
          <Link href="/dashboard/courses/create" className="btn-primary">
            <Plus className="w-4 h-4" />
            New course
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div
        data-testid="instructor-stats-grid"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
      >
        {[
          { icon: BookOpen, label: 'Courses', value: stats?.totalCourses ?? 0 },
          { icon: Users, label: 'Students', value: stats?.totalStudents ?? 0 },
          {
            icon: DollarSign,
            label: 'Total Revenue',
            value: formatUsdc(stats?.totalRevenue ?? 0),
          },
          {
            icon: TrendingUp,
            label: 'This Month',
            value: formatUsdc(thisMonthRevenue),
          },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-3 mb-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-saffron-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-saffron-600" />
              </div>
              <p className="text-xs text-ink-400 truncate">{label}</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-ink-900 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Analytics Section */}
      <div className="mb-8 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sorobanlard-primary" />
            Revenue Analytics
          </h2>
          <RevenueDateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {[
            {
              label: 'Total Revenue',
              value: formatUsdc(stats?.totalRevenue ?? 0),
              icon: '📊',
            },
            {
              label: 'This Month',
              value: formatUsdc(thisMonthRevenue),
              icon: '📈',
            },
            {
              label: 'Pending Payout',
              value: formatUsdc(pendingPayout),
              icon: '⏳',
            },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card p-4 text-center min-w-0">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-xs text-ink-500 mb-1 truncate">{label}</p>
              <p className="text-xl font-bold text-ink-900 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="card p-4 sm:p-6 min-w-0 overflow-hidden">
          <RevenueChart
            data={revenueData}
            isLoading={revenueLoading}
            height={350}
            rangeLabel={formatRangeLabel(dateRange)}
            exportFilename={`revenue-${dateRange.from}-to-${dateRange.to}`}
          />
        </div>
      </div>

      {/* My courses */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          My courses
        </h2>
        <Link href="/dashboard/instructor/courses" className="btn-secondary inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Manage courses
        </Link>
      </div>
      {!stats?.courses?.length ? (
        <div className="card p-6 sm:p-10 text-center">
          <BookOpen className="w-10 h-10 text-saffron-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-ink-700">No courses yet</p>
          <p className="text-xs text-ink-400 mt-1">
            Create your first course to start teaching.
          </p>
          <Link href="/dashboard/courses/create" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />
            Create course
          </Link>
        </div>
      ) : (
        <div className="course-grid">
          {stats.courses.map((course: Course) => (
            <div key={course.id} className="relative">
              <div className="absolute top-2.5 right-2.5 z-10">
                <span className={courseStatusBadge(course.status)}>
                  {course.status}
                </span>
              </div>
              <CourseCard
                course={course}
                href={`/dashboard/courses/${course.id}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateRevenueData(from: string, to: string) {
  const data = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const spansYears = start.getFullYear() !== end.getFullYear();

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const monthName = cursor.toLocaleString('en-US', {
      month: 'short',
      ...(spansYears ? { year: '2-digit' } : {}),
    });
    const revenue = Math.floor(Math.random() * 4000) + 500;

    data.push({
      month: monthName,
      revenue,
      date: cursor.toISOString(),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return data;
}
