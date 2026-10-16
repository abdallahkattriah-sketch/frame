import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { TRAKT_NEW_APP_URL, TRAKT_REDIRECT_URI } from "@/lib/trakt/config";
import { hasTraktClientId } from "@/lib/trakt/credentials";
import { ExtLink, KeyField, ROW_DESC } from "../shared";

export function TraktAppCredentials() {
  const t = useT();
  const { settings, update } = useSettings();
  const [idDraft, setIdDraft] = useState(settings.traktClientId);
  const [secretDraft, setSecretDraft] = useState(settings.traktClientSecret);
  const [saved, setSaved] = useState<"id" | "secret" | null>(null);
  const missing = !idDraft.trim() && !hasTraktClientId();

  return (
    <div className="flex flex-col gap-4">
      <ol className={`list-decimal space-y-1 ps-5 ${ROW_DESC}`}>
        <li>
          {t("Open")} <ExtLink href={TRAKT_NEW_APP_URL}>app.trakt.tv/settings/apps</ExtLink>{" "}
          {t("and create a new API app. Trakt asks you to link a verified GitHub account first.")}
        </li>
        <li>
          {t("Give it any name, and enter this Redirect URI:")}{" "}
          <code className="select-all">{TRAKT_REDIRECT_URI}</code>
        </li>
        <li>{t("Save the app, then copy its Client ID below. The Client Secret is optional.")}</li>
      </ol>
      {missing && (
        <p className={`${ROW_DESC} text-danger`}>
          {t("Add your Trakt Client ID to connect. Without it Harbor cannot sign in to Trakt.")}
        </p>
      )}
      <KeyField
        label={t("Trakt Client ID")}
        placeholder={t("Client ID of your Trakt app")}
        value={idDraft}
        onChange={setIdDraft}
        onSave={() => {
          update({ traktClientId: idDraft.trim() });
          setSaved("id");
        }}
        saved={saved === "id"}
        help={t("Used for sign-in and every Trakt request made on your behalf.")}
      />
      <KeyField
        label={t("Trakt Client Secret (optional)")}
        placeholder={t("Client Secret of your Trakt app")}
        value={secretDraft}
        onChange={setSecretDraft}
        onSave={() => {
          update({ traktClientSecret: secretDraft.trim() });
          setSaved("secret");
        }}
        saved={saved === "secret"}
        help={t(
          "Trakt does not need it for device sign-in. Fill it in only if Trakt rejects the sign-in without it.",
        )}
      />
    </div>
  );
}
