import { FastForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSettings, type Settings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { useMenuSide } from "../menu-side";
import { Tooltip } from "./tooltip";
import { watchOutsideMouseDown } from "@/lib/player/overlay-dismiss";

type SkipKey = "autoSkipIntro" | "autoSkipRecap" | "autoSkipOutro" | "autoSkipAd";

const OPTIONS: Array<{ key: SkipKey; label: string }> = [
  { key: "autoSkipIntro", label: "Intros" },
  { key: "autoSkipRecap", label: "Recaps" },
  { key: "autoSkipOutro", label: "Credits" },
  { key: "autoSkipAd", label: "Injected ads" },
];

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
        on ? "justify-end bg-accent" : "justify-start bg-canvas/70"
      }`}
    >
      <span className="h-4 w-4 rounded-full bg-white" />
    </span>
  );
}

export function AutoSkipMenu({
  onOpenChange,
  iconUrl,
}: {
  onOpenChange?: (open: boolean) => void;
  iconUrl?: string;
}) {
  const t = useT();
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { measure } = useMenuSide(wrap, 280);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    return watchOutsideMouseDown(close);
  }, [open]);

  // Injected-ad skipping only exists while ad detection is on, so that row follows the setting.
  const options = OPTIONS.filter((o) => o.key !== "autoSkipAd" || settings.adSkipEnabled);
  const onCount = options.filter((o) => settings[o.key]).length;
  const allOn = onCount === options.length;
  const setAll = (on: boolean) => {
    const patch: Partial<Settings> = {};
    for (const o of options) patch[o.key] = on;
    update(patch);
  };

  return (
    <div ref={wrap} className="relative">
      <Tooltip label={t("Auto-skip")}>
        <button
          onClick={() => {
            if (!open) measure();
            setOpen((o) => !o);
          }}
          aria-label={t("Auto-skip")}
          aria-expanded={open}
          className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 transition-[background-color,color] ${
            open || onCount > 0
              ? "bg-white/22 text-white hover:bg-white/30"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          }`}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className="h-[22px] w-[22px] shrink-0 select-none object-contain"
              draggable={false}
            />
          ) : (
            <FastForward size={20} strokeWidth={1.9} />
          )}
          {onCount > 0 ? (
            <span className="text-[11px] font-bold tracking-wider">{onCount}</span>
          ) : null}
        </button>
      </Tooltip>
      {open && (
        <div className="fixed end-14 bottom-[150px] max-h-[calc(100vh-174px)] w-[280px] max-w-[calc(100vw-72px)] overflow-y-auto rounded-md bg-elevated shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] animate-menu-pop">
          <div className="p-2">
            <div className="px-3 pt-1 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
              {t("Auto-skip")}
            </div>
            <button
              onClick={() => setAll(!allOn)}
              className="mb-1 flex h-9 w-full items-center justify-between gap-3 rounded-lg border-b border-edge-soft/60 px-3 text-start text-[13.5px] font-medium text-ink transition-colors hover:bg-canvas/55"
            >
              <span>{t("All")}</span>
              <Switch on={allOn} />
            </button>
            <div className="flex flex-col gap-0.5">
              {options.map((o) => {
                const on = settings[o.key];
                return (
                  <button
                    key={o.key}
                    onClick={() => update({ [o.key]: !on } as Partial<Settings>)}
                    className={`flex h-9 w-full items-center justify-between gap-3 rounded-lg px-3 text-start text-[13.5px] transition-colors ${
                      on
                        ? "bg-elevated text-ink ring-1 ring-edge"
                        : "text-ink-muted hover:bg-canvas/55 hover:text-ink"
                    }`}
                  >
                    <span className={on ? "font-medium" : ""}>{t(o.label)}</span>
                    <Switch on={on} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
