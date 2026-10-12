"use client";

import { useState } from "react";
import type { AttendanceStatus } from "@/generated/prisma/client";
import type { FormState } from "@/app/admin/_actions";
import { saveAttendance } from "@/app/admin/_actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "PRESENT", label: "Presente" },
  { value: "ABSENT", label: "Faltó" },
  { value: "LATE", label: "Tardanza" },
  { value: "JUSTIFIED", label: "Justificado" },
];

export function AsistenciaGrid({
  students,
  sectionId,
  date,
  initialStatuses,
}: {
  students: { id: string; name: string }[];
  sectionId: string;
  date: string;
  initialStatuses: Record<string, AttendanceStatus>;
}) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const out: Record<string, AttendanceStatus> = {};
    for (const st of students) out[st.id] = initialStatuses[st.id] ?? "PRESENT";
    return out;
  });
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
    setState({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const records = students.map((st) => ({
      studentId: st.id,
      status: statuses[st.id] ?? "PRESENT",
    }));

    const formData = new FormData();
    formData.set("sectionId", sectionId);
    formData.set("date", date);
    formData.set("records", JSON.stringify(records));

    setPending(true);
    const res = await saveAttendance({}, formData);
    setPending(false);
    setState(res);
    if (!res.error) setSavedAt(new Date());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {students.length === 0 ? (
        <p className="text-sm text-gray-500">Esta sección no tiene alumnos matriculados.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Alumno</TableHead>
                  <TableHead className="min-w-40">Estado del día</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    <TableCell>
                      <Select
                        value={statuses[st.id] ?? "PRESENT"}
                        onChange={(e) => updateStatus(st.id, e.target.value as AttendanceStatus)}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2">
            {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            {savedAt && !state.error ? <p className="text-sm text-green-600">Asistencia guardada.</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar asistencia"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}