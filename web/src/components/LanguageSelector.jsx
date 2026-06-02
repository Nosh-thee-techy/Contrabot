import { useTranslation } from "react-i18next";
import { Select, SelectItem } from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";

const LANGS = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
  { value: "lg", label: "Luganda" },
  { value: "fr", label: "Français" },
];

export function LanguageSelector({ className }) {
  const { i18n } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (
    <div className={className}>
      <Select
        value={language}
        onValueChange={(v) => {
          setLanguage(v);
          i18n.changeLanguage(v);
        }}
        placeholder="Language"
      >
        {LANGS.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
