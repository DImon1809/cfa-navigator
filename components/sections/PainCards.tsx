import { Card } from '@/components/ui/Card';

const pains = [
  {
    id: 1,
    icon: '🚫',
    title: 'Банк заморозил счёт другу — теперь боишься переводить деньги',
    description:
      'Покупка криптовалюты через P2P или зарубежные биржи грозит блокировкой счёта и вопросами от банка. ЦФА — легальная альтернатива, где вы инвестируете официально через российских операторов.',
    solution: 'ЦФА выпускаются лицензированными операторами и полностью законны в России',
  },
  {
    id: 2,
    icon: '😵',
    title: 'ФНС просит объяснить, откуда деньги с биржи',
    description:
      'С обычной криптовалюты нужно самостоятельно считать налоги, заполнять декларации и доказывать происхождение средств. С ЦФА всё автоматически — оператор сам рассчитает и удержит налог.',
    solution: 'Операторы ЦФА — налоговые агенты, они сами отчитываются в ФНС за вас',
  },
  {
    id: 3,
    icon: '⏰',
    title: 'Пока читал обзоры — выгодный выпуск уже закрылся',
    description:
      'Т-Банк, Сбер, Atomyze, Tokeon — у каждого свои выпуски ЦФА с разными условиями. Некоторые закрываются за несколько часов. Мы собрали все предложения в одном месте.',
    solution: 'У нас все ЦФА в одном месте с фильтрами по доходности, срокам и минимальной сумме',
  },
];

export function PainCards() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок секции */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Знакомая ситуация?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Мы понимаем сложности инвестирования в крипто в России. Вот как ЦФА решают эти проблемы.
          </p>
        </div>

        {/* Карточки с проблемами */}
        <div className="grid gap-8 md:grid-cols-3">
          {pains.map((pain) => (
            <Card key={pain.id} variant="bordered" className="flex flex-col transition-shadow hover:shadow-lg">
              <div className="flex flex-1 flex-col p-6">
                {/* Иконка */}
                <div className="mb-4 text-5xl">{pain.icon}</div>

                {/* Заголовок */}
                <h3 className="mb-3 text-xl font-semibold text-foreground">
                  {pain.title}
                </h3>

                {/* Описание проблемы */}
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {pain.description}
                </p>

                {/* Решение */}
                <div className="mt-auto rounded-lg bg-success/10 p-4">
                  <div className="mb-2 flex items-center text-sm font-medium text-success">
                    <svg
                      className="mr-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Решение
                  </div>
                  <p className="text-sm text-foreground">{pain.solution}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
