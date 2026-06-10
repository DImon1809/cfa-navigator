"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Maximize2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { GippyLogo } from "@/components/ui/GippyLogo";
import { useGippyOrb } from "@/context/gippy-orb-context";
import { useTheme } from "@/lib/theme-context";
import {
  BarChart,
  LineChart,
  parseSegments,
  renderMarkdown,
  CHAT_SESSION_KEY,
} from "@/components/ui/GippyChat";
import type { BarChartData, LineChartData } from "@/components/ui/GippyChat";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  onClose: () => void;
  onOpenFullChat: () => void;
}

export function GippyOrb({ onClose, onOpenFullChat }: Props) {
  const {
    tourCfaIds,
    tourCfaContext,
    setHighlightedCfaId,
    closeOrb,
    triggerYieldSort,
  } = useGippyOrb();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [orbX, setOrbX] = useState(0);
  const [orbY, setOrbY] = useState(0);
  const [orbVisible, setOrbVisible] = useState(false);
  const [orbTransition, setOrbTransition] = useState<string | undefined>(
    undefined,
  );
  const [phase, setPhase] = useState<"circle" | "panel">("circle");

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [panelAnimState, setPanelAnimState] = useState<"" | "enter" | "exit">(
    "",
  );
  const [pendingYieldTour, setPendingYieldTour] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const minimizedRef = useRef(false);
  const orbCircleRef = useRef<HTMLDivElement>(null);
  const tourIdsRef = useRef<string[]>([]);
  const messagesRef = useRef<ChatMsg[]>([]);
  const busyRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelScrollRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const setHighlightedRef = useRef(setHighlightedCfaId);
  const sendToAIRef = useRef<
    ((q: string, ctx?: string) => Promise<void>) | null
  >(null);
  const cfaContextRef = useRef<string>("");
  const runTourFromPanelRef = useRef<((ids: string[]) => Promise<void>) | null>(
    null,
  );
  const triggerYieldSortRef = useRef(triggerYieldSort);
  const tourCfaContextRef = useRef<string>("");
  // Typewriter
  const orbPendingRef = useRef("");
  const orbRevealedRef = useRef(0);
  const orbTypingRafRef = useRef<number | null>(null);
  const orbStreamDoneRef = useRef(false);

  // Keep refs in sync with latest values
  useEffect(() => {
    minimizedRef.current = minimized;
  }, [minimized]);
  useEffect(() => {
    tourIdsRef.current = tourCfaIds;
  }, [tourCfaIds]);
  useEffect(() => {
    tourCfaContextRef.current = tourCfaContext;
  }, [tourCfaContext]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    setHighlightedRef.current = setHighlightedCfaId;
  }, [setHighlightedCfaId]);

  // Preload live CFA data in parallel with tour startup
  useEffect(() => {
    fetch("/api/parse-cfa")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.allItems) return;
        const open = (data.allItems as Record<string, unknown>[]).filter(
          (i) => i.status === "open",
        );
        const lines = open.slice(0, 25).map((i) => {
          const access = Array.isArray(i.access)
            ? (i.access as string[]).join("+")
            : String(i.access ?? "");
          return `• [${i.id}] ${i.shortName ?? i.name} | ${i.operator} | ${i.type} | ${i.yield} | ${i.term} | от ${i.minAmount} | ${access}`;
        });
        cfaContextRef.current = `Открытых выпусков: ${open.length}\n${lines.join("\n")}`;
      })
      .catch(() => {});
  }, []);

  // Eased RAF scroll for panel
  useEffect(() => {
    const el = panelScrollRef.current;
    if (!el) return;
    if (scrollRafRef.current) return;
    const tick = () => {
      const container = panelScrollRef.current;
      if (!container) {
        scrollRafRef.current = null;
        return;
      }
      const diff =
        container.scrollHeight - container.clientHeight - container.scrollTop;
      if (diff > 1) {
        container.scrollTop += Math.max(2, diff * 0.18);
        scrollRafRef.current = requestAnimationFrame(tick);
      } else {
        container.scrollTop = container.scrollHeight;
        scrollRafRef.current = null;
      }
    };
    scrollRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [messages]);

  const sendToAI = useCallback(async (query: string, cfaContext?: string) => {
    if (busyRef.current) return;

    const history: ChatMsg[] = [
      ...messagesRef.current,
      { role: "user", content: query },
    ];
    setMessages([
      ...history,
      { role: "assistant", content: "", streaming: true },
    ]);
    setBusy(true);
    busyRef.current = true;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Reset typewriter
    orbPendingRef.current = "";
    orbRevealedRef.current = 0;
    orbStreamDoneRef.current = false;
    if (orbTypingRafRef.current) {
      cancelAnimationFrame(orbTypingRafRef.current);
      orbTypingRafRef.current = null;
    }

    const startTyping = () => {
      if (orbTypingRafRef.current) return;
      const tick = () => {
        const full = orbPendingRef.current;
        const cur = orbRevealedRef.current;
        if (cur >= full.length) {
          if (orbStreamDoneRef.current) {
            setMessages((m) => {
              const copy = [...m];
              if (copy[copy.length - 1]?.streaming) {
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: full,
                  streaming: false,
                };
              }
              return copy;
            });
            orbTypingRafRef.current = null;
          } else {
            orbTypingRafRef.current = requestAnimationFrame(tick);
          }
          return;
        }
        const next = Math.min(cur + 3, full.length);
        orbRevealedRef.current = next;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: full.slice(0, next),
            streaming: true,
          };
          return copy;
        });
        orbTypingRafRef.current = requestAnimationFrame(tick);
      };
      orbTypingRafRef.current = requestAnimationFrame(tick);
    };

    try {
      const res = await fetch("/api/gippy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          ...(cfaContext ? { cfaContext } : {}),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const delta =
              (
                JSON.parse(payload) as {
                  choices: [{ delta: { content?: string } }];
                }
              ).choices[0].delta.content ?? "";
            acc += delta;
            orbPendingRef.current = acc;
            startTyping();
          } catch {
            /* skip */
          }
        }
      }

      // Strip action markers so user never sees them in the chat bubble
      const hasShowBest = acc.includes("[[SHOW_BEST]]");
      const cfaTourMatch = !hasShowBest && acc.match(/\[\[CFA_TOUR:[^\]]+\]\]/);
      if (hasShowBest || cfaTourMatch) {
        acc = acc
          .replace(/\s*\[\[SHOW_BEST\]\]\s*/, "")
          .replace(/\s*\[\[CFA_TOUR:[^\]]+\]\]\s*/, "")
          .trimEnd();
        orbPendingRef.current = acc;
        orbRevealedRef.current = Math.min(orbRevealedRef.current, acc.length);
      }

      orbStreamDoneRef.current = true;
      startTyping();
    } catch (e) {
      if (orbTypingRafRef.current) {
        cancelAnimationFrame(orbTypingRafRef.current);
        orbTypingRafRef.current = null;
      }
      if ((e as Error).name === "AbortError") return;
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Ошибка при обращении к AI. Попробуйте снова.",
          streaming: false,
        };
        return copy;
      });
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }, []);

  // AI-triggered re-tour: panel collapses → orb visits highlighted cards → panel reopens
  const runTourFromPanel = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    // Pre-validate: only run tour if at least one ID actually exists in the DOM.
    // AI may return IDs from general knowledge that don't match current open listings.
    const validIds = ids
      .slice(0, 3)
      .filter((cfaId) =>
        Array.from(
          document.querySelectorAll<HTMLElement>(`[data-cfa-id="${cfaId}"]`),
        ).some((e) => e.getBoundingClientRect().height > 0),
      );
    console.log(
      "[GippyOrb] runTourFromPanel validIds:",
      validIds,
      "from ids:",
      ids,
    );
    if (validIds.length === 0) {
      console.warn("[GippyOrb] validIds empty — no matching DOM elements!");
      return;
    }

    // Scroll user to CFA section (they might have scrolled to another part of the page)
    const section = document.getElementById("cfa-cards");
    if (section) {
      const sectionRect = section.getBoundingClientRect();
      if (sectionRect.top < 0 || sectionRect.top > window.innerHeight * 0.6) {
        const sectionAbsTop = window.scrollY + sectionRect.top;
        window.scrollTo({ top: sectionAbsTop, behavior: "smooth" });
        await sleep(900);
      }
    }

    // Expand from minimized pill if needed
    if (minimizedRef.current) {
      setMinimized(false);
      await sleep(150);
    }

    // Animate panel out → collapse to orb circle
    setPanelAnimState("exit");
    await sleep(320);

    setOrbX(window.innerWidth - 52);
    setOrbY(window.innerHeight - 52);
    setOrbVisible(true);
    setOrbTransition(undefined);
    setPhase("circle");
    setPanelAnimState("");
    await sleep(200);

    // Visit each recommended card
    for (const cfaId of validIds) {
      const el = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-cfa-id="${cfaId}"]`),
      ).find((e) => e.getBoundingClientRect().height > 0);
      if (!el) continue;

      let rect = el.getBoundingClientRect();
      const isInView = rect.top >= 50 && rect.bottom <= window.innerHeight - 50;
      if (!isInView) {
        const cardAbsTop = window.scrollY + rect.top;
        window.scrollTo({
          top: Math.max(
            0,
            cardAbsTop - window.innerHeight / 2 + rect.height / 2,
          ),
          behavior: "smooth",
        });
        await sleep(1000);
        rect = el.getBoundingClientRect();
      }

      const targetX = Math.min(
        Math.max(40, rect.left + rect.width * 0.75),
        window.innerWidth - 40,
      );
      const targetY = Math.min(
        Math.max(60, rect.top + rect.height * 0.65),
        window.innerHeight - 60,
      );
      setOrbTransition(
        "left 0.55s cubic-bezier(0.4,0,0.2,1), top 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
      );
      setOrbX(targetX);
      setOrbY(targetY);
      await sleep(600);
      setOrbTransition(undefined);

      setHighlightedRef.current(cfaId);
      await sleep(750);
      setHighlightedRef.current(null);
      await sleep(200);
    }

    // Return to corner → reopen panel with enter animation (messages preserved)
    setOrbX(window.innerWidth - 52);
    setOrbY(window.innerHeight - 52);
    await sleep(700);
    setPhase("panel");
    await sleep(50);
    setPanelAnimState("enter");
  }, []);

  // Run yield-sorted tour: sort table by yield → wait for CfaCards to populate tourCfaIds → run card tour
  const runYieldTour = useCallback(async () => {
    // Brief pause so user can read the new AI message before the panel collapses
    await sleep(1500);
    console.log("[GippyOrb] runYieldTour START, triggering yield sort...");
    triggerYieldSortRef.current();
    // Wait for CfaCards to re-sort and call setTourCfaIds (one React render cycle ≈ 50ms, 350ms is safe)
    await sleep(350);
    const ids = tourIdsRef.current.slice(0, 3);
    console.log("[GippyOrb] runYieldTour ids after 350ms:", ids);
    if (ids.length === 0) {
      console.warn("[GippyOrb] runYieldTour: tourIdsRef still empty!");
      return;
    }
    await runTourFromPanelRef.current?.(ids);
  }, []);

  const runYieldTourRef = useRef(runYieldTour);

  // Keep sendToAI ref current so tour effect can call it without stale closure
  useEffect(() => {
    sendToAIRef.current = sendToAI;
  }, [sendToAI]);
  useEffect(() => {
    runTourFromPanelRef.current = runTourFromPanel;
  }, [runTourFromPanel]);
  useEffect(() => {
    runYieldTourRef.current = runYieldTour;
  }, [runYieldTour]);
  useEffect(() => {
    triggerYieldSortRef.current = triggerYieldSort;
  }, [triggerYieldSort]);

  // When AI finishes responding and a recommendation tour is pending, run yield tour
  useEffect(() => {
    if (!pendingYieldTour || busy) return;
    setPendingYieldTour(false);
    runYieldTourRef.current();
  }, [pendingYieldTour, busy]);

  // Main tour sequence — runs once per mount (cancelled on cleanup, restarts correctly in StrictMode)
  useEffect(() => {
    let cancelled = false;

    async function runTour() {
      // Appear at right side, vertically centered
      setOrbX(window.innerWidth - 80);
      setOrbY(window.innerHeight / 2);
      setOrbVisible(false);
      await sleep(80);
      if (cancelled) return;
      setOrbVisible(true);

      await sleep(250);
      if (cancelled) return;

      // Snap to page top so scroll always starts from the same point
      window.scrollTo({ top: 0, behavior: "instant" });
      await sleep(100);
      if (cancelled) return;

      const section = document.getElementById("cfa-cards");
      if (section) {
        // At scrollY=0 the section rect gives its absolute Y from viewport top
        const sectionRect = section.getBoundingClientRect();
        // Find first VISIBLE card (both mobile div and desktop tr share data-cfa-id;
        // desktop table is display:none on mobile and returns zero rect — skip it)
        const firstCardEl = Array.from(
          document.querySelectorAll<HTMLElement>("[data-cfa-id]"),
        ).find((el) => el.getBoundingClientRect().height > 0);
        // After block:'start' scroll, first card viewport Y = cardAbsoluteY - sectionAbsoluteY
        let sweepY = window.innerHeight * 0.28;
        if (firstCardEl) {
          const offset =
            firstCardEl.getBoundingClientRect().top - sectionRect.top;
          sweepY = Math.max(60, Math.min(offset, window.innerHeight * 0.4));
        }

        // Move orb in sync with scroll: same timing, same start, orb descends to card level
        setOrbTransition(
          "left 1.2s ease-in-out, top 1.2s ease-in-out, opacity 0.3s ease",
        );
        setOrbY(sweepY);
        // window.scrollTo is more reliable than scrollIntoView on mobile
        const sectionAbsTop = window.scrollY + sectionRect.top;
        window.scrollTo({ top: sectionAbsTop, behavior: "smooth" });
      }

      // Wait for scroll + orb sweep to complete
      await sleep(1400);
      if (cancelled) return;
      setOrbTransition(undefined); // restore normal 0.75s transition

      // Poll until CfaCards populates tourCfaIds (up to 5 seconds)
      let attempts = 0;
      while (tourIdsRef.current.length === 0 && attempts < 20) {
        await sleep(200);
        if (cancelled) return;
        attempts++;
      }

      const ids = tourIdsRef.current.slice(0, 3);

      for (const cfaId of ids) {
        if (cancelled) return;

        // Pick the visible element — desktop table rows are display:none on mobile
        // and return zero rect, so skip them
        const el = Array.from(
          document.querySelectorAll<HTMLElement>(`[data-cfa-id="${cfaId}"]`),
        ).find((e) => e.getBoundingClientRect().height > 0);
        if (!el) continue;

        let rect = el.getBoundingClientRect();

        // Scroll only if the card is outside the visible area
        const isInView =
          rect.top >= 50 && rect.bottom <= window.innerHeight - 50;
        if (!isInView) {
          const cardAbsTop = window.scrollY + rect.top;
          window.scrollTo({
            top: Math.max(
              0,
              cardAbsTop - window.innerHeight / 2 + rect.height / 2,
            ),
            behavior: "smooth",
          });
          await sleep(1000);
          if (cancelled) return;
          rect = el.getBoundingClientRect(); // refresh to actual post-scroll position
        }

        // Fly orb directly to card's real current viewport position — no prediction
        const targetX = Math.min(
          Math.max(40, rect.left + rect.width * 0.75),
          window.innerWidth - 40,
        );
        const targetY = Math.min(
          Math.max(60, rect.top + rect.height * 0.65),
          window.innerHeight - 60,
        );
        setOrbTransition(
          "left 0.55s cubic-bezier(0.4,0,0.2,1), top 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
        );
        setOrbX(targetX);
        setOrbY(targetY);
        await sleep(600);
        if (cancelled) return;
        setOrbTransition(undefined);

        setHighlightedRef.current(cfaId);
        await sleep(750);
        if (cancelled) return;

        setHighlightedRef.current(null);
        await sleep(200);
      }

      if (cancelled) return;

      // Fly to bottom-right corner
      setOrbX(window.innerWidth - 52);
      setOrbY(window.innerHeight - 52);
      await sleep(900);
      if (cancelled) return;

      // Expand to panel
      setPhase("panel");
      await sleep(50);
      setPanelAnimState("enter");

      // Send initial AI query — use highlighted cards as primary context
      await sleep(400);
      if (!cancelled && sendToAIRef.current) {
        const tourCtx =
          tourCfaContextRef.current || cfaContextRef.current || undefined;
        sendToAIRef.current(
          "Я только что подсветил на экране топ-3 ЦФА для начинающего инвестора с 50 000 ₽. " +
            "Прокомментируй именно эти три выпуска: для каждого объясни доходность, срок и почему подходит новичку (2-3 предложения). " +
            "В конце добавь бар-чарт сравнения их доходностей. " +
            "Не добавляй строку [[CFA_TOUR:...]] — это аналитический комментарий, не запрос рекомендации.",
          tourCtx,
        );
      }
    }

    runTour();
    return () => {
      cancelled = true;
      setHighlightedRef.current(null);
    };
  }, []);

  // Detect recommendation intent on the client side — do not rely solely on AI marker.
  // GPT-4.1-nano may skip [[SHOW_BEST]] so we pre-set the flag ourselves.
  const isRecommendQuery = (q: string) => {
    const t = q.toLowerCase();
    return [
      "подбери",
      "подбор",
      "рекомендуй",
      "порекомендуй",
      "выбери",
      "найди",
      "пожирнее",
      "самые выгодные",
      "самые доходные",
      "лучшие цфа",
      "топ цфа",
      "отсортируй",
      "сортируй",
      "покажи лучшие",
      "наибольшей доходност",
      "максимальн",
      "высокодоходн",
      "покажи еще",
      "покажи ещё",
      "покажи больше",
      "покажи другие",
      "ещё варианты",
      "еще варианты",
      "другие варианты",
      "другие цфа",
      "следующие",
      "ещё предложени",
      "еще предложени",
    ].some((kw) => t.includes(kw));
  };

  const handleSend = () => {
    const q = input.trim();
    console.log(
      "[GippyOrb] handleSend q=",
      JSON.stringify(q),
      "isRecommend=",
      isRecommendQuery(q),
      "busy=",
      busy,
    );
    if (!q || busy) return;
    setInput("");
    if (isRecommendQuery(q)) {
      console.log("[GippyOrb] pendingYieldTour = true");
      setPendingYieldTour(true);
    }
    sendToAI(q, cfaContextRef.current || undefined);
  };

  const handleClose = () => {
    abortRef.current?.abort();
    closeOrb();
    onClose();
  };

  const handleOpenFull = () => {
    abortRef.current?.abort();
    // Persist orb messages so GippyChat reads them on mount
    const toSave = messagesRef.current.filter((m) => !m.streaming);
    if (toSave.length > 0) {
      try {
        sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(toSave));
      } catch {
        /* ignore */
      }
    }
    closeOrb();
    onOpenFullChat();
  };

  // ── Theme tokens for panel & pill ──
  const tk = {
    panelBg: isDark ? "#0f0e1b" : "#ffffff",
    panelBorder: isDark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.18)",
    panelShadow: isDark
      ? "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.25)"
      : "0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(124,58,237,0.15)",
    headerBg: isDark ? "rgba(255,255,255,0.02)" : "#f5f3ff",
    headerBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    titleColor: isDark ? "white" : "#111827",
    badgeColor: isDark ? "rgba(167,139,250,0.9)" : "#7c3aed",
    badgeBg: isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.08)",
    badgeBorder: isDark ? "rgba(124,58,237,0.25)" : "rgba(124,58,237,0.2)",
    avatarBg: isDark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.1)",
    avatarBorder: isDark ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.22)",
    bubbleAssistBg: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6",
    bubbleAssistBord: isDark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.1)",
    bubbleAssistText: isDark ? "rgba(255,255,255,0.85)" : "#1f2937",
    footerBg: isDark ? "rgba(255,255,255,0.01)" : "#f5f3ff",
    footerBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    pillBg: isDark ? "#0f0e1b" : "#ffffff",
    pillText: isDark ? "white" : "#111827",
    pillChevron: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)",
    pillShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.15)"
      : "0 4px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(124,58,237,0.15)",
    iconBtn: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
    iconBtnHover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    inputColor: isDark ? "white" : "#111827",
    inputBg: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
    inputBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)",
    inputPlaceholder: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)",
  };

  // ── Minimized pill ──
  if (phase === "panel" && minimized) {
    return (
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px 8px 10px",
          borderRadius: 40,
          background: tk.pillBg,
          border: `1px solid ${tk.panelBorder}`,
          boxShadow: tk.pillShadow,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setMinimized(false)}
        title="Развернуть чат"
      >
        <div className="gippy-orb-logo-pulse">
          <GippyLogo size={22} theme={isDark ? "dark" : "light"} />
        </div>
        <span style={{ color: tk.pillText, fontSize: 13, fontWeight: 600 }}>
          Gippy AI
        </span>
        {messages.length > 0 && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#7c3aed",
              boxShadow: "0 0 6px rgba(124,58,237,0.8)",
              flexShrink: 0,
            }}
          />
        )}
        <ChevronUp size={14} color={tk.pillChevron} style={{ marginLeft: 2 }} />
      </div>
    );
  }

  // ── Panel mode ──
  if (phase === "panel") {
    return (
      <>
        <div
          className={
            panelAnimState === "enter"
              ? "gippy-orb-panel-enter"
              : panelAnimState === "exit"
                ? "gippy-orb-panel-exit"
                : ""
          }
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            width: 360,
            maxHeight: 500,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: tk.panelShadow,
            background: tk.panelBg,
            border: `1px solid ${tk.panelBorder}`,
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: `1px solid ${tk.headerBorder}`,
              background: tk.headerBg,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="gippy-orb-logo-pulse">
                <GippyLogo size={24} theme={isDark ? "dark" : "light"} />
              </div>
              <span
                style={{ color: tk.titleColor, fontSize: 13, fontWeight: 600 }}
              >
                Gippy AI
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: tk.badgeColor,
                  background: tk.badgeBg,
                  borderRadius: 8,
                  padding: "1px 7px",
                  border: `1px solid ${tk.badgeBorder}`,
                  fontWeight: 500,
                }}
              >
                Анализ ЦФА
              </span>
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {(
                [
                  {
                    icon: <Maximize2 size={14} />,
                    onClick: handleOpenFull,
                    title: "Открыть полный чат",
                  },
                  {
                    icon: <ChevronDown size={14} />,
                    onClick: () => setMinimized(true),
                    title: "Свернуть",
                  },
                  {
                    icon: <X size={14} />,
                    onClick: handleClose,
                    title: "Закрыть AI",
                  },
                ] as const
              ).map(({ icon, onClick, title }, i) => (
                <button
                  key={i}
                  onClick={onClick}
                  title={title}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 5,
                    borderRadius: 8,
                    color: tk.iconBtn,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      tk.titleColor;
                    (e.currentTarget as HTMLButtonElement).style.background =
                      tk.iconBtnHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      tk.iconBtn;
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "none";
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={panelScrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(124,58,237,0.3) transparent",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "28px 0",
                }}
              >
                <span className="gippy-dot" />
                <span className="gippy-dot" style={{ marginLeft: 6 }} />
                <span className="gippy-dot" style={{ marginLeft: 6 }} />
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: tk.avatarBg,
                      border: `1px solid ${tk.avatarBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <GippyLogo size={14} theme={isDark ? "dark" : "light"} />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "8px 12px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                        : tk.bubbleAssistBg,
                    border:
                      msg.role === "assistant"
                        ? `1px solid ${tk.bubbleAssistBord}`
                        : "none",
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: msg.role === "user" ? "white" : tk.bubbleAssistText,
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div>
                      {msg.streaming && msg.content === "" ? (
                        <div
                          style={{ display: "flex", gap: 5, padding: "3px 0" }}
                        >
                          <span className="gippy-dot" />
                          <span className="gippy-dot" />
                          <span className="gippy-dot" />
                        </div>
                      ) : (
                        <div
                          key={msg.content === "" ? "empty" : "text"}
                          className="gippy-content-appear"
                        >
                          {parseSegments(msg.content).map((seg, si) =>
                            seg.type === "chart" ? (
                              <div key={si}>
                                {(seg.content as LineChartData).type ===
                                "line" ? (
                                  <LineChart
                                    chart={seg.content as LineChartData}
                                    isDark={isDark}
                                  />
                                ) : (
                                  <BarChart
                                    chart={seg.content as BarChartData}
                                    isDark={isDark}
                                  />
                                )}
                              </div>
                            ) : (
                              <div
                                key={si}
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdown(seg.content, isDark),
                                }}
                              />
                            ),
                          )}
                          {msg.streaming && <span className="gippy-cursor" />}
                        </div>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: `1px solid ${tk.footerBorder}`,
              display: "flex",
              gap: 8,
              background: tk.footerBg,
              flexShrink: 0,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={busy}
              placeholder="Задайте вопрос о ЦФА..."
              style={{
                flex: 1,
                background: tk.inputBg,
                border: `1px solid ${tk.inputBorder}`,
                borderRadius: 10,
                padding: "7px 12px",
                fontSize: 12,
                color: tk.inputColor,
                caretColor: tk.inputColor,
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
                opacity: busy ? 0.5 : 1,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.45)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = tk.inputBorder;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || busy}
              className="gippy-orb-send-btn"
              aria-label="Отправить"
            >
              <Send size={14} color="white" />
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Circle mode ──
  return (
    <div
      ref={orbCircleRef}
      className="gippy-orb-circle"
      style={{
        position: "fixed",
        left: orbX,
        top: orbY,
        transform: "translate(-50%, -50%)",
        opacity: orbVisible ? 1 : 0,
        zIndex: 9999,
        pointerEvents: "none",
        ...(orbTransition ? { transition: orbTransition } : {}),
      }}
    >
      <div className="gippy-orb-ring" />
      <GippyLogo size={30} theme="dark" />
    </div>
  );
}
