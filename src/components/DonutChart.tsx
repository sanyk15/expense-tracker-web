import { useState } from 'react';
import { formatMoney } from '../lib/dates';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  icon?: string;
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} млн`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} тыс.`;
  return `${Math.round(value)}`;
}

export default function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = 60;
  const cy = 60;
  const r = 50;
  const baseSw = 16;
  const selSw = 26;
  const C = 2 * Math.PI * r;
  let acc = 0;

  const arcs = segments.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const len = frac * C;
    const start = acc;
    acc += len;
    const mid = -Math.PI / 2 + ((start + len / 2) / C) * 2 * Math.PI;
    return {
      ...s,
      frac,
      dash: `${len} ${C}`,
      offset: -start,
      x: cx + r * Math.cos(mid),
      y: cy + r * Math.sin(mid),
    };
  });

  const sel = selected !== null ? arcs[selected] : null;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut">
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={baseSw} style={{ stroke: 'var(--border)' }} />
        {arcs.map((a, i) => (
          <circle
            key={a.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={selected === i ? selSw : baseSw}
            strokeDasharray={a.dash}
            strokeDashoffset={a.offset}
            transform="rotate(-90 60 60)"
            opacity={selected === null || selected === i ? 1 : 0.28}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{ cursor: 'pointer' }}
          />
        ))}
        {arcs.map((a) =>
          a.icon && a.frac >= 0.06 ? (
            <text
              key={`icon-${a.label}`}
              x={a.x}
              y={a.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              pointerEvents="none"
            >
              {a.icon}
            </text>
          ) : null,
        )}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="donut-center">
          {sel ? `${Math.round(sel.frac * 100)}%` : compact(total)}
        </text>
      </svg>
      <div className="donut-info">
        {sel
          ? `${sel.icon ?? ''} ${sel.label} — ${formatMoney(sel.value)} (${Math.round(sel.frac * 100)}%)`
          : 'Коснись сектора, чтобы увидеть категорию'}
      </div>
    </div>
  );
}
