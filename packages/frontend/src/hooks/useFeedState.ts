import { useReducer, useEffect } from "react";

export type SortMode = "recommended" | "newest" | "oldest" | "popular" | "discussed";

export interface FeedState {
  sort: SortMode;
  sources: string[];       // empty = all (no filter)
  members: string[];       // empty = all (replaces useBias)
  contentTypes: string[];  // empty = all
}

export type FeedAction =
  | { type: "SET_SORT"; sort: SortMode }
  | { type: "TOGGLE_SOURCE"; source: string }
  | { type: "TOGGLE_MEMBER"; member: string }
  | { type: "TOGGLE_CONTENT_TYPE"; contentType: string }
  | { type: "CLEAR_ALL_FILTERS" }
  | { type: "RESET" };

const VALID_SORTS: SortMode[] = ["recommended", "newest", "oldest", "popular", "discussed"];

const STORAGE_KEY = "bts-feed-preferences";

export const DEFAULT_STATE: FeedState = {
  sort: "recommended",
  sources: [],
  members: [],
  contentTypes: [],
};

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "SET_SORT":
      return { ...state, sort: action.sort };
    case "TOGGLE_SOURCE":
      return { ...state, sources: toggleInArray(state.sources, action.source) };
    case "TOGGLE_MEMBER":
      return { ...state, members: toggleInArray(state.members, action.member) };
    case "TOGGLE_CONTENT_TYPE":
      return { ...state, contentTypes: toggleInArray(state.contentTypes, action.contentType) };
    case "CLEAR_ALL_FILTERS":
      return { ...state, sources: [], members: [], contentTypes: [] };
    case "RESET":
      return DEFAULT_STATE;
    default:
      return state;
  }
}

function loadFeedState(): FeedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && VALID_SORTS.includes(parsed.sort)) {
        return {
          sort: parsed.sort,
          sources: Array.isArray(parsed.sources) ? parsed.sources : [],
          members: Array.isArray(parsed.members) ? parsed.members : [],
          contentTypes: Array.isArray(parsed.contentTypes) ? parsed.contentTypes : [],
        };
      }
    }
  } catch {
    // Corrupted localStorage -- fall through
  }

  // Migrate from URL params if present (smooth transition from PERF-03)
  try {
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get("sort");
    const sourceParam = params.get("source");
    const typeParam = params.get("type");

    if (sortParam || sourceParam || typeParam) {
      const migrated: FeedState = {
        sort: sortParam && VALID_SORTS.includes(sortParam as SortMode)
          ? (sortParam as SortMode)
          : "recommended",
        sources: sourceParam && sourceParam !== "all" ? [sourceParam] : [],
        members: [],
        contentTypes: typeParam && typeParam !== "all" ? [typeParam] : [],
      };

      // Clear URL params without navigation
      window.history.replaceState({}, "", window.location.pathname);

      return migrated;
    }
  } catch {
    // URL parsing failed -- fall through
  }

  return DEFAULT_STATE;
}

function saveFeedState(state: FeedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

export function useFeedState() {
  const [state, dispatch] = useReducer(feedReducer, undefined, loadFeedState);

  // Persist to localStorage on every state change
  useEffect(() => {
    saveFeedState(state);
  }, [state]);

  return [state, dispatch] as const;
}
