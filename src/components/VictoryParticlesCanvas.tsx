import React, { useEffect, useRef } from 'react';

interface VictoryParticlesCanvasProps {
  isActive: boolean;
}

type ParticleKind = 'confetti' | 'star' | 'spark';

interface CelebrationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  rotation: number;
  vRot: number;
  wobblePhase: number;
  wobbleSpeed: number;
  kind: ParticleKind;
}

interface BurstRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

const VICTORY_PALETTE = [
  '#F59E0B', // Amber Gold
  '#FDE047', // Bright Gold
  '#06B6D4', // Cyan
  '#67E8F9', // Ice Cyan
  '#10B981', // Emerald
  '#EC4899', // Cyber Pink
  '#A855F7', // Violet
  '#FFFFFF', // Starlight White
];

export const VictoryParticlesCanvas: React.FC<VictoryParticlesCanvasProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: CelebrationParticle[] = [];
    const rings: BurstRing[] = [];
    const MAX_PARTICLES = 240;

    const pickColor = () =>
      VICTORY_PALETTE[Math.floor(Math.random() * VICTORY_PALETTE.length)];

    const spawnRadialBurst = (cx: number, cy: number, count: number) => {
      rings.push({
        x: cx,
        y: cy,
        radius: 8,
        maxRadius: 95 + Math.random() * 55,
        color: pickColor(),
        alpha: 0.75,
      });

      for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const speed = 2.8 + Math.random() * 6.2;
        const roll = Math.random();
        const kind: ParticleKind = roll < 0.42 ? 'confetti' : roll < 0.75 ? 'star' : 'spark';
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: kind === 'confetti' ? 5 + Math.random() * 4.5 : kind === 'star' ? 4.5 + Math.random() * 4 : 2.5 + Math.random() * 2,
          color: pickColor(),
          alpha: 1,
          life: 0,
          maxLife: 70 + Math.random() * 50,
          gravity: kind === 'confetti' ? 0.095 : 0.065,
          drag: kind === 'confetti' ? 0.975 : 0.982,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.24,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.08 + Math.random() * 0.1,
          kind,
        });
      }
    };

    const spawnCannonSpray = (fromLeft: boolean, count: number) => {
      const originX = fromLeft ? width * 0.06 : width * 0.94;
      const originY = height * 0.88;
      const baseAngle = fromLeft ? -Math.PI * 0.34 : -Math.PI * 0.66;

      for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        const spread = (Math.random() - 0.5) * 0.55;
        const angle = baseAngle + spread;
        const speed = 7.5 + Math.random() * 7.5;
        const roll = Math.random();
        const kind: ParticleKind = roll < 0.6 ? 'confetti' : roll < 0.86 ? 'star' : 'spark';
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: kind === 'confetti' ? 5.5 + Math.random() * 4.5 : 4 + Math.random() * 3.5,
          color: pickColor(),
          alpha: 1,
          life: 0,
          maxLife: 95 + Math.random() * 55,
          gravity: 0.14,
          drag: 0.985,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.28,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.1 + Math.random() * 0.1,
          kind,
        });
      }
    };

    // Grand opening bursts
    spawnCannonSpray(true, 38);
    spawnCannonSpray(false, 38);
    spawnRadialBurst(width * 0.5, height * 0.34, 34);

    let lastTime = performance.now();
    let burstTimer = 0.75;
    let totalElapsed = 0;

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      totalElapsed += dt;
      burstTimer -= dt;

      // Gentle ongoing celebratory bursts while screen is active (tapers gently after 4.5s)
      if (burstTimer <= 0 && totalElapsed < 6.0) {
        burstTimer = 0.7 + Math.random() * 0.55;
        const bx = width * (0.18 + Math.random() * 0.64);
        const by = height * (0.16 + Math.random() * 0.36);
        spawnRadialBurst(bx, by, 18);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Update & draw shockwave rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.radius += (ring.maxRadius - ring.radius) * 0.12;
        ring.alpha -= 0.025;
        if (ring.alpha <= 0.02) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ring.alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Update & draw celebration particles
      const stepScale = dt * 60;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += stepScale;
        if (p.life >= p.maxLife || p.y > height + 40) {
          particles.splice(i, 1);
          continue;
        }

        const dragFactor = Math.pow(p.drag, stepScale);
        p.vx *= dragFactor;
        p.vy *= dragFactor;
        p.vy += p.gravity * stepScale;
        p.wobblePhase += p.wobbleSpeed * stepScale;
        p.x += p.vx * stepScale + (p.kind === 'confetti' ? Math.sin(p.wobblePhase) * 0.45 : 0);
        p.y += p.vy * stepScale;
        p.rotation += p.vRot * stepScale;

        const lifeRatio = p.life / p.maxLife;
        p.alpha = lifeRatio > 0.72 ? Math.max(0, 1 - (lifeRatio - 0.72) / 0.28) : 1;

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.kind === 'confetti') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          const tiltScale = Math.cos(p.wobblePhase);
          ctx.scale(1, Math.max(0.22, Math.abs(tiltScale)));
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        } else if (p.kind === 'star') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          const spikes = 4;
          const outerR = p.size;
          const innerR = p.size * 0.42;
          for (let s = 0; s < spikes * 2; s++) {
            const rad = s % 2 === 0 ? outerR : innerR;
            const ang = (s * Math.PI) / spikes;
            const sx = Math.cos(ang) * rad;
            const sy = Math.sin(ang) * rad;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.5, p.size * 0.65);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[60] w-full h-full pointer-events-none"
    />
  );
};
