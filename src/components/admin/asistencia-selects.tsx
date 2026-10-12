"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

export type SectionGroupOption = { value: string; label: string };
export type SectionGroup = { label: string; options: SectionGroupOption[] };

export function AsistenciaSelects({
  groups,
  sectionId,
  date,
}: {
  groups: SectionGroup[];
  sectionId: string | null;
  date: string;
}) {
  const router = useRouter();

  function navigate(sec: string, day: string) {
    const params = new URLSearchParams();
    if (sec) params.set("section", sec);
    if (day) params.set("date", day);
    router.push(`/admin/asistencia?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asist-section">Sección</Label>
        <Select
          id="asist-section"
          value={sectionId ?? ""}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            navigate(e.target.value, params.get("date") ?? date);
          }}
        >
          <option value="">— Seleccionar sección —</option>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asist-date">Fecha</Label>
        <Input
          id="asist-date"
          type="date"
          value={date}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            navigate(params.get("section") ?? "", e.target.value);
          }}
        />
      </div>
    </div>
  );
}