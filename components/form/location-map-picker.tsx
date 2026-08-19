"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  toLatLngLiteral,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useController, type Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAutocompleteSuggestions } from "@/lib/google-maps/use-autocomplete-suggestions";
import type { EventInput } from "@/lib/validation/event";

// No stored user geolocation to default to — center on Brazil until the
// user searches, clicks, or (when editing) already has a saved point.
const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 };

type LatLng = { lat: number; lng: number };

// Centers the map on the browser's geolocation once it resolves, but only
// for a fresh pick (`skip` when the dialog opened with an already-saved
// point) — GPS should set the starting view, not override a choice that's
// already been made.
function CenterOnUserLocation({ skip }: { skip: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (skip || !map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.panTo({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        map.setZoom(14);
      },
      () => {
        // Denied/unavailable — keep the Brazil-wide fallback view.
      },
      { timeout: 5000 },
    );
  }, [map, skip]);

  return null;
}

// Everything here must render *inside* <APIProvider> — useMapsLibrary reads
// APIProviderContext, which isn't visible from an ancestor of the provider
// (that bug shipped once already: the search/geocoding hooks lived in
// LocationMapPicker, the component that renders <APIProvider> itself, so
// useMapsLibrary("places") silently returned null forever with no error).
function LocationPickerMap({
  query,
  onQueryChange,
  pendingPosition,
  setPendingPosition,
  setPendingAddress,
  hasSavedPosition,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  pendingPosition: LatLng | null;
  setPendingPosition: (position: LatLng) => void;
  setPendingAddress: (address: string) => void;
  hasSavedPosition: boolean;
}) {
  const map = useMap();
  const { suggestions, resetSession } = useAutocompleteSuggestions(query);
  const geocodingLib = useMapsLibrary("geocoding");
  const placesLib = useMapsLibrary("places");
  const geocoder = useMemo(
    () => (geocodingLib ? new geocodingLib.Geocoder() : null),
    [geocodingLib],
  );

  const reverseGeocode = useCallback(
    async (position: LatLng) => {
      setPendingPosition(position);

      // Plain reverse geocoding only ever returns a street address — raw
      // coordinates have no name. Prefer a named place (business/venue)
      // right at the pin when one exists, falling back to the address.
      if (placesLib) {
        try {
          const { places } = await placesLib.Place.searchNearby({
            locationRestriction: { center: position, radius: 50 },
            fields: ["displayName"],
            rankPreference: "DISTANCE",
            maxResultCount: 1,
          });
          if (places[0]?.displayName) {
            setPendingAddress(places[0].displayName);
            return;
          }
        } catch {
          // Fall through to plain reverse geocoding below.
        }
      }

      if (!geocoder) return;
      geocoder.geocode({ location: position }).then((res) => {
        const address = res.results[0]?.formatted_address;
        if (address) setPendingAddress(address);
      });
    },
    [geocoder, placesLib, setPendingPosition, setPendingAddress],
  );

  function handleMapClick(event: MapMouseEvent) {
    if (!event.detail.latLng) return;
    reverseGeocode(event.detail.latLng);
  }

  function handleMarkerDragEnd(event: google.maps.MapMouseEvent) {
    if (!event.latLng) return;
    reverseGeocode(toLatLngLiteral(event.latLng));
  }

  async function handleSuggestionSelect(
    suggestion: google.maps.places.AutocompleteSuggestion | null,
  ) {
    if (!suggestion?.placePrediction) return;
    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({ fields: ["location", "formattedAddress"] });

    if (place.location) {
      const position = toLatLngLiteral(place.location);
      setPendingPosition(position);
      setPendingAddress(
        place.formattedAddress ?? suggestion.placePrediction.text.text,
      );
      // Only for search results — the picked place can be anywhere on the
      // map, unlike a click/drag, which is already within view by
      // definition and shouldn't jerk the camera around while fine-tuning.
      map?.panTo(position);
      map?.setZoom(16);
    }
    onQueryChange("");
    resetSession();
  }

  return (
    <>
      <Combobox<google.maps.places.AutocompleteSuggestion>
        items={suggestions}
        filter={null}
        inputValue={query}
        onInputValueChange={onQueryChange}
        itemToStringLabel={(s) => s.placePrediction?.text.text ?? ""}
        itemToStringValue={(s) => s.placePrediction?.text.text ?? ""}
        onValueChange={handleSuggestionSelect}
      >
        <ComboboxInputGroup className="w-full">
          <ComboboxInput placeholder="Buscar endereço" />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>Nenhum endereço encontrado.</ComboboxEmpty>
          <ComboboxList>
            {(suggestion: google.maps.places.AutocompleteSuggestion) => (
              <ComboboxItem
                key={suggestion.placePrediction?.placeId}
                value={suggestion}
              >
                {suggestion.placePrediction?.text.text}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Map
        className="mt-3 h-80 w-full rounded-lg"
        defaultCenter={pendingPosition ?? BRAZIL_CENTER}
        defaultZoom={pendingPosition ? 15 : 4}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
        onClick={handleMapClick}
      >
        <CenterOnUserLocation skip={hasSavedPosition} />
        {pendingPosition && (
          <AdvancedMarker
            position={pendingPosition}
            draggable
            onDragEnd={handleMarkerDragEnd}
          />
        )}
      </Map>
    </>
  );
}

export function LocationMapPicker({
  control,
}: {
  control: Control<EventInput>;
}) {
  const { field: locationField } = useController({
    name: "location",
    control,
  });
  const { field: latField } = useController({ name: "latitude", control });
  const { field: lngField } = useController({ name: "longitude", control });

  const [open, setOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<LatLng | null>(null);
  const [hasSavedPosition, setHasSavedPosition] = useState(false);
  const [pendingAddress, setPendingAddress] = useState("");
  const [query, setQuery] = useState("");

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reopening (e.g. editing an event that already has coordinates)
      // seeds the pin from the form's current values instead of blank.
      const seeded =
        latField.value != null && lngField.value != null
          ? { lat: latField.value, lng: lngField.value }
          : null;
      setPendingPosition(seeded);
      setHasSavedPosition(seeded != null);
      setPendingAddress(locationField.value ?? "");
      setQuery("");
    }
    setOpen(next);
  }

  function handleConfirm() {
    if (!pendingPosition) return;
    locationField.onChange(pendingAddress);
    latField.onChange(pendingPosition.lat);
    lngField.onChange(pendingPosition.lng);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Selecionar local no mapa"
          />
        }
      >
        <MapPin />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar local no mapa</DialogTitle>
          <DialogDescription>
            Busque um endereço ou clique/arraste o pino para ajustar.
          </DialogDescription>
        </DialogHeader>

        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <LocationPickerMap
            query={query}
            onQueryChange={setQuery}
            pendingPosition={pendingPosition}
            setPendingPosition={setPendingPosition}
            setPendingAddress={setPendingAddress}
            hasSavedPosition={hasSavedPosition}
          />
        </APIProvider>

        {pendingAddress && (
          <p className="text-sm text-muted-foreground">{pendingAddress}</p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button
            type="button"
            disabled={!pendingPosition}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
