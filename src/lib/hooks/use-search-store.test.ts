import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PRICE_RANGE,
  DURATION_BUCKETS,
  MAX_RECENT_SEARCHES,
  durationToBucket,
  useSearchStore,
  type SearchSnapshot,
} from './use-search-store';

const defaultSearch = {
  query: '',
  sortBy: 'relevance' as const,
  selectedCategories: [],
  selectedLevels: [],
  selectedDurations: [],
  priceRange: DEFAULT_PRICE_RANGE,
  minRating: 0,
  recentSearches: [],
  savedSearches: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  useSearchStore.setState(defaultSearch);
});

describe('durationToBucket', () => {
  it('classifies duration boundaries in minutes', () => {
    expect(durationToBucket(0)).toBe('short');
    expect(durationToBucket(179)).toBe('short');
    expect(durationToBucket(180)).toBe('medium');
    expect(durationToBucket(600)).toBe('medium');
    expect(durationToBucket(601)).toBe('long');
    expect(DURATION_BUCKETS.map((bucket) => bucket.value))
      .toEqual(['short', 'medium', 'long']);
  });
});

describe('useSearchStore', () => {
  it('starts with the expected empty search and filter defaults', () => {
    const { result } = renderHook(() => useSearchStore());
    expect(result.current).toMatchObject(defaultSearch);
    expect(result.current.activeFilterCount()).toBe(0);
  });

  it('updates the query, sort, price range and minimum rating', () => {
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.setQuery('Design');
      result.current.setSortBy('price-low');
      result.current.setPriceRange({ min: 10, max: 100 });
      result.current.setMinRating(4);
    });

    expect(result.current).toMatchObject({
      query: 'Design',
      sortBy: 'price-low',
      priceRange: { min: 10, max: 100 },
      minRating: 4,
    });
    expect(result.current.activeFilterCount()).toBe(2);
  });

  it('toggles categories, levels and duration buckets without duplicates', () => {
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.toggleCategory('Fashion');
      result.current.toggleCategory('Photography');
      result.current.toggleLevel('Beginner');
      result.current.toggleDuration('medium');
    });
    expect(result.current.selectedCategories).toEqual(['Fashion', 'Photography']);
    expect(result.current.selectedLevels).toEqual(['Beginner']);
    expect(result.current.selectedDurations).toEqual(['medium']);
    expect(result.current.activeFilterCount()).toBe(4);

    act(() => {
      result.current.toggleCategory('Fashion');
      result.current.toggleLevel('Beginner');
      result.current.toggleDuration('medium');
    });
    expect(result.current.selectedCategories).toEqual(['Photography']);
    expect(result.current.selectedLevels).toEqual([]);
    expect(result.current.selectedDurations).toEqual([]);
    expect(result.current.activeFilterCount()).toBe(1);
  });

  it('clears active filters but preserves saved and recent searches', () => {
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.setQuery('Sewing');
      result.current.toggleCategory('Fashion');
      result.current.setSortBy('newest');
      result.current.addRecentSearch();
      result.current.saveSearch('My search');
      result.current.clearFilters();
    });
    expect(result.current).toMatchObject({
      query: '',
      sortBy: 'relevance',
      selectedCategories: [],
      selectedLevels: [],
      selectedDurations: [],
      priceRange: { min: 0, max: null },
      minRating: 0,
    });
    expect(result.current.activeFilterCount()).toBe(0);
    expect(result.current.recentSearches).toHaveLength(1);
    expect(result.current.savedSearches).toHaveLength(1);
  });

  it('does not record empty or whitespace-only searches', () => {
    const store = useSearchStore.getState();
    store.setQuery('   ');
    store.addRecentSearch();
    store.saveSearch();
    expect(useSearchStore.getState().recentSearches).toEqual([]);
    expect(useSearchStore.getState().savedSearches).toEqual([]);
  });

  it('records filter-only searches and removes exact recent duplicates', () => {
    const store = useSearchStore.getState();
    store.toggleCategory('Fashion');
    store.addRecentSearch();
    store.addRecentSearch();
    expect(useSearchStore.getState().recentSearches).toHaveLength(1);
    expect(useSearchStore.getState().recentSearches[0].selectedCategories)
      .toEqual(['Fashion']);

    store.setQuery('Sewing');
    store.addRecentSearch();
    expect(useSearchStore.getState().recentSearches.map((item) => item.query))
      .toEqual(['Sewing', '']);
  });

  it('caps recent history to five searches and can clear it', () => {
    const store = useSearchStore.getState();
    for (let index = 0; index < MAX_RECENT_SEARCHES + 2; index++) {
      store.setQuery(`query-${index}`);
      store.addRecentSearch();
    }
    expect(useSearchStore.getState().recentSearches).toHaveLength(MAX_RECENT_SEARCHES);
    expect(useSearchStore.getState().recentSearches.map((item) => item.query))
      .toEqual(['query-6', 'query-5', 'query-4', 'query-3', 'query-2']);

    store.clearHistory();
    expect(useSearchStore.getState().recentSearches).toEqual([]);
  });

  it('saves named searches and safely removes known or unknown IDs', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const store = useSearchStore.getState();
    store.setQuery('Pottery');
    store.saveSearch('  Weekend courses  ');
    store.saveSearch();

    const saved = useSearchStore.getState().savedSearches;
    expect(saved).toHaveLength(2);
    expect(saved[0].name).toBe('Pottery');
    expect(saved[1].name).toBe('Weekend courses');
    expect(saved[1].timestamp).toBe(1_700_000_000_000);

    store.removeSavedSearch('not-found');
    expect(useSearchStore.getState().savedSearches).toHaveLength(2);
    store.removeSavedSearch(saved[1].id);
    expect(useSearchStore.getState().savedSearches).toHaveLength(1);
    expect(useSearchStore.getState().savedSearches[0].id).toBe(saved[0].id);
  });

  it('applies a complete snapshot while leaving history untouched', () => {
    const snap: SearchSnapshot = {
      query: 'Business',
      sortBy: 'rating',
      selectedCategories: ['Business'],
      selectedLevels: ['Advanced'],
      selectedDurations: ['long'],
      priceRange: { min: 25, max: 250 },
      minRating: 4,
    };
    const store = useSearchStore.getState();
    store.setQuery('Before');
    store.addRecentSearch();
    store.applySearch(snap);

    expect(useSearchStore.getState()).toMatchObject(snap);
    expect(useSearchStore.getState().activeFilterCount()).toBe(5);
    expect(useSearchStore.getState().recentSearches).toHaveLength(1);
  });

  it('persists saved and recent searches, not the active query and filters', () => {
    const store = useSearchStore.getState();
    store.setQuery('Writing');
    store.toggleCategory('Language');
    store.addRecentSearch();
    store.saveSearch();

    const raw = localStorage.getItem('search-store');
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(persisted.state).toHaveProperty('recentSearches');
    expect(persisted.state).toHaveProperty('savedSearches');
    expect(persisted.state).not.toHaveProperty('query');
    expect(persisted.state).not.toHaveProperty('selectedCategories');
  });
});
