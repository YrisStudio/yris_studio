"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { label: "Services", href: "#services" },
  { label: "Works", href: "#works" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLink = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl">
      <motion.div
        animate={{
          paddingTop: scrolled ? 14 : 10,
          paddingBottom: scrolled ? 14 : 10,
          paddingLeft: scrolled ? 28 : 20,
          paddingRight: scrolled ? 28 : 20,
        }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-[2rem] overflow-hidden"
        style={{
          background: scrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Main row */}
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Yris" width={28} height={28} className="rounded-md" />
            <span className="font-bold text-[#141414] text-sm tracking-tight">Yris</span>
          </a>

          <nav className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <button
                key={l.href}
                onClick={() => handleLink(l.href)}
                className="text-sm font-medium text-[#141414]/55 hover:text-[#141414] transition-colors cursor-pointer"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => handleLink("#pricing")}
            className="hidden md:flex items-center bg-[#141414] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#141414]/80 transition-colors cursor-pointer"
          >
            Get Started
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            aria-label="Toggle menu"
          >
            <motion.span
              className="block h-0.5 w-5 bg-[#141414] rounded-full origin-center"
              animate={open ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.28 }}
            />
            <motion.span
              className="block h-0.5 w-5 bg-[#141414] rounded-full"
              animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="block h-0.5 w-5 bg-[#141414] rounded-full origin-center"
              animate={open ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.28 }}
            />
          </button>
        </div>

        {/* Mobile menu — expands inside the pill */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden md:hidden"
            >
              <div className="pt-4 pb-1 flex flex-col gap-1">
                {links.map((l, i) => (
                  <motion.button
                    key={l.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 + 0.05 }}
                    onClick={() => handleLink(l.href)}
                    className="text-sm font-medium text-[#141414]/55 hover:text-[#141414] transition-colors text-left py-2 cursor-pointer"
                  >
                    {l.label}
                  </motion.button>
                ))}
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 }}
                  onClick={() => handleLink("#pricing")}
                  className="mt-2 bg-[#141414] text-white text-sm font-semibold px-5 py-3 rounded-full cursor-pointer text-left"
                >
                  Get Started
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
