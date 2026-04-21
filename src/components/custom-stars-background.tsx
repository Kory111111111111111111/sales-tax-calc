'use client';

import * as React from 'react';
import {
  type HTMLMotionProps,
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
  type Transition,
} from 'motion/react';

import { cn } from '@/lib/utils';

type StarLayerProps = HTMLMotionProps<'div'> & {
  count: number;
  size: number;
  transition: Transition;
  starColor: string;
};

function generateStars(count: number, starColor: string) {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 8000) - 4000;
    const y = Math.floor(Math.random() * 6000) - 3000;
    shadows.push(`${x}px ${y}px ${starColor}`);
  }
  return shadows.join(', ');
}

function CustomStarLayer({
  count = 1000,
  size = 1,
  transition = { repeat: Infinity, duration: 50, ease: 'linear' },
  starColor = '#fff',
  className,
  ...props
}: StarLayerProps) {
  const [boxShadow, setBoxShadow] = React.useState<string>('');

  React.useEffect(() => {
    setBoxShadow(generateStars(count, starColor));
  }, [count, starColor]);

  return (
    <motion.div
      data-slot="custom-star-layer"
      animate={{ y: [0, -2000] }}
      transition={transition}
      className={cn('absolute top-0 left-0 w-full h-[2000px]', className)}
      {...props}
    >
      <div
        className="absolute bg-transparent rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow: boxShadow,
        }}
      />
      <div
        className="absolute bg-transparent rounded-full top-[2000px]"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow: boxShadow,
        }}
      />
    </motion.div>
  );
}

export interface StarLayerConfig {
  count: number;
  size: number;
  speedMultiplier: number;
}

type CustomStarsBackgroundProps = React.ComponentProps<'div'> & {
  factor?: number;
  speed?: number;
  transition?: SpringOptions;
  starColor?: string;
  pointerEvents?: boolean;
  starLayers?: StarLayerConfig[];
};

function CustomStarsBackground({
  children,
  className,
  factor = 0.05,
  speed = 50,
  transition = { stiffness: 50, damping: 20 },
  starColor = '#fff',
  pointerEvents = true,
  starLayers = [
    { count: 2000, size: 0.5, speedMultiplier: 0.8 },
    { count: 1500, size: 1, speedMultiplier: 1 },
    { count: 800, size: 1.5, speedMultiplier: 1.5 },
    { count: 400, size: 2, speedMultiplier: 2 },
    { count: 200, size: 3, speedMultiplier: 3 },
    { count: 100, size: 4, speedMultiplier: 4 },
  ],
  ...props
}: CustomStarsBackgroundProps) {
  const offsetX = useMotionValue(1);
  const offsetY = useMotionValue(1);
  const frameRef = React.useRef<number | null>(null);
  const pointerRef = React.useRef({ x: 0, y: 0 });
  const [enableParallax, setEnableParallax] = React.useState(false);

  const springX = useSpring(offsetX, transition);
  const springY = useSpring(offsetY, transition);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerQuery = window.matchMedia('(pointer: fine)');

    const updateParallaxState = () => {
      setEnableParallax(!reducedMotionQuery.matches && finePointerQuery.matches);
    };

    updateParallaxState();
    reducedMotionQuery.addEventListener?.('change', updateParallaxState);
    finePointerQuery.addEventListener?.('change', updateParallaxState);

    return () => {
      reducedMotionQuery.removeEventListener?.('change', updateParallaxState);
      finePointerQuery.removeEventListener?.('change', updateParallaxState);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!enableParallax) {
        return;
      }

      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const { x, y } = pointerRef.current;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        offsetX.set(-(x - centerX) * factor);
        offsetY.set(-(y - centerY) * factor);
      });
    },
    [enableParallax, factor, offsetX, offsetY],
  );

  return (
    <div
      data-slot="custom-stars-background"
      className={cn(
        'relative size-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]',
        className,
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        style={{ x: springX, y: springY }}
        className={cn({ 'pointer-events-none': !pointerEvents })}
      >
        {starLayers.map((layer, index) => (
          <CustomStarLayer
            key={index}
            count={layer.count}
            size={layer.size}
            transition={{
              repeat: Infinity,
              duration: speed * layer.speedMultiplier,
              ease: 'linear',
            }}
            starColor={starColor}
          />
        ))}
      </motion.div>
      {children}
    </div>
  );
}

export {
  CustomStarLayer,
  CustomStarsBackground,
  type StarLayerProps,
  type CustomStarsBackgroundProps,
};