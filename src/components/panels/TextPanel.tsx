// ============================================================
//  Tab：文字（V1）
//  中文标题 / 英文标题各自独立：字体、字号、粗细(滑块)、字间距(%)、
//  换行、XY 位移、可在预览里拖动；英文标题独享装饰（左竖条 + 横线）。
// ============================================================
import { useStore } from '../../store/useStore';
import type { FillValue, LinePos, TitleConfig } from '../../types';
import { fillToCss } from '../../render/fill';
import { minFillContrast } from '../../utils/contrast';
import { effectiveDecoColor } from '../../utils/decoColor';
import { ColorPopover } from '../ColorPopover';
import { FontSelect } from '../FontSelect';
import {
  ColorInput,
  GroupTitle,
  HelpText,
  Segmented,
  Slider,
  SliderNum,
  TextField,
  Toggle,
} from '../controls';

/** 一个标题（中文 / 英文）的通用控件块 */
function TitleControls({ which }: { which: 'cn' | 'en' }) {
  const t = useStore((s) => s[which]) as TitleConfig;
  const setTitleField = useStore((s) => s.setTitleField);
  const pro = useStore((s) => s.uiMode === 'pro');
  const set = <K extends keyof TitleConfig>(key: K, v: TitleConfig[K]) => setTitleField(which, key, v);

  return (
    <>
      <Slider label="字号" value={t.size} min={8} max={96} onChange={(v) => set('size', v)} suffix="px" />
      {pro && (
        <>
          <FontSelect label="字体" value={t.fontId} onChange={(v) => set('fontId', v)} />
          <Slider label="粗细" value={t.weight} min={100} max={900} step={100} onChange={(v) => set('weight', v)} />
          <SliderNum label="字间距" value={t.trackPct} min={-30} max={150} onChange={(v) => set('trackPct', v)} suffix="%" />
          {which === 'en' && <Toggle label="转大写" checked={t.upper} onChange={(v) => set('upper', v)} />}
          <Toggle label="自动换行" checked={t.wrap} onChange={(v) => set('wrap', v)} />
          {t.wrap && (
            <Slider label="换行宽度" value={t.wrapWidth} min={40} max={300} onChange={(v) => set('wrapWidth', v)} suffix="px" />
          )}
          <SliderNum label="位移 X" value={t.offsetX} min={-120} max={200} onChange={(v) => set('offsetX', v)} suffix="px" />
          <SliderNum label="位移 Y" value={t.offsetY} min={-120} max={120} onChange={(v) => set('offsetY', v)} suffix="px" />
        </>
      )}
    </>
  );
}

const LINE_POS: { value: LinePos; label: string }[] = [
  { value: 'above', label: '英文上方' },
  { value: 'below', label: '英文下方' },
];

const TEXT_COLOR_PRESETS = [
  { name: '纯白', c1: '#ffffff' },
  { name: '暖白', c1: '#fff3df' },
  { name: '冷白', c1: '#eaf4ff' },
  { name: '炭黑', c1: '#111318' },
  { name: '金色', c1: '#f0c878' },
];

function TextColorEditor(props: {
  value: FillValue;
  accent: string;
  onChange: (patch: Partial<FillValue>) => void;
}) {
  const { value, accent, onChange } = props;
  const presets = [...TEXT_COLOR_PRESETS, { name: '主题强调', c1: accent }];

  return (
    <div className="text-color-editor">
      <Segmented<'solid' | 'gradient'>
        value={value.mode}
        onChange={(mode) => onChange({ mode })}
        options={[{ value: 'solid', label: '纯色' }, { value: 'gradient', label: '渐变' }]}
      />
      <div className="text-color-presets">
        {presets.map((p) => (
          <button
            key={p.name}
            className="text-color-preset"
            style={{ background: p.c1 }}
            title={p.name}
            onClick={() => onChange({ mode: 'solid', c1: p.c1 })}
          />
        ))}
      </div>
      {value.mode === 'solid' ? (
        <ColorPopover label="颜色" value={value.c1} fallback="#ffffff" onChange={(c1) => onChange({ c1 })} />
      ) : (
        <>
          <ColorPopover label="起始色" value={value.c1} fallback="#ffffff" onChange={(c1) => onChange({ c1 })} />
          <ColorPopover label="结束色" value={value.c2} fallback={accent} onChange={(c2) => onChange({ c2 })} />
          <Slider label="渐变角度" value={value.angle} min={0} max={360} onChange={(angle) => onChange({ angle })} suffix="°" />
        </>
      )}
      <div className="css-readout">{fillToCss(value)}</div>
    </div>
  );
}

export function TextPanel() {
  const showText = useStore((s) => s.showText);
  const dragTitles = useStore((s) => s.dragTitles);
  const cnText = useStore((s) => s.cn.text);
  const enText = useStore((s) => s.en.text);
  const deco = useStore((s) => s.deco);
  const textFill = useStore((s) => s.textFill);
  const shadowBlur = useStore((s) => s.shadowBlur);
  const bgFill = useStore((s) => s.bgFill);
  const bgImageOn = useStore((s) => s.bgImageOn);

  const setField = useStore((s) => s.setField);
  const setTitleField = useStore((s) => s.setTitleField);
  const setDeco = useStore((s) => s.setDeco);
  const setTextFill = useStore((s) => s.setTextFill);
  const pro = useStore((s) => s.uiMode === 'pro');

  const decoColorShown = effectiveDecoColor(deco, bgFill, bgImageOn);
  const contrast = bgImageOn ? null : minFillContrast(textFill, bgFill);

  return (
    <div className="panel">
      <Toggle label="显示文字" checked={showText} onChange={(v) => setField('showText', v)} />
      {!showText && <HelpText>已隐藏文字层。打开后可编辑中文 / 英文标题、字体与颜色。</HelpText>}

      {showText && (
        <>
          {pro && (
            <>
              <Toggle label="拖动标题" checked={dragTitles} onChange={(v) => setField('dragTitles', v)} />
              <HelpText>
                开启后，可直接在左侧预览里<b>拖动中文 / 英文标题</b>调整位置（也可用下方位移 X/Y 精确设置）。
              </HelpText>
            </>
          )}

          <GroupTitle>中文标题</GroupTitle>
          <TextField label="文案" value={cnText} onChange={(v) => setTitleField('cn', 'text', v)} placeholder="电影" />
          <TitleControls which="cn" />

          <GroupTitle>英文标题</GroupTitle>
          <TextField label="文案" value={enText} onChange={(v) => setTitleField('en', 'text', v)} placeholder="MOVIE" />
          <TitleControls which="en" />

          {pro && (<>
          <GroupTitle>英文标题装饰</GroupTitle>
          <Toggle label="左竖条" checked={deco.barOn} onChange={(v) => setDeco({ barOn: v })} />
          {deco.barOn && (
            <>
              <Slider label="竖条粗细" value={deco.barWidth} min={1} max={12} onChange={(v) => setDeco({ barWidth: v })} suffix="px" />
              <Slider label="竖条间距" value={deco.barGap} min={0} max={20} onChange={(v) => setDeco({ barGap: v })} suffix="px" />
            </>
          )}
          <Toggle label="横线" checked={deco.lineOn} onChange={(v) => setDeco({ lineOn: v })} />
          {deco.lineOn && (
            <>
              <div className="field-row">
                <span className="field-label">横线位置</span>
                <Segmented<LinePos> value={deco.linePos} onChange={(v) => setDeco({ linePos: v })} options={LINE_POS} />
              </div>
              <Slider label="横线粗细" value={deco.lineWeight} min={1} max={8} onChange={(v) => setDeco({ lineWeight: v })} suffix="px" />
            </>
          )}
          {(deco.barOn || deco.lineOn) && (
            <>
              <Toggle label="自动取主题同色相" checked={deco.colorAuto} onChange={(v) => setDeco({ colorAuto: v })} />
              <ColorInput
                label="装饰颜色"
                value={decoColorShown}
                disabled={deco.colorAuto}
                onChange={(v) => setDeco({ color: v, colorAuto: false })}
              />
              {deco.colorAuto && <HelpText>正按背景主题自动取同色相：<b>{decoColorShown.toUpperCase()}</b>。关掉开关即可手动改色。</HelpText>}
            </>
          )}
          </>)}

          <GroupTitle>文字颜色（中英文共用）</GroupTitle>
          <TextColorEditor value={textFill} accent={decoColorShown} onChange={setTextFill} />
          {contrast !== null && contrast < 4.5 && (
            <div className="warn-text">
              标题可能看不清：当前文字与背景的最低对比度约 {contrast.toFixed(1)}:1，建议提高到 4.5:1 以上。
            </div>
          )}

          {pro && (
            <>
              <GroupTitle>阴影 / 发光</GroupTitle>
              <Slider label="阴影/发光" value={shadowBlur} min={0} max={24} onChange={(v) => setField('shadowBlur', v)} suffix="px" />
            </>
          )}
        </>
      )}
    </div>
  );
}
