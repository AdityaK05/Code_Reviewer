import { MotionProps } from 'framer-motion';

export const spring = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

export const fadeIn: MotionProps = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: spring,
};

export const rotate3d = (axis: 'x' | 'y' | 'z', degree: number): MotionProps => ({
  whileHover: {
    rotateX: axis === 'x' ? degree : 0,
    rotateY: axis === 'y' ? degree : 0,
    rotateZ: axis === 'z' ? degree : 0,
  },
  whileTap: { scale: 0.95 },
  transition: spring,
});

export const perspectiveStyle = {
  perspective: '1200px',
  transformStyle: 'preserve-3d',
} as const;
