"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/(site)/boutique/actions";

export default function FavoriteButton({ slug, initial, name }: { slug: string; initial: boolean; name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [favorite, setFavorite] = useOptimistic(initial);

  function onClick() {
    startTransition(async () => {
      setFavorite(!favorite);
      const res = await toggleFavorite(slug, !favorite);
      if (!res.ok && res.needLogin) {
        router.push(`/connexion?raison=favoris&next=${encodeURIComponent(pathname)}`);
      } else if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={favorite ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
      className="grid size-9 place-items-center rounded-full border border-line bg-panel-2/90 backdrop-blur transition-all hover:scale-110 hover:border-accent active:scale-95"
    >
      <Heart
        size={16}
        className={`transition-all duration-300 ${favorite ? "scale-110 fill-accent text-accent" : "text-muted"}`}
        aria-hidden
      />
    </button>
  );
}
