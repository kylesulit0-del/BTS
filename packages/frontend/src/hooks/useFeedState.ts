import { useReducer, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export type SortMode = "recommended" | "newest" | "oldest" | "popular" | "discussed";

export interface FeedState {
  sort: SortMode;
  source: string;
  contentType: string;
}

export type FeedAction =
  | { type: "SET_SORT"; sort: SortMode }
  | { type: "SET_SOURCE"; source: string }
  | { type: "SET_CONTENT_TYPE"; contentType: string }
  | { type: "RESET" };

const VALID_SORTS: SortMode[] = ["recommended", "newest", "oldest", "popular", "discussed"];

const DEFAULT_STATE: FeedState = {
  sort: "recommended",
  source: "all",
  contentType: "all",
};

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "SET_SORT":
      return { ...state, sort: action.sort };
    case "SET_SOURCE":
      return { ...state, source: action.source };
    case "SET_CONTENT_TYPE":
      return { ...state, contentType: action.contentType };
    case "RESET":
      return DEFAULT_STATE;
    default:
      return state;
  }
}

function parseSortParam(value: string | null): SortMode {
  if (value && VALID_SORTS.includes(value as SortMode)) {
    return value as SortMode;
  }
  return "recommended";
}

export function useFeedState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMount = useRef(true);

  const initialState: FeedState = {
    sort: parseSortParam(searchParams.get("sort")),
    source: searchParams.get("source") || "all",
    contentType: searchParams.get("type") || "all",
  };

  const [state, dispatch] = useReducer(feedReducer, initialState);

  // Sync state TO URL params
  useEffect(() => {
    // Skip the initial mount to avoid unnecessary URL update
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (state.sort !== "recommended") params.set("sort", state.sort);
    if (state.source !== "all") params.set("source", state.source);
    if (state.contentType !== "all") params.set("type", state.contentType);

    setSearchParams(params, { replace: true });
  }, [state.sort, state.source, state.contentType, setSearchParams]);

  return [state, dispatch] as const;
}
