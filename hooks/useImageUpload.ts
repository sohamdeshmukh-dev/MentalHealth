"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function createFilePath(userId: string, fileName: string) {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${userId}/${timestamp}-${suffix}-${sanitizeFileName(fileName)}`;
}

export function useImageUpload() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const selectFile = useCallback((incomingFile: File | null) => {
    if (!incomingFile) {
      setFile(null);
      setUploadError(null);
      return;
    }

    if (!incomingFile.type.startsWith("image/")) {
      setUploadError("Only image files are supported.");
      return;
    }

    if (incomingFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("Image is too large. Maximum size is 8MB.");
      return;
    }

    setFile(incomingFile);
    setUploadError(null);
  }, []);

  const clearImage = useCallback(() => {
    setFile(null);
    setUploadError(null);
  }, []);

  const uploadImage = useCallback(async () => {
    if (!file) {
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user?.id) {
        throw new Error("Please log in before uploading an image.");
      }

      const path = createFilePath(user.id, file.name);
      const { error: uploadErr } = await supabase.storage
        .from("journal-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { data } = supabase.storage.from("journal-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      setUploadError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [file, supabase]);

  return {
    file,
    previewUrl,
    isUploading,
    uploadError,
    selectFile,
    clearImage,
    uploadImage,
  };
}
