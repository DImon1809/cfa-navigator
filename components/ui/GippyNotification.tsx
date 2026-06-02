"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { GippyLogo } from "@/components/ui/GippyLogo";

function ymGoal(goal: string) {
  if (typeof window === "undefined" || !(window as any).ym) return;
  const id = process.env.NEXT_PUBLIC_YM_COUNTER_ID;
  if (id) (window as any).ym(id, "reachGoal", goal);
}

const STORAGE_KEY = "gippy_notif_seen_v1";
const SHOW_DELAY_MS = 2000;
const AUTO_DISMISS_MS = 12000;

interface Props {
  onOpen: () => void;
}

export function GippyNotification({ onOpen }: Props) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => { setVisible(true); ymGoal("GIPPY_NOTIF_SHOWN"); }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible]);

  const dismiss = () => {
    ymGoal("GIPPY_NOTIF_DISMISS");
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(() => setVisible(false), 260);
  };

  const handleOpen = () => {
    ymGoal("GIPPY_NOTIF_OPEN");
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(() => setVisible(false), 260);
    setTimeout(onOpen, 80);
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 right-4 sm:right-6 z-90 w-[calc(100vw-2rem)] sm:w-80
        ${exiting ? "gippy-notif-exit" : "gippy-notif-enter"}`}
    >
      {/* Внешнее свечение */}
      <div className="absolute inset-0 rounded-2xl bg-violet-600/10 blur-xl scale-110 pointer-events-none" />

      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #14112280 0%, #0e0c1d 100%)",
          border: "1px solid rgba(139,92,246,0.18)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Верхняя радужная полоска */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-violet-500 via-blue-400 to-violet-500" />

        {/* Фоновый градиент внутри */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-linear-to-b from-violet-500/[0.07] to-transparent pointer-events-none" />

        <div className="relative p-4">
          {/* Шапка */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              {/* Логотип с ореолом */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-md scale-150" />
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(37,99,235,0.2) 100%)",
                    border: "1px solid rgba(139,92,246,0.3)",
                  }}>
                  <GippyLogo size={22} theme="dark" />
                </div>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">Gippy AI</span>
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <Sparkles className="w-2.5 h-2.5" />
                    Новое
                  </span>
                </div>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>
                  AI-консультант по ЦФА
                </span>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1 rounded-lg transition-colors shrink-0 mt-0.5"
              style={{ color: "rgba(255,255,255,0.28)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)"; }}
              aria-label="Закрыть уведомление"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Текст */}
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
            Теперь на сайте есть AI-помощник. Он ответит на вопросы о ЦФА,
            сравнит платформы и покажет аналитику с&nbsp;графиками.
          </p>

          {/* CTA */}
          <button
            onClick={handleOpen}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 4px 16px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.12)"; }}
          >
            Попробовать
          </button>
        </div>
      </div>
    </div>
  );
}
