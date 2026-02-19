'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useAvatarUpload(userId: string | undefined) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string> => {
      setError(null);

      if (!userId) throw new Error('Not authenticated');

      if (!ALLOWED_TYPES.includes(file.type)) {
        const msg = 'Only JPG, PNG, and WebP images are allowed';
        setError(msg);
        throw new Error(msg);
      }

      if (file.size > MAX_SIZE) {
        const msg = 'File size must be under 2MB';
        setError(msg);
        throw new Error(msg);
      }

      setIsUploading(true);
      setProgress(10);

      try {
        const supabase = createClient();
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${Date.now()}.${ext}`;

        setProgress(30);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        setProgress(70);

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(path);

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);

        if (updateError) throw new Error(updateError.message);

        setProgress(100);
        return publicUrl;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setError(msg);
        throw e;
      } finally {
        setIsUploading(false);
      }
    },
    [userId]
  );

  const remove = useCallback(async () => {
    if (!userId) throw new Error('Not authenticated');
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Remove failed';
      setError(msg);
      throw e;
    }
  }, [userId]);

  return { upload, remove, isUploading, progress, error };
}
