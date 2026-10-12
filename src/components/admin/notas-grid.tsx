"use client";

import { useState } from "react";
import type { FormState } from "@/app/admin/_actions";
import { saveGrades } from "@/app/admin/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type GridStudent = { id: string; name: string };
export type GridCourse = { id: string; name: string };

export function NotasGrid({
  students,
  courses,
  initialGrades,
  term,
}: {
  students: GridStudent[];
  courses: GridCourse[];
  initialGrades: Record<string, Record<string, number | null>>;
  term: string;
}) {
  const [values, setValues] = useState<Record<string, Record<string, string>>>(
    () => {
      const out: Record<string, Record<string, string>> = {};
      for (const st of students) {
        out[st.id] = {};
        for (const c of courses) {
          const score = initialGrades[st.id]?.[c.id];
          out[st.id][c.id] = score === null || score === undefined ? "" : String(score);
        }
      }
      return out;
    },
  );
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function updateValue(studentId: string, courseId: string, value: string) {
    setValues((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [courseId]: value },
    }));
    setState({});
  }

  function parseScore(raw: string): number | null {
    const t = raw.trim();
    if (t === "") return null;
    const n = Number(t);
    if (Number.isNaN(n) || n < 0 || n > 20) return null;
    return Math.round(n * 2) / 2;
  }

  function average(studentId: string): string {
    const nums = courses
      .map((c) => parseScore(values[studentId]?.[c.id] ?? ""))
      .filter((n): n is number => n !== null);
    if (nums.length === 0) return "—";
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return avg.toFixed(1);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const grades: { studentId: string; courseId: string; score: number | null }[] = [];
    let hasInvalid = false;

    for (const st of students) {
      for (const c of courses) {
        const raw = values[st.id]?.[c.id] ?? "";
        const score = parseScore(raw);
        if (score === null && raw.trim() !== "") hasInvalid = true;
        grades.push({ studentId: st.id, courseId: c.id, score });
      }
    }

    if (hasInvalid) {
      setState({ error: "Hay notas fuera del rango 0–20 o mal escritas." });
      return;
    }

    const formData = new FormData();
    formData.set("grades", JSON.stringify(grades));
    formData.set("term", term);

    setPending(true);
    const res = await saveGrades({}, formData);
    setPending(false);
    setState(res);
    if (!res.error) setSavedAt(new Date());
  }

  return (
    <div className="flex flex-col gap-4">
      {courses.length === 0 ? (
        <p className="text-sm text-amber-700">
          Esta sección no tiene cursos configurados.{" "}
          <a href="/admin/cursos" className="underline">Crear cursos</a> primero.
        </p>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500">
          Esta sección no tiene alumnos matriculados.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-44">Alumno</TableHead>
                  {courses.map((c) => (
                    <TableHead key={c.id} className="min-w-24 text-center">{c.name}</TableHead>
                  ))}
                  <TableHead className="min-w-16 text-center">Prom.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    {courses.map((c) => (
                      <TableCell key={c.id}>
                        <Input
                          type="number"
                          step="0.5"
                          min={0}
                          max={20}
                          inputMode="decimal"
                          placeholder="—"
                          className="text-center"
                          value={values[st.id]?.[c.id] ?? ""}
                          onChange={(e) => updateValue(st.id, c.id, e.target.value)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold text-gray-700">
                      {average(st.id)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              {state.error ? <p className="text-red-600">{state.error}</p> : null}
              {savedAt && !state.error ? (
                <p className="text-green-600">Notas guardadas.</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Rango 0 – 20 · paso 0.5</span>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Guardar notas"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}