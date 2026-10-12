"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { CardContent, Label } from "@/components/ui/card";

type Option = { id: string; label: string };

export function BoletínForm({
  students,
  years,
  defaultYearId,
}: {
  students: Option[];
  years: Option[];
  defaultYearId?: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [yearId, setYearId] = useState(defaultYearId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !yearId) return;
    router.push(`/admin/boletines/${studentId}?year=${yearId}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="studentId">Alumno</Label>
          <Select
            id="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          >
            <option value="">— Selecciona —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="yearId">Año académico</Label>
          <Select id="yearId" value={yearId} onChange={(e) => setYearId(e.target.value)} required>
            <option value="">— Selecciona —</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </Select>
        </div>
        <Button type="submit">Generar boletín</Button>
        <p className="text-xs text-gray-400">El boletín se abre en PDF para imprimir o guardar.</p>
      </CardContent>
    </form>
  );
}