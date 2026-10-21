import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { rotate3d } from '../animations';

export const AnimatedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  const { children, ...rest } = props;
  return (
    <motion.svg
      {...rotate3d('z', 10)}
      whileTap={{ scale: 0.9 }}
      className={props.className}
      {...rest}
    >
      {children}
    </motion.svg>
  );
};
