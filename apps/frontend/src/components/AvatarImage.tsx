'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AvatarImage({
  hasAvatar,
  className,
  alt = 'Avatar',
}: {
  hasAvatar: boolean;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAvatar) return;
    let objectUrl: string | null = null;
    fetch('/api/auth/me/avatar', { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasAvatar]);

  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }
  return (
    <span className={className}>
      <User className="w-full h-full text-gray-400 p-4" />
    </span>
  );
}
