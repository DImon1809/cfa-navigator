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

interface CFAData {
  id: string;
  name: string;
  yield: string;
  term: string;
  operator: string;
  type: string;
  minAmount: string;
  position: number;
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
    ((q: string, ctx?: string, additionalCtx?: string) => Promise<void>) | null
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
  const phaseRef = useRef<"circle" | "panel">("circle");

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
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

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

  // Check if we're in mobile mode (cards) or desktop mode (table)
  const isMobileMode = useCallback(() => {
    const desktopRows = document.querySelectorAll("tr[data-cfa-id]");
    if (desktopRows.length > 0) return false;
    const mobileCards = document.querySelectorAll("div[data-cfa-id]");
    return mobileCards.length > 0;
  }, []);

  // Get actual CFA data from DOM after sorting - supports both desktop and mobile
  const getSortedCFAData = useCallback((): CFAData[] => {
    // Try desktop table rows first
    let rows = Array.from(
      document.querySelectorAll<HTMLElement>("tr[data-cfa-id]"),
    ).filter((el) => el.getBoundingClientRect().height > 0);

    // If no desktop rows, try mobile cards
    const isMobile = rows.length === 0;
    if (isMobile) {
      rows = Array.from(
        document.querySelectorAll<HTMLElement>("div[data-cfa-id]"),
      ).filter((el) => el.getBoundingClientRect().height > 0);
    }

    console.log(
      "[GippyOrb] getSortedCFAData found rows:",
      rows.length,
      isMobile ? "(mobile cards)" : "(desktop table)",
    );

    const result: CFAData[] = [];

    for (let idx = 0; idx < Math.min(rows.length, 6); idx++) {
      const row = rows[idx];
      const id = row.getAttribute("data-cfa-id") || "";

      let name = "";
      let operator = "";
      let yieldValue = "";
      let term = "";

      if (isMobile) {
        // Mobile mode: extract data from card divs
        // Name
        const nameEl = row.querySelector("h3");
        name = nameEl?.textContent?.trim() || "";

        // Operator and date (first line in the card)
        const operatorEl = row.querySelector("p.text-xs.text-muted-foreground");
        if (operatorEl) {
          const opText = operatorEl.textContent?.trim() || "";
          operator = opText.split("·")[0]?.trim() || "";
        }

        // Yield
        const yieldEl = row.querySelector(".text-2xl.font-bold");
        if (yieldEl) {
          yieldValue = yieldEl.textContent?.trim() || "";
          // Clean up yield value
          const yieldMatch = yieldValue.match(/(\d+(?:\.\d+)?)\s*%/);
          if (yieldMatch) {
            yieldValue = yieldMatch[1] + "%";
          }
        }

        // Term (maturity date)
        const termLabel = Array.from(
          row.querySelectorAll(".flex.justify-between"),
        ).find((el) => el.textContent?.includes("Погашение"));
        if (termLabel) {
          const termValue = termLabel.querySelector(".font-medium");
          if (termValue) {
            term = termValue.textContent?.trim() || "";
            if (
              term &&
              term.match(/\d{2}\.\d{2}\.\d{4}/) &&
              !term.includes("до")
            ) {
              term = `до ${term}`;
            }
          }
        }

        // If no term found, try to find maturity in other fields
        if (!term || term === "—") {
          const maturityLabel = Array.from(
            row.querySelectorAll(".flex.justify-between"),
          ).find(
            (el) =>
              el.textContent?.includes("Погашение") ||
              el.textContent?.includes("Maturity"),
          );
          if (maturityLabel) {
            const maturityValue = maturityLabel.querySelector(".font-medium");
            if (maturityValue) {
              term = maturityValue.textContent?.trim() || "";
              if (
                term &&
                term.match(/\d{2}\.\d{2}\.\d{4}/) &&
                !term.includes("до")
              ) {
                term = `до ${term}`;
              }
            }
          }
        }
      } else {
        // Desktop mode: extract data from table cells
        const cells = row.querySelectorAll("td");

        // Operator - cell index 3
        if (cells[3]) {
          operator = cells[3].textContent?.trim() || "";
        }

        // Name - cell index 4, might contain <p> tag
        if (cells[4]) {
          const nameParagraph = cells[4].querySelector("p");
          if (nameParagraph) {
            name = nameParagraph.textContent?.trim() || "";
          } else {
            name = cells[4].textContent?.trim() || "";
          }
        }

        // Yield - cell index 5
        if (cells[5]) {
          const yieldSpan = cells[5].querySelector("span.font-bold");
          if (yieldSpan) {
            yieldValue = yieldSpan.textContent?.trim() || "";
          } else {
            yieldValue = cells[5].textContent?.trim() || "";
          }
          const yieldMatch = yieldValue.match(/(\d+(?:\.\d+)?)\s*%/);
          if (yieldMatch) {
            yieldValue = yieldMatch[1] + "%";
          }
        }

        // Term (maturity date) - cell index 8
        if (cells[8]) {
          term = cells[8].textContent?.trim() || "";
          if (
            term &&
            term.match(/\d{2}\.\d{2}\.\d{4}/) &&
            !term.includes("до")
          ) {
            term = `до ${term}`;
          }
        }
      }

      // Clean up and set defaults
      name = name?.trim() || `Выпуск ${id.replace("cfarfpage-", "")}`;
      operator = operator?.trim() || "—";
      yieldValue = yieldValue?.trim() || "—";
      term = term?.trim() || "—";

      result.push({
        id,
        name,
        yield: yieldValue,
        term,
        operator,
        type: "—",
        minAmount: "—",
        position: idx + 1,
      });

      console.log(`[GippyOrb] Card ${idx + 1} parsed:`, {
        id,
        name,
        operator,
        yield: yieldValue,
        term,
      });
    }

    return result;
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

  // Collapse panel to orb circle
  const collapsePanelToOrb = useCallback(async () => {
    if (phaseRef.current === "panel" && !minimizedRef.current) {
      console.log("[GippyOrb] collapsePanelToOrb: collapsing panel");
      setPanelAnimState("exit");
      await sleep(320);
      setOrbX(window.innerWidth - 52);
      setOrbY(window.innerHeight - 52);
      setOrbVisible(true);
      setOrbTransition(undefined);
      setPhase("circle");
      setPanelAnimState("");
      await sleep(200);
    }
  }, []);

  const sendToAI = useCallback(
    async (query: string, cfaContext?: string, additionalContext?: string) => {
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
            ...(additionalContext ? { additionalContext } : {}),
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

        // Strip action markers
        const hasShowBest = acc.includes("[[SHOW_BEST]]");
        const cfaTourMatch =
          !hasShowBest && acc.match(/\[\[CFA_TOUR:[^\]]+\]\]/);
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
    },
    [],
  );

  // Get selector based on current mode (desktop table or mobile cards)
  const getElementSelector = useCallback(
    (cfaId: string) => {
      const isMobile = isMobileMode();
      return isMobile
        ? `div[data-cfa-id="${cfaId}"]`
        : `tr[data-cfa-id="${cfaId}"]`;
    },
    [isMobileMode],
  );

  // AI-triggered re-tour: panel collapses → orb visits highlighted cards → panel reopens
  const runTourFromPanel = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      console.log("[GippyOrb] runTourFromPanel starting with ids:", ids);

      const isMobile = isMobileMode();
      const selector = isMobile ? `div[data-cfa-id]` : `tr[data-cfa-id]`;

      const validIds = ids
        .slice(0, 3)
        .filter((cfaId) =>
          Array.from(
            document.querySelectorAll<HTMLElement>(
              isMobile
                ? `div[data-cfa-id="${cfaId}"]`
                : `tr[data-cfa-id="${cfaId}"]`,
            ),
          ).some((e) => e.getBoundingClientRect().height > 0),
        );
      console.log("[GippyOrb] runTourFromPanel validIds:", validIds);
      if (validIds.length === 0) {
        console.warn("[GippyOrb] runTourFromPanel validIds empty!");
        return;
      }

      const section = document.getElementById("cfa-cards");
      if (section) {
        const sectionRect = section.getBoundingClientRect();
        if (sectionRect.top < 0 || sectionRect.top > window.innerHeight * 0.6) {
          const sectionAbsTop = window.scrollY + sectionRect.top;
          window.scrollTo({ top: sectionAbsTop, behavior: "smooth" });
          await sleep(900);
        }
      }

      if (minimizedRef.current) {
        setMinimized(false);
        await sleep(150);
      }

      setPanelAnimState("exit");
      await sleep(320);

      setOrbX(window.innerWidth - 52);
      setOrbY(window.innerHeight - 52);
      setOrbVisible(true);
      setOrbTransition(undefined);
      setPhase("circle");
      setPanelAnimState("");
      await sleep(200);

      for (const cfaId of validIds) {
        const elSelector = isMobile
          ? `div[data-cfa-id="${cfaId}"]`
          : `tr[data-cfa-id="${cfaId}"]`;
        const el = Array.from(
          document.querySelectorAll<HTMLElement>(elSelector),
        ).find((e) => e.getBoundingClientRect().height > 0);
        if (!el) continue;

        let rect = el.getBoundingClientRect();
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

      setOrbX(window.innerWidth - 52);
      setOrbY(window.innerHeight - 52);
      await sleep(700);
      setPhase("panel");
      await sleep(50);
      setPanelAnimState("enter");
    },
    [isMobileMode],
  );

  // Run yield-sorted tour
  const runYieldTour = useCallback(async () => {
    console.log("[GippyOrb] runYieldTour START, collapsing panel...");

    await collapsePanelToOrb();
    await sleep(200);

    setOrbX(window.innerWidth - 52);
    setOrbY(window.innerHeight - 52);
    await sleep(100);

    console.log("[GippyOrb] runYieldTour triggering yield sort...");
    triggerYieldSortRef.current();

    let ids: string[] = [];
    for (let attempt = 0; attempt < 12 && ids.length === 0; attempt++) {
      await sleep(200);
      ids = tourIdsRef.current.slice(0, 3);
      console.log(`[GippyOrb] runYieldTour attempt ${attempt + 1}: ids=`, ids);
    }

    if (ids.length === 0) {
      // Try to find elements in both desktop and mobile mode
      let elements = Array.from(
        document.querySelectorAll<HTMLElement>("tr[data-cfa-id]"),
      );
      if (elements.length === 0) {
        elements = Array.from(
          document.querySelectorAll<HTMLElement>("div[data-cfa-id]"),
        );
      }
      ids = elements
        .filter((el) => el.getBoundingClientRect().height > 0)
        .slice(0, 3)
        .map((el) => el.getAttribute("data-cfa-id") ?? "")
        .filter(Boolean);
      console.log("[GippyOrb] runYieldTour DOM fallback ids:", ids);
    }

    if (ids.length === 0) {
      console.warn("[GippyOrb] runYieldTour: no IDs found!");
      return;
    }

    const sortedData = getSortedCFAData();
    console.log("[GippyOrb] runYieldTour sortedData:", sortedData);

    // Filter valid data
    const validData = sortedData.filter(
      (cfa) =>
        cfa.yield !== "—" &&
        cfa.yield !== "0%" &&
        cfa.name !== "Открыто" &&
        cfa.name !== "Неизвестно",
    );

    console.log("[GippyOrb] runYieldTour validData count:", validData.length);

    let sortedContext = "";
    let promptWithData = "";

    if (validData.length >= 3) {
      sortedContext = validData
        .slice(0, 3)
        .map((cfa) => {
          return `${cfa.position}. ${cfa.name} (${cfa.operator}) - Доходность: ${cfa.yield}, Срок: ${cfa.term}`;
        })
        .join("\n");

      promptWithData = `Проанализируй эти 3 ЦФА, которые я только что отсортировал по доходности (первые 3 в таблице):

${sortedContext}

Для каждого выпуска (1, 2, 3):
1. Название и оператор
2. Объясни доходность
3. Срок и что это значит для инвестора
4. Почему подходит новичку с 50 000 ₽

В конце добавь бар-чарт сравнения их доходностей.

ВАЖНО: используй ТОЛЬКО данные из таблицы выше.`;
    } else {
      // Fallback with IDs only
      sortedContext = ids
        .slice(0, 3)
        .map((id, idx) => `${idx + 1}. ЦФА ${id.replace("cfarfpage-", "")}`)
        .join("\n");

      promptWithData = `Проанализируй эти 3 ЦФА (первые в отсортированной таблице):

${sortedContext}

Дай общую рекомендацию по каждому.`;
    }

    await sleep(300);
    await runTourFromPanelRef.current?.(ids);
    await sleep(1000);

    if (sendToAIRef.current) {
      sendToAIRef.current(promptWithData, cfaContextRef.current, sortedContext);
    }
  }, [collapsePanelToOrb, getSortedCFAData]);

  const runYieldTourRef = useRef(runYieldTour);

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

  useEffect(() => {
    console.log(
      "[GippyOrb] yieldEffect pendingYieldTour=",
      pendingYieldTour,
      "busy=",
      busy,
    );
    if (!pendingYieldTour || busy) return;
    console.log("[GippyOrb] yieldEffect → calling runYieldTour");
    setPendingYieldTour(false);
    runYieldTourRef.current();
  }, [pendingYieldTour, busy]);

  // Main tour sequence - supports both desktop and mobile
  useEffect(() => {
    let cancelled = false;

    async function runTour() {
      setOrbX(window.innerWidth - 80);
      setOrbY(window.innerHeight / 2);
      setOrbVisible(false);
      await sleep(80);
      if (cancelled) return;
      setOrbVisible(true);

      await sleep(250);
      if (cancelled) return;

      window.scrollTo({ top: 0, behavior: "instant" });
      await sleep(100);
      if (cancelled) return;

      const section = document.getElementById("cfa-cards");
      if (section) {
        const sectionRect = section.getBoundingClientRect();
        // Find first visible element (either table row or card div)
        const firstCardEl = Array.from(
          document.querySelectorAll<HTMLElement>(
            "tr[data-cfa-id], div[data-cfa-id]",
          ),
        ).find((el) => el.getBoundingClientRect().height > 0);
        let sweepY = window.innerHeight * 0.28;
        if (firstCardEl) {
          const offset =
            firstCardEl.getBoundingClientRect().top - sectionRect.top;
          sweepY = Math.max(60, Math.min(offset, window.innerHeight * 0.4));
        }

        setOrbTransition(
          "left 1.2s ease-in-out, top 1.2s ease-in-out, opacity 0.3s ease",
        );
        setOrbY(sweepY);
        const sectionAbsTop = window.scrollY + sectionRect.top;
        window.scrollTo({ top: sectionAbsTop, behavior: "smooth" });
      }

      await sleep(1400);
      if (cancelled) return;
      setOrbTransition(undefined);

      let attempts = 0;
      while (tourIdsRef.current.length === 0 && attempts < 20) {
        await sleep(200);
        if (cancelled) return;
        attempts++;
      }

      const ids = tourIdsRef.current.slice(0, 3);
      const isMobile = isMobileMode();

      for (const cfaId of ids) {
        if (cancelled) return;

        const selector = isMobile
          ? `div[data-cfa-id="${cfaId}"]`
          : `tr[data-cfa-id="${cfaId}"]`;
        const el = Array.from(
          document.querySelectorAll<HTMLElement>(selector),
        ).find((e) => e.getBoundingClientRect().height > 0);
        if (!el) continue;

        let rect = el.getBoundingClientRect();
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
        if (cancelled) return;
        setOrbTransition(undefined);

        setHighlightedRef.current(cfaId);
        await sleep(750);
        if (cancelled) return;
        setHighlightedRef.current(null);
        await sleep(200);
      }

      if (cancelled) return;

      setOrbX(window.innerWidth - 52);
      setOrbY(window.innerHeight - 52);
      await sleep(900);
      if (cancelled) return;

      setPhase("panel");
      await sleep(50);
      setPanelAnimState("enter");

      await sleep(400);
      if (!cancelled && sendToAIRef.current) {
        const tourCtx =
          tourCfaContextRef.current || cfaContextRef.current || undefined;
        sendToAIRef.current(
          "Я только что подсветил на экране топ-3 ЦФА для начинающего инвестора с 50 000 ₽. " +
            "Прокомментируй именно эти три выпуска: для каждого объясни доходность, срок и почему подходит новичку (2-3 предложения). " +
            "В конце добавь бар-чарт сравнения их доходностей. " +
            "Не добавляй строку [[CFA_TOUR:...]]",
          tourCtx,
        );
      }
    }

    runTour();
    return () => {
      cancelled = true;
      setHighlightedRef.current(null);
    };
  }, [isMobileMode]);

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
    if (!q || busy) return;
    setInput("");

    if (isRecommendQuery(q)) {
      collapsePanelToOrb().then(() => {
        setPendingYieldTour(true);
      });
    } else {
      sendToAI(q, cfaContextRef.current || undefined);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    closeOrb();
    onClose();
  };

  const handleOpenFull = () => {
    abortRef.current?.abort();
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

  // Theme tokens
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

  // Minimized pill
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

  // Panel mode
  if (phase === "panel") {
    return (
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
            {[
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
            ].map(({ icon, onClick, title }, i) => (
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
                  e.currentTarget.style.color = tk.titleColor;
                  e.currentTarget.style.background = tk.iconBtnHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = tk.iconBtn;
                  e.currentTarget.style.background = "none";
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
                      <div className="gippy-content-appear">
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
    );
  }

  // Circle mode
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
