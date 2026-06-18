"use client";

import { useState } from "react";
import { motion } from "framer-motion";

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.776-8.896L2.25 2.25h7.119l4.256 5.636 5.619-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ArrowTopRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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

export default function Footer() {
  const [formState, setFormState] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <motion.footer
      id="contact"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-t-[2.5rem] overflow-hidden mt-16"
      style={{ background: "#141414" }}
    >
      <div className="px-10 py-20 lg:px-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* Left */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Logo — plain img tag so filter works reliably */}
              <div className="flex items-center gap-3 mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Yris"
                  width={36}
                  height={36}
                  style={{ filter: "brightness(0) invert(1)", borderRadius: 8 }}
                />
                <span className="text-white font-bold text-lg tracking-tight">Yris</span>
              </div>

              <p className="text-white/50 text-lg font-medium leading-relaxed max-w-xs mb-10">
                Turn your vision into a website people actually remember.
              </p>

              <div className="space-y-3">
                <a
                  href="mailto:yrisinc@gmail.com"
                  className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-sm font-medium"
                >
                  hello@yrisstudio.com
                  <ArrowTopRight />
                </a>
                <a
                  href="https://x.com/yris_studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-sm font-medium"
                >
                  <XIcon />
                  @yris_studio
                  <ArrowTopRight />
                </a>
              </div>
            </div>

            <p className="text-white/22 text-xs mt-14">
              © Yris {new Date().getFullYear()}. All rights reserved.
            </p>
          </div>

          {/* Right — contact form */}
          <div>
            <h3 className="text-white text-2xl font-black tracking-tight mb-7">
              Let&apos;s work together.
            </h3>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-start gap-3 py-8"
              >
                <span className="text-3xl">✓</span>
                <p className="text-white text-lg font-bold">Message received!</p>
                <p className="text-white/45 text-sm font-medium">
                  We&apos;ll get back to you within 24 hours.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    className="w-full bg-white/7 rounded-2xl px-4 py-3.5 text-white placeholder-white/28 text-sm font-medium focus:outline-none focus:bg-white/10 transition-colors"
                    style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
                    className="w-full bg-white/7 rounded-2xl px-4 py-3.5 text-white placeholder-white/28 text-sm font-medium focus:outline-none focus:bg-white/10 transition-colors"
                    style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <textarea
                  placeholder="Tell us about your project..."
                  rows={5}
                  required
                  value={formState.message}
                  onChange={(e) => setFormState((s) => ({ ...s, message: e.target.value }))}
                  className="w-full bg-white/7 rounded-2xl px-4 py-3.5 text-white placeholder-white/28 text-sm font-medium focus:outline-none focus:bg-white/10 transition-colors resize-none"
                  style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-white text-[#141414] font-bold text-sm px-7 py-3.5 rounded-full hover:bg-white/88 transition-colors cursor-pointer"
                >
                  Send message
                  <ArrowTopRight />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
