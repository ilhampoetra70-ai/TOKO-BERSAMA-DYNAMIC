import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';

interface LoginPulseProps {
  className?: string;
}

type AbstractTone = 'amber' | 'coral' | 'jade' | 'sky' | 'ink';
type AbstractVariant = 'diamond' | 'orb' | 'bar' | 'spark';

function AbstractCluster({
  x,
  y,
  rotate = 0,
  scale = 1,
  parallaxX = 0,
  parallaxY = 0,
  motionClassName = '',
  motionStyle,
  children,
}: {
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  parallaxX?: number;
  parallaxY?: number;
  motionClassName?: string;
  motionStyle?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <g
      className="auth-ornament-abstract-parallax"
      style={
        {
          ['--auth-parallax-x' as string]: `${parallaxX}`,
          ['--auth-parallax-y' as string]: `${parallaxY}`,
        } as CSSProperties
      }
    >
      <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
        <g className={motionClassName} style={motionStyle}>
          {children}
        </g>
      </g>
    </g>
  );
}

function AbstractGlyph({
  tone,
  variant,
}: {
  tone: AbstractTone;
  variant: AbstractVariant;
}) {
  const className = `auth-ornament-abstract-glyph auth-ornament-abstract-glyph-${variant}`;
  return (
    <g className={className} style={{ color: `var(--auth-ornament-${tone})` }}>
      {variant === 'diamond' ? (
        <>
          <path d="M60 12L108 60L60 108L12 60Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2.2" />
          <path d="M60 28L92 60L60 92L28 60Z" fill="none" stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.5" />
          <path d="M60 12V108M12 60H108" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.15" />
        </>
      ) : variant === 'orb' ? (
        <>
          <circle cx="60" cy="60" r="42" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeOpacity="0.78" strokeWidth="2.2" />
          <circle cx="60" cy="60" r="22" fill="none" stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.45" />
          <circle cx="60" cy="60" r="7" fill="currentColor" fillOpacity="0.9" />
          <path d="M60 18V102M18 60H102" fill="none" stroke="currentColor" strokeOpacity="0.24" strokeWidth="1.1" />
        </>
      ) : variant === 'bar' ? (
        <>
          <rect x="18" y="34" width="84" height="52" rx="22" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeOpacity="0.78" strokeWidth="2.15" />
          <path d="M32 60H88M60 34V86" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.35" />
          <circle cx="60" cy="60" r="10" fill="currentColor" fillOpacity="0.76" />
        </>
      ) : (
        <>
          <path d="M60 8L74 46L112 60L74 74L60 112L46 74L8 60L46 46Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2.15" />
          <path d="M60 24L84 60L60 96L36 60Z" fill="none" stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.35" />
          <circle cx="60" cy="60" r="6" fill="currentColor" fillOpacity="0.92" />
        </>
      )}
    </g>
  );
}

function AbstractBlob({
  tone,
  motionClassName,
  motionStyle,
}: {
  tone: AbstractTone;
  motionClassName: string;
  motionStyle?: CSSProperties;
}) {
  return (
    <g className={motionClassName} style={{ color: `var(--auth-ornament-${tone})`, ...motionStyle }}>
      <ellipse cx="0" cy="0" rx="178" ry="128" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeOpacity="0.62" strokeWidth="2.2" />
      <ellipse cx="0" cy="0" rx="112" ry="80" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.45" />
      <circle cx="-24" cy="-12" r="9" fill="currentColor" fillOpacity="0.72" />
      <circle cx="34" cy="18" r="6" fill="currentColor" fillOpacity="0.62" />
    </g>
  );
}

export function LoginPulse({ className = '' }: LoginPulseProps) {
  const rawId = useId().replace(/:/g, '');
  const fieldId = `${rawId}-field`;
  const ringId = `${rawId}-ring`;
  const waveId = `${rawId}-wave`;
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = shellRef.current;
    if (!root || typeof window === 'undefined') {
      return;
    }

    let frame = 0;
    let latestX = window.innerWidth * 0.5;
    let latestY = window.innerHeight * 0.42;
    let latestActive = 0;

    const writePointerVars = () => {
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      const offsetX = latestX - width / 2;
      const offsetY = latestY - height / 2;
      const normalizedX = offsetX / (width / 2);
      const normalizedY = offsetY / (height / 2);
      const maxShiftX = Math.min(width * 0.055, 88);
      const maxShiftY = Math.min(height * 0.045, 68);
      const shiftX = normalizedX * maxShiftX;
      const shiftY = normalizedY * maxShiftY;
      const distance = Math.min(1, Math.hypot(normalizedX, normalizedY) / Math.SQRT2);
      const focus = latestActive ? 1 - distance : 0.34;

      root.style.setProperty('--auth-pointer-dx', `${shiftX.toFixed(2)}px`);
      root.style.setProperty('--auth-pointer-dy', `${shiftY.toFixed(2)}px`);
      root.style.setProperty('--auth-pointer-focus', focus.toFixed(3));
      frame = 0;
    };

    const scheduleWrite = (clientX: number, clientY: number, active: number) => {
      latestX = clientX;
      latestY = clientY;
      latestActive = active;
      if (frame === 0) {
        frame = window.requestAnimationFrame(writePointerVars);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      scheduleWrite(event.clientX, event.clientY, 1);
    };

    const handleResize = () => {
      scheduleWrite(latestX, latestY, latestActive);
    };

    const handleBlur = () => {
      scheduleWrite(window.innerWidth * 0.5, window.innerHeight * 0.42, 0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', handleBlur);
    writePointerVars();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  const glyphPlacements = [
    { x: 224, y: 260, rotate: -20, scale: 1.08, parallaxX: -0.12, parallaxY: -0.08, tone: 'amber' as const, variant: 'diamond' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-slow' },
    { x: 438, y: 186, rotate: 18, scale: 0.9, parallaxX: -0.07, parallaxY: -0.12, tone: 'sky' as const, variant: 'bar' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-alt' },
    { x: 682, y: 164, rotate: 8, scale: 0.98, parallaxX: 0.01, parallaxY: -0.14, tone: 'jade' as const, variant: 'orb' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-medium' },
    { x: 934, y: 236, rotate: 26, scale: 1.0, parallaxX: 0.12, parallaxY: -0.08, tone: 'coral' as const, variant: 'spark' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-reverse' },
    { x: 1050, y: 510, rotate: -8, scale: 1.06, parallaxX: 0.14, parallaxY: 0.02, tone: 'amber' as const, variant: 'bar' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-slow' },
    { x: 980, y: 840, rotate: 18, scale: 0.92, parallaxX: 0.12, parallaxY: 0.12, tone: 'jade' as const, variant: 'diamond' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-alt' },
    { x: 724, y: 1018, rotate: -12, scale: 1.02, parallaxX: 0.0, parallaxY: 0.16, tone: 'sky' as const, variant: 'orb' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-medium' },
    { x: 434, y: 1002, rotate: -24, scale: 0.94, parallaxX: -0.12, parallaxY: 0.12, tone: 'coral' as const, variant: 'spark' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-reverse' },
    { x: 170, y: 676, rotate: 14, scale: 0.88, parallaxX: -0.15, parallaxY: 0.05, tone: 'ink' as const, variant: 'orb' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-alt' },
    { x: 208, y: 424, rotate: -30, scale: 0.84, parallaxX: -0.14, parallaxY: -0.02, tone: 'amber' as const, variant: 'bar' as const, motionClassName: 'auth-ornament-abstract-glyph-motion auth-ornament-abstract-glyph-motion-slow' },
  ];

  return (
    <div ref={shellRef} className={`auth-ornament-backdrop ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 1280 1280" className="auth-ornament-svg" role="presentation" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={fieldId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.72" />
            <stop offset="42%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="74%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={waveId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.74" />
            <stop offset="48%" stopColor="white" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="35%" stopColor="currentColor" stopOpacity="0.96" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        <g className="auth-ornament-abstract-field">
          <g className="auth-ornament-abstract-field-motion">
            <ellipse cx="640" cy="636" rx="418" ry="288" fill={`url(#${fieldId})`} />
            <ellipse cx="640" cy="636" rx="270" ry="184" fill={`url(#${waveId})`} fillOpacity="0.4" />
          </g>
        </g>

        <g className="auth-ornament-abstract-wave">
          <g className="auth-ornament-abstract-wave-motion">
            <path
              d="M92 444C260 314 402 300 548 420C676 524 818 548 1002 420C1102 350 1182 332 1214 344"
              fill="none"
              stroke={`url(#${ringId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4.5"
              strokeDasharray="44 24"
            />
            <path
              d="M68 844C230 728 392 708 548 814C682 906 846 914 1014 804C1124 730 1188 694 1234 688"
              fill="none"
              stroke={`url(#${ringId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.4"
              strokeDasharray="18 22"
            />
          </g>
        </g>

        <g className="auth-ornament-abstract-core">
          <g className="auth-ornament-abstract-core-motion">
            <circle cx="640" cy="640" r="332" fill="none" stroke={`url(#${ringId})`} strokeWidth="4.2" strokeDasharray="38 20" className="auth-ornament-abstract-core-ring auth-ornament-abstract-core-ring-primary" />
            <circle cx="640" cy="640" r="254" fill="none" stroke={`url(#${ringId})`} strokeWidth="2.6" strokeDasharray="14 22" className="auth-ornament-abstract-core-ring auth-ornament-abstract-core-ring-secondary" />
            <ellipse cx="640" cy="640" rx="268" ry="180" fill={`url(#${fieldId})`} className="auth-ornament-abstract-core-halo" />
            <path d="M640 456L764 640L640 824L516 640Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeOpacity="0.84" strokeWidth="2.3" className="auth-ornament-abstract-core-diamond" />
            <path d="M640 492L724 640L640 788L556 640Z" fill="none" stroke="currentColor" strokeOpacity="0.36" strokeWidth="1.5" className="auth-ornament-abstract-core-echo" />
            <circle cx="640" cy="640" r="30" fill="currentColor" fillOpacity="0.92" className="auth-ornament-abstract-core-spark" />
          </g>
        </g>

        <g className="auth-ornament-abstract-satellites">
          {glyphPlacements.map((placement) => (
            <AbstractCluster
              key={`${placement.x}-${placement.y}-${placement.variant}`}
              x={placement.x}
              y={placement.y}
              rotate={placement.rotate}
              scale={placement.scale}
              parallaxX={placement.parallaxX}
              parallaxY={placement.parallaxY}
              motionClassName={placement.motionClassName}
              motionStyle={{ animationDuration: placement.variant === 'diamond' ? '11s' : placement.variant === 'orb' ? '7.2s' : placement.variant === 'bar' ? '8.6s' : '10.2s' }}
            >
              <AbstractGlyph tone={placement.tone} variant={placement.variant} />
            </AbstractCluster>
          ))}
        </g>

        <g className="auth-ornament-abstract-corners">
          <AbstractCluster
            x={236}
            y={248}
            parallaxX={-0.12}
            parallaxY={-0.1}
            motionClassName="auth-ornament-abstract-blob-motion auth-ornament-abstract-blob-motion-alt"
          >
            <AbstractBlob tone="sky" motionClassName="auth-ornament-abstract-blob-motion-inner" />
          </AbstractCluster>
          <AbstractCluster
            x={1046}
            y={262}
            parallaxX={0.11}
            parallaxY={-0.08}
            motionClassName="auth-ornament-abstract-blob-motion auth-ornament-abstract-blob-motion-slow"
          >
            <AbstractBlob tone="coral" motionClassName="auth-ornament-abstract-blob-motion-inner" />
          </AbstractCluster>
          <AbstractCluster
            x={222}
            y={1020}
            parallaxX={-0.1}
            parallaxY={0.11}
            motionClassName="auth-ornament-abstract-blob-motion auth-ornament-abstract-blob-motion-slow"
          >
            <AbstractBlob tone="jade" motionClassName="auth-ornament-abstract-blob-motion-inner" />
          </AbstractCluster>
          <AbstractCluster
            x={1032}
            y={1006}
            parallaxX={0.12}
            parallaxY={0.1}
            motionClassName="auth-ornament-abstract-blob-motion auth-ornament-abstract-blob-motion-alt"
          >
            <AbstractBlob tone="amber" motionClassName="auth-ornament-abstract-blob-motion-inner" />
          </AbstractCluster>
        </g>
      </svg>
    </div>
  );
}
