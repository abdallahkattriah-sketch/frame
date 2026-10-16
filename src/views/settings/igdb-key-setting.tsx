import { useState } from "react";
import igdbLogo from "@/assets/service-logos/igdb.svg";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { ExtLink, KeyField } from "./shared";

export function IgdbKeySetting() {
  const { settings, update } = useSettings();
  const t = useT();
  const [idDraft, setIdDraft] = useState(settings.igdbClientId);
  const [secretDraft, setSecretDraft] = useState(settings.igdbClientSecret);
  const [saved, setSaved] = useState<"id" | "secret" | null>(null);
  const help = (
    <>
      {t(
        "Game catalogs, details and completion times come from IGDB, which signs in with a Twitch app. Register one for free at",
      )}{" "}
      <ExtLink href="https://dev.twitch.tv/console/apps">dev.twitch.tv/console/apps</ExtLink>
      {". "}
      {t(
        "Use any name, set the OAuth redirect URL to http://localhost, choose the Confidential client type, then copy the client ID and a new secret here.",
      )}
    </>
  );
  return (
    <div className="flex flex-col gap-4">
      <KeyField
        label={t("IGDB · Twitch client ID")}
        placeholder={t("Twitch client ID")}
        iconSrc={igdbLogo}
        value={idDraft}
        onChange={(v) => {
          setIdDraft(v);
          setSaved(null);
        }}
        onSave={() => {
          update({ igdbClientId: idDraft.trim() });
          setSaved("id");
        }}
        saved={saved === "id"}
        help={help}
      />
      <KeyField
        label={t("IGDB · Twitch client secret")}
        placeholder={t("Twitch client secret")}
        iconSrc={igdbLogo}
        value={secretDraft}
        onChange={(v) => {
          setSecretDraft(v);
          setSaved(null);
        }}
        onSave={() => {
          update({ igdbClientSecret: secretDraft.trim() });
          setSaved("secret");
        }}
        saved={saved === "secret"}
        help={t(
          "Harbor exchanges the ID and secret for a Twitch app token and keeps it until it expires. Without both, the Games catalog stays empty.",
        )}
      />
    </div>
  );
}
