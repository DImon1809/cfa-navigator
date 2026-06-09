'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { LeadFormData, LeadFormPayload } from '@/lib/types';

export function LeadForm() {
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    contact: '',
    amount: '',
    goal: '',
    term: '',
    comment: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LeadFormData, string>> = {};

    // Валидация контакта (email или telegram)
    if (!formData.contact.trim()) {
      newErrors.contact = 'Пожалуйста, укажите email или Telegram';
    } else {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact);
      const isTelegram = formData.contact.startsWith('@');
      if (!isEmail && !isTelegram) {
        newErrors.contact = 'Введите корректный email или Telegram (начиная с @)';
      }
    }

    // Валидация суммы
    if (!formData.amount) {
      newErrors.amount = 'Выберите сумму инвестиций';
    }

    // Валидация цели
    if (!formData.goal) {
      newErrors.goal = 'Выберите цель инвестирования';
    }

    // Валидация срока
    if (!formData.term) {
      newErrors.term = 'Выберите срок инвестирования';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: LeadFormPayload = {
        ...formData,
        timestamp: new Date().toISOString(),
        source: typeof window !== 'undefined' ? document.referrer || 'direct' : 'direct',
      };

      const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error('Webhook URL не настроен');
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Ошибка отправки формы');
      }

      // Успех
      setIsSuccess(true);

      // Яндекс.Метрика
      if (typeof window !== 'undefined' && (window as any).ym) {
        const counterId = process.env.NEXT_PUBLIC_YM_COUNTER_ID;
        if (counterId) {
          (window as any).ym(counterId, 'reachGoal', 'FORM_SUBMIT');
        }
      }
    } catch (error) {
      console.error('Ошибка отправки формы:', error);
      setErrors({
        contact: 'Произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section id="form" className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl bg-success/10 p-8 text-center md:p-12">
              <div className="mb-6 text-6xl">✅</div>
              <h3 className="mb-4 text-2xl font-bold text-foreground">
                Отлично! Заявка принята
              </h3>
              <p className="mb-6 text-lg text-muted-foreground">
                Мы пришлём персональную подборку ЦФА в течение часа на указанный вами контакт.
              </p>
              <p className="mb-8 text-muted-foreground">
                А пока подпишитесь на наш Telegram-канал, где мы публикуем новые выпуски ЦФА и
                обучающие материалы.
              </p>
              <Button
                size="lg"
                onClick={() => window.open('https://t.me/cfa_navigation_rf', '_blank')}
                className="bg-primary"
              >
                Перейти в Telegram
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="form" className="bg-gradient-to-br from-primary/5 to-secondary/5 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Заголовок */}
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Получить подборку ЦФА
            </h2>
            <p className="text-lg text-muted-foreground">
              Ответьте на несколько вопросов, и мы подберём для вас оптимальные варианты ЦФА
            </p>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="rounded-xl bg-card p-6 shadow-lg md:p-8">
            <div className="space-y-6">
              {/* Имя (необязательно) */}
              <Input
                label="Имя"
                type="text"
                placeholder="Как к вам обращаться?"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              {/* Email или Telegram */}
              <Input
                label="Email или Telegram"
                type="text"
                placeholder="example@mail.ru или @username"
                required
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                error={errors.contact}
                helperText="Укажите email или Telegram (начиная с @)"
              />

              {/* Сумма инвестиций */}
              <Select
                label="Сумма инвестиций"
                required
                placeholder="Выберите сумму"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                error={errors.amount}
                options={[
                  { value: 'до 50к', label: 'До 50 000 ₽' },
                  { value: '50-150к', label: '50 000 - 150 000 ₽' },
                  { value: '150-300к', label: '150 000 - 300 000 ₽' },
                  { value: '300к-1млн', label: '300 000 ₽ - 1 000 000 ₽' },
                  { value: '>1млн', label: 'Больше 1 000 000 ₽' },
                ]}
              />

              {/* Цель инвестирования */}
              <Select
                label="Цель инвестирования"
                required
                placeholder="Выберите цель"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                error={errors.goal}
                options={[
                  { value: 'сохранить от инфляции', label: 'Сохранить от инфляции' },
                  { value: 'получить доход', label: 'Получить доход' },
                  { value: 'спекуляция', label: 'Спекуляция на курсе' },
                  { value: 'диверсификация', label: 'Диверсификация портфеля' },
                ]}
              />

              {/* Срок инвестирования */}
              <Select
                label="Срок инвестирования"
                required
                placeholder="Выберите срок"
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                error={errors.term}
                options={[
                  { value: 'до 3 мес', label: 'До 3 месяцев' },
                  { value: '3-6 мес', label: '3-6 месяцев' },
                  { value: '6-12 мес', label: '6-12 месяцев' },
                  { value: '>года', label: 'Больше года' },
                ]}
              />

              {/* Кнопка отправки */}
              <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
                Получить подборку
              </Button>

              {/* Дисклеймер */}
              <p className="text-center text-xs text-muted-foreground">
                Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности и обработкой
                персональных данных
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
