'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import LottiePlayer from '../../components/LottiePlayer';

function isLottieMedia(src?: string) {
  return !!src && src.toLowerCase().endsWith('.json');
}

export function ContentBlock({
  title,
  body,
  media,
}: {
  title: string;
  body: string;
  media?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const showLottie = useMemo(() => isLottieMedia(media), [media]);

  return (
    <article className="space-y-4 text-[rgb(var(--text-secondary))] dark:text-slate-200">
      <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">{title}</h3>
      {media && !imageError ? (
        showLottie ? (
          <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] dark:border-white/10 bg-[rgb(var(--surface-elevated))] dark:bg-black/60">
            <LottiePlayer src={media} loop={false} className="w-full" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] dark:border-white/10 bg-[rgb(var(--surface-elevated))] dark:bg-black/60">
            <Image
              src={media}
              alt=""
              width={960}
              height={540}
              className="h-auto w-full object-contain"
              unoptimized
              priority
              onError={() => setImageError(true)}
            />
          </div>
        )
      ) : null}
      {imageError ? (
        <div className="rounded-xl border border-yellow-400/60 bg-yellow-100 dark:bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-100">
          Visual asset missing. Let the course maintainer know so it can be replaced.
        </div>
      ) : null}
      <p className="leading-relaxed whitespace-pre-line text-[rgb(var(--text-secondary))] dark:text-slate-200">{body}</p>
    </article>
  );
}
