// 字体下拉：统一字体库（中英文通用），列出内置 + 用户字体
import { allFontOptions } from '../fonts/registry';
import { LabeledSelect } from './controls';

export function FontSelect(props: { label: string; value: string; onChange: (v: string) => void }) {
  const options = allFontOptions().map((f) => ({ value: f.id, label: f.label }));
  return <LabeledSelect label={props.label} value={props.value} options={options} onChange={props.onChange} />;
}
