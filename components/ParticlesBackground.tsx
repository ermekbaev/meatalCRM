"use client";
import { useState, useEffect, useCallback, memo } from "react";
import Particles from "@tsparticles/react";
import { tsParticles } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

export const ParticlesBackground = memo(() => {
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    loadSlim(tsParticles).then(() => setInitDone(true));
  }, []);

  const options = useCallback(() => ({
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: "grab" as const,
        },
      },
      modes: {
        grab: {
          distance: 400,
          links: { opacity: 0.5 },
        },
      },
    },
    particles: {
      color: { value: "#94a3b8" },
      links: {
        color: "#94a3b8",
        distance: 150,
        enable: true,
        opacity: 0.3,
        width: 1,
      },
      move: {
        direction: "none" as const,
        enable: true,
        outModes: { default: "bounce" as const },
        random: false,
        speed: 1.5,
        straight: false,
      },
      number: {
        density: { enable: true },
        value: 150,
      },
      opacity: {
        value: 0.7,
        animation: { enable: true, speed: 3, sync: false },
      },
      shape: { type: "circle" },
      size: {
        value: { min: 1, max: 10 },
        animation: { enable: true, speed: 20, sync: false },
      },
    },
    detectRetina: true,
    background: { color: "transparent" },
  }), []);

  if (!initDone) return null;

  return (
    <div className="absolute inset-0" style={{ zIndex: 1 }}>
      <Particles id="tsparticles" className="w-full h-full" options={options()} />
    </div>
  );
});

ParticlesBackground.displayName = "ParticlesBackground";
