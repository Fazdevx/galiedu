"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/card";
import { Select } from "@/components/ui/input";

export type SectionGroupOption = { value: string; label: string };
export type SectionGroup = { label: string; options: SectionGroupOption[] };

const TERMS = ["P1", "P2", "P3", "P4"] as const;

export function NotasSelects({
  groups,
  sectionId,
  term,
}: {
  groups: SectionGroup[];
  sectionId: string | null;
  term: string;
}) {
  const router = useRouter();

  function change(sec: string, trm: string) {
    const params = new URLSearchParams();
    if (sec) params.set("section", sec);
    params.set("term", trm);
    router.push(`/admin/notas?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notas-section">Sección</Label>
        <Select
          id="notas-section"
          value={sectionId ?? ""}
          onChange={(e) => {
            const sec = e.target.value;
            change(sec, e.currentTarget.form ? new URLSearchParams(window.location.search).get("term") ?? term : term);
          }}
        >
          <option value="">— Seleccionar sección —</option>
          {groups.map((g, i) => (
            <optgroup key={`${g.label}-${i}`} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notas-term">Periodo</Label>
        <Select
          id="notas-term"
          value={term}
          onChange={(e) => {
            const currentSection = new URLSearchParams(window.location.search).get("section");
            change(currentSection ?? "", e.target.value);
          }}
        >
          {TERMS.map((t) => (
            <option key={t} value={t}>Período {t.replace("P", "")}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}