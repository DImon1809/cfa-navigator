'use client';

import { Card } from '@/components/ui/Card';
import { useInView } from '@/lib/use-in-view';

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
  const { ref: headingRef, inView: headingVisible } = useInView(0.4);
  const { ref: cardsRef,   inView: cardsVisible   } = useInView(0.1);

  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Заголовок */}
        <div
          ref={headingRef}
          className="mb-12 text-center transition-all duration-700"
          style={{
            opacity:   headingVisible ? 1 : 0,
            transform: headingVisible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Знакомая ситуация?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Мы понимаем сложности инвестирования в крипто в России. Вот как ЦФА решают эти проблемы.
          </p>
        </div>

        {/* Карточки со стаггером */}
        <div ref={cardsRef} className="grid gap-8 md:grid-cols-3">
          {pains.map((pain, i) => (
            <div
              key={pain.id}
              className="transition-all duration-700"
              style={{
                transitionDelay: cardsVisible ? `${i * 150}ms` : '0ms',
                opacity:   cardsVisible ? 1 : 0,
                transform: cardsVisible ? 'translateY(0)' : 'translateY(40px)',
              }}
            >
              <Card
                variant="bordered"
                className="group flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/30"
              >
                <div className="flex flex-1 flex-col p-6">

                  {/* Иконка с bounce-задержкой */}
                  <div
                    className="mb-4 text-5xl transition-all duration-500 group-hover:scale-110"
                    style={{
                      transitionDelay: cardsVisible ? `${i * 150 + 200}ms` : '0ms',
                      opacity:   cardsVisible ? 1 : 0,
                      transform: cardsVisible ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(12px)',
                    }}
                  >
                    {pain.icon}
                  </div>

                  <h3 className="mb-3 text-xl font-semibold text-foreground">
                    {pain.title}
                  </h3>

                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    {pain.description}
                  </p>

                  {/* Решение */}
                  <div className="mt-auto rounded-lg bg-success/10 p-4 transition-all duration-300 group-hover:bg-success/15">
                    <div className="mb-2 flex items-center text-sm font-medium text-success">
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Решение
                    </div>
                    <p className="text-sm text-foreground">{pain.solution}</p>
                  </div>

                </div>
              </Card>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
