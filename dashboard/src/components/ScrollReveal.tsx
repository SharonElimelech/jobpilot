"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ponytail: 20-line IntersectionObserver instead of Framer Motion/GSAP — swap in a lib if choreography outgrows this
export default function ScrollReveal() {
  const pathname = usePathname(); // re-scan after client-side navigation
  useEffect(() => {
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      // threshold 0: fraction-based thresholds never fire on panels taller than the viewport
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
