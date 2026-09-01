import { Camera } from "lucide-react";
import type { ChangeEvent } from "react";

import { Avatar } from "../../../shared/ui/avatar";
import { cn } from "../../../shared/ui/cn";

interface ProfileAvatarUploaderProps {
  alt: string;
  className?: string;
  disabled?: boolean;
  fallback: string;
  imageUrl?: string | null;
  onFileSelected: (file: File) => void;
  uploadButtonClassName?: string;
}

export function ProfileAvatarUploader({
  alt,
  className,
  disabled,
  fallback,
  imageUrl,
  onFileSelected,
  uploadButtonClassName,
}: ProfileAvatarUploaderProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      onFileSelected(file);
    }
  }

  return (
    <div className={cn("relative size-11 shrink-0", className)}>
      <Avatar
        alt={alt}
        className="size-full"
        fallback={fallback}
        src={imageUrl}
      />
      <label
        className={cn(
          "absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-hypo-pill border-2 border-hypo-surface bg-hypo-brand text-white shadow-hypo-panel",
          uploadButtonClassName,
          disabled
            ? "cursor-not-allowed opacity-55"
            : "cursor-pointer hover:bg-hypo-brand-strong",
        )}
      >
        <Camera size={13} />
        <span className="sr-only">프로필 사진 업로드</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-label="프로필 사진 업로드"
          className="sr-only"
          disabled={disabled}
          type="file"
          onChange={handleChange}
        />
      </label>
    </div>
  );
}
