import { useT } from "@/lib/i18n";
import { ExperimentalChangelog } from "@/components/update/experimental-changelog";
import { useInAppUpdatesSupported } from "@/lib/updater/in-app-updates";
import { Section } from "./shared";
import { UpdatesRow } from "./advanced-panel";
import { RollbackRow } from "./rollback-row";
import { BuildFeedback } from "./build-feedback";
import { BackupRow } from "./backup-row";
import { SettingsRecoverRow } from "./settings-recover-row";
import { ExperimentalBuildsSection } from "./experimental-builds-section";
import { readBetaReturnContext } from "@/lib/updater/beta-return";
import { useExperimentalAccess } from "@/lib/updater/experimental-access";

export function UpdatesPanel() {
  const t = useT();
  const supportsInAppUpdates = useInAppUpdatesSupported();
  const experimentalInstalled = readBetaReturnContext(__APP_VERSION__) !== null;
  const experimentalAccess = useExperimentalAccess();

  return (
    <>
      <ExperimentalChangelog />
      {supportsInAppUpdates && (
        <Section
          title={t("Updates")}
          subtitle={t(
            "Frame checks its GitHub releases for new versions and installs them in place. Nothing installs until you choose to, and a dismissed update never nags you again.",
          )}
        >
          <UpdatesRow />
          {!experimentalInstalled && <RollbackRow />}
          <BuildFeedback />
        </Section>
      )}

      {(experimentalAccess || experimentalInstalled) && <ExperimentalBuildsSection />}

      <Section
        title={t("Backup & restore")}
        subtitle={t(
          "Export your entire Frame setup to a single file, then restore it on a new computer or keep it as a backup. Everything is included except your Stremio sign-in.",
        )}
      >
        <SettingsRecoverRow />
        <BackupRow />
      </Section>
    </>
  );
}
