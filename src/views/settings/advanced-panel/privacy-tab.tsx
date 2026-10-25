import { useT } from "@/lib/i18n";
import { Section } from "../shared";
import { PrivacyRow } from "../privacy-row";

export function PrivacyTab() {
  const t = useT();
  return (
    <>
      <Section
        title={t("Privacy")}
        subtitle={t(
          "Choose whether to block requests to known advertising, analytics, and tracking services.",
        )}
      >
        <PrivacyRow />
      </Section>
    </>
  );
}
