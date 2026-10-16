import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { MAL_DEVELOPER_URL, MAL_SUGGESTED_REDIRECT_URI } from "@/lib/mal/config";
import { hasMalClientId } from "@/lib/mal/credentials";
import { ExtLink, KeyField, ROW_DESC } from "./shared";

export function MalAppCredentials() {
  const t = useT();
  const { settings, update } = useSettings();
  const [draft, setDraft] = useState(settings.malClientId);
  const [saved, setSaved] = useState(false);
  const missing = !draft.trim() && !hasMalClientId();

  return (
    <div className="flex flex-col gap-4">
      <ol className={`list-decimal space-y-1 ps-5 ${ROW_DESC}`}>
        <li>
          {t("Open")} <ExtLink href={MAL_DEVELOPER_URL}>myanimelist.net/apiconfig</ExtLink>{" "}
          {t("and click Create ID.")}
        </li>
        <li>{t('Set App Type to "other", so MyAnimeList does not issue a client secret.')}</li>
        <li>
          {t("Enter this App Redirect URL:")}{" "}
          <code className="select-all">{MAL_SUGGESTED_REDIRECT_URI}</code>
        </li>
        <li>
          {t("Fill in the remaining required fields, submit, then copy the Client ID below.")}
        </li>
      </ol>
      {missing && (
        <p className={`${ROW_DESC} text-danger`}>
          {t("Add your MAL Client ID to connect. Without it Harbor cannot sign in to MyAnimeList.")}
        </p>
      )}
      <KeyField
        label={t("MAL Client ID")}
        placeholder={t("Client ID of your MyAnimeList app")}
        value={draft}
        onChange={setDraft}
        onSave={() => {
          update({ malClientId: draft.trim() });
          setSaved(true);
        }}
        saved={saved}
        help={t(
          "After you approve Harbor, MyAnimeList sends your browser to that address. The page will not load: copy the full address from the address bar and paste it into Harbor.",
        )}
      />
    </div>
  );
}
