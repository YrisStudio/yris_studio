"use client";

import { motion } from "framer-motion";

const features: {
  label: string;
  basic: string | boolean;
  premium: string | boolean;
  max: string | boolean;
}[] = [
  { label: "Number of pages",  	basic: "5",  premium: "10", max: "Unlimited" },
  { label: "Design customize", 	basic: true, premium: true,  max: true },
  { label: "Mobile Reponsive", 	basic: true, premium: true,  max: true },
  { label: "SEO",              	basic: true, premium: true,  max: true },
  { label: "3 month follow-up", basic: true, premium: true, max: true },
  { label: "Backend",       	basic: false, premium: true, max: true },
  { label: "Advanced animation",basic: false, premium: true, max: true },
  { label: "User system",       basic: false, premium: false, max: true },
  { label: "Admin Dashboard",   basic: false, premium: false, max: true },
  
];

function Check({ dark }: { dark?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M4 9.5L7.5 13L14 6"
        stroke={dark ? "white" : "#141414"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dash({ dark }: { dark?: boolean }) {
  return (
    <span style={{ color: dark ? "rgba(255,255,255,0.2)" : "rgba(20,20,20,0.2)", fontSize: 18 }}>
      —
    </span>
  );
}

function CellValue({ val, dark }: { val: string | boolean; dark?: boolean }) {
  if (val === true)  return <Check dark={dark} />;
  if (val === false) return <Dash dark={dark} />;
  return (
    <span
      className="font-semibold text-sm"
      style={{ color: dark ? "white" : "#141414" }}
    >
      {val}
    </span>
  );
}

export default function Pricing() {
  const handleGetStarted = () => {
    window.location.href = "mailto:hello@yrisstudio.com?subject=Get Started";
  };

  return (
    <section id="pricing" className="py-28 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#141414]/35 uppercase block mb-4">
            Pricing
          </span>
          <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)" }}>
            Simple,{" "}
            <em className="not-italic italic bg-[#141414] text-white px-3 py-0.5 rounded-xl">
              transparent
            </em>{" "}
            pricing.
          </h2>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2rem] overflow-hidden"
          style={{ border: "1.5px solid #e8e8e8" }}
        >
          {/* ── Plan headers ── */}
          <div className="grid grid-cols-4">
            {/* Empty cell */}
            <div className="p-7" style={{ borderBottom: "1.5px solid #e8e8e8" }} />

            {/* Basic */}
            <div
              className="p-7"
              style={{ borderBottom: "1.5px solid #e8e8e8", borderLeft: "1.5px solid #e8e8e8" }}
            >
              <p className="text-sm font-semibold text-[#141414]/40 mb-2">Basic</p>
              <div className="flex items-end gap-1">
                <span className="text-[2rem] font-black text-[#141414] leading-none">$79.99</span>
                <span className="text-xs font-medium text-[#141414]/35 mb-1">/project</span>
              </div>
            </div>

            {/* Premium */}
            <div className="p-7 bg-[#141414]" style={{ borderBottom: "1.5px solid rgba(255,255,255,0.08)" }}>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-white bg-white/14 px-3 py-1.5 rounded-full mb-3">
                ★ Most Popular
              </span>
              <p className="text-sm font-semibold text-white/50 mb-2">Premium</p>
              <div className="flex items-end gap-1">
                <span className="text-[2rem] font-black text-white leading-none">$129.99</span>
                <span className="text-xs font-medium text-white/35 mb-1">/project</span>
              </div>
            </div>

            {/* Max */}
            <div
              className="p-7"
              style={{ borderBottom: "1.5px solid #e8e8e8", borderLeft: "1.5px solid #e8e8e8" }}
            >
              <p className="text-sm font-semibold text-[#141414]/40 mb-2">Max</p>
              <div className="flex items-end gap-1">
                <span className="text-[2rem] font-black text-[#141414] leading-none">$249.99</span>
                <span className="text-xs font-medium text-[#141414]/35 mb-1">/project</span>
              </div>
            </div>
          </div>

          {/* ── Feature rows ── */}
          {features.map((feat, i) => {
            const isLast = i === features.length - 1;
            const rowBorder = isLast ? undefined : "1.5px solid #e8e8e8";
            return (
              <div key={feat.label} className="grid grid-cols-4">
                <div className="px-7 py-5 flex items-center" style={{ borderBottom: rowBorder }}>
                  <span className="text-sm font-medium text-[#141414]/50">{feat.label}</span>
                </div>

                <div
                  className="px-7 py-5 flex items-center justify-center"
                  style={{ borderBottom: rowBorder, borderLeft: "1.5px solid #e8e8e8" }}
                >
                  <CellValue val={feat.basic} />
                </div>

                <div
                  className="px-7 py-5 bg-[#141414] flex items-center justify-center"
                  style={{ borderBottom: isLast ? undefined : "1.5px solid rgba(255,255,255,0.07)" }}
                >
                  <CellValue val={feat.premium} dark />
                </div>

                <div
                  className="px-7 py-5 flex items-center justify-center"
                  style={{ borderBottom: rowBorder, borderLeft: "1.5px solid #e8e8e8" }}
                >
                  <CellValue val={feat.max} />
                </div>
              </div>
            );
          })}

          {/* ── CTA row ── */}
          <div className="grid grid-cols-4" style={{ borderTop: "1.5px solid #e8e8e8" }}>
            <div className="px-7 py-6" />

            {/* Basic */}
            <div
              className="px-7 py-6 flex items-center justify-center"
              style={{ borderLeft: "1.5px solid #e8e8e8" }}
            >
              <button
                onClick={handleGetStarted}
                className="text-sm font-semibold px-6 py-3 rounded-full cursor-pointer transition-colors duration-200 hover:bg-[#141414]/5"
                style={{ border: "1.5px solid #d8d8d8", color: "#141414", background: "white" }}
              >
                Get started
              </button>
            </div>

            {/* Premium */}
            <div className="px-7 py-6 bg-[#141414] flex items-center justify-center">
              <button
                onClick={handleGetStarted}
                className="text-sm font-semibold px-6 py-3 rounded-full bg-white text-[#141414] cursor-pointer transition-colors duration-200 hover:bg-white/88"
              >
                Get started
              </button>
            </div>

            {/* Max */}
            <div
              className="px-7 py-6 flex items-center justify-center"
              style={{ borderLeft: "1.5px solid #e8e8e8" }}
            >
              <button
                onClick={handleGetStarted}
                className="text-sm font-semibold px-6 py-3 rounded-full cursor-pointer transition-colors duration-200 hover:bg-[#141414]/5"
                style={{ border: "1.5px solid #d8d8d8", color: "#141414", background: "white" }}
              >
                Get started
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
