"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, X, Search, MapPin } from "lucide-react";

interface LocationIQSuggestion {
  place_id: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    quarter?: string;
    suburb?: string;
    village?: string;
    hamlet?: string;
    city_district?: string;
    district?: string;
    city?: string;
    town?: string;
    county?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
  };
}

export interface ParsedAddress {
  alamatPengiriman: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodepos: string;
}

function parseLocationIQ(s: LocationIQSuggestion): ParsedAddress {
  const a = s.address;
  const road = a.road || a.pedestrian || "";
  return {
    alamatPengiriman: [a.house_number, road].filter(Boolean).join(" "),
    kelurahan: a.neighbourhood || a.quarter || a.suburb || a.village || a.hamlet || "",
    kecamatan: a.city_district || a.district || "",
    kabupatenKota: a.city || a.town || a.county || a.municipality || "",
    provinsi: a.state || "",
    kodepos: a.postcode || "",
  };
}

const LOCATIONIQ_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;

export default function AddressAutocomplete({
  onSelect,
  accentColor = "#C8A951",
}: {
  onSelect: (parsed: ParsedAddress, displayName: string) => void;
  accentColor?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationIQSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 4) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setIsLoading(true);
      try {
        const url = `https://us1.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&countrycodes=id&addressdetails=1&limit=7&dedupe=1&format=json`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error("LocationIQ error");
        const data: LocationIQSuggestion[] = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (s: LocationIQSuggestion) => {
      const parsed = parseLocationIQ(s);
      setSelected(s.display_name);
      setQuery("");
      setSuggestions([]);
      setIsOpen(false);
      onSelect(parsed, s.display_name);
    },
    [onSelect],
  );

  const handleClear = () => {
    setSelected("");
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-300 rounded-xl p-3">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 flex-1 leading-snug">{selected}</p>
          <button onClick={handleClear} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0 ml-1" title="Cari ulang">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accentColor} transparent transparent transparent` }} />
            ) : (
              <Search className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama jalan, area, atau kota..."
            className="w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm text-gray-800 bg-white placeholder-zinc-400 outline-none transition-colors"
            style={{ borderColor: `${accentColor}60` }}
            onFocus={(e) => { e.target.style.borderColor = accentColor; }}
            onBlur={(e) => { e.target.style.borderColor = `${accentColor}60`; }}
            autoComplete="off"
          />
          {query && (
            <button onClick={() => { setQuery(""); setSuggestions([]); setIsOpen(false); }}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((s) => (
            <button key={s.place_id} type="button" onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-0 transition-colors">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <span className="text-sm text-zinc-700 leading-snug">{s.display_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && suggestions.length === 0 && !isLoading && query.length >= 4 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-xl px-4 py-3 text-sm text-zinc-500">
          Alamat tidak ditemukan. Coba kata kunci yang lebih spesifik.
        </div>
      )}
    </div>
  );
}
