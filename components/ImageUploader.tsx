"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import Button from "@/components/Button";

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  uploadError: string | null;
  onSelectFile: (file: File | null) => void;
}

export default function ImageUploader({
  file,
  previewUrl,
  isUploading,
  uploadError,
  onSelectFile,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleIncomingFiles(files: FileList | null) {
    const nextFile = files?.[0] ?? null;
    onSelectFile(nextFile);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleIncomingFiles(event.target.files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleIncomingFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 backdrop-blur-sm">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">Add Context (Optional)</p>
        <p className="text-sm font-medium text-[var(--foreground)]">📷 Upload Photo</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
          isDragging
            ? "border-teal-400 bg-teal-500/10 shadow-[0_0_26px_rgba(45,212,191,0.25)]"
            : "border-[var(--border-soft)] bg-[var(--surface-2)]"
        }`}
      >
        <p className="text-sm text-[var(--foreground)]">Drag & drop image here</p>
        <p className="mt-1 text-xs text-[var(--subtle-text)]">or click to upload</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-xl px-3 py-2 text-xs"
        >
          Choose image
        </Button>

        {file ? <p className="mt-3 text-xs text-[var(--muted-text)]">Selected: {file.name}</p> : null}
      </div>

      {isUploading ? <p className="text-xs text-teal-300">Uploading image...</p> : null}
      {uploadError ? <p className="text-xs text-red-300">{uploadError}</p> : null}

      {previewUrl ? (
        <div className="animate-[fade-in_260ms_ease-out] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4">
          <p className="mb-3 text-xs text-[var(--muted-text)]">📷 Uploaded Image Preview</p>
          <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)]">
            <img src={previewUrl} alt="Mood entry preview" className="h-40 w-full object-cover" />
          </div>
          <Button
            variant="ghost"
            onClick={() => onSelectFile(null)}
            className="mt-3 rounded-xl px-3 py-2 text-xs"
          >
            Remove image
          </Button>
        </div>
      ) : null}
    </div>
  );
}
