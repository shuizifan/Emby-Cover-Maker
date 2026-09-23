// 字体下拉：统一字体库（中英文通用），列出内置 + 用户字体
import { useSyncExternalStore } from 'react';
import { allFontOptions, getFontsVersion, subscribeFonts } from '../fonts/registry';
import { LabeledSelect } from './controls';

export function FontSelect(props: { label: string; value: string; onChange: (v: string) => void }) {
  // 用户字体清单异步读取，读到后刷新下拉
  useSyncExternalStore(subscribeFonts, getFontsVersion);
  const options = allFontOptions().map((f) => ({ value: f.id, label: f.label }));
  return <LabeledSelect label={props.label} value={props.value} options={options} onChange={props.onChange} />;
}
