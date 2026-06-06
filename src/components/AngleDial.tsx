interface AngleDialProps {
  angle: number;
  label: string;
  onChange: (v: number) => void;
}

function normalizeAngle(v: number): number {
  return Math.round(((v % 360) + 360) % 360);
}

export function AngleDial({ angle, label, onChange }: AngleDialProps) {
  const setFromEvent = (el: HTMLElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    onChange(normalizeAngle((Math.atan2(dx, -dy) * 180) / Math.PI));
  };

  const step = (delta: number) => onChange(normalizeAngle(angle + delta));
  const knobX = 50 + Math.sin((angle * Math.PI) / 180) * 36;
  const knobY = 50 - Math.cos((angle * Math.PI) / 180) * 36;

  return (
    <div className="angle-row">
      <button
        type="button"
        className="angle-dial"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            step(e.shiftKey ? -10 : -1);
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            step(e.shiftKey ? 10 : 1);
          }
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromEvent(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromEvent(e.currentTarget, e.clientX, e.clientY);
        }}
      >
        <span className="angle-hand" style={{ transform: `rotate(${angle}deg)` }} />
        <span className="angle-knob" style={{ left: `${knobX}%`, top: `${knobY}%` }} />
      </button>
      <div className="angle-value">
        <span>{label}</span>
        <span className="angle-input-wrap">
          <input
            className="angle-input"
            type="number"
            min={0}
            max={359}
            step={1}
            value={angle}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isNaN(next)) onChange(normalizeAngle(next));
            }}
          />
          <em>°</em>
        </span>
      </div>
    </div>
  );
}
