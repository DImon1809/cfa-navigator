const platforms = ['Сбер', 'Т-Банк', 'Атомайз', 'Токеон', 'Альфа', 'ВТБ'];

export function CfaIntro() {
  return (
    <section className="bg-muted/50 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            {/* Объяснение */}
            <div className="max-w-xl">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <strong className="text-foreground">ЦФА</strong> — цифровые финансовые активы,
                выпускаемые российскими банками и платформами под надзором ЦБ РФ (259-ФЗ).
                Доходнее депозита, налоги платит оператор, блокировки счёта нет.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-card border border-border px-3 py-0.5 text-xs text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
                <span className="rounded-full bg-card border border-border px-3 py-0.5 text-xs text-muted-foreground">
                  и другие
                </span>
              </div>
            </div>

            {/* Статистика */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">от 1 000 ₽</div>
                <div className="text-xs text-muted-foreground">порог входа</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <div className="text-lg font-bold text-success">до 34%</div>
                <div className="text-xs text-muted-foreground">доходность / год</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">0 ₽</div>
                <div className="text-xs text-muted-foreground">комиссия за подбор</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
