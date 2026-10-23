import Image from "next/image";
import Link from "next/link";

export default function Logo({ invert = false }: { invert?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Yris Studio, accueil">
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        className={`rounded-lg ${invert ? "invert" : ""}`}
        priority
      />
      <span className="text-base font-medium tracking-tight">yris studio</span>
    </Link>
  );
}
