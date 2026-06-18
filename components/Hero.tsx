"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const rotatingWords = ["Premium", "Simple", "Clean", "Professional"];

function ArrowTopRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
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

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingWords.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        {/* Available for work — plain, no background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="flex items-center gap-2.5 mb-8"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-[#141414]/45 tracking-widest uppercase">
            Available for work
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="font-black tracking-tight leading-[0.92]" style={{ fontSize: "clamp(3.5rem, 10vw, 8.5rem)" }}>
          <span className="block text-[#141414]">Website that feels</span>
          <span className="block mt-3">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block bg-[#141414] text-white px-5 py-1 rounded-xl"
              >
                {rotatingWords[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg font-medium text-[#141414]/45 max-w-sm leading-relaxed mt-10 mb-16"
        >
          We design and develop high-end websites that convert visitors into clients — built fast, built right.
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })}
          className="flex items-center gap-3 bg-[#141414] text-white font-bold text-base px-12 py-5 rounded-full cursor-pointer hover:bg-[#141414]/82 transition-colors active:scale-[0.97]"
        >
          Get Started
          <motion.span
            animate={hovered ? { x: 2, y: -2 } : { x: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowTopRight />
          </motion.span>
        </motion.button>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-[10px] font-bold tracking-[0.22em] text-[#141414]/30 uppercase">
          Scroll
        </span>
        <div className="w-px h-10 overflow-hidden relative">
          <div className="absolute inset-0 bg-[#141414]/12" />
          <motion.div
            className="absolute left-0 w-full bg-[#141414]/50 rounded-full"
            animate={{ top: ["-100%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
            style={{ height: "50%" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
