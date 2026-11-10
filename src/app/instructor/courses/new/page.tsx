'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp,
  GripVertical, Plus, Trash2, Upload, Loader2, AlertCircle,
  BookOpen, DollarSign, Film, Star, Eye, Video, FileText,
  ClipboardCheck, X,
} from 'lucide-react';
import { coursesApi, uploadsApi, lessonsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { cn, generateCourseId, usdcToStroops } from '@/lib/utils';

// ── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Tailoring', 'Makeup Artistry', 'Baking', 'Hairstyling',
  'Photography', 'Nail Technology', 'Fashion Design', 'Eyelash Extension', 'Other',
];

const LEVELS    = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['English', 'Yoruba', 'Hausa', 'Igbo', 'French', 'Pidgin'];

// ── Types ───────────────────────────────────────────────────────────────────

interface LessonDraft {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  isFree: boolean;
}

interface SectionDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
  collapsed: boolean;
}

interface CourseFormData {
  // Step 1 — Basics
  title: string;
  subtitle: string;
  category: string;
  language: string;
  level: string;
  // Step 2 — Curriculum
  sections: SectionDraft[];
  // Step 3 — Media
  thumbnailUrl: string;
  thumbnailFile: File | null;
  promoVideoUrl: string;
  promoVideoFile: File | null;
  // Step 4 — Pricing
  pricingType: 'free' | 'paid';
  price: string;
  discountedPrice: string;
}

// ── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Basics',    icon: BookOpen },
  { id: 2, label: 'Curriculum',icon: FileText },
  { id: 3, label: 'Media',     icon: Film },
  { id: 4, label: 'Pricing',   icon: DollarSign },
  { id: 5, label: 'Review',    icon: Star },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptySection(): SectionDraft {
  return { id: uid(), title: '', lessons: [], collapsed: false };
}

function emptyLesson(): LessonDraft {
  return { id: uid(), title: '', type: 'VIDEO', isFree: false };
}

// ── Progress indicator ──────────────────────────────────────────────────────

function StepIndicator({ current, saved }: { current: number; saved: number }) {
  return (
    <nav aria-label="Form steps" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const done    = step.id < current;
          const active  = step.id === current;
          const Icon    = step.icon;
          return (
            <li key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  done   ? 'bg-saffron-600 border-saffron-600 text-white'
                         : active ? 'bg-white border-saffron-500 text-saffron-600 shadow-md'
                         : 'bg-white border-ink-200 text-ink-300',
                )}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn(
                  'text-[10px] font-medium hidden sm:block',
                  active ? 'text-saffron-700' : done ? 'text-ink-500' : 'text-ink-300',
                )}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1 transition-colors duration-300',
                  step.id < current ? 'bg-saffron-400' : 'bg-ink-100',
                )} />
              )}
            </li>
          );
        })}
      </ol>
      {saved >= 1 && (
        <p className="text-[10px] text-ink-400 text-center mt-2">
          Draft auto-saved through step {saved}
        </p>
      )}
    </nav>
  );
}

// ── Step 1 — Course Basics ──────────────────────────────────────────────────

function Step1({
  data, onChange, errors,
}: {
  data: CourseFormData;
  onChange: (k: keyof CourseFormData, v: any) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="course-title" className="label">
          Course title <span className="text-red-500">*</span>
        </label>
        <input
          id="course-title"
          type="text"
          placeholder="e.g. Professional Tailoring from Scratch"
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          className={cn('input', errors.title && 'border-red-400 focus:ring-red-300')}
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="course-subtitle" className="label">Subtitle</label>
        <input
          id="course-subtitle"
          type="text"
          placeholder="A short summary of what students will learn"
          value={data.subtitle}
          onChange={(e) => onChange('subtitle', e.target.value)}
          className="input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="course-category" className="label">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="course-category"
            value={data.category}
            onChange={(e) => onChange('category', e.target.value)}
            className={cn('select', errors.category && 'border-red-400')}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="course-language" className="label">Language</label>
          <select
            id="course-language"
            value={data.language}
            onChange={(e) => onChange('language', e.target.value)}
            className="select"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Level</label>
        <div className="flex gap-3 flex-wrap">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => onChange('level', lv)}
              className={cn(
                'px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                data.level === lv
                  ? 'bg-saffron-600 border-saffron-600 text-white shadow-sm'
                  : 'border-ink-200 text-ink-600 hover:border-saffron-300',
              )}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Curriculum ─────────────────────────────────────────────────────

function LessonRow({
  lesson, sectionId, position,
  onUpdate, onRemove, onDragStart, onDragOver, onDrop,
}: {
  lesson: LessonDraft; sectionId: string; position: number;
  onUpdate: (sId: string, lId: string, patch: Partial<LessonDraft>) => void;
  onRemove: (sId: string, lId: string) => void;
  onDragStart: (e: React.DragEvent, sId: string, lId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, sId: string, lId: string) => void;
}) {
  const typeIcon: Record<LessonDraft['type'], React.ElementType> = {
    VIDEO: Video, TEXT: FileText, QUIZ: ClipboardCheck, ASSIGNMENT: ClipboardCheck,
  };
  const TypeIcon = typeIcon[lesson.type];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, sectionId, lesson.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, sectionId, lesson.id)}
      className="flex items-center gap-2 p-2.5 rounded-xl border border-ink-100 bg-ink-50/50 hover:bg-white hover:border-saffron-200 transition-all group cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="w-4 h-4 text-ink-300 flex-shrink-0" />
      <span className="text-xs text-ink-400 w-5 text-center flex-shrink-0">{position}</span>
      <TypeIcon className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
      <input
        type="text"
        placeholder="Lesson title…"
        value={lesson.title}
        onChange={(e) => onUpdate(sectionId, lesson.id, { title: e.target.value })}
        className="flex-1 text-sm bg-transparent border-none outline-none text-ink-800 placeholder:text-ink-300"
      />
      <select
        value={lesson.type}
        onChange={(e) => onUpdate(sectionId, lesson.id, { type: e.target.value as LessonDraft['type'] })}
        className="text-xs border border-ink-200 rounded-lg px-2 py-1 bg-white text-ink-600 focus:outline-none"
      >
        <option value="VIDEO">Video</option>
        <option value="TEXT">Text</option>
        <option value="QUIZ">Quiz</option>
        <option value="ASSIGNMENT">Assignment</option>
      </select>
      <label className="flex items-center gap-1 text-[10px] text-ink-400 cursor-pointer">
        <input
          type="checkbox"
          checked={lesson.isFree}
          onChange={(e) => onUpdate(sectionId, lesson.id, { isFree: e.target.checked })}
          className="w-3 h-3 accent-saffron-600"
        />
        Free
      </label>
      <button
        type="button"
        onClick={() => onRemove(sectionId, lesson.id)}
        className="p-1 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SectionBlock({
  section, index, total,
  onUpdateTitle, onToggleCollapse, onAddLesson, onRemoveSection,
  onUpdateLesson, onRemoveLesson, onDragStart, onDragOver, onDrop,
}: {
  section: SectionDraft; index: number; total: number;
  onUpdateTitle: (id: string, title: string) => void;
  onToggleCollapse: (id: string) => void;
  onAddLesson: (sId: string) => void;
  onRemoveSection: (id: string) => void;
  onUpdateLesson: (sId: string, lId: string, patch: Partial<LessonDraft>) => void;
  onRemoveLesson: (sId: string, lId: string) => void;
  onDragStart: (e: React.DragEvent, sId: string, lId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, sId: string, lId: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-ink-50 border-b border-ink-100">
        <GripVertical className="w-4 h-4 text-ink-300 flex-shrink-0" />
        <span className="text-xs font-semibold text-ink-500 flex-shrink-0">
          Section {index + 1}
        </span>
        <input
          type="text"
          placeholder="Section title…"
          value={section.title}
          onChange={(e) => onUpdateTitle(section.id, e.target.value)}
          className="flex-1 bg-transparent text-sm font-medium text-ink-800 border-none outline-none placeholder:text-ink-300"
        />
        <span className="text-[10px] text-ink-400 flex-shrink-0">
          {section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => onToggleCollapse(section.id)}
          className="p-1 rounded-lg hover:bg-ink-100 transition-colors"
          aria-label={section.collapsed ? 'Expand section' : 'Collapse section'}
        >
          {section.collapsed
            ? <ChevronDown className="w-4 h-4 text-ink-400" />
            : <ChevronUp   className="w-4 h-4 text-ink-400" />}
        </button>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemoveSection(section.id)}
            className="p-1 rounded-lg hover:bg-red-50 hover:text-red-500 text-ink-300 transition-colors"
            aria-label="Remove section"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Lessons */}
      {!section.collapsed && (
        <div className="p-3 space-y-2">
          {section.lessons.map((lesson, li) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              sectionId={section.id}
              position={li + 1}
              onUpdate={onUpdateLesson}
              onRemove={onRemoveLesson}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
          <button
            type="button"
            onClick={() => onAddLesson(section.id)}
            className="flex items-center gap-1.5 text-xs text-saffron-600 hover:text-saffron-800 font-medium px-2 py-1.5 rounded-xl hover:bg-saffron-50 transition-colors w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add lesson
          </button>
        </div>
      )}
    </div>
  );
}

function Step2({
  data, onChange,
}: {
  data: CourseFormData;
  onChange: (k: keyof CourseFormData, v: any) => void;
}) {
  // Drag-and-drop state
  const dragRef = useRef<{ sId: string; lId: string } | null>(null);

  const updateSections = useCallback((fn: (s: SectionDraft[]) => SectionDraft[]) => {
    onChange('sections', fn(data.sections));
  }, [data.sections, onChange]);

  const addSection = () => updateSections((s) => [...s, emptySection()]);

  const removeSection = (id: string) =>
    updateSections((s) => s.filter((sec) => sec.id !== id));

  const updateSectionTitle = (id: string, title: string) =>
    updateSections((s) => s.map((sec) => sec.id === id ? { ...sec, title } : sec));

  const toggleCollapse = (id: string) =>
    updateSections((s) => s.map((sec) => sec.id === id ? { ...sec, collapsed: !sec.collapsed } : sec));

  const addLesson = (sId: string) =>
    updateSections((s) => s.map((sec) =>
      sec.id === sId ? { ...sec, lessons: [...sec.lessons, emptyLesson()] } : sec,
    ));

  const updateLesson = (sId: string, lId: string, patch: Partial<LessonDraft>) =>
    updateSections((s) => s.map((sec) =>
      sec.id === sId
        ? { ...sec, lessons: sec.lessons.map((l) => l.id === lId ? { ...l, ...patch } : l) }
        : sec,
    ));

  const removeLesson = (sId: string, lId: string) =>
    updateSections((s) => s.map((sec) =>
      sec.id === sId ? { ...sec, lessons: sec.lessons.filter((l) => l.id !== lId) } : sec,
    ));

  // DnD handlers
  const handleDragStart = (e: React.DragEvent, sId: string, lId: string) => {
    dragRef.current = { sId, lId };
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, targetSId: string, targetLId: string) => {
    e.preventDefault();
    if (!dragRef.current) return;
    const { sId: srcSId, lId: srcLId } = dragRef.current;
    if (srcSId !== targetSId || srcLId === targetLId) { dragRef.current = null; return; }
    updateSections((s) => s.map((sec) => {
      if (sec.id !== srcSId) return sec;
      const lessons = [...sec.lessons];
      const fromIdx = lessons.findIndex((l) => l.id === srcLId);
      const toIdx   = lessons.findIndex((l) => l.id === targetLId);
      const [moved] = lessons.splice(fromIdx, 1);
      lessons.splice(toIdx, 0, moved);
      return { ...sec, lessons };
    }));
    dragRef.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-500">
            {data.sections.length} section{data.sections.length !== 1 ? 's' : ''} ·{' '}
            {data.sections.reduce((acc, s) => acc + s.lessons.length, 0)} lessons
          </p>
          <p className="text-xs text-ink-400 mt-0.5">Drag lessons to reorder within a section</p>
        </div>
        <button type="button" onClick={addSection} className="btn-secondary text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add section
        </button>
      </div>

      {data.sections.map((section, idx) => (
        <SectionBlock
          key={section.id}
          section={section}
          index={idx}
          total={data.sections.length}
          onUpdateTitle={updateSectionTitle}
          onToggleCollapse={toggleCollapse}
          onAddLesson={addLesson}
          onRemoveSection={removeSection}
          onUpdateLesson={updateLesson}
          onRemoveLesson={removeLesson}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}

      {data.sections.length === 0 && (
        <div className="card p-10 text-center border-dashed">
          <BookOpen className="w-8 h-8 text-ink-200 mx-auto mb-3" />
          <p className="text-sm text-ink-500 mb-3">No sections yet. Add your first section to get started.</p>
          <button type="button" onClick={addSection} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add first section
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 3 — Media ──────────────────────────────────────────────────────────

function UploadDropzone({
  id, label, hint, accept, previewUrl, uploading,
  onFile,
}: {
  id: string; label: string; hint: string; accept: string;
  previewUrl: string; uploading?: boolean;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isVideo  = accept.includes('video');
  return (
    <div>
      <label className="label">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={cn(
          'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
          previewUrl
            ? 'border-leaf-300 bg-leaf-50'
            : 'border-ink-200 hover:border-saffron-300 hover:bg-saffron-50',
        )}
      >
        <input
          ref={inputRef} id={id} type="file" accept={accept}
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-saffron-400 animate-spin" />
            <p className="text-sm text-ink-500">Uploading…</p>
          </div>
        ) : previewUrl ? (
          isVideo ? (
            <div>
              <Video className="w-8 h-8 text-leaf-500 mx-auto mb-2" />
              <p className="text-xs text-leaf-600 font-medium">Video uploaded ✓</p>
              <p className="text-[10px] text-leaf-400 mt-0.5 truncate max-w-xs mx-auto">{previewUrl}</p>
            </div>
          ) : (
            <div>
              <img src={previewUrl} alt="Preview" className="h-28 mx-auto rounded-xl object-cover mb-2 shadow-sm" />
              <p className="text-xs text-leaf-600 font-medium">Thumbnail uploaded ✓</p>
            </div>
          )
        ) : (
          <>
            <Upload className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-600 font-medium">{`Upload ${label.toLowerCase()}`}</p>
            <p className="text-xs text-ink-400 mt-1">{hint}</p>
            <p className="text-xs text-ink-300 mt-1">or drag & drop here</p>
          </>
        )}
      </div>
    </div>
  );
}

function Step3({
  data, onChange,
}: {
  data: CourseFormData;
  onChange: (k: keyof CourseFormData, v: any) => void;
}) {
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleThumbnail = async (file: File) => {
    onChange('thumbnailFile', file);
    setUploadingThumb(true);
    try {
      const { url } = await uploadsApi.upload(file, 'thumbnail');
      onChange('thumbnailUrl', url);
    } catch (e) { console.error(e); }
    finally { setUploadingThumb(false); }
  };

  const handleVideo = async (file: File) => {
    onChange('promoVideoFile', file);
    setUploadingVideo(true);
    try {
      const { url } = await uploadsApi.upload(file, 'video');
      onChange('promoVideoUrl', url);
    } catch (e) { console.error(e); }
    finally { setUploadingVideo(false); }
  };

  return (
    <div className="space-y-6">
      <UploadDropzone
        id="thumbnail-upload"
        label="Course thumbnail"
        hint="PNG or JPG, 1280×720 recommended, up to 5 MB"
        accept="image/*"
        previewUrl={data.thumbnailUrl}
        uploading={uploadingThumb}
        onFile={handleThumbnail}
      />
      <UploadDropzone
        id="promo-video-upload"
        label="Promo video"
        hint="MP4, MOV, up to 200 MB — short preview clip shown to prospective students"
        accept="video/*"
        previewUrl={data.promoVideoUrl}
        uploading={uploadingVideo}
        onFile={handleVideo}
      />
    </div>
  );
}

// ── Step 4 — Pricing ────────────────────────────────────────────────────────

function Step4({
  data, onChange, errors,
}: {
  data: CourseFormData;
  onChange: (k: keyof CourseFormData, v: any) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {/* Free vs Paid */}
      <div>
        <label className="label">Pricing type</label>
        <div className="grid grid-cols-2 gap-3">
          {(['free', 'paid'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange('pricingType', type)}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all',
                data.pricingType === type
                  ? 'border-saffron-500 bg-saffron-50'
                  : 'border-ink-200 hover:border-ink-300',
              )}
            >
              <p className="text-sm font-semibold text-ink-900 capitalize">{type}</p>
              <p className="text-xs text-ink-400 mt-0.5">
                {type === 'free'
                  ? 'No payment required to enrol'
                  : 'Students pay to access the course'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {data.pricingType === 'paid' && (
        <>
          <div>
            <label htmlFor="course-price" className="label">
              Price (USDC) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-400">$</span>
              <input
                id="course-price"
                type="number" min="1" step="0.01" placeholder="49.99"
                value={data.price}
                onChange={(e) => onChange('price', e.target.value)}
                className={cn('input pl-7', errors.price && 'border-red-400')}
              />
            </div>
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            <p className="text-xs text-ink-400 mt-1.5">
              Platform keeps 20% · You receive 80% per enrolment
            </p>
          </div>

          <div>
            <label htmlFor="discounted-price" className="label">Discounted price (optional)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-400">$</span>
              <input
                id="discounted-price"
                type="number" min="0" step="0.01" placeholder="29.99"
                value={data.discountedPrice}
                onChange={(e) => onChange('discountedPrice', e.target.value)}
                className="input pl-7"
              />
            </div>
            <p className="text-xs text-ink-400 mt-1">Leave blank for no discount</p>
          </div>
        </>
      )}

      {data.pricingType === 'free' && (
        <div className="card p-4 bg-leaf-50 border-leaf-100">
          <p className="text-sm text-leaf-700 font-medium">✓ This course will be free to enrol</p>
          <p className="text-xs text-leaf-500 mt-0.5">
            Free courses are a great way to grow your student base.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Step 5 — Review & Publish ───────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-b border-ink-50 last:border-0">
      <span className="text-sm text-ink-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-ink-800 flex-1">{value || <span className="text-ink-300 italic">Not set</span>}</span>
    </div>
  );
}

function Step5({
  data, onGoToStep,
}: {
  data: CourseFormData;
  onGoToStep: (n: number) => void;
}) {
  const totalLessons = data.sections.reduce((acc, s) => acc + s.lessons.length, 0);
  return (
    <div className="space-y-5">
      {/* Basics */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink-900">Course basics</h3>
          <button type="button" onClick={() => onGoToStep(1)} className="text-xs text-saffron-600 hover:underline">Edit</button>
        </div>
        <ReviewRow label="Title"    value={data.title} />
        <ReviewRow label="Subtitle" value={data.subtitle} />
        <ReviewRow label="Category" value={data.category} />
        <ReviewRow label="Level"    value={data.level} />
        <ReviewRow label="Language" value={data.language} />
      </div>

      {/* Curriculum */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink-900">Curriculum</h3>
          <button type="button" onClick={() => onGoToStep(2)} className="text-xs text-saffron-600 hover:underline">Edit</button>
        </div>
        <ReviewRow label="Sections" value={`${data.sections.length} section${data.sections.length !== 1 ? 's' : ''}`} />
        <ReviewRow label="Lessons"  value={`${totalLessons} lesson${totalLessons !== 1 ? 's' : ''}`} />
        {data.sections.map((s, i) => (
          <div key={s.id} className="mt-2 pl-4 border-l-2 border-ink-100">
            <p className="text-xs font-medium text-ink-700">{i + 1}. {s.title || `Section ${i + 1}`}</p>
            {s.lessons.map((l, li) => (
              <p key={l.id} className="text-[11px] text-ink-400 mt-0.5 pl-2">
                {li + 1}. {l.title || 'Untitled lesson'} <span className="ml-1 opacity-60">({l.type})</span>
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* Media */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink-900">Media</h3>
          <button type="button" onClick={() => onGoToStep(3)} className="text-xs text-saffron-600 hover:underline">Edit</button>
        </div>
        <ReviewRow
          label="Thumbnail"
          value={data.thumbnailUrl
            ? <img src={data.thumbnailUrl} alt="Thumbnail" className="h-16 rounded-xl object-cover" />
            : 'Not uploaded'}
        />
        <ReviewRow label="Promo video" value={data.promoVideoUrl ? 'Uploaded ✓' : 'Not uploaded'} />
      </div>

      {/* Pricing */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink-900">Pricing</h3>
          <button type="button" onClick={() => onGoToStep(4)} className="text-xs text-saffron-600 hover:underline">Edit</button>
        </div>
        <ReviewRow label="Type"      value={data.pricingType === 'free' ? 'Free' : 'Paid'} />
        {data.pricingType === 'paid' && (
          <>
            <ReviewRow label="Price"      value={data.price ? `$${parseFloat(data.price).toFixed(2)} USDC` : ''} />
            <ReviewRow label="Discounted" value={data.discountedPrice ? `$${parseFloat(data.discountedPrice).toFixed(2)} USDC` : 'None'} />
          </>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-saffron-50 border border-saffron-100">
        <p className="text-sm text-saffron-800 font-medium">
          🎉 Ready to publish?
        </p>
        <p className="text-xs text-saffron-600 mt-1">
          Clicking "Submit for review" will register your course on-chain and send it to the SorobanLard team. Approval usually takes 24–48 hours.
        </p>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

const INITIAL_DATA: CourseFormData = {
  title: '', subtitle: '', category: '', language: 'English', level: 'Beginner',
  sections: [emptySection()],
  thumbnailUrl: '', thumbnailFile: null,
  promoVideoUrl: '', promoVideoFile: null,
  pricingType: 'paid', price: '', discountedPrice: '',
};

type ValidationErrors = Record<string, string>;

export type RegistrationErrorKind =
  | 'user_rejected'
  | 'wallet_unavailable'
  | 'onchain_failure'
  | 'network_error'
  | 'unknown_error';

export interface ClassifiedRegistrationError {
  kind: RegistrationErrorKind;
  title: string;
  message: string;
  recoveryHint: string;
  retryLabel: string;
}

export function classifyRegistrationTxError(err: unknown): ClassifiedRegistrationError {
  const rawMessage =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Something went wrong. Please try again.';
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('decline') ||
    lower.includes('reject') ||
    lower.includes('cancel') ||
    lower.includes('denied') ||
    lower.includes('user refused')
  ) {
    return {
      kind: 'user_rejected',
      title: 'Signature Declined in Freighter',
      message: rawMessage,
      recoveryHint:
        'Your course draft is saved. Re-open Freighter and approve the signature prompt when you are ready.',
      retryLabel: 'Retry Signature',
    };
  }

  if (
    lower.includes('not installed') ||
    lower.includes('freighter') ||
    lower.includes('wallet not connected') ||
    lower.includes('no wallet') ||
    lower.includes('locked')
  ) {
    return {
      kind: 'wallet_unavailable',
      title: 'Freighter Wallet Unavailable',
      message: rawMessage,
      recoveryHint:
        'Ensure your Stellar wallet is connected and unlocked before submitting your course for on-chain registration.',
      retryLabel: 'Retry Registration',
    };
  }

  if (
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('fetch') ||
    lower.includes('rpc') ||
    lower.includes('horizon') ||
    lower.includes('503') ||
    lower.includes('502')
  ) {
    return {
      kind: 'network_error',
      title: 'Stellar Network Connection Error',
      message: rawMessage,
      recoveryHint:
        'Could not reach the Soroban RPC / Horizon endpoint. Your course draft is saved locally — retry in a moment.',
      retryLabel: 'Retry Submission',
    };
  }

  if (
    lower.includes('tx_') ||
    lower.includes('op_') ||
    lower.includes('simulation') ||
    lower.includes('contract') ||
    lower.includes('insufficient') ||
    lower.includes('on-chain') ||
    lower.includes('stellar')
  ) {
    return {
      kind: 'onchain_failure',
      title: 'On-Chain Course Registration Failed',
      message: rawMessage,
      recoveryHint:
        'The Soroban smart contract rejected or failed to simulate the transaction. Verify your XLM balance and wallet account.',
      retryLabel: 'Retry On-Chain Registration',
    };
  }

  return {
    kind: 'unknown_error',
    title: 'Course Registration Failed',
    message: rawMessage,
    recoveryHint:
      'Your course draft has been preserved. You can retry submitting or save your draft to continue later.',
    retryLabel: 'Try Again',
  };
}

function validateStep(step: number, data: CourseFormData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (step === 1) {
    if (!data.title.trim()) errors.title = 'Course title is required.';
    if (!data.category)     errors.category = 'Please select a category.';
  }
  if (step === 4 && data.pricingType === 'paid') {
    if (!data.price || parseFloat(data.price) <= 0) errors.price = 'Enter a valid price.';
  }
  return errors;
}

export default function NewCoursePage() {
  const router  = useRouter();
  const { address } = useAuthStore();

  const [step,    setStep]    = useState(1);
  const [saved,   setSaved]   = useState(0);
  const [data,    setData]    = useState<CourseFormData>(INITIAL_DATA);
  const [errors,  setErrors]  = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [txStep,  setTxStep]  = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ClassifiedRegistrationError | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);

  const courseId = generateCourseId(data.category || 'COURSE');

  const handleChange = useCallback((k: keyof CourseFormData, v: any) => {
    setData((prev) => ({ ...prev, [k]: v }));
  }, []);

  // ── Save draft ────────────────────────────────────────────────
  const saveDraft = async () => {
    setDraftSaving(true);
    try {
      // Persist to localStorage as draft (real save would hit API)
      localStorage.setItem('sorobanlard_course_draft', JSON.stringify({ step, data }));
      setSaved(step);
    } finally {
      setDraftSaving(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────
  const goNext = async () => {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    await saveDraft();
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (n: number) => {
    setErrors({});
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit / Publish ──────────────────────────────────────────
  const handlePublish = async () => {
    if (!address) {
      const classified = classifyRegistrationTxError(
        new Error('Wallet not connected. Please connect your Freighter wallet to register this course.')
      );
      setError(classified.message);
      setErrorDetails(classified);
      return;
    }
    setError(null);
    setErrorDetails(null);
    setLoading(true);

    try {
      setTxStep('Creating course record…');
      const finalPrice = data.pricingType === 'free' ? 0 : parseFloat(data.price || '0');
      const course = await coursesApi.create({
        courseId,
        title:        data.title,
        description:  data.subtitle,
        category:     data.category,
        level:        data.level,
        language:     data.language,
        thumbnailUrl: data.thumbnailUrl || undefined,
        price:        finalPrice,
      });

      // Create sections + lessons
      setTxStep('Saving curriculum…');
      for (let si = 0; si < data.sections.length; si++) {
        const sec = data.sections[si];
        if (!sec.title && sec.lessons.length === 0) continue;
        const module = await lessonsApi.createModule(courseId, sec.title || `Section ${si + 1}`, si + 1);
        for (let li = 0; li < sec.lessons.length; li++) {
          const lesson = sec.lessons[li];
          await lessonsApi.createLesson({
            moduleId: module.id,
            title:    lesson.title || `Lesson ${li + 1}`,
            type:     lesson.type,
            position: li + 1,
            isFree:   lesson.isFree,
          });
        }
      }

      // Submit for review (on-chain step can be done later)
      setTxStep('Submitting for review…');
      await coursesApi.submitForReview(courseId);

      localStorage.removeItem('sorobanlard_course_draft');
      router.push('/dashboard/instructor');
    } catch (err: any) {
      localStorage.setItem('sorobanlard_course_draft', JSON.stringify({ step, data }));
      const classified = classifyRegistrationTxError(err);
      setError(classified.message);
      setErrorDetails(classified);
    } finally {
      setLoading(false);
      setTxStep('');
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard/instructor"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <h1 className="section-heading mb-1">Create a new course</h1>
      <p className="text-sm text-ink-500 mb-6">
        Complete all 5 steps to publish your course on SorobanLard.
      </p>

      {/* Step indicator */}
      <StepIndicator current={step} saved={saved} />

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          data-testid="tx-failure-banner"
          data-error-kind={errorDetails?.kind ?? 'unknown_error'}
          className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-red-900">
              {errorDetails?.title ?? 'Course Registration Failed'}
            </p>
            <p className="text-sm text-red-700">{error}</p>
            {errorDetails?.recoveryHint && (
              <p className="text-xs text-red-600">{errorDetails.recoveryHint}</p>
            )}
            {step === 5 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
                >
                  {errorDetails?.retryLabel ?? 'Try Again'}
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setErrorDetails(null);
            }}
            aria-label="Dismiss error"
            className="ml-auto text-red-400 hover:text-red-600 self-start"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step content */}
      <div className="card p-6 mb-5">
        <h2 className="text-base font-semibold text-ink-900 mb-5 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-saffron-100 text-saffron-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
            {step}
          </span>
          {STEPS[step - 1].label}
        </h2>

        {step === 1 && <Step1 data={data} onChange={handleChange} errors={errors} />}
        {step === 2 && <Step2 data={data} onChange={handleChange} />}
        {step === 3 && <Step3 data={data} onChange={handleChange} />}
        {step === 4 && <Step4 data={data} onChange={handleChange} errors={errors} />}
        {step === 5 && <Step5 data={data} onGoToStep={goToStep} />}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button type="button" onClick={goPrev} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <button
          type="button"
          onClick={saveDraft}
          disabled={draftSaving}
          className="btn-secondary"
        >
          {draftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Save draft
        </button>

        <div className="flex-1" />

        {step < 5 ? (
          <button type="button" onClick={goNext} className="btn-primary">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{txStep || 'Processing…'}</>
              : <><Check className="w-4 h-4" /> Submit for review</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
