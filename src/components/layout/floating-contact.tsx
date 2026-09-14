"use client";

import { m, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SPRING } from "@/components/motion/tokens";
import { useMotionPreference } from "@/components/motion/use-motion-preference";

/**
 * Floating WhatsApp / Messenger buttons.
 *
 * Both are driven by `GET /settings` and render ONLY when the admin has
 * configured them — an unconfigured channel shows nothing rather than a
 * dead link.
 *
 * They spring in once the hero is scrolled past, so they never cover the
 * primary CTA on first paint.
 */
export function FloatingContact({
  whatsappNumber,
  messengerPageId,
}: {
  whatsappNumber?: string | null;
  messengerPageId?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const { animate } = useMotionPreference();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whatsapp = whatsappNumber?.replace(/[^\d]/g, "");
  if (!whatsapp && !messengerPageId) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          initial={animate ? { opacity: 0, scale: 0.8, y: 8 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={animate ? { opacity: 0, scale: 0.8, y: 8 } : undefined}
          transition={SPRING}
          className="fixed bottom-5 right-4 z-40 flex flex-col gap-3 sm:bottom-8 sm:right-6"
        >
          {whatsapp ? (
            <ContactButton
              href={`https://wa.me/${whatsapp}`}
              label="Chat with us on WhatsApp"
              className="bg-[#25D366] text-white"
            />
          ) : null}

          {messengerPageId ? (
            <ContactButton
              href={`https://m.me/${messengerPageId}`}
              label="Chat with us on Messenger"
              className="bg-[#0084FF] text-white"
            />
          ) : null}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function ContactButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`grid size-12 place-items-center rounded-full shadow-lift transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95 ${className}`}
    >
      <MessageCircle aria-hidden strokeWidth={1.75} className="size-6" />
    </a>
  );
}
