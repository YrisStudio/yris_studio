"use client";

import { useState } from "react";
import { CategoryGlyph } from "@/components/Art";
import type { Category } from "@/lib/site";

// Grande photo + miniatures. Sans photo : l'illustration de la catégorie.
export default function Gallery({ photos, name, category }: { photos: string[]; name: string; category: Category }) {
  const [current, setCurrent] = useState(0);
  if (!photos.length) {
    return <CategoryGlyph category={category} className="aspect-square w-full rounded-2xl border border-line" />;
  }
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        {/* eslint-disable-next-line @next/next/no-img-element -- photo Supabase Storage */}
        <img src={photos[current]} alt={name} className="aspect-square w-full object-cover" />
      </div>
      {photos.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {photos.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === current}
                className="block w-full overflow-hidden rounded-lg border border-line opacity-70 transition hover:opacity-100 aria-[current=true]:border-accent aria-[current=true]:opacity-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
