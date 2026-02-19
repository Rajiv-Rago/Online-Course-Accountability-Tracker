'use client';

import { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Trash2 } from 'lucide-react';
import { useAvatarUpload } from '../hooks/use-avatar-upload';

interface Props {
  userId: string | undefined;
  avatarUrl: string | null;
  displayName: string;
  onAvatarChange: (url: string | null) => void;
}

export function AvatarUpload({
  userId,
  avatarUrl,
  displayName,
  onAvatarChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, remove, isUploading, progress, error } =
    useAvatarUpload(userId);

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      onAvatarChange(url);
    } catch {
      // error is tracked in hook
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    try {
      await remove();
      onAvatarChange(null);
    } catch {
      // error tracked in hook
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
        <AvatarFallback className="text-lg">{initials || '?'}</AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={handleRemove}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">Max 2MB. JPG, PNG, or WebP.</p>
        {isUploading && <Progress value={progress} className="h-1 w-40" />}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
