"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BackIcon, PlusIcon } from "@/components/icons";
import { Button, Chip, Field, inputCls, PageHeader, Sheet, Toast } from "@/components/ui";
import { VisionTile } from "@/components/VisionTile";
import { FREE_LIMITS } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { CATEGORIES, HORIZONS, type Category, type Horizon, type VisionItem, type VisionItemType } from "@/lib/types";
import { cx, fileToDataUrl, uid } from "@/lib/utils";

const TYPES: { id: VisionItemType; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "text", label: "Words" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Voice" },
];

export default function EditBoardPage() {
  return (
    <AppShell feature="board">
      <Editor />
    </AppShell>
  );
}

function Editor() {
  const { state, update, isPremium } = useStore();
  const [editing, setEditing] = useState<VisionItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const atLimit = !isPremium && state.vision.length >= FREE_LIMITS.visionItems;

  function save(item: VisionItem) {
    update(
      (s) => ({
        ...s,
        vision: s.vision.some((v) => v.id === item.id) ? s.vision.map((v) => (v.id === item.id ? item : v)) : [item, ...s.vision],
      }),
      { activity: true },
    );
    setEditing(null);
    setToast("Added to your vision.");
  }

  function remove(id: string) {
    update((s) => ({ ...s, vision: s.vision.filter((v) => v.id !== id) }));
    setEditing(null);
  }

  function move(id: string, dir: -1 | 1) {
    update((s) => {
      const list = [...s.vision];
      const i = list.findIndex((v) => v.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return s;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...s, vision: list };
    });
  }

  return (
    <>
      <Link href="/board" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-2 px-2 text-muted hover:text-cream">
        <BackIcon width={18} height={18} /> Board
      </Link>
      <PageHeader eyebrow="Vision board editor" title="Shape your vision" subtitle="Tap a piece to edit it. Link pieces to goals so they light up when it's time." />

      {atLimit ? (
        <Link href="/upgrade" className="mb-5 block rounded-2xl border border-gold/40 bg-gold/10 p-4 text-[14px] text-gold-light">
          You've used all {FREE_LIMITS.visionItems} free pieces. Upgrade to Premium for an unlimited board →
        </Link>
      ) : (
        <Button className="mb-5 w-full" onClick={() => setEditing(blankItem())}>
          <PlusIcon width={18} height={18} /> Add to my board
        </Button>
      )}

      <ul className="space-y-3">
        {state.vision.map((v, i) => (
          <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-line bg-charcoal p-2 pr-3">
            <button className="w-24 shrink-0 overflow-hidden rounded-xl" onClick={() => setEditing(v)} aria-label="Edit piece">
              <div className="pointer-events-none origin-top-left">
                <VisionTile item={v.type === "video" ? { ...v, type: "text", content: "▶ Video" } : v} goals={state.goals} />
              </div>
            </button>
            <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(v)}>
              <p className="truncate text-[14px]">{v.caption || (v.type === "text" ? v.content : TYPES.find((t) => t.id === v.type)?.label)}</p>
              <p className="mt-0.5 text-[12px] text-faint">
                {v.category} · {v.horizon}
              </p>
            </button>
            <div className="flex flex-col">
              <button className="h-9 w-9 text-faint hover:text-cream disabled:opacity-20" disabled={i === 0} onClick={() => move(v.id, -1)} aria-label="Move up">
                ↑
              </button>
              <button className="h-9 w-9 text-faint hover:text-cream disabled:opacity-20" disabled={i === state.vision.length - 1} onClick={() => move(v.id, 1)} aria-label="Move down">
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing && state.vision.some((v) => v.id === editing.id) ? "Edit piece" : "Add to your board"}>
        {editing && <ItemForm initial={editing} onSave={save} onDelete={state.vision.some((v) => v.id === editing.id) ? () => remove(editing.id) : undefined} />}
      </Sheet>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

function blankItem(): VisionItem {
  return { id: uid(), type: "image", content: "", category: "Career", horizon: "This year", createdAt: new Date().toISOString() };
}

function ItemForm({ initial, onSave, onDelete }: { initial: VisionItem; onSave: (v: VisionItem) => void; onDelete?: () => void }) {
  const { state } = useStore();
  const [item, setItem] = useState<VisionItem>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<VisionItem>) => setItem((v) => ({ ...v, ...patch }));
  const goals = state.goals.filter((g) => !g.archived);

  async function onFile(f?: File) {
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      if (item.type === "image") set({ content: await fileToDataUrl(f) });
      else if (f.size > 2_000_000) setError("Files over 2 MB can't be stored on the board yet. Paste a link instead.");
      else set({ content: await fileToDataUrl(f) });
    } catch {
      setError("That file couldn't be read.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => set({ type: t.id, content: "" })}
            className={cx("min-h-11 rounded-xl border text-[13px] transition", item.type === t.id ? "border-gold bg-gold/15 text-gold-light" : "border-line text-muted")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {item.type === "image" && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {item.content ? (
            <button onClick={() => fileRef.current?.click()} className="block w-full overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.content} alt="" className="max-h-72 w-full object-cover" />
            </button>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-gold/40 text-gold">
              {busy ? "Preparing…" : "Choose a photo"}
            </button>
          )}
        </div>
      )}
      {item.type === "text" && (
        <Field label="Your words">
          <textarea rows={3} className={inputCls} placeholder="I am the CEO of my life." value={item.content} onChange={(e) => set({ content: e.target.value })} />
        </Field>
      )}
      {item.type === "video" && (
        <Field label="Video link" hint="YouTube or a direct video link.">
          <input className={inputCls} placeholder="https://youtube.com/watch?v=…" value={item.content} onChange={(e) => set({ content: e.target.value.trim() })} />
        </Field>
      )}
      {item.type === "audio" && <AudioInput value={item.content} onChange={(content) => set({ content })} onFile={onFile} />}

      <Field label="Caption (optional)">
        <input className={inputCls} value={item.caption ?? ""} onChange={(e) => set({ caption: e.target.value })} placeholder="My dream office" />
      </Field>

      <Field label="Category">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={item.category === c} onClick={() => set({ category: c as Category })}>
              {c}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="When">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {HORIZONS.map((h) => (
            <Chip key={h} active={item.horizon === h} onClick={() => set({ horizon: h as Horizon })}>
              {h}
            </Chip>
          ))}
        </div>
      </Field>
      {goals.length > 0 && (
        <Field label="Linked goal">
          <select className={inputCls} value={item.goalId ?? ""} onChange={(e) => {
            const g = goals.find((x) => x.id === e.target.value);
            set({ goalId: e.target.value || undefined, ...(g ? { category: g.category, horizon: g.horizon } : {}) });
          }}>
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      {error && <p className="text-[13px] text-rose">{error}</p>}
      <div className="flex gap-3 pt-2">
        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            Remove
          </Button>
        )}
        <Button className="flex-1" disabled={!item.content.trim() || busy} onClick={() => onSave(item)}>
          Save
        </Button>
      </div>
    </div>
  );
}

function AudioInput({ value, onChange, onFile }: { value: string; onChange: (v: string) => void; onFile: (f?: File) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const r = new FileReader();
        r.onload = () => onChange(String(r.result));
        r.readAsDataURL(blob);
        setRec(null);
      };
      mr.start();
      setRec(mr);
      setTimeout(() => mr.state === "recording" && mr.stop(), 30_000);
    } catch {
      setErr("Microphone access was blocked. You can upload a short audio file instead.");
    }
  }

  return (
    <div className="space-y-3">
      {value && <audio controls src={value} className="w-full" />}
      <div className="flex gap-2">
        {rec ? (
          <Button variant="danger" className="flex-1" onClick={() => rec.stop()}>
            ■ Stop recording
          </Button>
        ) : (
          <Button variant="secondary" className="flex-1" onClick={start}>
            ● Record (30s)
          </Button>
        )}
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          Upload
        </Button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {err && <p className="text-[13px] text-rose">{err}</p>}
    </div>
  );
}
