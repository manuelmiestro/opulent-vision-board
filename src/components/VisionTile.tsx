"use client";

import type { Goal, VisionItem } from "@/lib/types";
import { cx, daysBetween, day } from "@/lib/utils";

/** True when a vision piece belongs to something that matters right now. */
export function isNow(item: VisionItem, goals: Goal[]): boolean {
  const g = item.goalId ? goals.find((x) => x.id === item.goalId) : undefined;
  if (g?.completedAt) return false;
  if (g?.deadline && daysBetween(day(), g.deadline) <= 45) return true;
  const h = g?.horizon ?? item.horizon;
  return h === "This month" || h === "This quarter";
}

export function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export function VisionTile({ item, goals, large, onClick }: { item: VisionItem; goals: Goal[]; large?: boolean; onClick?: () => void }) {
  const now = isNow(item, goals);
  const goal = item.goalId ? goals.find((g) => g.id === item.goalId) : undefined;
  return (
    <figure
      onClick={onClick}
      className={cx(
        "group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border bg-charcoal transition",
        now ? "border-gold/70 shadow-[0_0_0_1px_rgba(201,169,98,0.4),0_12px_30px_-16px_rgba(201,169,98,0.6)]" : "border-line",
        onClick && "cursor-pointer",
      )}
    >
      {item.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.content} alt={item.caption ?? "Vision board image"} className="w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
      )}
      {item.type === "text" && (
        <div className={cx("flex items-center justify-center bg-gradient-to-br from-raised to-charcoal p-6 text-center", large ? "min-h-64" : "min-h-36")}>
          <p className={cx("font-display leading-snug text-gold-light", large ? "text-[26px]" : "text-[18px]")}>{item.content}</p>
        </div>
      )}
      {item.type === "video" && <VideoEmbed url={item.content} />}
      {item.type === "audio" && (
        <div className="p-4">
          <p className="mb-3 font-display text-[16px] text-gold-light">♪ {item.caption || "Audio"}</p>
          <audio controls src={item.content} className="w-full" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {(item.caption && item.type !== "audio") || now || goal ? (
        <figcaption className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="min-w-0 truncate text-[12px] text-muted">{item.caption || goal?.title || item.category}</span>
          {now && <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">Now</span>}
        </figcaption>
      ) : null}
    </figure>
  );
}

function VideoEmbed({ url }: { url: string }) {
  const yt = youTubeId(url);
  if (yt) {
    return (
      <div className="aspect-video w-full" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}`}
          title="Vision video"
          className="h-full w-full"
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return <video src={url} controls playsInline className="w-full" onClick={(e) => e.stopPropagation()} />;
}
