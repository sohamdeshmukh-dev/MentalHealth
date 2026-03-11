"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { College, CITIES } from "@/lib/types";
import { ALL_COLLEGES, CollegeEntry } from "@/lib/collegeList";
import CollegeLogo from "./CollegeLogo";

interface CollegePickerProps {
  currentCollege: College | null;
  currentCity: string | null;
  currentMajor: string | null;
  currentGrade: string | null;
  onSave: (collegeId: string | null, city: string, major: string | null, grade: string | null) => Promise<void>;
}

const GRADE_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "PhD",
  "Alumni",
];

export default function CollegePicker({ currentCollege, currentCity, currentMajor, currentGrade, onSave }: CollegePickerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCity, setSelectedCity] = useState(currentCity || CITIES[0].name);
  const [search, setSearch] = useState("");
  const [selectedCollegeName, setSelectedCollegeName] = useState<string | null>(currentCollege?.name ?? null);
  const [major, setMajor] = useState(currentMajor ?? "");
  const [grade, setGrade] = useState(currentGrade ?? "");
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredColleges = useMemo(() => {
    const cityColleges = ALL_COLLEGES.filter((c) => c.city === selectedCity);
    if (!search.trim()) return cityColleges;
    const q = search.toLowerCase();
    return cityColleges.filter((c) => c.name.toLowerCase().includes(q));
  }, [selectedCity, search]);

  useEffect(() => {
    if (isEditing && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!selectedCollegeName) {
        await onSave(null, selectedCity, major || null, grade || null);
      } else {
        const res = await fetch(`/api/colleges?city=${encodeURIComponent(selectedCity)}&q=${encodeURIComponent(selectedCollegeName)}`);
        let collegeId: string | null = null;
        if (res.ok) {
          const data = await res.json();
          const match = (data.colleges ?? []).find(
            (c: { name: string }) => c.name === selectedCollegeName
          );
          collegeId = match?.id ?? null;
        }
        await onSave(collegeId, selectedCity, major || null, grade || null);
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save college:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedCity(currentCity || CITIES[0].name);
    setSelectedCollegeName(currentCollege?.name ?? null);
    setMajor(currentMajor ?? "");
    setGrade(currentGrade ?? "");
    setSearch("");
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <section className="mb-6 app-surface rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Campus Affiliation</h2>
            {currentCollege ? (
              <div className="mt-2 flex items-center gap-3">
                <CollegeLogo collegeName={currentCollege.name} size={40} />
                <div>
                  <p className="text-sm font-medium text-slate-200">{currentCollege.name}</p>
                  <p className="text-xs text-slate-400">{currentCollege.city}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {currentMajor && (
                      <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        {currentMajor}
                      </span>
                    )}
                    {currentGrade && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        {currentGrade}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-[var(--muted-text)]">
                No college selected. Link your university to unlock campus insights.
              </p>
            )}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
          >
            {currentCollege ? "Change" : "Add College"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 app-surface rounded-3xl p-5">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Select Your College</h2>
      <p className="mt-1 text-xs text-[var(--muted-text)]">
        Choose a city, then pick your university.
      </p>

      {/* City selector */}
      <div className="mt-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">City</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CITIES.map((city) => {
            const count = ALL_COLLEGES.filter((c) => c.city === city.name).length;
            return (
              <button
                key={city.name}
                onClick={() => {
                  setSelectedCity(city.name);
                  setSelectedCollegeName(null);
                  setSearch("");
                }}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  selectedCity === city.name
                    ? "bg-indigo-600 text-white shadow"
                    : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200"
                }`}
              >
                {city.name} <span className="ml-0.5 opacity-50">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="mt-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Search University ({filteredColleges.length} available)
        </label>
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type to search..."
          className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/40 focus:outline-none"
        />
      </div>

      {/* College list */}
      <div className="mt-3 max-h-[280px] overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {filteredColleges.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No colleges found{search ? ` matching "${search}"` : ""} in {selectedCity}.
          </div>
        ) : (
          filteredColleges.map((c: CollegeEntry) => (
            <button
              key={`${c.city}-${c.name}`}
              onClick={() => setSelectedCollegeName(c.name)}
              className={`flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-colors last:border-b-0 ${
                selectedCollegeName === c.name
                  ? "bg-cyan-500/15 text-cyan-200"
                  : "text-slate-300 hover:bg-white/[0.04]"
              }`}
            >
              {selectedCollegeName === c.name ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/25 text-sm">
                  ✓
                </div>
              ) : (
                <CollegeLogo collegeName={c.name} size={28} />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-[11px] text-slate-500">{c.city}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* No college option */}
      <button
        onClick={() => setSelectedCollegeName(null)}
        className={`mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
          selectedCollegeName === null
            ? "border border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.04]"
        }`}
      >
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
          selectedCollegeName === null ? "bg-amber-500/25" : "bg-white/[0.06]"
        }`}>
          {selectedCollegeName === null ? "✓" : "—"}
        </div>
        <span className="text-sm font-medium">No college / Remove affiliation</span>
      </button>

      {/* Major & Grade */}
      {selectedCollegeName && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Major</label>
            <input
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="e.g. Computer Science"
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Grade Classification</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {GRADE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(grade === g ? "" : g)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    grade === g
                      ? "bg-emerald-600 text-white shadow"
                      : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
