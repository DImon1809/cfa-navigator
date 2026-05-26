import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <a
      href="/documents/Пользовательское соглашение.pdf"
      download="Пользовательское соглашение.pdf"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/50 transition-colors"
    >
      <Download className="h-4 w-4" />
      Скачать PDF
    </a>
  );
}
