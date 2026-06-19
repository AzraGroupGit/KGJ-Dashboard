"use client";

import { useEffect, useState, useRef } from "react";
import { Bookmark, Trash2 } from "lucide-react";

interface Preset {
  name: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  activeTab: string;
  bnFilter: string;
}

const STORAGE_KEY = "monitoring-filter-presets";
const MAX_PRESETS = 5;

export function FilterPresets({
  searchQuery,
  setSearchQuery,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  activeTab,
  setActiveTab,
  bnFilter,
  setBnFilter,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  activeTab: string;
  setActiveTab: (v: string) => void;
  bnFilter: string;
  setBnFilter: (v: string) => void;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPresets(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const persist = (updated: Preset[]) => {
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const savePreset = () => {
    const name = newName.trim();
    if (!name) return;
    const preset: Preset = {
      name,
      searchQuery,
      dateFrom,
      dateTo,
      activeTab,
      bnFilter,
    };
    const updated = [...presets, preset].slice(-MAX_PRESETS);
    persist(updated);
    setNewName("");
  };

  const applyPreset = (preset: Preset) => {
    setSearchQuery(preset.searchQuery);
    setDateFrom(preset.dateFrom);
    setDateTo(preset.dateTo);
    setActiveTab(preset.activeTab);
    setBnFilter(preset.bnFilter);
    setIsOpen(false);
  };

  const deletePreset = (index: number) => {
    persist(presets.filter((_, i) => i !== index));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
      >
        <Bookmark className="h-3.5 w-3.5" />
        Simpan Filter
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex gap-1.5 border-b border-slate-100 p-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") savePreset();
              }}
              placeholder="Nama preset..."
              className="flex-1 min-w-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
            />
            <button
              onClick={savePreset}
              disabled={!newName.trim()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              Simpan
            </button>
          </div>

          {presets.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">
              Belum ada preset tersimpan
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {presets.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-slate-50 px-3 py-2 last:border-0 hover:bg-slate-50"
                >
                  <button
                    onClick={() => applyPreset(p)}
                    className="flex-1 text-left text-xs font-medium text-slate-700 truncate"
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => deletePreset(i)}
                    className="ml-2 shrink-0 rounded p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
