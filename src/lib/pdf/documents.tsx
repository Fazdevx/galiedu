import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { SchoolInfo } from "@/lib/settings";

export const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 portrait
export const MARGIN = 40;

const styles = StyleSheet.create({
  page: {
    padding: MARGIN,
    paddingBottom: 60,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f766e",
    paddingBottom: 8,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f766e",
  },
  schoolSub: {
    fontSize: 8.5,
    color: "#4b5563",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
    fontSize: 8,
    color: "#6b7280",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 9,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
  },
  dataLabel: {
    color: "#6b7280",
    marginBottom: 2,
    fontSize: 8,
  },
  dataValue: {
    fontSize: 10,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    paddingBottom: 3,
  },
  table: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#d1d5db",
  },
  tableHead: {
    backgroundColor: "#0f766e",
    color: "#ffffff",
    fontWeight: "bold",
    padding: 4,
    fontSize: 8.5,
  },
  tableCell: {
    padding: 4,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#9ca3af",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
  money: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0f766e",
  },
});

type SchoolHeaderProps = {
  school: SchoolInfo;
  yearName?: string;
};

export function SchoolHeader({ school, yearName }: SchoolHeaderProps) {
  const contact = [school.address, school.phone, school.email].filter(Boolean).join(" · ");
  return (
    <View style={[styles.header, { borderBottomColor: school.primaryColor }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        {school.logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={school.logoUrl} style={{ width: 44, height: 44, objectFit: "contain" }} />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              backgroundColor: school.primaryColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
              {school.shortName.charAt(0)}
            </Text>
          </View>
        )}
        <View>
          <Text style={[styles.schoolName, { color: school.primaryColor }]}>{school.shortName}</Text>
          <Text style={styles.schoolSub}>{school.name}</Text>
          {contact ? <Text style={styles.schoolSub}>{contact}</Text> : null}
        </View>
      </View>
      <View style={styles.headerRight}>
        {school.ruc ? <Text>RUC {school.ruc}</Text> : null}
        {yearName ? <Text>Año académico: {yearName}</Text> : null}
        {school.website ? <Text>{school.website}</Text> : null}
      </View>
    </View>
  );
}

export function DocFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>Documento emitido por el sistema Galileo EDU.</Text>
      <Text>Este documento no tiene validez fiscal.</Text>
    </View>
  );
}

type StudentData = {
  fullName: string;
  document?: string;
  levelName?: string;
  gradeName?: string;
  sectionName?: string;
  guardianName?: string;
  guardianPhone?: string;
};

function StudentBlock({ data }: { data: StudentData }) {
  return (
    <View>
      <RowBlock label="Apellidos y nombres" value={data.fullName} />
      {data.document ? <RowBlock label="Documento de identidad" value={data.document} /> : null}
      {data.guardianName ? <RowBlock label="Apoderado/a" value={data.guardianName} /> : null}
      {data.guardianPhone ? <RowBlock label="Teléfono" value={data.guardianPhone} /> : null}
      <LevelBlock data={data} />
    </View>
  );
}

function RowBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 3 }}>
      <Text style={{ width: 170, color: "#6b7280", fontSize: 9 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 10 }}>{value}</Text>
    </View>
  );
}

function LevelBlock({ data }: { data: StudentData }) {
  const parts = [data.levelName, data.gradeName, data.sectionName].filter(Boolean).join(" · ");
  if (!parts) return null;
  return <RowBlock label="Sección" value={parts} />;
}

// ---------------------------------------------------------------------------
// Boleta de pago
// ---------------------------------------------------------------------------

export type BoletaData = {
  receiptNumber: string;
  dateText: string;
  student: StudentData;
  conceptName: string;
  conceptDescription?: string;
  method: string;
  reference?: string;
  amount: number;
  yearTitle: string;
};

export function BoletaDocument({ data, school }: { data: BoletaData; school: SchoolInfo }) {
  return (
    <Document>
      <Page size={PAGE_SIZE} style={styles.page}>
        <SchoolHeader school={school} yearName={data.yearTitle} />

        <View>
          <Text style={styles.title}>BOLETA DE PAGO</Text>
          <Text style={styles.subtitle}>Comprobante de pago N° {data.receiptNumber}</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <StudentBlock data={data.student} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.dataLabel}>FECHA DE PAGO</Text>
            <Text style={styles.dataValue}>{data.dateText}</Text>
          </View>
        </View>

        <View style={styles.sectionTitle}>
          <Text>Detalle del concepto</Text>
        </View>
        <RowBlock label="Concepto" value={data.conceptName} />
        {data.conceptDescription ? (
          <RowBlock label="Detalle" value={data.conceptDescription} />
        ) : null}
        <RowBlock label="Método de pago" value={data.method} />
        {data.reference ? <RowBlock label="Referencia" value={data.reference} /> : null}

        <View style={{ marginTop: 18, alignItems: "flex-end" }}>
          <Text style={{ fontSize: 9.5, color: "#6b7280", marginBottom: 2 }}>Monto pagado</Text>
          <Text style={[styles.money, { color: school.primaryColor }]}>S/ {data.amount.toFixed(2)}</Text>
        </View>

        <DocFooter />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Boletín de notas
// ---------------------------------------------------------------------------

export type BoletínRow = {
  course: string;
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  avg: number | null;
};

export type BoletínData = {
  yearName: string;
  termLabels: string[];
  student: StudentData;
  rows: BoletínRow[];
  attendance: {
    present: number;
    absent: number;
    late: number;
    justified: number;
    total: number;
  };
  issuedAt: string;
};

const TERM_KEYS = ["p1", "p2", "p3", "p4"] as const;

export function BoletínDocument({ data, school }: { data: BoletínData; school: SchoolInfo }) {
  const { student, rows } = data;

  return (
    <Document>
      <Page size={PAGE_SIZE} style={styles.page}>
        <SchoolHeader school={school} yearName={data.yearName} />

        <View>
          <Text style={styles.title}>BOLETÍN DE NOTAS</Text>
          <Text style={styles.subtitle}>Cronograma académico {data.yearName}</Text>
        </View>

        <StudentBlock data={student} />

        <View style={styles.sectionTitle}>
          <Text>Calificaciones</Text>
        </View>

        <View style={[styles.table, { flexDirection: "row" }]}>
          <View style={{ flex: 3, padding: 4, backgroundColor: school.primaryColor }}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 8.5 }}>Área curricular</Text>
          </View>
          {data.termLabels.map((t) => (
            <View key={t} style={[styles.tableHead, { flex: 1, alignItems: "center", backgroundColor: school.primaryColor }]}>
              <Text>{t}</Text>
            </View>
          ))}
          <View style={[styles.tableHead, { flex: 1.2, alignItems: "center", backgroundColor: school.primaryColor }]}>
            <Text>Promedio</Text>
          </View>
        </View>

        {rows.map((r, i) => (
          <View key={i} style={[styles.table, { backgroundColor: i % 2 ? "#f9fafb" : "#fff" }]}>
            <View style={{ flex: 3, padding: 4 }}>
              <Text style={{ fontSize: 9 }}>{r.course}</Text>
            </View>
            {TERM_KEYS.map((k) => (
              <View key={k} style={{ flex: 1, padding: 4, alignItems: "center" }}>
                <Text style={{ fontSize: 9 }}>{r[k] === null ? "—" : r[k]!.toFixed(1)}</Text>
              </View>
            ))}
            <View style={{ flex: 1.2, padding: 4, alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "bold" }}>
                {r.avg === null ? "—" : r.avg.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.sectionTitle}>
          <Text>Asistencia {data.yearName}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.dataValue}>
            Asistencias: {data.attendance.present} · Tardanzas: {data.attendance.late}
          </Text>
          <Text style={styles.dataValue}>
            Faltas: {data.attendance.absent} · Justificadas: {data.attendance.justified}
          </Text>
          <Text style={styles.dataValue}>Total de días: {data.attendance.total}</Text>
        </View>

        <View style={{ marginTop: 34 }}>
          <Text style={{ fontSize: 8, color: "#9ca3af" }}>
            Observaciones: __________________________________________________________________
          </Text>
          <View style={{ marginTop: 40, flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ alignItems: "center", width: "30%" }}>
              <Text style={{ fontSize: 9 }}>______________________________</Text>
              <Text style={{ fontSize: 8.5, marginTop: 2, color: "#4b5563" }}>Director(a)</Text>
            </View>
            <View style={{ alignItems: "center", width: "30%" }}>
              <Text style={{ fontSize: 9 }}>______________________________</Text>
              <Text style={{ fontSize: 8.5, marginTop: 2, color: "#4b5563" }}>Tutor(a)</Text>
            </View>
            <View style={{ alignItems: "center", width: "30%" }}>
              <Text style={{ fontSize: 9 }}>______________________________</Text>
              <Text style={{ fontSize: 8.5, marginTop: 2, color: "#4b5563" }}>Apoderado(a)</Text>
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 8, color: "#9ca3af", marginTop: 24 }}>
          Expedido el {data.issuedAt} · La escala vigente es de 0 a 20. Promedio anual: 0–10 en proceso, 11–20 logrado.
        </Text>

        <DocFooter />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Constancia de matrícula
// ---------------------------------------------------------------------------

export type ConstanciaData = {
  yearName: string;
  student: StudentData;
  issuedAt: string;
};

export function ConstanciaDocument({ data, school }: { data: ConstanciaData; school: SchoolInfo }) {
  const { student } = data;
  return (
    <Document>
      <Page size={PAGE_SIZE} style={styles.page}>
        <SchoolHeader school={school} yearName={data.yearName} />

        <View>
          <Text style={styles.title}>CONSTANCIA DE MATRÍCULA</Text>
          <Text style={styles.subtitle}>Año académico {data.yearName}</Text>
        </View>

        <Text style={{ fontSize: 10, lineHeight: 1.8, textAlign: "justify" }}>
          {`El (La) Director(a) de la Institución Educativa Particular Galileo EDU, que suscribe, hace constar lo siguiente:\n\n`}
          {`Que el (la) estudiante ${student.fullName}${student.document ? `, identificado(a) con DNI N° ${student.document},` : ","} `}
          {`se encuentra formalmente MATRICULADO(A) para el año académico ${data.yearName} en la sección `}
          {`${[student.levelName, student.gradeName, student.sectionName].filter(Boolean).join(", ")} de esta institución.`}
        </Text>

        <Text style={{ fontSize: 10, lineHeight: 1.8, marginTop: 14, textAlign: "justify" }}>
          {`Se expide la presente constancia a solicitud del (la) apoderado(a) ${student.guardianName ?? "interesado(a)"}, `}
          {`para los fines que estime convenientes.`}
        </Text>

        <View style={{ marginTop: 46, alignItems: "center" }}>
          <Text style={{ fontSize: 9 }}>______________________________</Text>
          <Text style={{ fontSize: 8.5, marginTop: 2, color: "#4b5563" }}>
            {school.directorName ?? "Director(a) · " + school.shortName}
          </Text>
          <Text style={{ fontSize: 8, marginTop: 2, color: "#9ca3af" }}>
            {school.directorDocument ? `DNI: ${school.directorDocument}` : school.name}
          </Text>
        </View>

        <DocFooter />
      </Page>
    </Document>
  );
}