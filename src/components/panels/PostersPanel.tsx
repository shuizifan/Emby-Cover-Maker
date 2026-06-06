// ============================================================
//  Tab：海报（手册 §6.3 / §7 —— 关键面板）
//  槽位约 80×120（2:3），按列分组，每列小标题「列 N (M 张)」。
//  点空槽位上传单张 / 拖拽交换 / 悬停删除 / 顶部批量上传 / 全部清空。
//  填满才允许导出（导出按钮在工具栏判定）。
// ============================================================
import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { filesToImages, fileToImage } from '../../utils/imageLoad';
import { AngleDial } from '../AngleDial';
import { Collapsible, GroupTitle, SliderNum, Toggle } from '../controls';

export function PostersPanel() {
  const cols = useStore((s) => s.cols);
  const columns = useStore((s) => s.columns);
  const postersByCol = useStore((s) => s.postersByCol);
  const posterShadow = useStore((s) => s.posterShadow);

  const uploadToSlot = useStore((s) => s.uploadToSlot);
  const uploadBatch = useStore((s) => s.uploadBatch);
  const removePoster = useStore((s) => s.removePoster);
  const swapPosters = useStore((s) => s.swapPosters);
  const shufflePosters = useStore((s) => s.shufflePosters);
  const clearAllPosters = useStore((s) => s.clearAllPosters);
  const setPosterShadow = useStore((s) => s.setPosterShadow);
  const pro = useStore((s) => s.uiMode === 'pro');

  const batchRef = useRef<HTMLInputElement>(null);
  const singleRef = useRef<HTMLInputElement>(null);
  const singleTarget = useRef<number>(-1);
  const [note, setNote] = useState<string>('');

  // 全局索引基址（列主序）
  const bases: number[] = [];
  let acc = 0;
  for (let c = 0; c < cols; c++) {
    bases.push(acc);
    acc += columns[c]?.count ?? 0;
  }
  const totalSlots = acc;
  let filled = 0;
  for (let c = 0; c < cols; c++) for (const p of postersByCol[c] ?? []) if (p) filled++;
  const missing = totalSlots - filled;

  const onBatch = async (files: FileList | null) => {
    if (!files) return;
    const imgs = await filesToImages(files);
    const overflow = uploadBatch(imgs);
    setNote(overflow > 0 ? `已填入 ${imgs.length - overflow} 张，溢出丢弃 ${overflow} 张（槽位已满）` : `已填入 ${imgs.length} 张`);
    if (batchRef.current) batchRef.current.value = '';
  };

  const onSingle = async (file: File | undefined) => {
    if (file && singleTarget.current >= 0) {
      const img = await fileToImage(file);
      uploadToSlot(singleTarget.current, img);
    }
    if (singleRef.current) singleRef.current.value = '';
    singleTarget.current = -1;
  };

  const openSinglePicker = (globalIndex: number) => {
    singleTarget.current = globalIndex;
    singleRef.current?.click();
  };

  return (
    <div className="panel">
      <div className="posters-header">
        <button className="btn btn-soft" onClick={() => batchRef.current?.click()}>
          批量上传
        </button>
        {pro && (
          <button className="btn btn-soft" onClick={shufflePosters} disabled={filled < 2}>
            随机打乱
          </button>
        )}
        <span className={`fill-indicator ${missing === 0 ? 'is-ok' : 'is-warn'}`}>
          已填 {filled} / {totalSlots}
          {missing > 0 && <em>（还差 {missing} 张）</em>}
        </span>
        <button className="btn btn-ghost danger" onClick={() => { clearAllPosters(); setNote(''); }}>
          全部清空
        </button>
      </div>
      {note && <div className="help-text">{note}</div>}

      {pro && (<>
      <GroupTitle>海报投影</GroupTitle>
      <Toggle label="投影" checked={posterShadow.enabled} onChange={(enabled) => setPosterShadow({ enabled })} />
      {posterShadow.enabled && (
        <Collapsible title="投影选项" defaultOpen>
          <AngleDial label="投影角度" angle={posterShadow.angle} onChange={(angle) => setPosterShadow({ angle })} />
          <SliderNum
            label="不透明度"
            value={posterShadow.opacity}
            min={0}
            max={100}
            onChange={(opacity) => setPosterShadow({ opacity })}
            suffix="%"
          />
          <SliderNum
            label="距离"
            value={posterShadow.distance}
            min={0}
            max={30}
            onChange={(distance) => setPosterShadow({ distance })}
            suffix="px"
          />
          <SliderNum
            label="模糊"
            value={posterShadow.blur}
            min={0}
            max={40}
            onChange={(blur) => setPosterShadow({ blur })}
            suffix="px"
          />
          <SliderNum
            label="扩散"
            value={posterShadow.spread}
            min={0}
            max={16}
            onChange={(spread) => setPosterShadow({ spread })}
            suffix="px"
          />
        </Collapsible>
      )}
      </>)}

      <input ref={batchRef} type="file" accept="image/*" multiple hidden onChange={(e) => onBatch(e.target.files)} />
      <input ref={singleRef} type="file" accept="image/*" hidden onChange={(e) => onSingle(e.target.files?.[0])} />

      <div className="poster-columns">
        {Array.from({ length: cols }).map((_, c) => {
          const count = columns[c]?.count ?? 0;
          const arr = postersByCol[c] ?? [];
          const colFilled = arr.filter(Boolean).length;
          return (
            <div key={c} className="poster-col">
              <div className="poster-col-title">
                列 {c + 1} <span>（{colFilled}/{count} 张）</span>
              </div>
              <div className="poster-slot-grid">
                {Array.from({ length: count }).map((__, i) => {
                  const globalIndex = bases[c] + i;
                  const img = arr[i] as HTMLImageElement | null;
                  return (
                    <PosterSlot
                      key={i}
                      globalIndex={globalIndex}
                      number={globalIndex + 1}
                      src={img?.src ?? null}
                      onOpen={() => openSinglePicker(globalIndex)}
                      onDelete={() => removePoster(globalIndex)}
                      onSwap={(from) => swapPosters(from, globalIndex)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SlotProps {
  globalIndex: number;
  number: number;
  src: string | null;
  onOpen: () => void;
  onDelete: () => void;
  onSwap: (fromIndex: number) => void;
}

function PosterSlot({ globalIndex, number, src, onOpen, onDelete, onSwap }: SlotProps) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={`poster-slot ${src ? 'is-filled' : 'is-empty'} ${dragOver ? 'is-drop' : ''}`}
      draggable={!!src}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(globalIndex))}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const from = Number(e.dataTransfer.getData('text/plain'));
        if (!Number.isNaN(from) && from !== globalIndex) onSwap(from);
      }}
      onClick={() => {
        if (!src) onOpen();
      }}
      title={src ? '拖拽到其它槽位可交换' : '点击上传'}
    >
      {src ? (
        <>
          <img src={src} alt={`海报 ${number}`} draggable={false} />
          <button
            className="slot-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="删除"
          >
            ×
          </button>
        </>
      ) : (
        <span className="slot-empty-hint">
          <em>+</em>
          {number}
        </span>
      )}
    </div>
  );
}
