"use client";

import { useEffect, useRef } from "react";

/**
 * Animated grid with beams of light traversing the lines.
 * Pure canvas for performance — no DOM elements per beam.
 */
export function GridBeams({
  className,
  gridSize = 60,
  beamColor = "rgba(14, 165, 233, 0.15)",
  gridColor = "rgba(255, 255, 255, 0.03)",
  beamCount = 6,
}: {
  className?: string;
  gridSize?: number;
  beamColor?: string;
  gridColor?: string;
  beamCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width: number;
    let height: number;

    interface Beam {
      x: number;
      y: number;
      length: number;
      speed: number;
      horizontal: boolean;
      opacity: number;
    }

    const beams: Beam[] = [];

    function resize() {
      width = canvas!.offsetWidth;
      height = canvas!.offsetHeight;
      canvas!.width = width * window.devicePixelRatio;
      canvas!.height = height * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function initBeams() {
      beams.length = 0;
      for (let i = 0; i < beamCount; i++) {
        beams.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: 80 + Math.random() * 120,
          speed: 0.5 + Math.random() * 1.5,
          horizontal: Math.random() > 0.5,
          opacity: 0.3 + Math.random() * 0.7,
        });
      }
    }

    function drawGrid() {
      ctx!.strokeStyle = gridColor;
      ctx!.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, height);
        ctx!.stroke();
      }
      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(width, y);
        ctx!.stroke();
      }
    }

    function drawBeams() {
      for (const beam of beams) {
        const gradient = beam.horizontal
          ? ctx!.createLinearGradient(beam.x, beam.y, beam.x + beam.length, beam.y)
          : ctx!.createLinearGradient(beam.x, beam.y, beam.x, beam.y + beam.length);

        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, beamColor);
        gradient.addColorStop(1, "transparent");

        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = 2;
        ctx!.globalAlpha = beam.opacity;
        ctx!.beginPath();

        if (beam.horizontal) {
          // Snap to nearest grid line
          const snappedY = Math.round(beam.y / gridSize) * gridSize;
          ctx!.moveTo(beam.x, snappedY);
          ctx!.lineTo(beam.x + beam.length, snappedY);
        } else {
          const snappedX = Math.round(beam.x / gridSize) * gridSize;
          ctx!.moveTo(snappedX, beam.y);
          ctx!.lineTo(snappedX, beam.y + beam.length);
        }
        ctx!.stroke();
        ctx!.globalAlpha = 1;

        // Move beam
        if (beam.horizontal) {
          beam.x += beam.speed;
          if (beam.x > width) {
            beam.x = -beam.length;
            beam.y = Math.random() * height;
          }
        } else {
          beam.y += beam.speed;
          if (beam.y > height) {
            beam.y = -beam.length;
            beam.x = Math.random() * width;
          }
        }
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, width, height);
      drawGrid();
      drawBeams();
      animationId = requestAnimationFrame(animate);
    }

    resize();
    initBeams();
    animate();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [gridSize, beamColor, gridColor, beamCount]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
