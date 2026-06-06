import { useEffect, useId, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { normalizeHex } from '../utils/color';

const COLOR_POPOVER_EVENT = 'dynamic-cover-tool:color-popover-open';

export function ColorPopover(props: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { label, value, fallback, onChange, placeholder } = props;
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const color = normalizeHex(value) || normalizeHex(fallback) || '#ffffff';

  useEffect(() => {
    const closeOthers = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail !== id) setOpen(false);
    };
    window.addEventListener(COLOR_POPOVER_EVENT, closeOthers);
    return () => window.removeEventListener(COLOR_POPOVER_EVENT, closeOthers);
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) window.dispatchEvent(new CustomEvent(COLOR_POPOVER_EVENT, { detail: id }));
      return next;
    });
  };

  return (
    <div className="color-pop-row" ref={rootRef}>
      <span className="field-label">{label}</span>
      <button
        type="button"
        className="color-pop-swatch"
        style={{ background: color }}
        onClick={toggleOpen}
        title="打开色盘"
      />
      <input
        className="text-input mono-input"
        value={value}
        placeholder={placeholder ?? color}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {open && (
        <div className="color-pop-panel">
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
