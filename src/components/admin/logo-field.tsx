"use client";

import { useState } from "react";
import { Label } from "@/components/ui/card";

export function LogoField({ current }: { current: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const shown = removed ? null : preview ?? current;

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="logoFile">Logo</Label>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">Sin logo</span>
          )}
        </div>
        <input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
            if (file) setRemoved(false);
          }}
        />
      </div>
      {current ? (
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            name="removeLogo"
            checked={removed}
            onChange={(e) => {
              setRemoved(e.target.checked);
              if (e.target.checked) setPreview(null);
            }}
          />
          Quitar el logo actual
        </label>
      ) : null}
      <p className="text-xs text-gray-400">PNG, JPG o SVG. Máximo 800 KB.</p>
    </div>
  );
}
