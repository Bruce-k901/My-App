import { IconProps } from '@phosphor-icons/react';
import { ComponentType } from 'react';

interface OpslyIconProps extends IconProps {
  icon: ComponentType<IconProps>;
  fillOpacity?: number;
}

export function OpslyIcon({
  icon: Icon,
  fillOpacity = 0.15,
  ...props
}: OpslyIconProps) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Icon
        weight="fill"
        {...props}
        style={{ position: 'absolute', opacity: fillOpacity }}
      />
      <Icon
        weight="thin"
        {...props}
        style={{ position: 'relative' }}
      />
    </span>
  );
}
