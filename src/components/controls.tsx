// ============================================================
//  可复用控件：滑块 / 分段单选 / 下拉 / 开关 / 文本框 / 折叠区
// ============================================================
import { useState, type ReactNode } from 'react';

export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  warn?: boolean;
}) {
  const { label, value, min, max, step = 1, onChange, suffix, warn } = props;
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className={`field-value ${warn ? 'is-warn' : ''}`}>
        {value}
        {suffix ?? ''}
      </span>
    </div>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {props.options.map((o) => (
        <button key={o.value} className={`seg-btn ${props.value === o.value ? 'is-active' : ''}`} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select className="select-input" value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function LabeledSelect<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="field-row">
      <span className="field-label">{props.label}</span>
      <Select value={props.value} options={props.options} onChange={props.onChange} />
    </div>
  );
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="field-row">
      <span className="field-label">{props.label}</span>
      <button
        role="switch"
        aria-checked={props.checked}
        className={`switch ${props.checked ? 'on' : ''}`}
        onClick={() => props.onChange(!props.checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function TextField(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="field-row">
      <span className="field-label">{props.label}</span>
      <input
        type="text"
        className="text-input"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

export function Collapsible(props: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  return (
    <div className={`collapsible ${open ? 'open' : 'closed'}`}>
      <button className="collapsible-header" onClick={() => setOpen((o) => !o)}>
        <span>{props.title}</span>
        <span className="chev" aria-hidden="true">▾</span>
      </button>
      {open && <div className="collapsible-body">{props.children}</div>}
    </div>
  );
}

export function SectionHead(props: { title: string; actions?: ReactNode }) {
  return (
    <div className="section-head">
      <span className="group-title">{props.title}</span>
      {props.actions && <span className="section-actions">{props.actions}</span>}
    </div>
  );
}

export function GroupTitle({ children }: { children: ReactNode }) {
  return <div className="group-title">{children}</div>;
}

export function HelpText({ children }: { children: ReactNode }) {
  return <div className="help-text">{children}</div>;
}

/**
 * 数字输入框：输入过程中持有本地草稿，可以清空重输、先打负号；
 * 草稿是范围内的合法数字时实时生效，失焦或回车时再按 normalize 收敛提交，Esc 放弃。
 */
export function NumberField(props: {
  value: number;
  min: number;
  max: number;
  step?: number;
  className?: string;
  onChange: (v: number) => void;
  /** 提交前的收敛规则，默认按 [min, max] 夹取 */
  normalize?: (v: number) => number;
}) {
  const { value, min, max, step = 1, className, onChange } = props;
  const normalize = props.normalize ?? ((v: number) => Math.max(min, Math.min(max, v)));
  const [draft, setDraft] = useState<string | null>(null);
  const parse = (text: string): number | null => {
    if (text.trim() === '') return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  };
  const commit = () => {
    if (draft === null) return;
    const n = parse(draft);
    if (n !== null) onChange(normalize(n));
    setDraft(null);
  };
  return (
    <input
      type="number"
      className={className}
      value={draft ?? String(value)}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const n = parse(text);
        if (n !== null && n >= min && n <= max) onChange(normalize(n));
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}

/** 滑块 + 可输入数字（PS 风格）：用于字间距百分比这类既要拖也要精确输入的值 */
export function SliderNum(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const { label, value, min, max, step = 1, onChange, suffix } = props;
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="num-box">
        <NumberField className="num-input" value={value} min={min} max={max} step={step} onChange={onChange} />
        {suffix ? <em>{suffix}</em> : null}
      </span>
    </div>
  );
}

/** 颜色行：原生取色器 + HEX 显示（用于装饰色等单色场景） */
export function ColorInput(props: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="field-row">
      <span className="field-label">{props.label}</span>
      <input
        type="color"
        className="color-input"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <span className="color-hex">{props.value.toUpperCase()}</span>
    </div>
  );
}
