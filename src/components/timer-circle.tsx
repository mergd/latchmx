import Svg, { Circle } from 'react-native-svg';

import { color } from '@/lib/theme';

const SIZE = 18;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TimerCircleProps = {
  progress: number;
};

export function TimerCircle({ progress }: TimerCircleProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke={color.line}
        strokeWidth={STROKE}
        fill="none"
      />
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke={color.accent}
        strokeWidth={STROKE}
        fill="none"
        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
        strokeLinecap="round"
      />
    </Svg>
  );
}
