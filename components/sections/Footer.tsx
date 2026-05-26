export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* О сервисе */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              ЦФА.Навигатор
            </h3>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              Агрегатор цифровых финансовых активов для сравнения и подбора
              лучших предложений от российских операторов. Помогаем
              инвестировать легально и безопасно.
            </p>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Контакты
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://t.me/cfa_navigation_rf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  📱 Telegram: @cfa_navigation_rf
                </a>
              </li>
              <li>
                <a
                  href="mailto:alex@gippy.ru"
                  className="hover:text-primary transition-colors"
                >
                  ✉️ Email: alex@gippy.ru
                </a>
              </li>
            </ul>
          </div>

          {/* Ссылки */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Информация
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/blog" className="hover:text-primary transition-colors">
                  Блог о ЦФА
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Политика конфиденциальности
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Пользовательское соглашение
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Дисклеймер
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
