import { updateSchoolSettings } from "@/app/admin/_actions";
import { getSchoolSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/admin/form";
import { LogoField } from "@/components/admin/logo-field";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const s = await getSchoolSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configuración del colegio</h1>
        <p className="text-sm text-gray-500">
          Estos datos aparecen en el panel y en los documentos PDF (boleta de pago, boletín de notas y
          constancia de matrícula).
        </p>
      </div>

      <Form action={updateSchoolSettings} submitLabel="Guardar configuración">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Identidad</CardTitle>
              <CardDescription>Nombre y marca de la institución.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Razón social / nombre</Label>
                <Input id="name" name="name" required defaultValue={s.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shortName">Nombre corto (marca)</Label>
                <Input id="shortName" name="shortName" required defaultValue={s.shortName} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="slogan">Lema / descripción corta</Label>
                <Input id="slogan" name="slogan" defaultValue={s.slogan ?? ""} placeholder="Inicial · Primaria · Secundaria · Academia" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ruc">RUC</Label>
                <Input id="ruc" name="ruc" defaultValue={s.ruc ?? ""} placeholder="Ej. 20512345678" />
              </div>
              <LogoField current={s.logoUrl} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contacto</CardTitle>
                <CardDescription>Dirección, teléfono y web.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" name="address" defaultValue={s.address ?? ""} placeholder="Av. Ejemplo 123, Lima" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" defaultValue={s.phone ?? ""} placeholder="(01) 555-5555" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Correo</Label>
                    <Input id="email" name="email" type="email" defaultValue={s.email ?? ""} placeholder="informes@colegio.edu.pe" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="website">Sitio web</Label>
                  <Input id="website" name="website" defaultValue={s.website ?? ""} placeholder="colegio.edu.pe" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dirección y estilo</CardTitle>
                <CardDescription>Firma del director y color institucional.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="directorName">Director(a)</Label>
                    <Input id="directorName" name="directorName" defaultValue={s.directorName ?? ""} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="directorDocument">DNI</Label>
                    <Input id="directorDocument" name="directorDocument" defaultValue={s.directorDocument ?? ""} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="primaryColor">Color institucional</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="primaryColor"
                      name="primaryColor"
                      type="color"
                      defaultValue={s.primaryColor}
                      className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
                    />
                    <span className="text-sm text-gray-500">Se usa en encabezados y tablas de los PDF.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Form>
    </div>
  );
}
