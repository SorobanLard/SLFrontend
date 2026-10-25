import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Course } from '@/types';

export interface CartItem {
  courseId: string;
  course: Course;
  addedAt: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (course: Course) => void;
  /** Adds every course not already in the cart; returns how many were added. */
  addItems: (courses: Course[]) => number;
  removeItem: (courseId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

const STORAGE_KEY = 'sorobanlard_cart';

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (course: Course) => {
        set((state) => {
          const exists = state.items.find((item) => item.courseId === course.id);
          if (exists) return state;

          return {
            items: [
              ...state.items,
              {
                courseId: course.id,
                course,
                addedAt: new Date().toISOString(),
              },
            ],
          };
        });
      },

      addItems: (courses: Course[]) => {
        const inCart = new Set(get().items.map((item) => item.courseId));
        const addedAt = new Date().toISOString();
        const added: CartItem[] = [];

        courses.forEach((course) => {
          if (inCart.has(course.id)) return;
          inCart.add(course.id);
          added.push({ courseId: course.id, course, addedAt });
        });

        if (added.length > 0) {
          set((state) => ({ items: [...state.items, ...added] }));
        }
        return added.length;
      },

      removeItem: (courseId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.courseId !== courseId),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.course.price, 0);
      },

      getItemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: STORAGE_KEY,
      // createJSONStorage swallows the ReferenceError on the server, so persistence
      // simply stays inert until the store reaches the browser.
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/**
 * True once the persisted cart has been read back from localStorage.
 *
 * Server-rendered markup can never know what is in localStorage, so anything
 * driven by the cart must render its empty state first and fill in after
 * hydration — otherwise React discards the mismatched client render.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    // Hydration is synchronous for localStorage, so it has usually already
    // finished by the time this effect runs and the subscription above missed it.
    if (useCartStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  return hydrated;
}
