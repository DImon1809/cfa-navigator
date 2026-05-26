'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Shield, TrendingUp, Zap, Layers,
  Clock, CalendarDays, Calendar, CalendarRange,
  ChevronLeft, Check,
} from 'lucide-react';

type Step = 'amount' | 'goal' | 'term' | 'contact';

const amounts = [
  { value: 'до 50к',    label: 'До 50 000 ₽',        qual: false },
  { value: '50-150к',   label: '50–150 тыс. ₽',       qual: false },
  { value: '150-300к',  label: '150–300 тыс. ₽',      qual: false },
  { value: '300к-1млн', label: '300 тыс. — 1 млн ₽',  qual: true  },
  { value: '>1млн',     label: 'Больше 1 млн ₽',      qual: true  },
];

const goals = [
  { value: 'сохранить от инфляции', label: 'Сохранить от инфляции',           hint: 'Обогнать вклад без лишнего риска',               Icon: Shield      },
  { value: 'получить доход',        label: 'Получить стабильный доход',        hint: 'Фиксированная ставка — знаю сколько получу',     Icon: TrendingUp  },
  { value: 'рост курса btc/золота', label: 'Заработать на росте BTC или золота', hint: 'Потенциал выше, но доход зависит от курса',   Icon: Zap         },
  { value: 'диверсификация',        label: 'Не держать всё в одном месте',     hint: 'Часть средств — в новый класс активов',         Icon: Layers      },
];

const terms = [
  { value: 'до 3 мес', label: 'До 3 месяцев',  Icon: Clock         },
  { value: '3-6 мес',  label: '3–6 месяцев',   Icon: CalendarDays  },
  { value: '6-12 мес', label: '6–12 месяцев',  Icon: Calendar      },
  { value: '>года',    label: 'Больше года',    Icon: CalendarRange },
];

const stepLabels: Record<Step, string> = {
  amount:  'Осталось 3 вопроса',
  goal:    'Осталось 2 вопроса',
  term:    'Последний вопрос',
  contact: 'Почти готово — введите контакт',
};

const stepQuestions: Record<Step, string> = {
  amount: 'С какой суммой начнём?',
  goal: 'Что сейчас важнее?',
  term: 'Когда могут понадобиться эти деньги?',
  contact: 'Куда отправить ваш персональный разбор?',
};

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ url: window.location.href, title: 'ЦФА.Навигатор' });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <Button variant="outline" onClick={handleShare}>
      {copied ? '✓ Ссылка скопирована' : 'Переслать ссылку другу'}
    </Button>
  );
}

export function QuickLeadForm() {
  const [step, setStep] = useState<Step>('amount');
  const [formData, setFormData] = useState({
    amount: '',
    goal: '',
    term: '',
    contact: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [contactError, setContactError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const TG_RE = /^@[a-zA-Z0-9_]{4,}$/;

  const validateContact = (value: string): string => {
    const v = value.trim();
    if (!v) return 'Введите email или Telegram-ник';
    if (v.startsWith('@')) {
      return TG_RE.test(v) ? '' : 'Telegram-ник: @username (мин. 5 символов, только буквы, цифры и _)';
    }
    return EMAIL_RE.test(v) ? '' : 'Некорректный email — проверьте формат';
  };

  // Предзаполнение суммы из калькулятора (через localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('cfa_prefilled_amount');
    if (saved) {
      setFormData((prev) => ({ ...prev, amount: saved }));
      setStep('goal');
      localStorage.removeItem('cfa_prefilled_amount');
    }
  }, []);

  const currentStepIndex = ['amount', 'goal', 'term', 'contact'].indexOf(step);
  const progress = ((currentStepIndex + 1) / 4) * 100;

  const handleSelect = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (field === 'amount') setStep('goal');
    if (field === 'goal') setStep('term');
    if (field === 'term') setStep('contact');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateContact(formData.contact);
    if (err) { setContactError(err); return; }
    setContactError('');
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        name: '',
        timestamp: new Date().toISOString(),
        source: typeof window !== 'undefined' ? document.referrer || 'direct' : 'direct',
      };

      console.log('📋 Данные формы:', payload);

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn('⚠️ Ошибка отправки:', response.status);
      } else {
        console.log('✅ Данные отправлены');
      }

      setIsSuccess(true);

      if (typeof window !== 'undefined' && (window as any).ym) {
        const counterId = process.env.NEXT_PUBLIC_YM_COUNTER_ID;
        if (counterId) {
          (window as any).ym(counterId, 'reachGoal', 'QUICK_FORM_SUBMIT');
        }
      }
    } catch (error) {
      console.error('❌ Ошибка обработки формы:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section id="form" className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border-2 border-success/30 bg-success/10 p-8 text-center">
              <div className="mb-4 text-5xl">✅</div>
              <h3 className="mb-3 text-2xl font-bold text-foreground">
                Готово. Аналитик уже смотрит на выпуски
                {formData.amount ? ` для суммы ${formData.amount}` : ''}
                {formData.term ? `, горизонт ${formData.term}` : ''}.
              </h3>

              <div className="mb-6 rounded-xl bg-card p-5 text-left text-sm text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground mb-2">Через 60 минут пришлём:</p>
                <p>— 2–3 актуальных выпуска, подходящих под ваш профиль прямо сейчас</p>
                <p>— расчёт дохода для каждого в рублях — не в процентах, а конкретно</p>
                <p>— что нужно знать перед покупкой именно этих выпусков</p>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                Пока ждёте — в нашем канале выходят новые выпуски раньше, чем они
                появляются на платформах. Часть закрывается за первые часы.
              </p>
              <p className="mb-5 text-xs text-muted-foreground/70">
                Информация носит ознакомительный характер и не является индивидуальной
                инвестиционной рекомендацией. Инвестиции в ЦФА не застрахованы государством.
                Доходность не гарантирована.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={() => window.open('https://t.me/cfa_navigation_rf', '_blank')}>
                  Подписаться на канал ЦФА.Навигатор
                </Button>
                <ShareButton />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="form" className="bg-gradient-to-br from-primary/5 to-secondary/5 py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            {/* Левая часть — текст */}
            <div>
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Получите персональный разбор ЦФА за 60 минут
              </h2>
              <p className="mb-4 text-lg text-muted-foreground">
                Укажите сумму, цель и срок. Живой аналитик найдёт 2–3 выпуска с лучшей
                доходностью прямо сейчас — с расчётом в рублях, не в процентах.
              </p>
              <div className="mb-6 inline-flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 hidden md:flex">
                <span className="text-amber-700 mt-0.5 shrink-0">⚡</span>
                <p className="text-sm text-amber-700">
                  Последний выпуск Т-Банка был распродан за 4 часа.
                </p>
              </div>
              <div className="space-y-1.5">
                {[
                  'Без звонков',
                  'Без рассылки',
                  'Один ответ — вы решаете дальше',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Правая часть — форма */}
            <div className="rounded-2xl bg-card p-6 shadow-xl border border-border min-h-[520px] flex flex-col">
              {/* Прогресс */}
              <div className="mb-6 shrink-0">
                <div className="mb-2 flex justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{stepLabels[step]}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Кнопка Назад — общая */}
              {step !== 'amount' && (
                <button
                  onClick={() => {
                    if (step === 'goal') setStep('amount');
                    if (step === 'term') setStep('goal');
                    if (step === 'contact') setStep('term');
                  }}
                  type="button"
                  className="mb-4 flex items-center gap-1 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Назад
                </button>
              )}

              {/* Шаг 1: Сумма */}
              {step === 'amount' && (
                <div>
                  <h3 className="mb-4 text-xl font-bold text-foreground">
                    {stepQuestions.amount}
                  </h3>
                  <div className="space-y-2">
                    {amounts.map((option, i) => (
                      <button
                        key={option.value}
                        onClick={() => handleSelect('amount', option.value)}
                        className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                          formData.amount === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        }`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground">{option.label}</span>
                        {formData.amount === option.value && (
                          <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Для сумм свыше 600 000 ₽/год может потребоваться статус квалинвестора
                  </p>
                </div>
              )}

              {/* Шаг 2: Цель */}
              {step === 'goal' && (
                <div>
                  <h3 className="mb-4 text-xl font-bold text-foreground">
                    {stepQuestions.goal}
                  </h3>
                  <div className="space-y-2">
                    {goals.map(({ value, label, hint, Icon }) => (
                      <button
                        key={value}
                        onClick={() => handleSelect('goal', value)}
                        className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                          formData.goal === value
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0 text-primary" />
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{label}</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>
                        </div>
                        {formData.goal === value && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Шаг 3: Срок */}
              {step === 'term' && (
                <div>
                  <h3 className="mb-4 text-xl font-bold text-foreground">
                    {stepQuestions.term}
                  </h3>
                  <div className="space-y-2">
                    {terms.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => handleSelect('term', value)}
                        className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                          formData.term === value
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0 text-primary" />
                        <span className="font-medium text-foreground">{label}</span>
                        {formData.term === value && (
                          <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Шаг 4: Контакт */}
              {step === 'contact' && (
                <form onSubmit={handleSubmit}>
                  <h3 className="mb-4 text-xl font-bold text-foreground">
                    {stepQuestions.contact}
                  </h3>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Email или Telegram-ник
                  </label>
                  <Input
                    type="text"
                    placeholder="@username или example@mail.ru"
                    autoComplete="email"
                    value={formData.contact}
                    onChange={(e) => {
                      setFormData({ ...formData, contact: e.target.value });
                      if (contactError) setContactError('');
                    }}
                    required
                    className="mb-1"
                  />
                  {contactError ? (
                    <p className="mb-3 text-xs text-danger">{contactError}</p>
                  ) : (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Если есть Telegram — лучше его: разбор придёт прямо в мессенджер.
                    </p>
                  )}
                  {/* Пользовательское соглашение */}
                  <label className="flex items-start gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground leading-snug">
                      Я принимаю условия{' '}
                      <Link
                        href="/user-agreement"
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        Пользовательского соглашения
                      </Link>{' '}
                      и даю согласие на обработку персональных данных
                    </span>
                  </label>

                  <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting} disabled={!agreed}>
                    Получить мой разбор ЦФА
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
