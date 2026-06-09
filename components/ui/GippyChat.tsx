"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, Send, User, ChevronRight, RotateCcw, Sun, Moon, Lock } from "lucide-react";
import { GippyLogo } from "@/components/ui/GippyLogo";
import { useAuth } from "@/lib/auth-context";

const GUEST_PROMPT_LIMIT = 2;
const GUEST_COUNT_KEY = "gippy_prompt_count";
const CHAT_SESSION_KEY = "gippy_session_messages";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface BarChartData {
  type?: "bar";
  title: string;
  data: { label: string; value: number; color: string }[];
}

interface LineChartData {
  type: "line";
  title: string;
  unit?: string;
  points: { label: string; value: number }[];
  projected?: { label: string; value: number }[];
}

type ChartData = BarChartData | LineChartData;

type Segment =
  | { type: "text"; content: string }
  | { type: "chart"; content: ChartData };

// ─── Static market data (welcome screen) ─────────────────────────────────────

const MARKET_GROWTH: LineChartData = {
  type: "line",
  title: "Объём рынка ЦФА в России, млрд ₽",
  unit: "млрд ₽",
  points: [
    { label: "2022", value: 5 },
    { label: "2023", value: 60 },
    { label: "2024", value: 500 },
    { label: "2025", value: 1100 },
  ],
  projected: [
    { label: "2026", value: 1450 },
    { label: "2027", value: 1750 },
  ],
};

const SUGGESTIONS = [
  "Какой ЦФА лучше для новичка с 50 000 ₽?",
  "Сравни доходность Т-Банк и Сбер ЦФА",
  "Какие риски у ЦФА от Atomyze?",
  "Как рассчитать налог с ЦФА?",
  "Что такое лимит 600 000 ₽ для неквалов?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtY(v: number): string {
  if (v === 0) return "0";
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")} трлн`;
  if (v >= 1)   return `${Math.round(v)} млрд`;
  return `${v}`;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(pts.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

function BarChart({ chart, isDark }: { chart: BarChartData; isDark: boolean }) {
  const [visible, setVisible] = useState(false);
  const max = Math.max(...chart.data.map((d) => d.value), 1);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`my-3 rounded-xl border p-4 ${
      isDark ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200"
    }`}>
      <p className={`text-[11px] font-semibold mb-3 uppercase tracking-widest ${
        isDark ? "text-white/50" : "text-gray-500"
      }`}>
        {chart.title}
      </p>
      <div className="space-y-3">
        {chart.data.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className={isDark ? "text-white/75" : "text-gray-700"}>{item.label}</span>
              <span className={`font-semibold ${isDark ? "text-white/90" : "text-gray-900"}`}>{item.value}%</span>
            </div>
            <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
              <div
                className="h-2 rounded-full"
                style={{
                  width: visible ? `${(item.value / max) * 100}%` : "0%",
                  backgroundColor: item.color,
                  boxShadow: visible ? `0 0 8px ${item.color}80` : "none",
                  transition: `width 0.75s cubic-bezier(0.4,0,0.2,1) ${i * 0.09}s, box-shadow 0.75s ease ${i * 0.09}s`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LineChart ────────────────────────────────────────────────────────────────

let lineChartCounter = 0;

function LineChart({ chart, isDark }: { chart: LineChartData; isDark: boolean }) {
  const uid = useRef(`glc${++lineChartCounter}`).current;
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(9999);
  const [animated, setAnimated] = useState(false);

  const W = 520, H = 195;
  const PL = 58, PR = 12, PT = 28, PB = 35;
  const CW = W - PL - PR, CH = H - PT - PB;

  const all = [...chart.points, ...(chart.projected ?? [])];
  const maxVal = Math.max(...all.map((p) => p.value)) * 1.18;

  const sx = (i: number) => PL + (i / Math.max(all.length - 1, 1)) * CW;
  const sy = (v: number) => PT + (1 - v / maxVal) * CH;

  const hPts = chart.points.map((p, i) => ({
    x: sx(i), y: sy(p.value), label: p.label, value: p.value,
  }));
  const pPts = (chart.projected ?? []).map((p, i) => ({
    x: sx(chart.points.length + i), y: sy(p.value), label: p.label, value: p.value,
  }));

  const hPath = smoothPath(hPts);
  const pPath = smoothPath(hPts.length ? [hPts[hPts.length - 1], ...pPts] : pPts);
  const areaPath = hPts.length
    ? `${hPath} L${hPts[hPts.length - 1].x},${PT + CH} L${hPts[0].x},${PT + CH} Z`
    : "";

  const yTicks = Array.from({ length: 5 }, (_, i) => ({
    y: sy((maxVal * i) / 4),
    label: fmtY((maxVal * i) / 4),
  })).reverse();

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    setPathLen(len);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnimated(true))
    );
    return () => cancelAnimationFrame(raf);
  }, [hPath]);

  // Значок роста
  const firstVal = chart.points[0]?.value ?? 0;
  const lastVal  = chart.points[chart.points.length - 1]?.value ?? 0;
  const growthX  = firstVal > 0 ? Math.round(lastVal / firstVal) : 0;
  const showGrowth = growthX >= 10;
  const yearStart  = parseInt(chart.points[0]?.label ?? "0");
  const yearEnd    = parseInt(chart.points[chart.points.length - 1]?.label ?? "0");

  // Pill-каллаут: ширина по тексту, позиция над/под точкой
  const lw = (s: string) => Math.min(Math.max(30, s.length * 5.2 + 10), 58);
  const above = (pt: { y: number }) => pt.y > PT + CH * 0.35;

  const gridColor   = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
  const labelColor  = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.5)";
  const xLabelColor = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.5)";

  return (
    <div
      className={`my-3 rounded-2xl p-4 overflow-hidden ${isDark ? "" : "bg-gray-100 border border-gray-200"}`}
      style={isDark ? {
        background: "#0f0d1e",
        border: "1px solid rgba(139,92,246,0.18)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 16px rgba(0,0,0,0.4)",
      } : undefined}
    >
      {/* Заголовок + значок роста */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className={`text-[11px] font-semibold uppercase tracking-widest ${isDark ? "text-white/40" : "text-gray-500"}`}>
          {chart.title}
        </p>
        {showGrowth && (
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={isDark
              ? { background: "rgba(52,211,153,0.12)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.2)" }
              : { background: "rgba(16,185,129,0.1)",  color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }
            }
          >
            ×{growthX} за {yearEnd - yearStart} года
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 260, display: "block" }}>
          <defs>
            <linearGradient id={`${uid}-line`} x1={PL} y1="0" x2={W - PR} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#6366f1" />
              <stop offset="55%"  stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#7c3aed" stopOpacity={isDark ? "0.42" : "0.14"} />
              <stop offset="55%"  stopColor="#6366f1" stopOpacity={isDark ? "0.1"  : "0.04"} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-10%" y="-60%" width="120%" height="220%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={`${uid}-halo`} x="-15%" y="-100%" width="130%" height="300%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* Сетка */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PL} y1={t.y} x2={W - PR} y2={t.y}
                stroke={gridColor} strokeWidth="1" strokeDasharray={i === 0 ? "0" : "3 3"} />
              <text x={PL - 6} y={t.y + 3.5} textAnchor="end"
                fill={labelColor} fontSize="10" fontFamily="monospace">
                {t.label}
              </text>
            </g>
          ))}

          {/* Заливка под линией */}
          {areaPath && (
            <path d={areaPath} fill={`url(#${uid}-area)`}
              style={{ opacity: animated ? 1 : 0, transition: "opacity 0.8s ease 0.9s" }} />
          )}

          {/* Фиолетовый ореол (жирный + размытый, под основной линией) */}
          <path d={hPath} fill="none" stroke="#7c3aed" strokeWidth="8"
            filter={`url(#${uid}-halo)`}
            style={{ opacity: animated ? 0.28 : 0, transition: "opacity 0.5s ease 1.1s" }}
          />

          {/* Основная анимированная линия с градиентом */}
          <path
            ref={pathRef}
            d={hPath}
            fill="none"
            stroke={isDark ? `url(#${uid}-line)` : "#7c3aed"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={animated ? `url(#${uid}-glow)` : undefined}
            style={{
              strokeDasharray: pathLen,
              strokeDashoffset: animated ? 0 : pathLen,
              transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)",
            }}
          />

          {/* Пунктирная линия прогноза */}
          {pPts.length > 0 && (
            <path d={pPath} fill="none" stroke="#a78bfa" strokeWidth="1.8"
              strokeLinecap="round" strokeDasharray="6 4"
              style={{ opacity: animated ? 0.55 : 0, transition: "opacity 0.5s ease 1.5s" }} />
          )}

          {/* Исторические точки */}
          {hPts.map((p, i) => {
            const isAbove = above(p);
            const txt     = fmtY(p.value);
            const pw      = lw(txt);
            const pillY   = isAbove ? p.y - 26 : p.y + 12;
            const textY   = isAbove ? p.y - 15  : p.y + 22;
            const isLast  = i === hPts.length - 1;
            return (
              <g key={i}>
                {/* Внешнее кольцо */}
                <circle cx={p.x} cy={p.y} r="9"
                  fill={isDark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.07)"}
                  stroke={isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.22)"} strokeWidth="1"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.4s ease ${0.82 + i * 0.07}s` }} />
                {/* Второе кольцо у последней точки */}
                {isLast && (
                  <circle cx={p.x} cy={p.y} r="14" fill="none"
                    stroke={isDark ? "rgba(139,92,246,0.15)" : "rgba(124,58,237,0.1)"} strokeWidth="1"
                    style={{ opacity: animated ? 1 : 0, transition: `opacity 0.4s ease ${0.9 + i * 0.07}s` }} />
                )}
                {/* Точка */}
                <circle cx={p.x} cy={p.y} r="4.5"
                  fill={isDark ? "#7c3aed" : "#6d28d9"}
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${0.87 + i * 0.07}s` }} />
                <circle cx={p.x} cy={p.y} r="1.8" fill="white"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${0.95 + i * 0.07}s` }} />
                {/* Pill-каллаут */}
                <rect x={p.x - pw / 2} y={pillY} width={pw} height={13} rx="3.5"
                  fill={isDark ? "rgba(124,58,237,0.22)" : "rgba(124,58,237,0.1)"}
                  stroke={isDark ? "rgba(139,92,246,0.4)" : "rgba(124,58,237,0.25)"} strokeWidth="0.5"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.35s ease ${1.1 + i * 0.07}s` }} />
                <text x={p.x} y={textY} textAnchor="middle"
                  fill={isDark ? "rgba(196,181,253,0.9)" : "rgba(109,40,217,0.85)"}
                  fontSize="8" fontFamily="monospace" fontWeight="bold"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.35s ease ${1.1 + i * 0.07}s` }}>
                  {txt}
                </text>
                {/* Подпись оси X */}
                <text x={p.x} y={H - 6} textAnchor="middle"
                  fill={xLabelColor} fontSize="10" fontFamily="system-ui"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${1.08 + i * 0.07}s` }}>
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* Точки прогноза */}
          {pPts.map((p, i) => {
            const isAbove = above(p);
            const txt     = `~${fmtY(p.value)}`;
            const pw      = lw(txt);
            const pillY   = isAbove ? p.y - 26 : p.y + 12;
            const textY   = isAbove ? p.y - 15  : p.y + 22;
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5.5" fill="none"
                  stroke="#a78bfa" strokeWidth="1.5"
                  style={{ opacity: animated ? 0.65 : 0, transition: `opacity 0.3s ease ${1.55 + i * 0.1}s` }} />
                <circle cx={p.x} cy={p.y} r="2" fill="#a78bfa"
                  style={{ opacity: animated ? 0.65 : 0, transition: `opacity 0.3s ease ${1.6 + i * 0.1}s` }} />
                <rect x={p.x - pw / 2} y={pillY} width={pw} height={13} rx="3.5"
                  fill={isDark ? "rgba(167,139,250,0.12)" : "rgba(124,58,237,0.07)"}
                  stroke={isDark ? "rgba(167,139,250,0.25)" : "rgba(124,58,237,0.18)"} strokeWidth="0.5"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${1.7 + i * 0.1}s` }} />
                <text x={p.x} y={textY} textAnchor="middle"
                  fill={isDark ? "rgba(196,181,253,0.7)" : "rgba(109,40,217,0.7)"}
                  fontSize="8" fontFamily="monospace" fontWeight="bold"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${1.7 + i * 0.1}s` }}>
                  {txt}
                </text>
                <text x={p.x} y={H - 6} textAnchor="middle"
                  fill={isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.35)"}
                  fontSize="10" fontFamily="system-ui"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${1.68 + i * 0.1}s` }}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <svg width="16" height="4">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className={`text-[10px] ${isDark ? "text-white/28" : "text-gray-400"}`}>Факт</span>
        </div>
        {(chart.projected?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="16" height="4">
              <line x1="0" y1="2" x2="16" y2="2" stroke="#a78bfa" strokeWidth="1.8" strokeDasharray="4 2.5" strokeLinecap="round" />
            </svg>
            <span className={`text-[10px] ${isDark ? "text-white/28" : "text-gray-400"}`}>Прогноз</span>
          </div>
        )}
        {chart.unit && (
          <span className={`text-[10px] ml-auto ${isDark ? "text-white/18" : "text-gray-300"}`}>{chart.unit}</span>
        )}
      </div>
    </div>
  );
}

// ─── Segment parser ───────────────────────────────────────────────────────────

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```chart\n([\s\S]*?)```/g;
  let cursor = 0, m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    if (m.index > cursor) segments.push({ type: "text", content: raw.slice(cursor, m.index) });
    try {
      segments.push({ type: "chart", content: JSON.parse(m[1].trim()) as ChartData });
    } catch {
      segments.push({ type: "text", content: m[0] });
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < raw.length) segments.push({ type: "text", content: raw.slice(cursor) });
  return segments;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string, isDark: boolean): string {
  const h3 = isDark
    ? 'class="font-bold text-white/90 mt-3 mb-1 text-xs uppercase tracking-wide"'
    : 'class="font-bold text-gray-800 mt-3 mb-1 text-xs uppercase tracking-wide"';
  const h2 = isDark
    ? 'class="font-semibold text-white mt-3 mb-1 text-sm"'
    : 'class="font-semibold text-gray-900 mt-3 mb-1 text-sm"';
  const h1 = isDark
    ? 'class="font-bold text-white mt-2 mb-1"'
    : 'class="font-bold text-gray-900 mt-2 mb-1"';

  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, `<p ${h3}>$1</p>`)
    .replace(/^## (.+)$/gm, `<p ${h2}>$1</p>`)
    .replace(/^# (.+)$/gm, `<p ${h1}>$1</p>`)
    .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 my-0.5"><span class="text-violet-400 mt-0.5 shrink-0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-1.5 my-0.5"><span class="text-violet-400 font-semibold min-w-[1rem] shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, "<br/>")
    .replace(/\n/g, "<br/>");
}

// ─── Yandex Metrika helper ────────────────────────────────────────────────────

function ymGoal(goal: string) {
  if (typeof window === "undefined" || !(window as any).ym) return;
  const id = process.env.NEXT_PUBLIC_YM_COUNTER_ID;
  if (id) (window as any).ym(id, "reachGoal", goal);
}

// ─── GippyChat component ──────────────────────────────────────────────────────

interface Props { onClose: () => void; }

export function GippyChat({ onClose }: Props) {
  const { isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem(CHAT_SESSION_KEY);
      return stored ? (JSON.parse(stored) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortCtrl = useRef<AbortController | null>(null);

  const [guestCount, setGuestCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(GUEST_COUNT_KEY) ?? "0", 10);
  });
  const isLimited = !isAuthenticated && guestCount >= GUEST_PROMPT_LIMIT;

  const handleClose = () => {
    ymGoal("GIPPY_CHAT_CLOSE");
    setClosing(true);
    setTimeout(() => onClose(), 220);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const toStore = messages.filter((m) => !m.streaming);
    if (toStore.length > 0) {
      sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(toStore));
    }
  }, [messages]);

  useEffect(() => {
    ymGoal("GIPPY_CHAT_OPEN");
    textareaRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...history, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setBusy(true);
    ymGoal("GIPPY_CHAT_MESSAGE_SENT");

    if (!isAuthenticated) {
      const next = guestCount + 1;
      setGuestCount(next);
      localStorage.setItem(GUEST_COUNT_KEY, String(next));
    }

    abortCtrl.current?.abort();
    abortCtrl.current = new AbortController();

    try {
      const res = await fetch("/api/gippy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: abortCtrl.current.signal,
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
            const delta = (JSON.parse(payload) as { choices: [{ delta: { content?: string } }] })
              .choices[0].delta.content ?? "";
            acc += delta;
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", content: acc, streaming: true };
              return copy;
            });
          } catch { /* skip */ }
        }
      }

      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: acc, streaming: false };
        return copy;
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Произошла ошибка при обращении к API. Проверьте настройки и попробуйте снова.",
          streaming: false,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }, [messages, busy, isAuthenticated, guestCount]);

  const reset = () => {
    ymGoal("GIPPY_CHAT_RESET");
    abortCtrl.current?.abort();
    setMessages([]);
    setBusy(false);
    sessionStorage.removeItem(CHAT_SESSION_KEY);
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  };

  // ── Derived class strings ──
  const rootBg    = isDark ? "bg-[#09090f]"              : "bg-white";
  const panelBg   = isDark ? "bg-[#0f0e1b]"              : "bg-gray-50";
  const border    = isDark ? "border-violet-500/10"       : "border-gray-200";
  const textPrimary   = isDark ? "text-white"             : "text-gray-900";
  const textSecondary = isDark ? "text-white/55"          : "text-gray-500";
  const textMuted     = isDark ? "text-white/35"          : "text-gray-400";
  const textHint      = isDark ? "text-white/20"          : "text-gray-400";
  const iconBtn = `p-2 rounded-lg transition-colors ${isDark
    ? "text-white/35 hover:text-white/70 hover:bg-violet-500/10"
    : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"}`;
  const suggestionBtn = isDark
    ? "border border-white/[0.07] bg-white/[0.03] hover:bg-violet-500/[0.08] hover:border-violet-500/25 hover:shadow-sm hover:shadow-violet-500/10"
    : "border border-gray-200 bg-white hover:bg-gray-50 hover:border-violet-400/40 shadow-sm";
  const suggestionText = isDark ? "text-white/55 group-hover:text-white/90" : "text-gray-600 group-hover:text-gray-900";
  const assistantBubble = isDark
    ? "bg-white/[0.04] border border-violet-500/[0.14] text-white/85 shadow-sm shadow-black/20"
    : "bg-gray-100 border border-gray-200 text-gray-800";
  const avatarAssistant = isDark
    ? "bg-gradient-to-br from-violet-500/25 to-blue-600/20 border border-violet-500/25"
    : "bg-gray-200 border border-gray-300";
  const textareaStyle = isDark
    ? "bg-white/[0.05] border-white/[0.08] text-white placeholder-white/30 focus:border-violet-500/35 focus:ring-violet-500/15 focus:bg-violet-500/[0.04]"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500/50 focus:ring-violet-500/20 shadow-sm";

  return (
    <div className={`fixed inset-0 z-100 flex flex-col ${rootBg} ${closing ? "gippy-exit" : "gippy-enter"}`}>
      {/* Header */}
      <header className={`flex-none flex items-center justify-between px-4 sm:px-6 h-14 border-b ${border} ${panelBg}`}>
        <div className="flex items-center gap-2.5">
          <GippyLogo size={32} theme={isDark ? "dark" : "light"} />
          <div className="leading-tight">
            <div className={`text-sm font-semibold ${textPrimary}`}>Gippy AI</div>
            <div className={`text-[11px] ${textMuted}`}>Консультант по ЦФА</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={reset} className={iconBtn} title="Новый диалог">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsDark((v) => !v)}
            className={iconBtn}
            title={isDark ? "Светлая тема" : "Тёмная тема"}
            aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={handleClose} className={iconBtn} aria-label="Закрыть Gippy AI">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="gippy-messages flex-1 overflow-y-auto relative">
        {/* Декоративный градиент сверху (только тёмная тема) */}
        {isDark && (
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-56 bg-violet-600/[0.05] blur-3xl rounded-full" />
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center px-4 sm:px-6 py-8 gap-6 max-w-2xl mx-auto w-full relative">
            <div className="text-center">
              {/* Логотип с ореолом */}
              <div className="flex justify-center mb-4">
                {isDark ? (
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-violet-500/25 blur-xl scale-[1.6]" />
                    <div className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-600/20 to-blue-600/15 border border-violet-500/25 shadow-lg shadow-violet-500/10">
                      <GippyLogo size={44} theme="dark" />
                    </div>
                  </div>
                ) : (
                  <GippyLogo size={60} theme="light" />
                )}
              </div>
              <h2 className={`text-xl font-bold mb-1 ${isDark ? "bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent" : "text-gray-900"}`}>
                Привет! Я Gippy
              </h2>
              <p className={`text-sm max-w-xs mx-auto ${textSecondary}`}>
                AI-консультант по цифровым финансовым активам России
              </p>
            </div>

            <div className="w-full">
              <LineChart chart={MARKET_GROWTH} isDark={isDark} />
            </div>

            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map((q, i) => (
                <button key={i} onClick={() => { ymGoal("GIPPY_CHAT_SUGGESTION_CLICK"); send(q); }}
                  className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all group ${suggestionBtn}`}>
                  <ChevronRight className="w-3.5 h-3.5 text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <span className={`text-sm transition-colors ${suggestionText}`}>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-6 space-y-5 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-7 h-7 rounded-full flex-none flex items-center justify-center text-white ${
                  msg.role === "user" ? "bg-violet-600" : avatarAssistant
                }`}>
                  {msg.role === "user"
                    ? <User className="w-3.5 h-3.5" />
                    : <GippyLogo size={16} theme={isDark ? "dark" : "light"} />}
                </div>

                <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? `bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-tr-sm shadow-md ${isDark ? "shadow-violet-500/20" : "shadow-violet-500/15"}`
                    : `${assistantBubble} rounded-tl-sm`
                }`}>
                  {msg.role === "user" ? (
                    <span>{msg.content}</span>
                  ) : (
                    <div>
                      {msg.streaming && msg.content === "" ? (
                        <span className="flex items-center gap-1.5 py-1">
                          <span className="gippy-dot" />
                          <span className="gippy-dot" />
                          <span className="gippy-dot" />
                        </span>
                      ) : (
                        <>
                          {parseSegments(msg.content).map((seg, si) =>
                            seg.type === "chart"
                              ? <div key={si}>{
                                  (seg.content as LineChartData).type === "line"
                                    ? <LineChart chart={seg.content as LineChartData} isDark={isDark} />
                                    : <BarChart chart={seg.content as BarChartData} isDark={isDark} />
                                }</div>
                              : <div key={si} dangerouslySetInnerHTML={{ __html: renderMarkdown(seg.content, isDark) }} />
                          )}
                          {msg.streaming && <span className="gippy-cursor" />}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`flex-none border-t ${border} ${panelBg} px-4 sm:px-6 py-4`}>
        {isLimited ? (
          <div className="max-w-3xl mx-auto text-center py-2">
            <p className={`text-sm font-medium mb-1.5 ${textPrimary}`}>
              Вы использовали {GUEST_PROMPT_LIMIT} бесплатных вопроса
            </p>
            <p className={`text-xs mb-4 ${textSecondary}`}>
              Зарегистрируйтесь бесплатно, чтобы продолжить общение с Gippy
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/cabinet/register"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 transition-all shadow-md hover:shadow-violet-500/30"
              >
                Зарегистрироваться
              </Link>
              <Link
                href="/cabinet/login"
                onClick={handleClose}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${isDark ? "border-white/15 text-white/70 hover:border-white/30 hover:text-white" : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900"}`}
              >
                Войти
              </Link>
              <a
                href="https://t.me/cfa_navigation_rf"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${isDark ? "border-blue-500/30 text-blue-400 hover:border-blue-400/60 hover:text-blue-300" : "border-blue-400/40 text-blue-600 hover:border-blue-500 hover:text-blue-700"}`}
              >
                Telegram-канал
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                disabled={busy}
                onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                placeholder="Спросите о ЦФА..."
                className={`gippy-textarea flex-1 border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 transition-all disabled:opacity-50 ${textareaStyle}`}
                style={{ minHeight: 44, maxHeight: 128 }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || busy}
                className="w-11 h-11 flex-none flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-violet-500/30 hover:shadow-lg"
                aria-label="Отправить">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            {!isAuthenticated && (
              <p className={`text-center text-[10px] mt-2 ${textHint}`}>
                Осталось бесплатных вопросов: {Math.max(0, GUEST_PROMPT_LIMIT - guestCount)}
              </p>
            )}
            <p className={`text-center text-[10px] mt-1.5 ${textHint}`}>
              Не является индивидуальной инвестиционной рекомендацией · Инвестиции сопряжены с рисками
            </p>
          </>
        )}
      </div>
    </div>
  );
}
