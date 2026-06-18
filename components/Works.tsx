"use client";

import { motion } from "framer-motion";

function ArrowTopRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 13L13 3M13 3H5M13 3V11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const works = [
  {
    name: "Luxe Interiors",
    category: "Interior Design Studio",
    color: "#e8e4dc",
    accent: "#8b7355",
    url: "#",
  },
  {
    name: "Volt Finance",
    category: "Fintech Startup",
    color: "#d4e8d4",
    accent: "#2d5a2d",
    url: "#",
  },
  {
    name: "Nova Agency",
    category: "Creative Agency",
    color: "#dcdce8",
    accent: "#3d3d8b",
    url: "#",
  },
  {
    name: "Bloom Market",
    category: "E-commerce",
    color: "#e8d4d4",
    accent: "#8b2d2d",
    url: "#",
  },
];

function WorkCard({ work, index }: { work: (typeof works)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        delay: (index % 2) * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group cursor-pointer"
    >
      {/* Image area — self-contained with its own overflow-hidden */}
      <div
        className="relative aspect-[4/3] rounded-3xl overflow-hidden"
        style={{ background: work.color }}
      >
        {/* Browser mockup centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-[62%] bg-white/88 rounded-2xl overflow-hidden"
            style={{ marginBottom: "4%" }}
          >
            {/* Chrome bar */}
            <div className="bg-white/55 px-3 py-2 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: work.accent, opacity: 0.55 }} />
              <div className="w-2 h-2 rounded-full" style={{ background: work.accent, opacity: 0.38 }} />
              <div className="w-2 h-2 rounded-full" style={{ background: work.accent, opacity: 0.22 }} />
              <div className="ml-2 flex-1 bg-black/5 rounded px-2 py-0.5 text-[9px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                {work.name.toLowerCase().replace(" ", "")}.com
              </div>
            </div>
            {/* Body */}
            <div className="p-4 space-y-2">
              <div className="h-4 rounded-lg" style={{ background: work.accent, opacity: 0.82 }} />
              <div className="h-2.5 rounded-md bg-black/10 w-4/5" />
              <div className="h-2.5 rounded-md bg-black/6 w-3/5" />
              <div className="mt-3 h-14 rounded-xl" style={{ background: work.accent, opacity: 0.1 }} />
            </div>
          </div>
        </div>

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-[#141414]/0 group-hover:bg-[#141414]/55 transition-all duration-500" />

        {/* "Open website" — bottom-left, slides up on hover */}
        <div className="absolute bottom-4 left-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-350 ease-out">
          <div className="flex items-center gap-2 bg-white text-[#141414] font-semibold text-sm px-4 py-2.5 rounded-full">
            Open website
            <ArrowTopRight />
          </div>
        </div>
      </div>

      {/* Text — outside overflow-hidden, no clipping issues */}
      <div className="pt-4 pb-1">
        <h3 className="font-bold text-[#141414] text-base">{work.name}</h3>
        <p className="text-sm font-medium text-[#141414]/40 mt-0.5">{work.category}</p>
      </div>
    </motion.div>
  );
}

export default function Works() {
  return (
    <section id="works" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#141414]/35 uppercase block mb-4">
            Our Work
          </span>
          <h2 className="font-black tracking-tight leading-tight" style={{ fontSize: "clamp(2.2rem, 4vw, 3.5rem)" }}>
            Projects we&apos;re proud of.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-10">
          {works.map((work, i) => (
            <WorkCard key={work.name} work={work} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
