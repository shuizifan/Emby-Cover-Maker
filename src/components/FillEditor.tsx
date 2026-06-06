// ============================================================
//  调色工具：纯色 / 渐变（线性·径向），取色面板 + HEX/RGB + 色板
//  + 实时 CSS 代码。背景与文字颜色共用（文字传 allowRadial=false）。
//  模式（纯色/渐变）由父级面板控制，此处不渲染模式开关。
// ============================================================
import { useState } from 'react';
import { HexColorPicker, RgbColorPicker } from 'react-colorful';
import type { FillValue, GradKind } from '../types';
import { fillToCss } from '../render/fill';
import { hexToRgbObj, normalizeHex, rgbObjToHex, rgbText } from '../utils/color';
import { Segmented, Slider } from './controls';

const SWATCHES = [
  '#ffffff', '#f5f1e8', '#0a1638', '#1f2c5a', '#2d0a14', '#5a1f2c',
  '#0a2d1f', '#1f5a3a', '#1a0a2d', '#3a1f5a', '#1a1a1a', '#3a3a3a',
  '#d4af6f', '#5bdaff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8',
];

export function FillEditor(props: {
  value: FillValue;
  onChange: (patch: Partial<FillValue>) => void;
  allowRadial?: boolean;
}) {
  const { value, onChange, allowRadial = true } = props;
  const [inputMode, setInputMode] = useState<'hex' | 'rgb'>('hex');
  const [stop, setStop] = useState<1 | 2>(1);
  const isGradient = value.mode === 'gradient';
  const activeKey = stop === 1 ? 'c1' : 'c2';
  const activeColor = stop === 1 ? value.c1 : value.c2;

  const setActive = (hex: string) => {
    const n = normalizeHex(hex);
    if (n) onChange({ [activeKey]: n } as Partial<FillValue>);
  };

  return (
    <div className="fill-editor">
      {isGradient && (
        <div className="fill-stops">
          <button className={`stop-chip ${stop === 1 ? 'is-active' : ''}`} onClick={() => setStop(1)}>
            <span className="stop-dot" style={{ background: value.c1 }} />起始
          </button>
          <button className={`stop-chip ${stop === 2 ? 'is-active' : ''}`} onClick={() => setStop(2)}>
            <span className="stop-dot" style={{ background: value.c2 }} />结束
          </button>
        </div>
      )}

      <div className="picker-wrap">
        {inputMode === 'hex' ? (
          <HexColorPicker color={activeColor} onChange={setActive} />
        ) : (
          <RgbColorPicker color={hexToRgbObj(activeColor)} onChange={(rgb) => setActive(rgbObjToHex(rgb))} />
        )}
      </div>

      <div className="fill-row">
        <Segmented<'hex' | 'rgb'>
          value={inputMode}
          onChange={setInputMode}
          options={[{ value: 'hex', label: 'HEX' }, { value: 'rgb', label: 'RGB' }]}
        />
        <input
          className="hex-input"
          value={inputMode === 'hex' ? activeColor.toUpperCase() : rgbText(activeColor)}
          onChange={(e) => setActive(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="swatch-row">
        {SWATCHES.map((c) => (
          <button key={c} className="mini-swatch" style={{ background: c }} title={c} onClick={() => setActive(c)} />
        ))}
      </div>

      {isGradient && (
        <>
          <div className="gradient-preview" style={{ background: fillToCss(value) }} />
          {allowRadial && (
            <div className="field-row">
              <span className="field-label">渐变</span>
              <Segmented<GradKind>
                value={value.gradType}
                onChange={(v) => onChange({ gradType: v })}
                options={[{ value: 'linear', label: '线性' }, { value: 'radial', label: '径向' }]}
              />
            </div>
          )}
          {value.gradType === 'linear' && (
            <Slider label="角度" value={value.angle} min={0} max={360} onChange={(v) => onChange({ angle: v })} suffix="°" />
          )}
          <Slider label="结束位置" value={value.endPos} min={0} max={100} onChange={(v) => onChange({ endPos: v })} suffix="%" />
        </>
      )}

      <div className="css-readout">{fillToCss(value)}</div>
    </div>
  );
}
