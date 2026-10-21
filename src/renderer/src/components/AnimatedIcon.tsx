// @ts-ignore
import React from 'react';

export const AnimatedIcon: React.FC<any> = (props) => {
  const { children, ...rest } = props;
  return (
    <svg {...rest} className={props.className}>
      {children}
    </svg>
  );
};
