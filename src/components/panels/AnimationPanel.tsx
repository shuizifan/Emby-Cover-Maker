// ============================================================
//  Tab：动画（手册 §6.2 / §3.4）
//  时长 / 帧率 / 倾斜角 / 轴心 X / 轴心 Y。
//  轴心可在预览画布上拖动（点「显示轴心」后），也可用此处滑块。
// ============================================================
import { useStore } from '../../store/useStore';
import { GroupTitle, HelpText, Slider } from '../controls';
import { frameCount } from '../../export/frameMath';

export function AnimationPanel() {
  const duration = useStore((s) => s.duration);
  const fps = useStore((s) => s.fps);
  const tiltDeg = useStore((s) => s.tiltDeg);
  const pivotXPct = useStore((s) => s.pivotXPct);
  const pivotYPct = useStore((s) => s.pivotYPct);
  const showPivot = useStore((s) => s.showPivot);

  const setField = useStore((s) => s.setField);
  const pro = useStore((s) => s.uiMode === 'pro');

  const frames = frameCount(duration, fps);

  return (
    <div className="panel">
      <GroupTitle>倾斜</GroupTitle>
      <Slider label="倾斜角度" value={tiltDeg} min={0} max={30} onChange={(v) => setField('tiltDeg', v)} suffix="°" />

      {pro && (
        <>
          <GroupTitle>时间</GroupTitle>
          <Slider label="循环时长" value={duration} min={3} max={25} onChange={(v) => setField('duration', v)} suffix="s" />
          <Slider label="帧率" value={fps} min={10} max={30} onChange={(v) => setField('fps', v)} suffix="fps" />
          <div className="readonly-row">
            <span>总帧数（只读 = 时长 × 帧率）</span>
            <b>{frames} 帧</b>
          </div>

          <GroupTitle>轴心</GroupTitle>
          <Slider label="轴心 X" value={pivotXPct} min={0} max={100} onChange={(v) => setField('pivotXPct', v)} suffix="%" />
          <Slider label="轴心 Y" value={pivotYPct} min={0} max={100} onChange={(v) => setField('pivotYPct', v)} suffix="%" />

          <button
            className={`btn btn-soft full ${showPivot ? 'is-active' : ''}`}
            onClick={() => setField('showPivot', !showPivot)}
          >
            {showPivot ? '隐藏轴心（停止拖动）' : '在画布上拖动轴心'}
          </button>

          <HelpText>
            轴心越靠下，底部越不摆、顶部摆得越明显；越靠上则相反；居中则上下对称摆动。「倾斜角度」是顶部右倾的角度。
          </HelpText>
        </>
      )}
    </div>
  );
}
