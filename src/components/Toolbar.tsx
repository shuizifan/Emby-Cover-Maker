// ============================================================
//  预览区工具栏：导出 GIF（始终可见）/ 重启预览 / 显示轴心 / 恢复默认 + 状态栏
//  · 「导出 GIF」按钮在预览区始终可见，不需切到导出 Tab。
//  · 所有槽位填满才允许导出，否则红字「还差 X 张」并禁用按钮。
//  · 「恢复默认」清空所有改过的样式与图片（保留界面明暗主题）。
// ============================================================
import { useStore } from '../store/useStore';

export function Toolbar() {
  const showPivot = useStore((s) => s.showPivot);
  const setField = useStore((s) => s.setField);
  const pro = useStore((s) => s.uiMode === 'pro');
  const restartPreview = useStore((s) => s.restartPreview);
  const runExport = useStore((s) => s.runExport);
  const resetAll = useStore((s) => s.resetAll);

  const busy = useStore((s) => s.exportBusy);
  const status = useStore((s) => s.exportStatus);
  const statusKind = useStore((s) => s.exportStatusKind);

  const totalSlots = useStore((s) => {
    let n = 0;
    for (let c = 0; c < s.cols; c++) n += s.columns[c]?.count ?? 0;
    return n;
  });
  const filled = useStore((s) => {
    let n = 0;
    for (let c = 0; c < s.cols; c++) {
      for (const p of s.postersByCol[c] ?? []) if (p) n++;
    }
    return n;
  });

  const missing = totalSlots - filled;
  const complete = missing === 0 && totalSlots > 0;

  const onReset = () => {
    if (window.confirm('恢复默认会清空所有改过的样式与已上传的海报图片，确定继续吗？')) {
      resetAll();
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-actions">
        <button
          className="btn btn-primary"
          onClick={runExport}
          disabled={!complete || busy}
          title={complete ? '导出 GIF' : `还差 ${missing} 张海报`}
        >
          {busy ? '导出中…' : complete ? '导出 GIF' : `还差 ${missing} 张`}
        </button>
        {pro && (
          <>
            <button className="btn btn-ghost" onClick={restartPreview} disabled={busy}>
              重启预览
            </button>
            <button
              className={`btn btn-ghost ${showPivot ? 'is-active' : ''}`}
              onClick={() => setField('showPivot', !showPivot)}
            >
              {showPivot ? '隐藏轴心' : '显示轴心'}
            </button>
          </>
        )}
        <button className="btn btn-ghost danger" onClick={onReset} disabled={busy}>
          恢复默认
        </button>
      </div>
      <div className={`status-bar status-${statusKind}`}>{status}</div>
    </div>
  );
}
