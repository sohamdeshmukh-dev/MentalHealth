"use client";

import { useCallback, useRef, useState } from "react";

interface ImageUploaderProps {
  imagePreview: string | null;
  onImageSelect: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export default function ImageUploader({
  imagePreview,
  onImageSelect,
  disabled,
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) return; // 5MB limit

      const reader = new FileReader();
      reader.onload = (e) => {
        onImageSelect(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (imagePreview) {
    return (
      <div className="relative group">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-40 w-full object-cover"
          />
        </div>
        <button
          type="button"
          onClick={() => onImageSelect(null)}
          disabled={disabled}
          className="absolute right-2 top-2 rounded-xl border border-white/10 bg-slate-900/80 p-1.5 text-slate-400 backdrop-blur-sm transition-all hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
        isDragOver
          ? "border-teal-500/50 bg-teal-500/[0.06]"
          : "border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.03]"
      } ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl bg-white/[0.04] p-2.5">
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </div>
        <p className="text-xs text-slate-400">
          <span className="font-medium text-slate-300">Upload photo</span> or
          drag & drop
        </p>
        <p className="text-[10px] text-slate-500">PNG, JPG up to 5MB</p>
      </div>
    </div>
  );
}
