import { HARBOR_ISSUES_URL } from "@/lib/config/endpoints";
import { openUrl } from "@/lib/window";

declare const __APP_VERSION__: string;

// GitHub answers 500 for issue links around 7 KB, so long fields are trimmed to fit under this.
const MAX_URL = 6000;

export type Severity = "low" | "normal" | "high" | "critical";

export type BugReportInput = {
  summary: string;
  severity: Severity;
  steps: string;
  expected: string;
  actual: string;
  reporterName: string;
  reporterGithub: string;
  reporterContact: string;
  consentCredit: boolean;
  files: File[];
};

export type Diagnostics = {
  appVersion: string;
  os: string;
  osVersion: string;
  ua: string;
  viewport: string;
  locale: string;
  flags: {
    playerEngine: string;
    region: string;
    hasTmdb: boolean;
    hasRpdb: boolean;
    hasTrakt: boolean;
    hasStremio: boolean;
    debridCount: number;
    addonCount: number | null;
    iptvCount: number;
  };
  mpvProbe: { available: boolean; version: string | null; error: string | null } | null;
  recentErrors: Array<{ ts: number; msg: string; src?: string }>;
};

const ERR_BUFFER: Array<{ ts: number; msg: string; src?: string }> = [];
const MAX_ERRORS = 50;
let installed = false;

export function installBugReportErrorCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    push(
      `${e.message}${e.filename ? ` (${e.filename}:${e.lineno ?? "?"})` : ""}`,
      "window.onerror",
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as unknown;
    const msg = r instanceof Error ? `${r.name}: ${r.message}` : String(r);
    push(msg, "unhandledrejection");
  });
}

function push(msg: string, src?: string) {
  ERR_BUFFER.push({ ts: Date.now(), msg: msg.slice(0, 600), src });
  while (ERR_BUFFER.length > MAX_ERRORS) ERR_BUFFER.shift();
}

export function getRecentErrors() {
  return ERR_BUFFER.slice();
}

export async function collectDiagnostics(opts: {
  playerEngine: string;
  region: string;
  hasTmdb: boolean;
  hasRpdb: boolean;
  hasTrakt: boolean;
  hasStremio: boolean;
  debridCount: number;
  addonCount: number | null;
  iptvCount: number;
}): Promise<Diagnostics> {
  let osName = "unknown";
  let osVer = "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/windows nt 10/i.test(ua)) osName = "Windows";
  else if (/mac os x/i.test(ua)) osName = "macOS";
  else if (/linux/i.test(ua)) osName = "Linux";
  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const modName = "@tauri-apps/plugin-os";
      const osMod: { platform?: () => Promise<string>; version?: () => Promise<string> } =
        await import(/* @vite-ignore */ modName).catch(() => ({}));
      try {
        osName = (await osMod.platform?.()) || osName;
      } catch {}
      try {
        osVer = (await osMod.version?.()) || "";
      } catch {}
    }
  } catch {}

  const viewport =
    typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "";

  let mpvProbe: Diagnostics["mpvProbe"] = null;
  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { probeMpv } = await import("@/lib/player/mpv");
      const probe = await probeMpv();
      mpvProbe = { available: probe.available, version: probe.version, error: probe.error };
    }
  } catch {}

  return {
    appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev",
    os: osName,
    osVersion: osVer,
    ua,
    viewport,
    locale: typeof navigator !== "undefined" ? navigator.language : "",
    flags: opts,
    mpvProbe,
    recentErrors: getRecentErrors().slice(-20),
  };
}

function appVersion(): string {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
}

function errorLines(errors: Diagnostics["recentErrors"]): string {
  return errors.map((e) => `${new Date(e.ts).toISOString()} ${e.src ?? ""} ${e.msg}`).join("\n");
}

function issueUrl(title: string, body: string, labels: string[]): string {
  const build = (text: string) =>
    `${HARBOR_ISSUES_URL}/new?title=${encodeURIComponent(title)}&labels=${encodeURIComponent(labels.join(","))}&body=${encodeURIComponent(text)}`;
  let text = body;
  while (build(text).length > MAX_URL && text.length > 200) {
    text = `${text.slice(0, Math.floor(text.length * 0.8))}\n\n_(trimmed to fit a GitHub link)_`;
  }
  return build(text);
}

// Opens a prefilled GitHub issue; the user reviews it and presses Submit on GitHub.
export function openErrorReportIssue(args: {
  code: string;
  title: string;
  message: string;
  detail?: string;
}): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const path = typeof window !== "undefined" ? window.location.pathname + window.location.hash : "";
  const body = [
    `**Error:** \`${args.code}\` ${args.title}`,
    `**Message:** ${args.message}`,
    `**Frame:** ${appVersion()}`,
    `**User agent:** ${ua}`,
    path ? `**Screen:** \`${path}\`` : "",
    args.detail ? `\n**Technical detail**\n\n\`\`\`\n${args.detail}\n\`\`\`` : "",
    `\n**Recent errors**\n\n\`\`\`\n${errorLines(getRecentErrors().slice(-20))}\n\`\`\``,
    "\n**What were you doing when it happened?**\n\n",
  ]
    .filter(Boolean)
    .join("\n");
  const url = issueUrl(`[Bug]: [${args.code}] ${args.title}`.slice(0, 200), body, ["bug"]);
  openUrl(url);
  return url;
}

export function openBugReportIssue(input: BugReportInput, diag: Diagnostics): string {
  const section = (heading: string, text: string) => (text ? `### ${heading}\n\n${text}\n` : "");
  const reporter = [
    input.reporterName && `**Name:** ${input.reporterName}`,
    input.reporterGithub && `**GitHub:** @${input.reporterGithub}`,
    input.reporterContact && `**Contact:** ${input.reporterContact}`,
    input.consentCredit ? "**Credit:** yes, credit me in the release notes" : "",
  ]
    .filter(Boolean)
    .join("\n");
  const body = [
    `**Severity:** ${input.severity}`,
    "",
    section("Steps to reproduce", input.steps),
    section("Expected", input.expected),
    section("What happened", input.actual),
    input.files.length
      ? `### Attachments\n\nDrag these files into this issue: ${input.files.map((f) => `\`${f.name}\``).join(", ")}\n`
      : "",
    reporter ? `### Reporter\n\n${reporter}\n` : "",
    "### Diagnostics\n",
    `- **Frame:** ${diag.appVersion}`,
    `- **OS:** ${diag.os} ${diag.osVersion}`.trimEnd(),
    `- **Viewport:** ${diag.viewport}`,
    `- **Locale:** ${diag.locale}`,
    `- **Player engine:** ${diag.flags.playerEngine}, **region:** ${diag.flags.region}`,
    `- **mpv:** ${diag.mpvProbe ? (diag.mpvProbe.available ? (diag.mpvProbe.version ?? "available") : `unavailable (${diag.mpvProbe.error ?? "unknown"})`) : "n/a"}`,
    `- **Services:** TMDB ${diag.flags.hasTmdb ? "yes" : "no"}, RPDB ${diag.flags.hasRpdb ? "yes" : "no"}, Trakt ${diag.flags.hasTrakt ? "yes" : "no"}, Stremio ${diag.flags.hasStremio ? "yes" : "no"}, ${diag.flags.debridCount} debrid, ${diag.flags.addonCount ?? "?"} addons, ${diag.flags.iptvCount} IPTV`,
    diag.recentErrors.length
      ? `\n<details><summary>Recent errors</summary>\n\n\`\`\`\n${errorLines(diag.recentErrors)}\n\`\`\`\n</details>`
      : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
  const url = issueUrl(`[Bug]: ${input.summary}`.slice(0, 200), body, ["bug"]);
  openUrl(url);
  return url;
}
