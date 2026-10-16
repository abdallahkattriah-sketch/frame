import { ArrowDownToLine, Check } from "../icons";
import { useState } from "react";
import { HARBOR_RELEASES_URL } from "@/lib/config/endpoints";
import { useT } from "@/lib/i18n";
import { noteFromMarkdown } from "@/lib/updater/release-notes";
import { installerUrl, type VersionEntry } from "@/lib/updater/versions";
import { openUrl } from "@/lib/window";
import { SButton } from "../ui";
import { VERSION_BADGE } from "./badge";
import { VersionNotesModal } from "./version-notes-modal";

export function VersionItem({ entry, isCurrent }: { entry: VersionEntry; isCurrent: boolean }) {
  const t = useT();
  const url = installerUrl(entry);
  const [open, setOpen] = useState(false);
  const preview = noteFromMarkdown(entry.notes)
    ?.sections?.flatMap((s) => s.items)
    .join(" · ");

  return (
    <div className="flex min-h-[84px] items-center gap-5 border-t border-edge px-5 py-4 transition-colors first:rounded-ss-[10px] first:rounded-se-[10px] first:border-t-0 last:rounded-es-[10px] last:rounded-ee-[10px] hover:bg-elevated">
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("Show the full notes for this build")}
        className="flex min-w-0 flex-1 flex-col gap-1.5 text-start"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="text-[16.5px] font-medium leading-[24px] tabular-nums text-ink">
            {entry.version}
          </span>
          {entry.date && (
            <span className="text-[15.5px] leading-[22px] text-ink-subtle">{entry.date}</span>
          )}
        </span>
        {preview && (
          <span className="line-clamp-2 max-w-[72ch] text-[15.5px] leading-[22px] text-ink-muted">
            {preview}
          </span>
        )}
      </button>

      {isCurrent ? (
        <span className={`${VERSION_BADGE} bg-accent-soft text-accent`}>
          <Check size={13} strokeWidth={2.8} />
          {t("Current")}
        </span>
      ) : url ? (
        <SButton
          title={t("Download this build's installer, then run it over your current copy")}
          onClick={() => openUrl(url)}
        >
          <ArrowDownToLine size={16} strokeWidth={2.4} />
          {t("Download")}
        </SButton>
      ) : (
        <SButton onClick={() => openUrl(HARBOR_RELEASES_URL)}>{t("Releases")}</SButton>
      )}
      {open && (
        <VersionNotesModal entry={entry} isCurrent={isCurrent} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
