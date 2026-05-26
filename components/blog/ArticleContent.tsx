import type { ArticleSection } from '@/data/blog/types';
import { Info, AlertTriangle, Lightbulb, AlertCircle } from 'lucide-react';

function Callout({
  variant,
  title,
  text,
}: {
  variant: 'info' | 'warning' | 'tip' | 'danger';
  title?: string;
  text: string;
}) {
  const styles = {
    info: {
      wrapper: 'bg-primary/5 border-primary/20 text-primary',
      icon: <Info className="h-5 w-5 shrink-0 mt-0.5" />,
    },
    warning: {
      wrapper: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />,
    },
    tip: {
      wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />,
    },
    danger: {
      wrapper: 'bg-red-50 border-red-200 text-red-700',
      icon: <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />,
    },
  };

  const { wrapper, icon } = styles[variant];

  return (
    <div className={`flex gap-3 rounded-xl border p-4 mb-6 ${wrapper}`}>
      {icon}
      <div className="min-w-0">
        {title && <p className="font-semibold mb-1 text-sm">{title}</p>}
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function CtaBlock({
  variant,
  title,
  text,
  buttonLabel,
}: {
  variant: 'form' | 'telegram';
  title: string;
  text: string;
  buttonLabel: string;
}) {
  const href = variant === 'form' ? '#form' : 'https://t.me/cfa_navigation_rf';
  const external = variant === 'telegram';

  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 p-6 my-8">
      <p className="font-bold text-foreground text-lg mb-2">{title}</p>
      <p className="text-muted-foreground text-sm mb-4">{text}</p>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="inline-block rounded-lg bg-warning text-warning-foreground px-6 py-3 text-sm font-semibold hover:bg-warning/90 transition-colors"
      >
        {buttonLabel}
      </a>
    </div>
  );
}

function ArticleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            {headers.map((h, i) => (
              <th key={i} className="py-2 px-3 text-left font-semibold text-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border hover:bg-muted/30 transition-colors">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="py-2 px-3 text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ArticleContent({ sections }: { sections: ArticleSection[] }) {
  return (
    <div>
      {sections.map((section, i) => {
        switch (section.type) {
          case 'paragraph':
            return (
              <p
                key={i}
                className="text-base text-muted-foreground leading-relaxed mb-5"
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            );

          case 'h2':
            return (
              <h2
                key={i}
                id={section.id}
                className="text-2xl font-bold text-foreground mt-10 mb-4 scroll-mt-20"
              >
                {section.text}
              </h2>
            );

          case 'h3':
            return (
              <h3
                key={i}
                id={section.id}
                className="text-xl font-semibold text-foreground mt-6 mb-3 scroll-mt-20"
              >
                {section.text}
              </h3>
            );

          case 'ul':
            return (
              <ul key={i} className="list-disc pl-6 space-y-2 mb-5 text-muted-foreground">
                {section.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={i} className="list-decimal pl-6 space-y-2 mb-5 text-muted-foreground">
                {section.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ol>
            );

          case 'callout':
            return (
              <Callout
                key={i}
                variant={section.variant}
                title={section.title}
                text={section.text}
              />
            );

          case 'table':
            return <ArticleTable key={i} headers={section.headers} rows={section.rows} />;

          case 'highlight':
            return (
              <blockquote
                key={i}
                className="border-l-4 border-primary pl-5 py-2 italic text-foreground font-medium mb-6 bg-primary/5 rounded-r-lg"
              >
                {section.text}
              </blockquote>
            );

          case 'cta':
            return (
              <CtaBlock
                key={i}
                variant={section.variant}
                title={section.title}
                text={section.text}
                buttonLabel={section.buttonLabel}
              />
            );

          case 'divider':
            return <hr key={i} className="border-t border-border my-8" />;

          default:
            return null;
        }
      })}
    </div>
  );
}
