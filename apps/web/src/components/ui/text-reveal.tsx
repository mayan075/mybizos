"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Animated text that reveals word by word with spring physics.
 * Each word staggers in, creating a cinematic text entrance.
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  as: Component = "h1",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}) {
  const words = text.split(" ");

  return (
    <Component className={cn("flex flex-wrap", className)}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="mr-[0.25em] inline-block"
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: delay + i * 0.04,
          }}
        >
          {word}
        </motion.span>
      ))}
    </Component>
  );
}

/**
 * Gradient text that shimmers — animated background gradient on text.
 */
export function ShimmerText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmerText_3s_ease-in-out_infinite]",
        className,
      )}
    >
      {children}
    </span>
  );
}
