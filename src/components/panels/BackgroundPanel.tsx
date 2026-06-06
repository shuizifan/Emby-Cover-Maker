// ============================================================
//  Tab：背景
//  单一入口：模式 + 色相/明暗层次 + 色系预设 + 角度盘 + 折叠自定义。
// ============================================================
import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { FillValue, LookPreset } from '../../types';
import { normalizeHex, hexToRgbObj, rgbObjToHex, rgbToHsl, hslToRgb } from '../../utils/color';
import { fileToImage } from '../../utils/imageLoad';
import { fillToCss } from '../../render/fill';
import { AngleDial } from '../AngleDial';
import { ColorPopover } from '../ColorPopover';
import { Collapsible, GroupTitle, HelpText, SectionHead, Segmented, Toggle } from '../controls';

type PickerMode = 'single' | 'dual' | 'solid' | 'image';
type Mood = 'soft' | 'standard' | 'rich';
type GradientKind = 'linear' | 'radial';

interface PickerState {
  mode: PickerMode;
  hue1: number;
  hue2: number;
  mood: Mood;
  lightnessSpan: number;
  gradType: GradientKind;
  angle: number;
  customStart: string;
  customEnd: string;
  smartCorrection: boolean;
}

const MOOD: Record<Mood, { sd: number; sl: number }> = {
  soft: { sd: 30, sl: 55 },
  standard: { sd: 46, sl: 73 },
  rich: { sd: 60, sl: 85 },
};

const PRESETS = [
  { hue: 10, name: '日落珊瑚' },
  { hue: 40, name: '琥珀金' },
  { hue: 145, name: '森林绿' },
  { hue: 190, name: '深海青' },
  { hue: 217, name: '海洋蓝' },
  { hue: 265, name: '皇家紫' },
  { hue: 325, name: '玫瑰粉' },
];

const DEFAULT_PICKER: PickerState = {
  mode: 'single',
  hue1: 217,
  hue2: 217,
  mood: 'standard',
  lightnessSpan: 43,
  gradType: 'linear',
  angle: 90,
  customStart: '',
  customEnd: '',
  smartCorrection: true,
};

const LIGHTNESS_CENTER = 48.5;

function hslToHex(h: number, s: number, l: number): string {
  return rgbObjToHex(hslToRgb({ h, s: s / 100, l: l / 100 }));
}

function hueGap(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2);
  return d > 180 ? 360 - d : d;
}

function lightnessPair(span: number): { dark: number; light: number } {
  const safeSpan = Math.max(10, Math.min(75, span));
  return {
    dark: Math.max(12, LIGHTNESS_CENTER - safeSpan / 2),
    light: Math.min(88, LIGHTNESS_CENTER + safeSpan / 2),
  };
}

function lightnessStatus(span: number): { kind: 'weak' | 'safe' | 'strong' | 'danger'; text: string } {
  if (span < 20) return { kind: 'weak', text: '层次偏弱，接近纯色' };
  if (span <= 55) return { kind: 'safe', text: '安全范围，层次自然' };
  if (span <= 65) return { kind: 'strong', text: '对比偏强，注意别抢海报' };
  return { kind: 'danger', text: '危险范围，渐变容易突兀' };
}

function colorsFor(state: PickerState): { start: string; end: string | null } {
  const customStart = normalizeHex(state.customStart);
  const customEnd = normalizeHex(state.customEnd);
  const m = MOOD[state.mood];
  const l = lightnessPair(state.lightnessSpan);

  if (state.mode === 'solid') {
    if (customStart) return { start: customStart, end: null };
    return { start: hslToHex(state.hue1, m.sl, LIGHTNESS_CENTER), end: null };
  }

  if (customStart && customEnd) return { start: customStart, end: customEnd };
  const endHue = state.mode === 'dual' ? state.hue2 : state.hue1;
  return {
    start: hslToHex(state.hue1, m.sd, l.dark),
    end: hslToHex(endHue, m.sl, l.light),
  };
}

function fillFor(state: PickerState): FillValue {
  const { start, end } = colorsFor(state);
  return {
    mode: state.mode === 'solid' ? 'solid' : 'gradient',
    gradType: state.gradType,
    c1: start,
    c2: end ?? start,
    angle: state.angle,
    endPos: 100,
  };
}

function presetCss(hue: number, state: PickerState): string {
  const m = MOOD[state.mood];
  const l = lightnessPair(state.lightnessSpan);
  const a = hslToHex(hue, m.sd, l.dark);
  const b = hslToHex(hue, m.sl, l.light);
  return `linear-gradient(180deg, ${a}, ${b})`;
}

function warningsForCustom(state: PickerState): string[] {
  if (!state.smartCorrection || !state.customStart || !state.customEnd || state.mode === 'solid') return [];
  const start = normalizeHex(state.customStart);
  const end = normalizeHex(state.customEnd);
  if (!start || !end) return [];
  const sH = rgbToHsl(hexToRgbObj(start));
  const eH = rgbToHsl(hexToRgbObj(end));
  const gap = hueGap(sH.h, eH.h);
  const warnings: string[] = [];
  if (gap > 120) {
    const safe = hslToHex(eH.h, MOOD.standard.sd, lightnessPair(43).dark);
    warnings.push(`色相跨度 ${Math.round(gap)}° 偏大，建议起始色靠近 ${safe}。`);
  }
  if (sH.s < 0.15) warnings.push(`起始色饱和度 ${Math.round(sH.s * 100)}%，可能显得褪色。`);
  if (eH.s < 0.15) warnings.push(`结束色饱和度 ${Math.round(eH.s * 100)}%，可能显得褪色。`);
  if (Math.abs(sH.l - eH.l) < 0.15) warnings.push(`深浅差异不足 ${Math.round(Math.abs(sH.l - eH.l) * 100)}%，渐变会不明显。`);
  return warnings;
}

function warningForDual(state: PickerState): string {
  if (state.mode !== 'dual') return '';
  const { start, end } = colorsFor(state);
  if (!end) return '';
  const s = hexToRgbObj(start);
  const e = hexToRgbObj(end);
  const mid = rgbObjToHex({ r: (s.r + e.r) / 2, g: (s.g + e.g) / 2, b: (s.b + e.b) / 2 });
  const midHsl = rgbToHsl(hexToRgbObj(mid));
  const gap = hueGap(state.hue1, state.hue2);
  if (gap > 100 && midHsl.s < 0.25) return `色相差 ${Math.round(gap)}°，中点饱和度仅 ${Math.round(midHsl.s * 100)}%，中段会偏灰。`;
  if (gap > 100) return `色相差 ${Math.round(gap)}°，已经进入双色相临界区。`;
  return '';
}

function HueSlider(props: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="bg-control">
      <div className="bg-control-head">
        <span>{props.label}</span>
        <b>{Math.round(props.value)}°</b>
      </div>
      <div className="bg-hue-wrap">
        <div className="bg-hue-rainbow" />
        <input
          type="range"
          min={0}
          max={360}
          value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function LightnessSlider(props: { value: number; onChange: (v: number) => void }) {
  const status = lightnessStatus(props.value);
  return (
    <div className="bg-control">
      <div className="bg-control-head">
        <span>明暗层次</span>
        <b>{props.value}</b>
      </div>
      <input
        className={`bg-lightness-range is-${status.kind}`}
        type="range"
        min={10}
        max={75}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <div className="risk-bar">
        <span className="risk-weak" />
        <span className="risk-safe" />
        <span className="risk-strong" />
        <span className="risk-danger" />
        <i style={{ left: `${((props.value - 10) / 65) * 100}%` }} />
      </div>
      <div className={`risk-label is-${status.kind}`}>{status.text}</div>
    </div>
  );
}

export function BackgroundPanel() {
  const hasBgImage = useStore((s) => s.bgImage != null);
  const setField = useStore((s) => s.setField);
  const setBgFill = useStore((s) => s.setBgFill);
  const setBgImage = useStore((s) => s.setBgImage);
  const getLook = useStore((s) => s.getLook);
  const applyLook = useStore((s) => s.applyLook);
  const pro = useStore((s) => s.uiMode === 'pro');

  const imgRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [picker, setPicker] = useState<PickerState>(DEFAULT_PICKER);

  const fill = useMemo(() => fillFor(picker), [picker]);
  const cssText = picker.mode === 'image' ? '/* 图片背景 */' : fillToCss(fill);
  const dualWarning = warningForDual(picker);
  const customWarnings = warningsForCustom(picker);
  const currentColors = colorsFor(picker);

  const commit = (next: PickerState) => {
    setPicker(next);
    setField('bgImageOn', next.mode === 'image');
    if (next.mode !== 'image') setBgFill(fillFor(next));
  };

  const patchPicker = (patch: Partial<PickerState>) => commit({ ...picker, ...patch });

  const onPickPreset = (hue: number) => {
    patchPicker({ hue1: hue, hue2: hue, customStart: '', customEnd: '' });
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setBgImage(await fileToImage(file));
    patchPicker({ mode: 'image' });
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(getLook(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-look-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const preset = JSON.parse(await file.text()) as Partial<LookPreset>;
      applyLook(preset);
    } catch {
      alert('外观文件解析失败');
    }
    if (importRef.current) importRef.current.value = '';
  };

  return (
    <div className="panel">
      <SectionHead
        title="背景"
        actions={
          pro ? (
            <>
              <button className="link-btn" onClick={() => importRef.current?.click()}>导入外观</button>
              <button className="link-btn" onClick={onExport}>导出外观</button>
            </>
          ) : undefined
        }
      />
      <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />

      <GroupTitle>背景模式</GroupTitle>
      <Segmented<PickerMode>
        value={picker.mode}
        onChange={(mode) => patchPicker({ mode })}
        options={[
          { value: 'single', label: '单色相' },
          { value: 'dual', label: '双色相' },
          { value: 'solid', label: '纯色' },
          { value: 'image', label: '图片' },
        ]}
      />

      <div
        className="bg-gradient-preview"
        style={{
          background:
            picker.mode === 'image'
              ? 'repeating-linear-gradient(45deg, var(--surface-3), var(--surface-3) 8px, var(--surface-2) 8px, var(--surface-2) 16px)'
              : cssText,
        }}
      />

      {picker.mode === 'image' ? (
        <div className="inline-upload">
          <button className="btn btn-soft full" onClick={() => imgRef.current?.click()}>选择背景图片（cover 铺满）</button>
          <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => onPickImage(e.target.files?.[0])} />
          <HelpText>{hasBgImage ? '已选择背景图片' : '未选择时会显示占位底纹'}</HelpText>
        </div>
      ) : (
        <>
          <HueSlider label={picker.mode === 'dual' ? '深色端色相' : '色相'} value={picker.hue1} onChange={(hue1) => patchPicker({ hue1, customStart: '', customEnd: '' })} />
          {picker.mode === 'dual' && (
            <>
              <HueSlider label="浅色端色相" value={picker.hue2} onChange={(hue2) => patchPicker({ hue2, customStart: '', customEnd: '' })} />
              {dualWarning && <div className="warn-text">{dualWarning}</div>}
            </>
          )}
          {picker.mode !== 'solid' && (
            <LightnessSlider value={picker.lightnessSpan} onChange={(lightnessSpan) => patchPicker({ lightnessSpan, customStart: '', customEnd: '' })} />
          )}

          {pro && (
            <>
              <GroupTitle>调子</GroupTitle>
              <Segmented<Mood>
                value={picker.mood}
                onChange={(mood) => patchPicker({ mood })}
                options={[
                  { value: 'soft', label: '柔和' },
                  { value: 'standard', label: '标准' },
                  { value: 'rich', label: '浓郁' },
                ]}
              />
            </>
          )}

          <GroupTitle>色系预设</GroupTitle>
          <div className="hue-preset-row">
            {PRESETS.map((p) => (
              <button
                key={p.hue}
                className={`hue-preset ${Math.round(picker.hue1) === p.hue ? 'is-active' : ''}`}
                style={{ background: presetCss(p.hue, picker) }}
                title={p.name}
                onClick={() => onPickPreset(p.hue)}
              />
            ))}
          </div>

          {pro && picker.mode !== 'solid' && (
            <>
              <GroupTitle>渐变方向</GroupTitle>
              <Segmented<GradientKind>
                value={picker.gradType}
                onChange={(gradType) => patchPicker({ gradType })}
                options={[
                  { value: 'linear', label: '线性' },
                  { value: 'radial', label: '径向' },
                ]}
              />
              {picker.gradType === 'linear' ? (
                <AngleDial label="线性角度" angle={picker.angle} onChange={(angle) => patchPicker({ angle })} />
              ) : (
                <HelpText>径向渐变从中心向外扩散，不需要方向角度。</HelpText>
              )}
            </>
          )}

          {pro && (
          <Collapsible title="完全自定义">
            <ColorPopover
              label={picker.mode === 'solid' ? '纯色' : '起始色'}
              value={picker.customStart}
              fallback={currentColors.start}
              placeholder="留空按公式生成"
              onChange={(customStart) => patchPicker({ customStart })}
            />
            {picker.mode !== 'solid' && (
              <ColorPopover
                label="结束色"
                value={picker.customEnd}
                fallback={currentColors.end ?? currentColors.start}
                placeholder="留空按公式生成"
                onChange={(customEnd) => patchPicker({ customEnd })}
              />
            )}
            {picker.mode !== 'solid' && (
              <>
                <Toggle label="智能校正" checked={picker.smartCorrection} onChange={(smartCorrection) => patchPicker({ smartCorrection })} />
                {customWarnings.map((w) => <div className="warn-text" key={w}>{w}</div>)}
              </>
            )}
          </Collapsible>
          )}
        </>
      )}

      {pro && <div className="css-readout">background: {cssText};</div>}
    </div>
  );
}
