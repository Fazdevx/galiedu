import { colorTokens } from "@/lib/color";
import type { SchoolInfo } from "@/lib/settings";

export function ThemeStyle({ school }: { school: SchoolInfo }) {
  const tokens = colorTokens(school.primaryColor);
  return <style dangerouslySetInnerHTML={{ __html: tokens.css }} />;
}