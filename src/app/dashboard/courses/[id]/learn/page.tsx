"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  CheckCircle2, Circle, ChevronDown, ChevronRight,
  Download, Loader2, ArrowLeft, Award, SkipForward,
} from 'lucide-react';
import Link from 'next/link';
import { coursesApi, enrollmentsApi, lessonsApi } from '@/lib/api/services';
import { formatDuration, cn } from '@/lib/utils';
import CourseCompletionModal from '@/components/learn/CourseCompletionModal';
import { AutoplayCountdown } from '@/components/learn/AutoplayCountdown';
import type { Course, Enrollment, Lesson } from '@/types';

// ── Dynamic import: heavy client-only video player ─────────────────────────
const VideoPlayer = dynamic(
  () => import('@/components/learn/VideoPlayer').then((m) => m.VideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-ink-900">
        <Loader2 className="h-6 w-6 animate-spin text-saffron-500" />
      </div>
    ),
  },
);

// ── Constants ──────────────────────────────────────────────────────────────
const AUTOPLAY_STORAGE_KEY = 'sorobanlard:autoplay';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns the flat ordered list of all lessons across every module */
function flatLessons(course: Course): Lesson[] {
  return course.modules?.flatMap((m) => m.lessons) ?? [];
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LearnPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLessonId = searchParams.get("lesson");

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("lessons");
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // ── Autoplay state ───────────────────────────────────────────────────────
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(AUTOPLAY_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [showCountdown, setShowCountdown] = useState(false);

  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const previousCompletedCountRef = useRef<number | null>(null);
  const hasInitializedCompletionState = useRef(false);

  // ── Derived: next lesson ─────────────────────────────────────────────────
  const nextLesson = useMemo<Lesson | null>(() => {
    if (!course || !activeLesson) return null;
    const all = flatLessons(course);
    const idx = all.findIndex((l) => l.id === activeLesson.id);
    return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  }, [course, activeLesson]);

  // ── Persist autoplay preference ──────────────────────────────────────────
  const handleAutoplayChange = useCallback((enabled: boolean) => {
    setAutoplay(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTOPLAY_STORAGE_KEY, String(enabled));
    }
    // If the user turns autoplay off while the countdown is visible, cancel it
    if (!enabled) setShowCountdown(false);
  }, []);

  // ── Video ended handler ──────────────────────────────────────────────────
  const handleVideoEnded = useCallback(() => {
    if (autoplay && nextLesson) {
      setShowCountdown(true);
    }
    // If autoplay is off or there's no next lesson the video just stops
  }, [autoplay, nextLesson]);

  // ── Navigate to next lecture ─────────────────────────────────────────────
  const goToNext = useCallback(() => {
    if (!nextLesson) return;
    setShowCountdown(false);
    setActiveLesson(nextLesson);
  }, [nextLesson]);

  const cancelCountdown = useCallback(() => {
    setShowCountdown(false);
  }, []);

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      coursesApi.get(id),
      enrollmentsApi.get(id),
    ]).then(([c, e]) => {
      setCourse(c);
      setEnrollment(e);
      // Open first module by default
      if (c.modules?.[0]) setExpanded({ [c.modules[0].id]: true });
      // Start from first incomplete lesson
      const allLessons = flatLessons(c);
      const completedIds = new Set(
        e.lessonProgress?.filter((p: { completed: boolean }) => p.completed).map((p: { lessonId: string }) => p.lessonId),
      );
      const first = allLessons.find((l) => !completedIds.has(l.id)) ?? allLessons[0];
      if (first) setActiveLesson(first);
    })
    .catch(console.error)
    .finally(() => setLoading(false));

    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [id]);

  // ── Course completion detection ──────────────────────────────────────────
  useEffect(() => {
    if (!course || !enrollment) return;

    const totalLessons = flatLessons(course).length;
    const completedCount = enrollment.lessonProgress?.filter((p: { completed: boolean }) => p.completed).length ?? 0;
    const isComplete = totalLessons > 0 && completedCount >= totalLessons;
    const previouslyIncomplete =
      previousCompletedCountRef.current === null ||
      previousCompletedCountRef.current < totalLessons;
    const newlyCompleted =
      hasInitializedCompletionStateRef.current && previouslyIncomplete && isComplete;

    previousCompletedCountRef.current = completedCount;
    hasInitializedCompletionState.current = true;

    if (!isComplete) {
      setShowCompletionModal(false);
      return;
    }

    const storageKey = `course-completion:${course.id}`;
    const hasSeenModal =
      typeof window !== 'undefined' &&
      window.localStorage.getItem(storageKey) === 'true';

    if (newlyCompleted && !hasSeenModal) {
      setShowCompletionModal(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, "true");
      }
    } else {
      setShowCompletionModal(false);
    }
  }, [course, enrollment]);

  // ── Dismiss countdown when lesson changes (e.g. sidebar click) ──────────
  useEffect(() => {
    setShowCountdown(false);
  }, [activeLesson]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isLessonCompleted = (lessonId: string) =>
    enrollment?.lessonProgress?.some(
      (p: { lessonId: string; completed: boolean }) => p.lessonId === lessonId && p.completed,
    ) ?? false;

  const handleMarkComplete = async () => {
    if (!activeLesson || !enrollment || marking) return;
    setMarking(true);
    try {
      await lessonsApi.markComplete(activeLesson.id, enrollment.id);
      const updated = await enrollmentsApi.get(id);
      setEnrollment(updated);
    } finally {
      setMarking(false);
    }
  };

  const totalLessons   = course ? flatLessons(course).length : 0;
  const completedCount = enrollment?.lessonProgress?.filter((p: { completed: boolean }) => p.completed).length ?? 0;
  const progress       = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 text-saffron-500 animate-spin" />
    </div>
  );

  if (!course)
    return (
      <div className="text-center py-16 text-ink-500">Course not found.</div>
    );

  return (
    <div className="-m-3 flex h-[calc(100vh-4rem)] flex-col overflow-hidden sm:-m-6 md:flex-row">
      {course && (
        <CourseCompletionModal
          open={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          courseTitle={course.title}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
          <Link
            href={`/dashboard/courses/${id}`}
            className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm font-medium text-ink-900">{course.title}</span>
        </div>

        {activeLesson ? (
          <div className="flex-1 p-4">
            <VideoPlayer
              lesson={activeLesson}
              onEnded={handleVideoEnded}
              autoplay={autoplay}
              onAutoplayChange={handleAutoplayChange}
            />

            <div className="mt-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-ink-900">{activeLesson.title}</h1>
              <button
                onClick={handleMarkComplete}
                disabled={marking || isLessonCompleted(activeLesson.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  isLessonCompleted(activeLesson.id)
                    ? 'bg-green-50 text-green-700'
                    : 'bg-saffron-500 text-white hover:bg-saffron-600',
                )}
              >
                {marking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLessonCompleted(activeLesson.id) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                {isLessonCompleted(activeLesson.id) ? 'Completed' : 'Mark complete'}
              </button>
            </div>

            {activeLesson.description && (
              <p className="mt-2 text-sm text-ink-500">{activeLesson.description}</p>
            )}

            {activeLesson.resources && activeLesson.resources.length > 0 && (
              <div className="mt-4 space-y-2">
                <h2 className="text-sm font-semibold text-ink-900">Resources</h2>
                {activeLesson.resources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-saffron-600 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {r.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-ink-500">
            Select a lesson to begin.
          </div>
        )}

        {showCountdown && nextLesson && (
          <AutoplayCountdown
            nextLessonTitle={nextLesson.title}
            onComplete={goToNext}
            onCancel={cancelCountdown}
          />
        )}
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-full shrink-0 border-t border-ink-100 md:w-80 md:border-l md:border-t-0">
        <div className="border-b border-ink-100 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink-900">Progress</span>
            <span className="text-ink-500">{progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-saffron-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex border-b border-ink-100">
          <button
            onClick={() => setSidebarTab('lessons')}
            className={cn(
              'flex-1 py-2 text-sm font-medium',
              sidebarTab === 'lessons' ? 'text-saffron-600' : 'text-ink-500',
            )}
          >
            Lessons
          </button>
          <button
            onClick={() => setSidebarTab('resources')}
            className={cn(
              'flex-1 py-2 text-sm font-medium',
              sidebarTab === 'resources' ? 'text-saffron-600' : 'text-ink-500',
            )}
          >
            Resources
          </button>
        </div>

        <div className="overflow-y-auto p-2">
          {sidebarTab === 'lessons' &&
            course.modules?.map((module) => (
              <div key={module.id} className="mb-1">
                <button
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [module.id]: !prev[module.id] }))
                  }
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-ink-900 hover:bg-ink-50"
                >
                  <span>{module.title}</span>
                  {expanded[module.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expanded[module.id] && (
                  <ul className="mt-1 space-y-1">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <button
                          onClick={() => setActiveLesson(lesson)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                            activeLesson?.id === lesson.id
                              ? 'bg-saffron-50 text-saffron-700'
                              : 'text-ink-600 hover:bg-ink-50',
                          )}
                        >
                          {isLessonCompleted(lesson.id) ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-ink-300" />
                          )}
                          <span className="flex-1 truncate">{lesson.title}</span>
                          <span className="text-xs text-ink-400">
                            {formatDuration(lesson.duration ?? 0)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

          {sidebarTab === 'resources' && (
            <div className="p-2 text-sm text-ink-500">
              {activeLesson?.resources && activeLesson.resources.length > 0 ? (
                activeLesson.resources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-1 text-saffron-600 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {r.title}
                  </a>
                ))
              ) : (
                <p>No resources for this lesson.</p>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
