// @ts-ignore
import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { fadeIn } from '../animations';

export const AnimatedButton: React.FC<any> = (props) => {
  const { children, ...rest } = props;
  return (
    <motion.button
      {...fadeIn}
      whileTap={{ scale: 0.95 }}
      className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition ${props.className || ''}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
};
