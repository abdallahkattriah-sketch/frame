import { Check, GitPullRequest } from "../icons";
import { GitHubIcon } from "@/components/github-icon";
import { useLayoutEffect, useRef } from "react";
import { HARBOR_REPO_URL } from "@/lib/config/endpoints";
import { openUrl } from "@/lib/window";
import { tvFocus } from "@/lib/keyboard-navigation";
import { useT } from "@/lib/i18n";
import { ROW_ACTION, ROW_ACTION_PRIMARY } from "../kit";

export function SuccessCard({ url, onAnother }: { url: string; onAnother: () => void }) {
  const t = useT();
  const againRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const el = againRef.current;
    if (el && document.querySelector('[data-tv-focused="true"]')) tvFocus(el);
  }, []);

  return (
    <section className="flex flex-col gap-5 rounded-[10px] border border-edge-soft bg-elevated p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent">
          <Check size={20} strokeWidth={2.4} />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="text-[19px] font-semibold leading-[26px] tracking-tight text-ink">
            {t("Your report is ready on GitHub")}
          </h2>
          <p className="max-w-[66ch] text-[15.5px] leading-[22px] text-ink-muted">
            {t(
              "Check it in the browser tab that opened, drag in any attachments, then press Submit new issue to send it.",
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button ref={againRef} type="button" onClick={onAnother} className={ROW_ACTION_PRIMARY}>
          {t("File another")}
        </button>
        <button type="button" onClick={() => openUrl(url)} className={ROW_ACTION}>
          <GitHubIcon size={18} />
          {t("Open the issue again")}
        </button>
        <button
          type="button"
          onClick={() => openUrl(`${HARBOR_REPO_URL}/pulls`)}
          className={ROW_ACTION}
        >
          <GitPullRequest size={18} strokeWidth={1.9} />
          {t("Pitch a fix as a PR")}
        </button>
      </div>
    </section>
  );
}
