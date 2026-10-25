'use client';

import { memo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Heart, Star, Users } from 'lucide-react';
import {
  cn, courseTotalMins, formatUsdc, levelChip,
} from '@/lib/utils';
import { useIsWishlisted, useWishlistStore } from '@/lib/hooks/use-wishlist-store';
import { useCompareStore } from '@/lib/hooks/use-compare-store';
import { useHoverPrefetch } from '@/lib/hooks/useHoverPrefetch';
import type { Course } from '@/types';

// A 1×1 purple-toned blurred placeholder encoded as a base64 data URL.
// Used as the blur placeholder while the real image loads.
const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAHklEQVQI12NgYGD4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==';

type BadgeVariant = 'bestseller' | 'new' | 'hot';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  bestseller: 'bg-sorobanlard-lilac text-sorobanlard-deep',
  new:        'bg-sorobanlard-lilac text-sorobanlard-deep',
  hot:        'bg-orange-100 text-orange-700',
};

interface Props {
  course: Course;
  href?: string;
  showProgress?: number;
  priority?: boolean;
  freeCta?: boolean;
}

function CourseCardComponent({
  course,
  href,
  showProgress,
  priority = false,
  freeCta = false,
}: Props) {
  const dest = href ?? `/dashboard/courses/${course.id}`;
  const mins = courseTotalMins(course.totalDuration ?? 0);

  // Warm the router cache for the course page once the pointer has rested
  // on the card for 200ms (skipped on touch devices, cancelled on early exit).
  const hoverPrefetch = useHoverPrefetch(dest);

  const isWishlisted  = useIsWishlisted(course.id);
  const toggleWishlistId = useWishlistStore((state) => state.toggle);
  const isComparing = useCompareStore((state) => state.isComparing(course.id));
  const addToCompare = useCompareStore((state) => state.add);
  const removeFromCompare = useCompareStore((state) => state.remove);
  const compareCount = useCompareStore((state) => state.courses.length);
  const [isHovered, setIsHovered]     = useState(false);
  const [showPreview, setShowPreview]  = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const badge        = course.badge as BadgeVariant | undefined;
  const rating       = course.rating != null ? Math.min(5, Math.max(0, course.rating)) : null;
  const reviewCount  = course.reviewCount ?? 0;
  const hasDiscount  = course.originalPrice != null && course.originalPrice > course.price;
  const discountPct  = hasDiscount ? Math.round((1 - course.price / course.originalPrice!) * 100) : 0;

  function handleMouseEnter() {
    setIsHovered(true);
    hoverPrefetch.onMouseEnter();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPreview(true), 200);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setShowPreview(false);
    hoverPrefetch.onMouseLeave();
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }

  function toggleWishlist(e: React.MouseEvent) {
    // The card is wrapped in a Link — stop the click from navigating away.
    e.preventDefault();
    e.stopPropagation();
    toggleWishlistId(course.id);
  }

  function toggleCompare(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (isComparing) {
      removeFromCompare(course.id);
    } else {
      addToCompare(course);
    }
  }

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <Link href={dest} className="group block relative">
      <article
        className={cn(
          'card overflow-hidden transition-all duration-200',
          isHovered && 'shadow-lifted -translate-y-0.5',
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Thumbnail ── */}
        <div className="relative aspect-video bg-gradient-to-br from-saffron-100 to-saffron-200 overflow-hidden">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={`${course.title} course thumbnail`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority={priority}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">
                {course.category === 'Tailoring'       ? '🧵' :
                 course.category === 'Baking'          ? '🍰' :
                 course.category === 'Photography'     ? '📷' :
                 course.category === 'Makeup Artistry' ? '💄' :
                 course.category === 'Hairstyling'     ? '💇' :
                 course.category === 'Nail Technology' ? '💅' : '🎓'}
              </span>
            </div>
          )}

          {/* Badge — top-left */}
          {badge && BADGE_STYLES[badge] && (
            <span className={cn(
              'absolute top-2.5 left-2.5 px-2.5 py-1 text-xs font-semibold rounded-full capitalize',
              BADGE_STYLES[badge],
            )}>
              {badge}
            </span>
          )}

          {/* Level chip (fallback when no badge) */}
          {!badge && (
            <div className="absolute top-2.5 left-2.5">
              <span className={levelChip(course.level)}>{course.level}</span>
            </div>
          )}

          {/* Wishlist heart — top-right */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={isWishlisted}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sorobanlard-primary"
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-400',
              )}
            />
          </button>

          {/* Preview video overlay */}
          {course.previewVideoUrl && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-ink-800 ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="p-4">
          <p className="text-xs text-saffron-600 font-medium mb-1">{course.category}</p>
          <h3 className="text-sm font-semibold text-ink-900 mb-2 line-clamp-2 leading-snug">
            {course.title}
          </h3>
          <p className="text-xs text-ink-500 mb-3 truncate">
            {course.instructor?.name ?? 'SorobanLard Instructor'}
          </p>

          {/* Star rating + review count */}
          {rating !== null && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-3.5 h-3.5',
                      star <= Math.round(rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200',
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-ink-500">
                {rating.toFixed(1)} ({reviewCount})
              </span>
            </div>
          )}

          {/* Duration + students */}
          <div className="flex items-center gap-3 text-xs text-ink-500 mb-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {mins}
            </span>
            {course.studentCount != null && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {course.studentCount.toLocaleString()}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-ink-900">
              {course.price === 0 ? 'Free' : formatUsdc(course.price)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xs text-ink-400 line-through">
                  {formatUsdc(course.originalPrice!)}
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  {discountPct}% off
                </span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

// Memoize so that filter/search state changes in the parent CourseBrowser
// (which re-renders the grid) do not re-render every card. Cards only
// re-render when their own props change; per-card store subscriptions
// (wishlist/compare) still trigger updates for the affected card only.
export const CourseCard = memo(CourseCardComponent);
