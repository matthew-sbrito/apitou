import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export type UseAutocompleteSuggestionsReturn = {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  resetSession: () => void;
};

// Adapted from the vis.gl example (google.maps.places.AutocompleteSuggestion
// is the current, non-deprecated replacement for the old Autocomplete
// widget/AutocompleteService — see https://developers.google.com/maps/
// documentation/javascript/place-autocomplete-data).
export function useAutocompleteSuggestions(
  inputString: string,
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary("places");

  // A session groups the suggestion fetches with the eventual place-details
  // fetch for Google's billing purposes — must be reset after a selection.
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!placesLib || inputString === "") return;

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    // Every keystroke fires a new request here with no cancellation — an
    // older, slower request (from an earlier, shorter prefix) can resolve
    // after a newer one and clobber it with stale results. `cancelled`
    // guards against that.
    let cancelled = false;

    // Deferred to the next frame rather than called synchronously in the
    // effect body, per the same rule `use-match-clock.ts` works around.
    const raf = requestAnimationFrame(() => setIsLoading(true));
    AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: inputString,
      sessionToken: sessionTokenRef.current,
    })
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.suggestions);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Most common cause: "Places API (New)" isn't enabled for this key
        // in Google Cloud Console (distinct from the legacy "Places API").
        console.error("Google Places autocomplete failed:", error);
        setSuggestions([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [placesLib, inputString]);

  return {
    // Derived instead of reset via a synchronous setState in the effect
    // above (react-hooks/set-state-in-effect) — empty input has no
    // suggestions by definition.
    suggestions: inputString === "" ? [] : suggestions,
    isLoading,
    resetSession: () => {
      sessionTokenRef.current = null;
      setSuggestions([]);
    },
  };
}
