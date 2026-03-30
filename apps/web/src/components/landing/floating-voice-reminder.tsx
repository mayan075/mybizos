'use client';

import { useEffect, useState } from 'react';
import { Microphone } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

export function FloatingVoiceReminder() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById('voice-demo');
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show floating button when the voice widget is NOT visible
        setIsVisible(!entry?.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const scrollToWidget = () => {
    const target = document.getElementById('voice-demo');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToWidget}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-indigo-500/90 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(99,102,241,0.4)] backdrop-blur-sm transition-shadow hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          whileHover={{ y: -2 }}
          aria-label="Try our AI voice agent"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <Microphone className="h-4 w-4" weight="fill" />
          Talk to Our AI
        </motion.button>
      )}
    </AnimatePresence>
  );
}
