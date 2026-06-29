import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, Children, type CSSProperties, type ReactNode } from "react";
import { Menu, X, Cog, Lock, Gift, Briefcase, Flame, Trophy, Users2, Plus } from "lucide-react";
import nadfunLogo from "@/assets/nadfun.jpg";
import { getPortfolio, type PortfolioToken } from "@/lib/portfolio";
import { getVeDust, type VeDustData } from "@/lib/vedust";
declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: HTMLElement | null) => void } };
  }
}

export const Route = createFileRoute("/")({
  component: Index,
});

const EASE = "cubic-bezier(0.22,1,0.36,1)";

// BCHOG brand palette
const BG = "#12052A";
const BG_DEEP = "#0D0418";
const SURFACE = "#1E0A42";
const PANEL = "#2A1058";
const INDIGO = "#3D1488";
const BORDER = "rgba(181, 76, 255, 0.12)";
const BORDER_STRONG = "rgba(181, 76, 255, 0.22)";
const PURPLE = "#7A2DFF";
const PURPLE_BRIGHT = "#B54CFF";
const CREAM = "#FFE8B4";
const CORAL = "#FF5C8A";
const MUTED = "rgba(255, 232, 180, 0.45)";
const FOOTER_BG = "#0D0418";
const TOKEN_LOGO = "/bchoglogo.png";

// Dashboard / Trading Desk palette — purple/black/white, no orange
const DB_BG = BG;
const DB_SURFACE = SURFACE;
const DB_PANEL = PANEL;
const DB_BORDER = BORDER;
const DB_BORDER_STRONG = BORDER_STRONG;
const DB_ORANGE = PURPLE_BRIGHT;
const DB_ORANGE_DIM = "rgba(181, 76, 255, 0.55)";
const DB_GREEN = "#4adeae";
const DB_RED = "#ff5c8a";
const DB_MUTED = MUTED;

const STAT_DOTS = {
  purple: PURPLE_BRIGHT,
  cream: CREAM,
  green: PURPLE,
  pink: CORAL,
  blue: INDIGO,
} as const;

const EXPLORER = "https://monadvision.com";
const explorerAddr = (a: string) => `${EXPLORER}/address/${a}`;
const explorerToken = (a: string) => `${EXPLORER}/token/${a}`;
const explorerTx = (h: string) => `${EXPLORER}/tx/${h}`;

const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' fill='white' filter='url(%23n)' opacity='0.04'/></svg>`,
  );

const SECTION_SUBTITLES: Record<string, string> = {
  "trading-desk": "Market support and portfolio activity.",
  contests: "Community contests and collaborations.",
};

const SECTIONS = [
  { id: "dashboard", title: "Dashboard", short: "Dashboard" },
  { id: "how-it-works", title: "How It Works", short: "How" },
  { id: "trading-desk", title: "Trading Desk", short: "Desk" },
  { id: "contests", title: "Contests & Collabs", short: "Contests" },
  { id: "coming-soon", title: "Coming Soon", short: "Soon", soon: true },
];

const SOCIALS = {
  x: "https://x.com/BURNINGCHOG",
  telegram: "https://t.me/BurningChogs",
};

const MONAD_RPC_URL = "https://rpc.monad.xyz";
const BCHOG_TOKEN = "0xFD97581D397622f6E6662917ea3DeEEfB9F57777";
const LOCK_TARGET = 1_000_000n;
const NADFUN_TOKEN_URL = `https://nad.fun/tokens/${BCHOG_TOKEN}`;

const WALLETS = {
  trading: "0x574db938dd0F3C88DDF141E3F39a60803e7526fb",
  lockHolding: "0x2A176CA63AFb92A429C4311d77bc34033F4C97b4",
  treasury: "0x87ec68CBa62ABE8A8747ca4926e7c1F9144955cb",
  burn: "0x000000000000000000000000000000000000dEaD",
  atlantisLock: "0x56A1DD4E07BD41804883FF51BA1458cb6cfF8f1C",
};

type BchogStats = {
  decimals: number;
  totalSupply?: bigint;
  balances: Record<keyof typeof WALLETS, bigint | undefined>;
};

const emptyStats: BchogStats = {
  decimals: 18,
  balances: {
    trading: undefined,
    lockHolding: undefined,
    treasury: undefined,
    burn: undefined,
    atlantisLock: undefined,
  },
};

function padAddress(address: string) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function hexToBigInt(hex?: string) {
  return hex ? BigInt(hex) : undefined;
}

async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch(MONAD_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const payload = (await response.json()) as { result?: string; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message ?? "Monad RPC call failed");
  return payload.result;
}

async function ethCallTo(to: string, data: string) {
  return rpcCall("eth_call", [{ to, data }, "latest"]);
}

async function ethCall(data: string) {
  return ethCallTo(BCHOG_TOKEN, data);
}

async function tokenBalanceOf(address: string) {
  return hexToBigInt(await ethCall(`0x70a08231${padAddress(address)}`));
}

function useBchogStats() {
  const [stats, setStats] = useState<BchogStats>(emptyStats);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const decimals = Number(hexToBigInt(await ethCall("0x313ce567")) ?? 18n);
        const [totalSupply, trading, lockHolding, treasury, burn, atlantisLock] = await Promise.all(
          [
            ethCall("0x18160ddd").then(hexToBigInt),
            tokenBalanceOf(WALLETS.trading),
            tokenBalanceOf(WALLETS.lockHolding),
            tokenBalanceOf(WALLETS.treasury),
            tokenBalanceOf(WALLETS.burn),
            tokenBalanceOf(WALLETS.atlantisLock),
          ],
        );

        if (!cancelled) {
          setStats({
            decimals,
            totalSupply,
            balances: { trading, lockHolding, treasury, burn, atlantisLock },
          });
        }
      } catch (error) {
        console.warn("BCHOG stats unavailable", error);
      }
    }

    loadStats();
    const timer = window.setInterval(loadStats, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return stats;
}

function scaledDivisor(decimals: number) {
  return 10n ** BigInt(decimals);
}

function formatToken(value: bigint | undefined, decimals: number, suffix = "") {
  if (value === undefined) return "---";
  const divisor = scaledDivisor(decimals);
  const whole = value / divisor;
  const compact =
    whole >= 1_000_000_000n
      ? `${Number(whole / 1_000_000n) / 1000}B`
      : whole >= 1_000_000n
        ? `${Number(whole / 1000n) / 1000}M`
        : whole >= 1_000n
          ? `${Number(whole / 10n) / 100}K`
          : whole.toLocaleString();
  return `${compact}${suffix}`;
}

function percentOf(value: bigint | undefined, total: bigint | undefined) {
  if (!value || !total) return 0;
  return Math.max(0.5, Math.min(100, Number((value * 1000n) / total) / 10));
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ---- off-chain market data: DexScreener (market cap) + Nad.fun (holders, trades) ----

const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${BCHOG_TOKEN}`;
const NADFUN_MARKET_URL = `https://api.nad.fun/trade/market/${BCHOG_TOKEN}`;
const NADFUN_SWAPS_URL = `https://api.nad.fun/trade/swap-history/${BCHOG_TOKEN}?limit=5`;

type Trade = {
  type: "BUY" | "SELL";
  valueUsd: number;
  tokenAmount: number;
  hash: string;
  ts: number;
  account: string;
};

type MarketExtras = {
  marketCapUsd?: number;
  priceUsd?: number;
  holders?: number;
  trades: Trade[];
};

type DexPair = {
  marketCap?: number;
  fdv?: number;
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { address?: string };
  info?: { imageUrl?: string };
};

type RawSwap = {
  swap_info?: {
    event_type?: string;
    value?: string;
    token_amount?: string;
    transaction_hash?: string;
    created_at?: number;
  };
  account_info?: { account_id?: string };
};

function useMarketExtras() {
  const [market, setMarket] = useState<MarketExtras>({ trades: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [dex, info, swaps] = await Promise.allSettled([
        fetch(DEXSCREENER_URL).then((r) => r.json()),
        fetch(NADFUN_MARKET_URL).then((r) => r.json()),
        fetch(NADFUN_SWAPS_URL).then((r) => r.json()),
      ]);
      if (cancelled) return;

      const next: MarketExtras = { trades: [] };

      if (dex.status === "fulfilled") {
        const pairs = (dex.value?.pairs ?? []) as DexPair[];
        const best = pairs
          .slice()
          .sort((a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0))[0];
        if (best) {
          next.marketCapUsd = Number(best.marketCap ?? best.fdv) || undefined;
          next.priceUsd = Number(best.priceUsd) || undefined;
        }
      }
      if (info.status === "fulfilled") {
        const h = info.value?.market_info?.holder_count;
        if (typeof h === "number") next.holders = h;
      }
      if (swaps.status === "fulfilled") {
        next.trades = ((swaps.value?.swaps ?? []) as RawSwap[]).slice(0, 5).map((s) => ({
          type: s.swap_info?.event_type === "SELL" ? "SELL" : "BUY",
          valueUsd: Number(s.swap_info?.value) || 0,
          tokenAmount: Number(s.swap_info?.token_amount ?? 0) / 1e18,
          hash: s.swap_info?.transaction_hash ?? "",
          ts: Number(s.swap_info?.created_at) || 0,
          account: s.account_info?.account_id ?? "",
        }));
      }

      setMarket(next);
    }

    load().catch((e) => console.warn("BCHOG market data unavailable", e));
    const timer = window.setInterval(() => load().catch(() => {}), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return market;
}

// Trading Desk token holdings (via Zerion server fn) + DexScreener logos.
function usePortfolio() {
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const list = await getPortfolio();
      if (cancelled || !list.length) {
        if (!cancelled) setTokens(list);
        return;
      }
      // pull finer logos from DexScreener (one batched call)
      try {
        const addrs = list
          .slice(0, 20)
          .map((t) => t.address)
          .join(",");
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addrs}`);
        const j = (await r.json()) as { pairs?: DexPair[] };
        const logos = new Map<string, string>();
        for (const pair of j.pairs ?? []) {
          const a = pair?.baseToken?.address?.toLowerCase();
          const img = pair?.info?.imageUrl;
          if (a && img && !logos.has(a)) logos.set(a, img);
        }
        const withLogos = list.map((t) => ({
          ...t,
          iconUrl: logos.get(t.address.toLowerCase()) ?? t.iconUrl,
        }));
        if (!cancelled) setTokens(withLogos);
      } catch {
        if (!cancelled) setTokens(list);
      }
    }

    load().catch((e) => console.warn("BCHOG portfolio unavailable", e));
    const timer = window.setInterval(() => load().catch(() => {}), 90_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return tokens;
}

// ---- Neverland veDUST positions held by the Trading Desk (server fn) ----
function useVeDust() {
  const [veDust, setVeDust] = useState<VeDustData | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getVeDust()
        .then((v) => !cancelled && setVeDust(v))
        .catch((e) => console.warn("BCHOG veDUST unavailable", e));
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
  return veDust;
}

function formatUsd(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return "$---";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1000).toFixed(2)}K`;
  if (value === 0) return "$0";
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${value.toPrecision(2)}`;
}

function formatCount(value?: number) {
  return value === undefined ? "---" : value.toLocaleString();
}

function timeAgo(ts: number) {
  if (!ts) return "";
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function compactAmount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const stats = useBchogStats();
  const market = useMarketExtras();
  const portfolio = usePortfolio();
  const veDust = useVeDust();

  const scrollToId = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", backgroundColor: BG, color: "white" }}>
      <h1 className="sr-only">BCHOG — Burning Chog</h1>

      <SiteHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} scrollToId={scrollToId} />

      <LandingHero />

      {SECTIONS.map((s) => (
        <SectionBlock
          key={s.id}
          section={s}
          stats={stats}
          market={market}
          portfolio={portfolio}
          veDust={veDust}
        />
      ))}

      <Footer />
    </div>
  );
}

function SiteHeader({
  menuOpen,
  setMenuOpen,
  scrollToId,
}: {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  scrollToId: (id: string) => void;
}) {
  return (
    <>
      <div className="fixed top-4 sm:top-5 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none">
        <header
          className="pointer-events-auto w-[82%] max-w-[756px] min-w-[300px] h-[70px] sm:h-[75px] rounded-full flex items-center justify-between px-5 sm:px-7 relative"
          style={{
            background: "rgba(18, 5, 42, 0.55)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${BORDER_STRONG}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          }}
        >
          <a href="#top" className="flex items-center gap-2 no-underline shrink-0" style={{ color: "white" }}>
            <img src={TOKEN_LOGO} alt="BCHOG" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
            <span className="text-sm font-semibold tracking-[0.16em] uppercase">BCHOG</span>
          </a>

          <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {SECTIONS.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => scrollToId(s.id)}
                className="px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] rounded-full transition-colors hover:text-white hover:bg-white/[0.06]"
                style={{ color: MUTED }}
              >
                {s.short}
                {s.soon && (
                  <span
                    className="ml-1.5 text-[9px] font-bold uppercase tracking-[0.1em] align-middle"
                    style={{ color: CORAL }}
                  >
                    soon
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
            style={{ color: "white" }}
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          {/* Spacer mirrors logo+text width to keep nav perfectly centered */}
          <div className="hidden lg:block w-[100px] shrink-0" aria-hidden />
        </header>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{ background: "rgba(13,4,24,0.92)", backdropFilter: "blur(16px)" }}
          onClick={() => setMenuOpen(false)}
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center"
            style={{ color: "white" }}
          >
            <X size={20} />
          </button>
          <nav className="flex flex-col gap-2 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {SECTIONS.map((s, i) => (
              <button
                type="button"
                key={s.id}
                onClick={() => scrollToId(s.id)}
                className="flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.04]"
                style={{ borderBottom: `1px solid ${BORDER}`, color: "white" }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono" style={{ color: MUTED }}>
                    0{i + 1}
                  </span>
                  <span className="text-lg font-medium tracking-tight">{s.title}</span>
                </div>
                {s.soon && (
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: CREAM }}>
                    Soon
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

function LandingHero() {
  const [unlocked, setUnlocked] = useState(false);

  // Unlock scroll on first downward swipe/scroll
  useEffect(() => {
    let touchStartY = 0;
    const onWheel = (e: WheelEvent) => {
      if (unlocked) return;
      if (e.deltaY > 20) { setUnlocked(true); }
    };
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      if (unlocked) return;
      if (touchStartY - e.touches[0].clientY > 40) { setUnlocked(true); }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [unlocked]);

  // Particle star positions — stable (generated once)
  const stars = Array.from({ length: 120 }, (_, i) => ({
    x: ((i * 137.508) % 100),
    y: ((i * 97.3) % 100),
    r: i % 5 === 0 ? 1.4 : i % 3 === 0 ? 1.0 : 0.6,
    o: 0.15 + (i % 7) * 0.08,
  }));

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden flex flex-col"
      style={{ height: "100dvh", backgroundColor: "#080412" }}
    >
      {/* ── Star particle field ── */}
      <svg
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.4} fill="white" fillOpacity={s.o} />
        ))}
      </svg>

      {/* ── Subtle radial purple glow bottom-right ── */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 55% at 75% 85%, rgba(122,45,255,0.22) 0%, transparent 70%)",
      }} />
      <div aria-hidden style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 50% 40% at 20% 60%, rgba(181,76,255,0.08) 0%, transparent 65%)",
      }} />

      {/* ── Grid lines (very subtle) ── */}
      <div aria-hidden className="absolute inset-0 bchog-grid-bg pointer-events-none" style={{ opacity: 0.12, zIndex: 0 }} />

      {/* ── Hero content — left aligned like Capricorn ── */}
      <div
        className="relative flex flex-col justify-center h-full px-6 sm:px-12 lg:px-20 max-w-6xl mx-auto w-full"
        style={{ zIndex: 2 }}
      >
        {/* Eyebrow */}
        <p
          className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.22em] mb-5"
          style={{ color: PURPLE_BRIGHT, letterSpacing: "0.24em" }}
        >
          Built on Monad
        </p>

        {/* Big heading */}
        <h1
          className="text-white m-0 leading-[0.95]"
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: "clamp(3.2rem, 12vw, 9rem)",
            letterSpacing: "-0.02em",
            maxWidth: "14ch",
          }}
        >
          BCHOG
        </h1>

        {/* Sub-tagline */}
        <p
          className="mt-5 max-w-sm sm:max-w-md"
          style={{
            fontSize: "clamp(0.95rem, 2.2vw, 1.2rem)",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
          }}
        >
          Always less. Always more.
        </p>

        {/* CTA */}
        <div className="flex items-center gap-4 mt-8 flex-wrap">
          <a
            href={NADFUN_TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="no-underline flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold transition-all hover:scale-[1.04] hover:brightness-110"
            style={{
              background: PURPLE_BRIGHT,
              color: "white",
              fontSize: "clamp(0.85rem,2vw,1rem)",
              letterSpacing: "0.04em",
              boxShadow: `0 0 28px rgba(181,76,255,0.5), 0 4px 16px rgba(0,0,0,0.4)`,
            }}
          >
            Buy BCHOG
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="white" strokeWidth="2" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold transition-all hover:scale-[1.03]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.7)",
              fontSize: "clamp(0.85rem,2vw,1rem)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            View Dashboard
          </button>
        </div>
      </div>

      {/* ── Scroll cue ── */}
      <div
        className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-2 pointer-events-none"
        style={{ zIndex: 10, opacity: unlocked ? 0 : 1, transition: "opacity 600ms ease" }}
      >
        <div className="flex flex-col gap-0.5 items-center" aria-hidden>
          <div className="w-px h-8 rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${PURPLE_BRIGHT})` }} />
          <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `5px solid ${PURPLE_BRIGHT}` }} />
        </div>
        <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(181,76,255,0.5)" }}>Scroll</span>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative w-full px-4 sm:px-8 lg:px-16 py-6" style={{ background: "transparent" }}>
      <div
        className="relative w-full max-w-6xl mx-auto flex items-center justify-between px-6 sm:px-8 py-4 rounded-full"
        style={{
          background: "rgba(18,5,42,0.55)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${BORDER_STRONG}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
      >
        {/* Left — logo + name */}
        <a href="#top" className="flex items-center gap-2 no-underline shrink-0" style={{ color: "white" }}>
          <img src={TOKEN_LOGO} alt="BCHOG" className="w-7 h-7 rounded-full object-cover" />
          <span className="text-sm font-semibold tracking-[0.16em] uppercase">BCHOG</span>
        </a>

        {/* Centre — tagline */}
        <p
          className="absolute left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.16em] hidden sm:block whitespace-nowrap"
          style={{ color: "rgba(255,232,180,0.35)" }}
        >
          Rewarding. Unstoppable.
        </p>

        {/* Right — social icons with deliberate spacing */}
        <div className="flex items-center" style={{ gap: 10 }}>
          {/* X */}
          <a
            href={SOCIALS.x}
            target="_blank"
            rel="noreferrer"
            aria-label="X (Twitter)"
            className="no-underline flex items-center justify-center transition-all hover:scale-110"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff" aria-hidden>
              <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.875l-5.38-7.03L4.6 22H1.34l8.02-9.165L1 2h7.05l4.86 6.43L18.244 2Zm-1.205 18h1.9L7.05 3.9H5.01L17.04 20Z" />
            </svg>
          </a>

          {/* Telegram */}
          <a
            href={SOCIALS.telegram}
            target="_blank"
            rel="noreferrer"
            aria-label="Telegram"
            className="no-underline flex items-center justify-center transition-all hover:scale-110"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff" aria-hidden>
              <path d="M21.95 4.27 18.6 20.06c-.25 1.1-.91 1.38-1.84.86l-5.1-3.76-2.46 2.37c-.27.27-.5.5-1.02.5l.36-5.18 9.42-8.51c.41-.36-.09-.56-.64-.2L5.05 13.18l-5.01-1.57c-1.09-.34-1.11-1.09.23-1.61l19.59-7.55c.91-.34 1.7.2 1.41 1.82Z" transform="translate(1 0)" />
            </svg>
          </a>

          {/* Nad.fun — wider gap to feel intentional */}
          <a
            href={NADFUN_TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Buy on Nad.fun"
            className="no-underline flex items-center justify-center overflow-hidden transition-all hover:scale-110"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <img src={nadfunLogo} alt="Nad.fun" className="w-full h-full object-cover" draggable={false} />
          </a>
        </div>
      </div>

      {/* Built on Monad — below the bar */}
      <p className="text-center text-[9px] uppercase tracking-[0.18em] mt-3" style={{ color: "rgba(255,255,255,0.15)" }}>
        Built on Monad
      </p>
    </footer>
  );
}

function SocialButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="w-10 h-10 flex items-center justify-center overflow-hidden no-underline transition-opacity hover:opacity-70"
      style={{
        background: SURFACE,
        color: "white",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
      }}
    >
      {children}
    </a>
  );
}

function SectionBlock({
  section,
  stats,
  market,
  portfolio,
  veDust,
}: {
  section: (typeof SECTIONS)[number];
  stats: BchogStats;
  market: MarketExtras;
  portfolio: PortfolioToken[];
  veDust: VeDustData | undefined;
}) {
  const isDashboard = section.id === "dashboard" || section.id === "trading-desk";
  const sectionBg = isDashboard ? DB_BG : BG;
  const sectionBorder = isDashboard ? DB_BORDER : BORDER;
  return (
    <section
      id={section.id}
      className="relative w-full overflow-hidden"
      style={{
        minHeight: section.id === "coming-soon" ? undefined : "70vh",
        backgroundColor: sectionBg,
        color: "white",
        borderTop: `1px solid ${sectionBorder}`,
      }}
    >
      <div className="absolute inset-0 bchog-grid-bg opacity-20 pointer-events-none" />
      <div
        className={`relative px-4 sm:px-8 lg:px-16 w-full max-w-6xl mx-auto ${section.id === "coming-soon" ? "pt-10 sm:pt-12 pb-6" : "pt-16 sm:pt-20 pb-14"}`}
        style={{ zIndex: 2 }}
      >
        <div className="mb-7 sm:mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="bchog-section-title text-[clamp(2rem,6vw,3.6rem)] text-white m-0"
            style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "-0.01em" }}>
              {section.title}
            </h2>
            {section.soon && (
              <span
                className="text-[10px] font-medium uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                In Development
              </span>
            )}
          </div>
          {SECTION_SUBTITLES[section.id] && (
            <p className="mt-2 text-sm" style={{ color: isDashboard ? DB_MUTED : MUTED }}>
              {SECTION_SUBTITLES[section.id]}
            </p>
          )}
        </div>

        <SectionMock
          id={section.id}
          stats={stats}
          market={market}
          portfolio={portfolio}
          veDust={veDust}
        />
      </div>
    </section>
  );
}

/* ---- scroll reveal: slide in from the side, slide back out on reverse ---- */

function Reveal({
  children,
  delay = 0,
  className = "",
  dir = -1,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  dir?: number; // -1 = enter from left, 1 = enter from right
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      <div
        style={{
          opacity: shown ? 1 : 0,
          transform: shown
            ? "translateX(0) rotate(0deg) scale(1)"
            : `translateX(${dir * 72}px) rotate(${dir * 3}deg) scale(0.96)`,
          transition: `opacity 520ms ${EASE} ${delay}ms, transform 600ms ${EASE} ${delay}ms`,
          willChange: shown ? "auto" : "transform, opacity",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// pieces converge from alternating sides, like glass reassembling
function Stagger({ children, step = 80 }: { children: React.ReactNode; step?: number }) {
  return (
    <>
      {Children.toArray(children).map((c, i) => (
        <Reveal key={i} delay={i * step} dir={i % 2 === 0 ? -1 : 1}>
          {c}
        </Reveal>
      ))}
    </>
  );
}

/* ---- premium UI building blocks ---- */

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg p-5 sm:p-6 ${className}`}
      style={{ background: PANEL, border: `1px solid ${BORDER}` }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em]"
      style={{ color: MUTED }}
    >
      {children}
    </span>
  );
}

function MetricCell({
  dot,
  label,
  value,
  sub,
  bordered = false,
  borderedTop = false,
  className = "",
}: {
  dot: string;
  label: string;
  value: string;
  sub?: string;
  bordered?: boolean;
  borderedTop?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col justify-end p-3 sm:p-5 lg:p-6 min-h-[88px] sm:min-h-[120px] ${className}`}
      style={{
        borderRight: bordered ? `1px solid ${BORDER}` : undefined,
        borderTop: borderedTop ? `1px solid ${BORDER}` : undefined,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
        <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.12em] truncate" style={{ color: MUTED }}>
          {label}
        </span>
      </div>
      <div className="bchog-stat-value text-[clamp(1.1rem,3.5vw,2rem)] font-semibold text-white truncate">
        {value}
      </div>
      {sub && (
        <div className="text-[9px] sm:text-[10px] mt-1 uppercase tracking-[0.1em]" style={{ color: MUTED }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StatGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={`grid gap-px ${cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}
      style={{ background: BORDER, border: `1px solid ${BORDER}` }}
    >
      {Children.map(children, (child, i) => (
        <div key={i} style={{ background: SURFACE }}>
          {child}
        </div>
      ))}
    </div>
  );
}

function StatTile({
  dot,
  label,
  value,
  sub,
}: {
  dot: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-5 sm:p-6 flex flex-col justify-end min-h-[120px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
        <SectionLabel>{label}</SectionLabel>
      </div>
      <div className="bchog-stat-value text-[clamp(1.25rem,4vw,2.25rem)] font-semibold text-white">{value}</div>
      {sub && (
        <div className="text-[10px] mt-1 uppercase tracking-[0.1em]" style={{ color: MUTED }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ---- dashboard charts (monochrome, reference-style) ----

const CHART_STROKE = PURPLE_BRIGHT;
const CHART_FILL = "rgba(181, 76, 255, 0.18)";
const CHART_MUTED = "rgba(61, 20, 136, 0.8)";

function DashCard({
  title,
  value,
  children,
  className = "",
}: {
  title: string;
  value: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-5 sm:p-6 flex flex-col min-h-[180px] ${className}`}
      style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: MUTED }}>
        {title}
      </p>
      <p className="bchog-stat-value text-[clamp(1.5rem,4vw,2.25rem)] font-semibold text-white mt-3">
        {value}
      </p>
      {children && <div className="mt-auto pt-4">{children}</div>}
    </div>
  );
}

function SparkBars({ values, highlight }: { values: number[]; highlight?: number }) {
  const max = Math.max(...values, 1);
  return (
    <svg viewBox="0 0 80 48" className="w-full h-14" aria-hidden>
      {values.map((v, i) => {
        const h = (v / max) * 38;
        const active = highlight === i;
        return (
          <rect
            key={i}
            x={4 + i * 9.5}
            y={44 - h}
            width={7}
            height={h}
            rx={3}
            fill={active ? CHART_STROKE : CHART_MUTED}
          />
        );
      })}
    </svg>
  );
}

function SparkArea({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 78 + 1;
      const y = 44 - (v / max) * 38;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `M1,48 L${pts.split(" ").join(" L")} L79,48 Z`;
  return (
    <svg viewBox="0 0 80 48" className="w-full h-14" aria-hidden>
      <path d={area} fill={CHART_FILL} />
      <polyline points={pts} fill="none" stroke={CHART_STROKE} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ segments }: { segments: { value: number; label: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="w-14 h-14 shrink-0" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" stroke={CHART_MUTED} strokeWidth="6" />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={i}
              cx="20"
              cy="20"
              r={r}
              fill="none"
              stroke={i === 0 ? CHART_STROKE : CHART_MUTED}
              strokeWidth="6"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 20 20)"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="flex flex-col gap-1 text-[10px]" style={{ color: MUTED }}>
        {segments.map((s) => (
          <span key={s.label}>
            {Math.round((s.value / total) * 100)}% {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RingProgress({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const len = (pct / 100) * c;
  return (
    <svg viewBox="0 0 40 40" className="w-14 h-14 ml-auto" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke={CHART_MUTED} strokeWidth="5" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={CHART_STROKE}
        strokeWidth="5"
        strokeDasharray={`${len} ${c - len}`}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

function TargetCompare({ current, target }: { current: number; target: number }) {
  const pct = Math.min((current / Math.max(target, 1)) * 100, 100);
  return (
    <div className="relative h-9 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div
        className="absolute inset-y-0 left-0 rounded-md"
        style={{ width: `${pct}%`, background: "rgba(181,76,255,0.35)" }}
      />
      <div
        className="absolute inset-y-0 border-r border-dashed"
        style={{ left: "100%", transform: "translateX(-1px)", borderColor: CHART_STROKE }}
      />
      <div className="absolute bottom-1 right-2 text-[9px]" style={{ color: MUTED }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

// ---- How It Works ----

function FlyStep({ step, title }: { step: string; title: string }) {
  return (
    <div
      className="shrink-0 rounded-xl px-5 py-4 min-w-[120px]"
      style={{ background: PANEL, border: `1px solid ${BORDER_STRONG}` }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: PURPLE_BRIGHT }}>
        {step}
      </p>
      <p className="text-sm font-semibold text-white mt-1.5">{title}</p>
    </div>
  );
}

function FlyConnector() {
  return (
    <div className="shrink-0 flex items-center px-2 sm:px-3" aria-hidden>
      <div className="w-6 sm:w-10 h-px" style={{ background: PURPLE }} />
    </div>
  );
}

function FlyOutcome({
  amount,
  label,
  progress,
}: {
  amount: string;
  label: string;
  progress?: number;
}) {
  return (
    <div
      className="rounded-xl px-4 py-4 flex flex-col min-h-[88px]"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
    >
      <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
        {label}
      </p>
      <p className="text-base font-semibold mt-1" style={{ color: CREAM }}>
        {amount}
      </p>
      {progress !== undefined && (
        <div className="mt-auto pt-3">
          <div className="h-4 rounded-full overflow-hidden" style={{ background: INDIGO }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: PURPLE_BRIGHT }} />
          </div>
        </div>
      )}
    </div>
  );
}

function DeflationaryFlywheelDiagram({ lockProgress }: { lockProgress: number }) {
  // iPhone glass — purple / white / black only
  const GLASS_BG    = "rgba(255,255,255,0.035)";
  const GLASS_BORDER = "rgba(255,255,255,0.08)";
  const GLASS_SHINE = "rgba(255,255,255,0.14)";
  const GLASS_BOT   = "rgba(255,255,255,0.03)";
  const SPINE = "rgba(181,76,255,0.30)";
  const DOT = PURPLE_BRIGHT;

  const glassCard: React.CSSProperties = {
    background: GLASS_BG,
    border: `1px solid ${GLASS_BORDER}`,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: `inset 0 1.5px 0 ${GLASS_SHINE}, inset 0 -1px 0 ${GLASS_BOT}, 0 8px 32px rgba(0,0,0,0.40)`,
    position: "relative" as const,
    overflow: "hidden" as const,
  };

  const steps = [
    {
      num: "01",
      title: "100k Burn",
      detail: "Every cycle starts with 100,000 BCHOG permanently removed from supply.",
      side: "left" as const,
    },
    {
      num: "02",
      title: "200% Match",
      detail: "The treasury matches the burn with a 200% contribution — doubling the impact.",
      side: "right" as const,
    },
    {
      num: "03",
      title: "Burn + Lock",
      detail: "+100k burned forever. +50k locked to reduce circulating supply.",
      side: "left" as const,
    },
    {
      num: "04",
      title: "Rewards",
      detail: "+50k distributed back to the community, fuelling the next cycle.",
      side: "right" as const,
    },
  ];

  const GlassSheen = () => (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "40%",
        borderRadius: "16px 16px 60% 60% / 12px 12px 28px 28px",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)",
        pointerEvents: "none",
      }}
    />
  );

  return (
    <div className="mt-8 relative w-full">
      {/* ── Desktop zigzag ── */}
      <div className="hidden sm:block relative">
        {/* Spine */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0"
          style={{ width: 1, background: `linear-gradient(to bottom, transparent, ${SPINE} 15%, ${SPINE} 85%, transparent)` }}
          aria-hidden
        />

        <div className="flex flex-col" style={{ gap: 56 }}>
          {steps.map((step, i) => {
            const isLeft = step.side === "left";
            return (
              <div
                key={step.num}
                style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", alignItems: "start" }}
              >
                {/* Col 1 */}
                <div style={{ display: "flex", justifyContent: isLeft ? "flex-end" : "flex-start", paddingRight: isLeft ? 24 : 0, paddingLeft: isLeft ? 0 : 24 }}>
                  {isLeft && (
                    <Reveal delay={i * 100} dir={-1}>
                      <div
                        className="rounded-2xl p-5"
                        style={{ ...glassCard, width: "min(100%, 320px)" }}
                      >
                        <GlassSheen />
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                        <p className="text-[15px] font-bold text-white mb-2">{step.title}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{step.detail}</p>
                        {i === 2 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[9px] mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                              <span>Lock progress</span><span>{Math.round(lockProgress)}%</span>
                            </div>
                            <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}>
                              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${lockProgress}%`, background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_BRIGHT} 70%, rgba(255,255,255,0.6) 100%)`, boxShadow: `0 0 10px 2px ${PURPLE_BRIGHT}77` }} />
                              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </Reveal>
                  )}
                </div>
                {/* Col 2 — dot */}
                <div className="flex flex-col items-center pt-5" style={{ zIndex: 2 }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: DOT, boxShadow: `0 0 12px 4px ${DOT}66, 0 0 0 3px rgba(181,76,255,0.15)` }} />
                  <div className="flex gap-[3px] mt-1.5" aria-hidden>
                    {[10,15,11,7,5].map((h, j) => (
                      <div key={j} style={{ width: 1, height: h, borderRadius: 99, background: `rgba(181,76,255,${[0.7,0.5,0.35,0.2,0.1][j]})` }} />
                    ))}
                  </div>
                </div>
                {/* Col 3 */}
                <div style={{ display: "flex", justifyContent: isLeft ? "flex-start" : "flex-end", paddingLeft: isLeft ? 24 : 0, paddingRight: isLeft ? 0 : 24 }}>
                  {!isLeft && (
                    <Reveal delay={i * 100} dir={1}>
                      <div
                        className="rounded-2xl p-5"
                        style={{ ...glassCard, width: "min(100%, 320px)" }}
                      >
                        <GlassSheen />
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                        <p className="text-[15px] font-bold text-white mb-2">{step.title}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{step.detail}</p>
                      </div>
                    </Reveal>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile zigzag ── */}
      <div className="sm:hidden relative">
        <div className="absolute top-0 bottom-0" style={{ left: "50%", width: 1, transform: "translateX(-50%)", background: `linear-gradient(to bottom, transparent, ${SPINE} 15%, ${SPINE} 85%, transparent)` }} aria-hidden />
        <div className="flex flex-col" style={{ gap: 20 }}>
          {steps.map((step, i) => {
            const isLeft = step.side === "left";
            return (
              <div key={step.num} style={{ display: "grid", gridTemplateColumns: "1fr 28px 1fr", alignItems: "start" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 8 }}>
                  {isLeft && (
                    <Reveal delay={i * 80} dir={-1}>
                      <div className="rounded-xl p-3" style={{ ...glassCard }}>
                        <GlassSheen />
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                        <p className="text-[12px] font-bold text-white mb-1">{step.title}</p>
                        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>{step.detail}</p>
                      </div>
                    </Reveal>
                  )}
                </div>
                <div className="flex justify-center pt-3" style={{ zIndex: 2 }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: DOT, boxShadow: `0 0 8px 3px ${DOT}55` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: 8 }}>
                  {!isLeft && (
                    <Reveal delay={i * 80} dir={1}>
                      <div className="rounded-xl p-3" style={{ ...glassCard }}>
                        <GlassSheen />
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                        <p className="text-[12px] font-bold text-white mb-1">{step.title}</p>
                        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>{step.detail}</p>
                      </div>
                    </Reveal>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ArchBox removed — replaced by EcosystemArchitecture NodeCard

function EcosystemArchitecture() {
  // iPhone glass — purple / white / black only
  const PUB      = PURPLE_BRIGHT; // #B54CFF
  const ARW      = PUB;
  const DASH_CLR = "rgba(181,76,255,0.60)";

  type NodeDef = {
    id: string;
    label: string;
    sub: string;
    desc: string;
    href?: string;
    Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    highlight?: boolean;
  };

  const nodes: NodeDef[] = [
    {
      id: "treasury",
      label: "TREASURY WALLET",
      sub: "Ecosystem Engine",
      desc: "The engine that powers the BCHOG ecosystem.",
      href: explorerAddr(WALLETS.treasury),
      Icon: Cog,
      highlight: true,
    },
    {
      id: "lock",
      label: "LOCK HOLDING",
      sub: "The Vault",
      desc: "Accumulating lock tokens, locked with Atlantis at 1M.",
      href: explorerAddr(WALLETS.lockHolding),
      Icon: Lock,
    },
    {
      id: "trading",
      label: "TRADING WALLET",
      sub: "Market Support",
      desc: "Investing in the community, profits feed the BCHOG flywheel.",
      href: explorerAddr(WALLETS.trading),
      Icon: Briefcase,
    },
    {
      id: "rewards",
      label: "REWARDS WALLET",
      sub: "Community Rewards",
      desc: "Funds community engagement, contests, and rewards.",
      Icon: Gift,
    },
    {
      id: "burn",
      label: "BUYBACK & BURN",
      sub: "Deflation",
      desc: "Tokens permanently removed from circulation to drive deflation.",
      Icon: Flame,
    },
  ];

  // ── Pure SVG diagram — same viewBox on all screen sizes ──
  // Node centres (in SVG units, viewBox 0 0 560 520):
  //   Treasury  T  = (280, 72)   — top centre
  //   Lock      LK = (82,  240)  — mid left
  //   Rewards   RW = (478, 240)  — mid right
  //   Trading   TR = (280, 390)  — bottom centre
  //   Burn      BN = (82,  500)  — bottom left  (small)
  // Node radii: Treasury=62, Lock/Rewards=58, Trading=58, Burn=46
  //
  // Connections (matching reference image):
  //   Treasury ──solid──► Lock    (curve left)
  //   Treasury ──solid──► Rewards (curve right)
  //   Treasury ──solid──► Trading (straight down)
  //   Trading  ──dashed──► Burn   (curve bottom-left)
  //   Lock     ──dashed──► Burn   (straight down, closes cycle)

  const VW = 560, VH = 540;
  const T  = { x: 280, y:  72, r: 62 };
  const LK = { x:  82, y: 240, r: 56 };
  const RW = { x: 478, y: 240, r: 56 };
  const TR = { x: 280, y: 392, r: 58 };
  const BN = { x:  82, y: 502, r: 44 };

  // Arrowhead: tip at (tx,ty), pointing in direction of (dx,dy)
  function Arrow({ tx, ty, dx, dy, fill }: { tx: number; ty: number; dx: number; dy: number; fill: string }) {
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    const size = 9;
    const spread = 0.42;
    const p1 = `${tx},${ty}`;
    const p2 = `${tx - size * (ux - spread * uy)},${ty - size * (uy + spread * ux)}`;
    const p3 = `${tx - size * (ux + spread * uy)},${ty - size * (uy - spread * ux)}`;
    return <polygon points={`${p1} ${p2} ${p3}`} fill={fill} />;
  }

  // A point on the surface of a circle at angle θ (radians)
  function edge(cx: number, cy: number, r: number, angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  // Glass circle node rendered entirely in pure SVG — no foreignObject (iOS Safari compat)
  function NodeCircle({
    node, cx, cy, r,
  }: {
    node: (typeof nodes)[number];
    cx: number; cy: number; r: number;
  }) {
    const isHL = !!node.highlight;
    const { Icon: _Icon } = node; // not used in pure SVG path, we use lucide path data

    // icon symbol paths (lucide path data for each id)
    const iconPaths: Record<string, string> = {
      treasury: "M12 2a7 7 0 1 0 0 14A7 7 0 0 0 12 2zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 12 4zm-1 2v2H9l3 3 3-3h-2V6h-2zm-1 6v2h4v-2h-4z",
      lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-7 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4-7V7a4 4 0 0 0-8 0v4h8z",
      trading:  "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 9h16v2H4V9zm0 10v-6h16v6H4zm8-4h4v2h-4v-2z",
      rewards:  "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6m18-4H2m10 0V2m0 6a3 3 0 0 1-3-3 3 3 0 0 1 3 3zm0 0a3 3 0 0 0 3-3 3 3 0 0 0-3 3z",
      burn:     "M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9zm0 4c0 0 3 2.5 3 5.5a3 3 0 0 1-6 0C9 8.5 12 6 12 6zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
    };

    const iconR = r * 0.28;
    const iconOff = iconR;
    const labelY  = cy + r * 0.15;
    const subY    = cy + r * 0.38;
    const iconY   = cy - r * 0.22;

    const ringFill  = isHL ? "rgba(181,76,255,0.18)" : "rgba(255,255,255,0.05)";
    const ringStroke = isHL ? "rgba(181,76,255,0.50)" : "rgba(255,255,255,0.12)";
    const glowColor  = isHL ? "rgba(181,76,255,0.35)" : "rgba(0,0,0,0)";
    const labelColor = "#ffffff";
    const subColor   = isHL ? PUB : "rgba(255,255,255,0.45)";
    const iconColor  = isHL ? PUB : "rgba(255,255,255,0.70)";
    const iconBgFill = isHL ? "rgba(181,76,255,0.25)" : "rgba(255,255,255,0.07)";

    // Split label into two lines if needed
    const words = node.label.split(" ");
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(" ");
    const line2 = words.slice(mid).join(" ");
    const lSize = r < 50 ? 7 : (r < 58 ? 8 : 9);
    const sSize = r < 50 ? 6 : 7;

    const href = node.href;
    const content = (
      <g>
        {/* drop shadow filter */}
        <defs>
          <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={isHL ? "6" : "3"} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Outer glow ring (highlight only) */}
        {isHL && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="rgba(181,76,255,0.18)" strokeWidth="8" />}

        {/* Main circle */}
        <circle cx={cx} cy={cy} r={r} fill={ringFill} stroke={ringStroke} strokeWidth="1.5" />

        {/* Top sheen arc */}
        <path
          d={`M${cx - r * 0.85},${cy - r * 0.35} A${r},${r} 0 0,1 ${cx + r * 0.85},${cy - r * 0.35}`}
          fill="rgba(255,255,255,0.10)" stroke="none"
        />

        {/* Icon background circle */}
        <circle cx={cx} cy={iconY} r={iconOff} fill={iconBgFill} stroke={isHL ? "rgba(181,76,255,0.30)" : "rgba(255,255,255,0.10)"} strokeWidth="1" />

        {/* Icon — simple SVG symbol per node */}
        {node.id === "treasury" && (
          <g transform={`translate(${cx - 7},${iconY - 7}) scale(0.58)`} fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="9" width="20" height="13" rx="2" /><path d="M16 2H8l-4 7h16l-4-7z" /><line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
          </g>
        )}
        {node.id === "lock" && (
          <g transform={`translate(${cx - 7},${iconY - 7}) scale(0.58)`} fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16" r="1" fill={iconColor} />
          </g>
        )}
        {node.id === "trading" && (
          <g transform={`translate(${cx - 7},${iconY - 7}) scale(0.58)`} fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="6" width="22" height="15" rx="2" /><path d="M1 10h22" /><line x1="7" y1="15" x2="10" y2="15" />
          </g>
        )}
        {node.id === "rewards" && (
          <g transform={`translate(${cx - 7},${iconY - 7}) scale(0.58)`} fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" rx="1" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </g>
        )}
        {node.id === "burn" && (
          <g transform={`translate(${cx - 7},${iconY - 7}) scale(0.58)`} fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A4.5 4.5 0 0 0 12 19a4.5 4.5 0 0 0 4.5-4.5c0-2-1.5-3.5-2-5C14 8 12 2 12 2s-2 6-2.5 7.5c-.5 1.5-1 2.5-1 5z" />
          </g>
        )}

        {/* Label — two lines */}
        <text x={cx} y={labelY} textAnchor="middle" fill={labelColor} fontSize={lSize} fontWeight="800" letterSpacing="0.10em" style={{ fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
          {line2 ? (
            <>
              <tspan x={cx} dy="0">{line1}</tspan>
              <tspan x={cx} dy={lSize * 1.3}>{line2}</tspan>
            </>
          ) : line1}
        </text>

        {/* Sub label */}
        <text x={cx} y={subY} textAnchor="middle" fill={subColor} fontSize={sSize} letterSpacing="0.08em" style={{ fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
          {node.sub}
        </text>
      </g>
    );

    return href ? (
      <a href={href} target="_blank" rel="noreferrer" style={{ cursor: "pointer" }}>{content}</a>
    ) : content;
  }

  // Pre-compute arrow endpoints on circle edges
  // Treasury → Lock: exit bottom-left of T, enter top of LK
  const tToLk_start = edge(T.x, T.y, T.r, Math.atan2(LK.y - T.y, LK.x - T.x));
  const tToLk_end   = edge(LK.x, LK.y, LK.r, Math.atan2(T.y - LK.y, T.x - LK.x));
  // Treasury → Rewards: exit bottom-right of T, enter top of RW
  const tToRw_start = edge(T.x, T.y, T.r, Math.atan2(RW.y - T.y, RW.x - T.x));
  const tToRw_end   = edge(RW.x, RW.y, RW.r, Math.atan2(T.y - RW.y, T.x - RW.x));
  // Treasury → Trading: straight down
  const tToTr_start = edge(T.x, T.y, T.r, Math.PI / 2);
  const tToTr_end   = edge(TR.x, TR.y, TR.r, -Math.PI / 2);
  // Trading → Burn: exit bottom-left of TR, enter right of BN
  const trToBn_start = edge(TR.x, TR.y, TR.r, Math.atan2(BN.y - TR.y, BN.x - TR.x));
  const trToBn_end   = edge(BN.x, BN.y, BN.r, Math.atan2(TR.y - BN.y, TR.x - BN.x));
  // Lock → Burn: exit bottom of LK, enter top of BN
  const lkToBn_start = edge(LK.x, LK.y, LK.r, Math.PI / 2);
  const lkToBn_end   = edge(BN.x, BN.y, BN.r, -Math.PI / 2);

  return (
    <div className="mt-4 w-full">
      <div className="text-center mb-6">
        <p className="text-white font-bold uppercase" style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(0.85rem,2.5vw,1.2rem)", letterSpacing: "0.15em", color: "rgba(255,255,255,0.92)" }}>
          BCHOG ECOSYSTEM WALLET FLOW
        </p>
      </div>

      {/* ── Single responsive SVG — same layout on all screen sizes ── */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: "100%", maxWidth: 600, display: "block", margin: "0 auto", overflow: "visible" }}
        aria-label="BCHOG ecosystem wallet flow diagram"
      >
        <defs>
          <marker id="arr-solid" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={ARW} />
          </marker>
          <marker id="arr-dash" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={DASH_CLR} />
          </marker>
        </defs>

        {/* ── Arrows (drawn under nodes) ── */}

        {/* Treasury → Lock */}
        <path
          d={`M${tToLk_start.x},${tToLk_start.y} C${T.x - 80},${(T.y + LK.y) / 2} ${LK.x + 60},${(T.y + LK.y) / 2} ${tToLk_end.x},${tToLk_end.y}`}
          fill="none" stroke={ARW} strokeWidth="1.8" markerEnd="url(#arr-solid)"
        />
        {/* Treasury → Rewards */}
        <path
          d={`M${tToRw_start.x},${tToRw_start.y} C${T.x + 80},${(T.y + RW.y) / 2} ${RW.x - 60},${(T.y + RW.y) / 2} ${tToRw_end.x},${tToRw_end.y}`}
          fill="none" stroke={ARW} strokeWidth="1.8" markerEnd="url(#arr-solid)"
        />
        {/* Treasury → Trading (straight down) */}
        <line
          x1={tToTr_start.x} y1={tToTr_start.y}
          x2={tToTr_end.x}   y2={tToTr_end.y}
          stroke={ARW} strokeWidth="1.8" markerEnd="url(#arr-solid)"
        />
        {/* Trading → Burn (dashed curve) */}
        <path
          d={`M${trToBn_start.x},${trToBn_start.y} C${TR.x - 60},${(TR.y + BN.y) / 2} ${BN.x + 80},${(TR.y + BN.y) / 2} ${trToBn_end.x},${trToBn_end.y}`}
          fill="none" stroke={DASH_CLR} strokeWidth="1.8" strokeDasharray="6 4" markerEnd="url(#arr-dash)"
        />
        {/* Lock → Burn (dashed straight down, cycle closes) */}
        <line
          x1={lkToBn_start.x} y1={lkToBn_start.y}
          x2={lkToBn_end.x}   y2={lkToBn_end.y}
          stroke={DASH_CLR} strokeWidth="1.6" strokeDasharray="5 4" markerEnd="url(#arr-dash)"
        />

        {/* ── Circular glass nodes ── */}
        <NodeCircle node={nodes[0]} cx={T.x}  cy={T.y}  r={T.r}  />
        <NodeCircle node={nodes[1]} cx={LK.x} cy={LK.y} r={LK.r} />
        <NodeCircle node={nodes[3]} cx={RW.x} cy={RW.y} r={RW.r} />
        <NodeCircle node={nodes[2]} cx={TR.x} cy={TR.y} r={TR.r} />
        <NodeCircle node={nodes[4]} cx={BN.x} cy={BN.y} r={BN.r} />
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 mt-5 pt-4" style={{ borderTop: "1px solid rgba(181,76,255,0.10)" }}>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.28)" }}>
          <span className="inline-block w-5 h-px" style={{ background: PUB }} />
          Wallet Flow
        </span>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.28)" }}>
          <span className="inline-block" style={{ width: 20, borderTop: `2px dashed ${DASH_CLR}` }} />
          Buyback / Burn
        </span>
      </div>
    </div>
  );
}

// Renders a real embedded X (Twitter) post via the widgets script.
let twttrPromise: Promise<void> | null = null;
function loadTwttr() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve();
  if (!twttrPromise) {
    twttrPromise = new Promise<void>((resolve) => {
      const s = document.createElement("script");
      s.src = "https://platform.twitter.com/widgets.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.body.appendChild(s);
    });
  }
  return twttrPromise;
}

function TweetEmbed({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadTwttr().then(() => {
      if (cancelled) return;
      window.twttr?.widgets?.load(ref.current);
      // give the widget a moment to swap in, then hide the fallback
      window.setTimeout(() => !cancelled && setLoaded(true), 1200);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div
        ref={ref}
        className="px-2"
        style={{ background: SURFACE, maxHeight: 460, overflowY: "auto" }}
      >
        <blockquote className="twitter-tweet" data-theme="dark" data-dnt="true">
          <a href={url}>{!loaded ? "Loading post from X…" : ""}</a>
        </blockquote>
      </div>
    </div>
  );
}

// ── Phantom-style wallet ──────────────────────────────────────────────────────

function PhantomWallet({
  bchogBalance,
  totalNetworkValue,
  memeTotal,
  roster,
  neverslandItems,
  veDust,
  trades,
}: {
  bchogBalance: string;
  totalNetworkValue: number;
  memeTotal: number;
  roster: PortfolioToken[];
  neverslandItems: { k: string; v: string }[];
  veDust: VeDustData | undefined;
  trades: Trade[];
}) {
  const [walletTab, setWalletTab] = useState<"tokens" | "defi" | "activity">("tokens");

  const walletTabs: { id: "tokens" | "defi" | "activity"; label: string }[] = [
    { id: "tokens", label: "Tokens" },
    { id: "defi", label: "DeFi" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="w-full">
      <Reveal>
        <div
          className="w-full rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #1a0636 0%, #110426 100%)",
            border: `1px solid rgba(181,76,255,0.25)`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* Top bar: network badge */}
          <div className="flex items-center justify-between px-5 sm:px-7 pt-5 pb-1">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{
                background: "rgba(181,76,255,0.12)",
                border: "1px solid rgba(181,76,255,0.2)",
                color: PURPLE_BRIGHT,
              }}
            >
              <img
                src="https://pbs.twimg.com/profile_images/1967693862559698944/XTfCXXGa_400x400.jpg"
                alt="Monad"
                className="w-3.5 h-3.5 rounded-full object-cover"
              />
              Monad
            </div>
            <div
              className="text-[10px] font-mono truncate max-w-[120px]"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              0x574d…526fb
            </div>
          </div>

          {/* Balance */}
          <div className="px-5 sm:px-7 pt-3 pb-5">
            <p
              className="font-black text-white leading-none"
              style={{
                fontSize: "clamp(2.2rem,6vw,3.5rem)",
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {totalNetworkValue > 0 ? formatUsd(totalNetworkValue) : "$0.00"}
            </p>
            <p className="text-[12px] mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              Trading Desk Portfolio
            </p>
          </div>

          {/* Tabs */}
          <div className="flex mx-4 sm:mx-6 mb-0 gap-1.5 p-1 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.02)",
            }}
          >
            {walletTabs.map((t) => {
              const active = walletTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setWalletTab(t.id)}
                  className="flex-1 py-2 text-[11px] sm:text-[12px] font-semibold transition-all duration-200 rounded-xl"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    background: active
                      ? "rgba(181,76,255,0.18)"
                      : "transparent",
                    border: active
                      ? "1px solid rgba(181,76,255,0.35)"
                      : "1px solid transparent",
                    backdropFilter: active ? "blur(16px)" : "none",
                    WebkitBackdropFilter: active ? "blur(16px)" : "none",
                    boxShadow: active
                      ? "inset 0 1.5px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.04), 0 0 14px rgba(181,76,255,0.20)"
                      : "none",
                    color: active ? "white" : "rgba(255,255,255,0.32)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {active && (
                    <span aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", borderRadius: "12px 12px 50% 50% / 8px 8px 16px 16px", background: "linear-gradient(to bottom, rgba(255,255,255,0.11), transparent)", pointerEvents: "none" }} />
                  )}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="px-4 sm:px-6 pb-5 pt-1">

            {/* Tokens tab — all wallet tokens */}
            {walletTab === "tokens" && (
              <div
                className="flex flex-col pt-2 rounded-2xl mt-2"
                style={{
                  maxHeight: 420,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  position: "relative",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 28px rgba(0,0,0,0.45)",
                  padding: "0 12px",
                }}
              >
                {/* BCHOG first */}
                <div
                  className="flex items-center justify-between py-3.5"
                  style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                      style={{ background: PANEL, border: `1.5px solid rgba(181,76,255,0.3)` }}
                    >
                      <img src={TOKEN_LOGO} alt="BCHOG" className="w-full h-full object-cover" draggable={false} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white">BCHOG</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Burning Chog</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-white">{bchogBalance}</p>
                    <p className="text-[10px]" style={{ color: PURPLE_BRIGHT }}>BCHOG</p>
                  </div>
                </div>
                {roster.length === 0 ? (
                  <div className="py-6 text-sm text-center" style={{ color: "rgba(255,255,255,0.25)" }}>Loading tokens…</div>
                ) : (
                  roster.map((t) => (
                    <a
                      key={t.address}
                      href={explorerToken(t.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between py-3.5 no-underline hover:bg-white/[0.04] transition-colors rounded-xl px-1"
                      style={{ borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "white" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                          style={{ background: PANEL, border: `1.5px solid rgba(181,76,255,0.2)` }}
                        >
                          {t.iconUrl
                            ? <img src={t.iconUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                            : <span className="text-[10px] font-bold" style={{ color: PURPLE_BRIGHT }}>{t.symbol.slice(0, 2)}</span>
                          }
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-white">{t.symbol}</p>
                          <p className="text-[10px] truncate max-w-[120px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t.name}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-[13px] font-semibold text-white">{formatUsd(t.valueUsd)}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {t.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}

            {/* DeFi tab — Neverland positions */}
            {walletTab === "defi" && (
              <div className="flex flex-col gap-3 pt-3">
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 28px rgba(0,0,0,0.45)",
                  }}
                >
                  {/* top sheen */}
                  <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "16px 16px 60% 60% / 10px 10px 24px 24px", background: "linear-gradient(to bottom, rgba(255,255,255,0.09), transparent)", pointerEvents: "none" }} />
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid rgba(181,76,255,0.3)` }}
                    >
                      <img
                        src="https://pbs.twimg.com/profile_images/2066183456401338368/wZHKC1Nj_400x400.jpg"
                        alt="Neverland"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: PURPLE_BRIGHT }}>
                      Neverland veDUST
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {neverslandItems.map((r) => (
                      <div
                        key={r.k}
                        className="rounded-xl p-3"
                        style={{
                          position: "relative",
                          overflow: "hidden",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          backdropFilter: "blur(16px)",
                          WebkitBackdropFilter: "blur(16px)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.35)",
                        }}
                      >
                        <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", borderRadius: "12px 12px 50% 50% / 8px 8px 18px 18px", background: "linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" }} />
                        <p className="text-[9px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.3)" }}>{r.k}</p>
                        <p className="text-[13px] font-bold text-white mt-0.5 truncate">{r.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─ Activity ─ */}
            {walletTab === "activity" && (
              <div className="flex flex-col pt-2">
                <div className="flex items-center justify-between py-2.5 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Recent Transactions
                  </p>
                  <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DB_GREEN }} />
                  </span>
                </div>
                {trades.length === 0 ? (
                  <div className="py-8 text-sm text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Loading transactions…
                  </div>
                ) : (
                  <div
                    className="flex flex-col rounded-2xl"
                    style={{
                      maxHeight: 400,
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      position: "relative",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 28px rgba(0,0,0,0.45)",
                      padding: "0 12px",
                    }}
                  >
                    {trades.map((t, idx) => (
                      <a
                        key={t.hash}
                        href={explorerTx(t.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 sm:gap-4 py-3.5 no-underline hover:bg-white/[0.04] transition-colors rounded-xl"
                        style={{ borderBottom: idx < trades.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined, color: "white" }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: t.type === "BUY" ? "rgba(74,222,174,0.08)" : "rgba(255,92,138,0.08)",
                            border: `1px solid ${t.type === "BUY" ? "rgba(74,222,174,0.22)" : "rgba(255,92,138,0.22)"}`,
                            boxShadow: t.type === "BUY" ? "inset 0 1px 0 rgba(255,255,255,0.10)" : "inset 0 1px 0 rgba(255,255,255,0.10)",
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                            stroke={t.type === "BUY" ? DB_GREEN : DB_RED} strokeWidth="2.2" aria-hidden>
                            {t.type === "BUY"
                              ? <path d="M12 19V5M5 12l7-7 7 7" />
                              : <path d="M12 5v14M5 12l7 7 7-7" />
                            }
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-white">
                            {t.type === "BUY" ? "Bought" : "Sold"} BCHOG
                          </p>
                          <p className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.28)" }}>
                            {t.account ? `${t.account.slice(0, 6)}…${t.account.slice(-4)}` : "—"} · {timeAgo(t.ts)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold"
                            style={{ color: t.type === "BUY" ? DB_GREEN : DB_RED }}>
                            {t.type === "BUY" ? "+" : "-"}{formatUsd(t.valueUsd)}
                          </p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                            {compactAmount(t.tokenAmount)} BCHOG
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

function SectionMock({
  id,
  stats,
  market,
  portfolio,
  veDust,
}: {
  id: string;
  stats: BchogStats;
  market: MarketExtras;
  portfolio: PortfolioToken[];
  veDust: VeDustData | undefined;
}) {
  const lockedTotal = (stats.balances.lockHolding ?? 0n) + (stats.balances.atlantisLock ?? 0n);
  const circulating =
    stats.totalSupply === undefined
      ? undefined
      : stats.totalSupply -
        (stats.balances.burn ?? 0n) -
        (stats.balances.treasury ?? 0n) -
        (stats.balances.trading ?? 0n) -
        lockedTotal;

  if (id === "dashboard") {
    const lockProgress = percentOf(
      stats.balances.lockHolding,
      LOCK_TARGET * scaledDivisor(stats.decimals),
    );
    const burnedPct = percentOf(stats.balances.burn, stats.totalSupply);
    const lockPct = percentOf(lockedTotal, stats.totalSupply);

    // Simple sparkline data (visual only — represents trend shape)
    const sparkPts = [30, 38, 34, 44, 40, 52, 48, 58, 54, 62, 68, 64, 72, 70, 78];

    // Build sparkline polyline string
    const sparkW = 200, sparkH = 48;
    const sparkMax = Math.max(...sparkPts);
    const sparkMin = Math.min(...sparkPts);
    const sparkRange = sparkMax - sparkMin || 1;
    const sparkCoords = sparkPts.map((v, i) => {
      const x = (i / (sparkPts.length - 1)) * sparkW;
      const y = sparkH - ((v - sparkMin) / sparkRange) * (sparkH - 6) - 3;
      return `${x},${y}`;
    }).join(" ");
    const sparkArea = `0,${sparkH} ${sparkCoords} ${sparkW},${sparkH}`;

    const glassCard: React.CSSProperties = {
      position: "relative",
      overflow: "hidden",
      background: "rgba(255,255,255,0.035)",
      border: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.4)",
    };

    const GlassSheen = () => (
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "16px 16px 60% 60% / 10px 10px 24px 24px", background: "linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)", pointerEvents: "none" }} />
    );

    return (
      <div className="flex flex-col gap-4">

        {/* ── Row 1: 4 key metrics ── */}
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Market Cap",    value: formatUsd(market.marketCapUsd),                            accent: PURPLE_BRIGHT },
              { label: "Holders",       value: formatCount(market.holders),                               accent: PURPLE_BRIGHT },
              { label: "Total Burned",  value: formatToken(stats.balances.burn, stats.decimals),          accent: CORAL        },
              { label: "Supply Locked", value: `${Math.round(lockPct)}%`,                                 accent: PURPLE_BRIGHT },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4 sm:p-5 flex flex-col gap-1" style={glassCard}>
                <GlassSheen />
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.30)" }}>{s.label}</p>
                <p className="font-black text-white leading-none" style={{
                  fontSize: "clamp(1.5rem,5.5vw,2.4rem)",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                  textShadow: `0 0 24px ${s.accent}66`,
                }}>{s.value}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── Row 2: Sparkline chart + Lock progress ── */}
        <Reveal delay={60}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Price trend chart */}
            <div className="rounded-2xl p-5 flex flex-col gap-3" style={glassCard}>
              <GlassSheen />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.30)" }}>Price Trend</p>
                  <p className="font-black text-white mt-1 leading-none" style={{ fontSize: "clamp(1.2rem,3.5vw,1.8rem)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                    {market.priceUsd ? `$${market.priceUsd.toPrecision(3)}` : "$---"}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(181,76,255,0.15)", color: PURPLE_BRIGHT, border: "1px solid rgba(181,76,255,0.25)" }}>
                  BCHOG
                </span>
              </div>
              <div className="relative mt-1" style={{ height: 52 }}>
                <svg viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ width: "100%", height: "100%", overflow: "visible" }} preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PURPLE_BRIGHT} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={PURPLE_BRIGHT} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <polygon points={sparkArea} fill="url(#spark-fill)" />
                  <polyline points={sparkCoords} fill="none" stroke={PURPLE_BRIGHT} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                  {/* last point dot */}
                  <circle cx={sparkW} cy={parseFloat(sparkCoords.split(" ").at(-1)!.split(",")[1])} r="3" fill={PURPLE_BRIGHT} />
                </svg>
              </div>
              <div className="flex justify-between text-[9px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                <span>Early</span>
                <span>Now</span>
              </div>
            </div>

            {/* Lock to 1M progress */}
            <div className="rounded-2xl p-5 flex flex-col justify-between gap-4" style={glassCard}>
              <GlassSheen />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.30)" }}>Lock Target</p>
                  <p className="font-black text-white mt-1 leading-none" style={{ fontSize: "clamp(1.2rem,3.5vw,1.8rem)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                    {formatToken(stats.balances.lockHolding, stats.decimals)}
                  </p>
                </div>
                <span className="font-black text-[clamp(1.4rem,4vw,2rem)]" style={{ color: PURPLE_BRIGHT, letterSpacing: "-0.02em" }}>
                  {Math.round(lockProgress)}%
                </span>
              </div>
              {/* Thick progress bar */}
              <div>
                <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 2px 5px rgba(0,0,0,0.55)" }}>
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{
                    width: `${lockProgress}%`,
                    background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_BRIGHT} 60%, rgba(255,255,255,0.6) 100%)`,
                    boxShadow: `0 0 14px 3px ${PURPLE_BRIGHT}88`,
                  }} />
                  <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)" }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                  <span>{Math.round(lockProgress)}% of 1M target</span>
                  <span>1,000,000</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Row 3: Supply split + Trading desk value ── */}
        <Reveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Burned vs locked vs circulating — 3 big numbers */}
            <div className="lg:col-span-2 rounded-2xl p-5" style={glassCard}>
              <GlassSheen />
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: "rgba(255,255,255,0.30)" }}>Supply Snapshot</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Burned",      pct: burnedPct,  color: CORAL,        value: formatToken(stats.balances.burn, stats.decimals) },
                  { label: "Locked",      pct: lockPct,    color: PURPLE_BRIGHT, value: formatToken(lockedTotal, stats.decimals) },
                  { label: "Circulating", pct: percentOf(circulating, stats.totalSupply), color: "rgba(255,255,255,0.55)", value: formatToken(circulating, stats.decimals) },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[9px] uppercase tracking-[0.1em] mb-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>{s.label}</p>
                    <p className="font-black text-white leading-none" style={{ fontSize: "clamp(1rem,3.5vw,1.5rem)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", textShadow: `0 0 16px ${s.color}66` }}>
                      {s.value}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: s.color }}>{Math.round(s.pct)}%</p>
                    <div className="relative h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${s.pct}%`, background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading desk snapshot */}
            <a href="#trading-desk" onClick={(e) => { e.preventDefault(); document.getElementById("trading-desk")?.scrollIntoView({ behavior: "smooth" }); }}
              className="no-underline rounded-2xl p-5 flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]"
              style={{ ...glassCard, cursor: "pointer" }}>
              <GlassSheen />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.30)" }}>Trading Desk</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>{shortAddress(WALLETS.trading)}</p>
              </div>
              <div>
                <p className="font-black text-white leading-none" style={{ fontSize: "clamp(1.2rem,3.5vw,1.8rem)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  {formatToken(stats.balances.trading, stats.decimals)}
                </p>
                <p className="text-[10px] mt-1" style={{ color: PURPLE_BRIGHT }}>BCHOG balance</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                <span>View desk</span>
                <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </div>
            </a>

          </div>
        </Reveal>

      </div>
    );
  }

  if (id === "how-it-works") {
    const lockProgress = percentOf(
      stats.balances.lockHolding,
      LOCK_TARGET * scaledDivisor(stats.decimals),
    );

    // Zigzag timeline steps — purple & white only, like the image
    const timelineSteps = [
      {
        num: "Phase 01",
        title: "100k Burn",
        bullets: [
          "Treasury initiates 100,000 BCHOG burn",
          "Tokens permanently removed from supply",
          "Supply pressure builds",
        ],
        side: "left" as const,
        accent: PURPLE_BRIGHT,
      },
      {
        num: "Phase 02",
        title: "200% Match",
        bullets: [
          "Treasury matches with 200% contribution",
          "200,000 BCHOG redirected to flywheel",
          "Multiplied burn impact",
        ],
        side: "right" as const,
        accent: PURPLE_BRIGHT,
      },
      {
        num: "Phase 03",
        title: "Burn + Lock",
        bullets: [
          "+100k burned permanently",
          "+50k locked — reducing circulating supply",
          "Lock progress tracked on-chain",
        ],
        side: "left" as const,
        accent: PURPLE_BRIGHT,
      },
      {
        num: "Phase 04",
        title: "Rewards",
        bullets: [
          "+50k distributed to community",
          "Rewarding holders and participants",
          "Cycle repeats — flywheel spins",
        ],
        side: "right" as const,
        accent: PURPLE_BRIGHT,
      },
    ];

    return (
      <div className="flex flex-col gap-8">

        {/* ── Zigzag timeline ── */}
        <Reveal>
          <p
            className="text-center font-bold uppercase mb-8"
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: "clamp(1.4rem,4vw,2.2rem)",
              letterSpacing: "0.1em",
              color: "white",
            }}
          >
            Explore the Flywheel
          </p>

          {/* Desktop zigzag — true 3-column grid, cards alternate left/right */}
          <div className="hidden sm:block relative">
            {/* Spine */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: 24,
                bottom: 24,
                width: 1,
                background: `linear-gradient(to bottom, transparent, ${PURPLE_BRIGHT}88, ${PURPLE}88, transparent)`,
              }}
              aria-hidden
            />

            <div className="flex flex-col" style={{ gap: 64 }}>
              {timelineSteps.map((step, i) => {
                const isLeft = step.side === "left";
                // card goes col 1 (left) or col 3 (right); spacer fills the opposite
                return (
                  <div
                    key={step.num}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 1fr",
                      gridTemplateRows: "1fr",
                      alignItems: "start",
                    }}
                  >
                    {/* Col 1 — card when isLeft, empty when isRight */}
                    <div
                      style={{ display: "flex", justifyContent: isLeft ? "flex-end" : "flex-start", paddingRight: isLeft ? 24 : 0, paddingLeft: isLeft ? 0 : 24 }}
                    >
                      {isLeft && (
                        <Reveal delay={i * 110} dir={-1}>
                          <div
                            className="rounded-2xl p-5"
                            style={{
                              width: "min(100%, 340px)",
                              position: "relative",
                              overflow: "hidden",
                              background: "rgba(255,255,255,0.035)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              backdropFilter: "blur(24px)",
                              WebkitBackdropFilter: "blur(24px)",
                              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.40)",
                            }}
                          >
                            <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "16px 16px 60% 60% / 12px 12px 28px 28px", background: "linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" }} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                            <p className="text-[15px] font-bold text-white mb-3">{step.title}</p>
                            <ul className="flex flex-col gap-1.5">
                              {step.bullets.map((b) => (
                                <li key={b} className="flex items-start gap-2">
                                  <span className="text-[10px] mt-0.5 shrink-0" style={{ color: PURPLE_BRIGHT }}>+</span>
                                  <span className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.48)" }}>{b}</span>
                                </li>
                              ))}
                            </ul>
                            {i === 2 && (
                              <div className="mt-4">
                                <div className="flex justify-between text-[9px] mb-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                                  <span>Lock progress</span><span>{Math.round(lockProgress)}%</span>
                                </div>
                                <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}>
                                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${lockProgress}%`, background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_BRIGHT} 70%, rgba(255,255,255,0.55) 100%)`, boxShadow: `0 0 10px 2px ${PURPLE_BRIGHT}77` }} />
                                  <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)" }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </Reveal>
                      )}
                    </div>

                    {/* Col 2 — centre dot always */}
                    <div className="flex flex-col items-center pt-5" style={{ zIndex: 2 }}>
                      <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: PURPLE_BRIGHT, boxShadow: `0 0 12px 4px ${PURPLE_BRIGHT}66, 0 0 0 3px rgba(181,76,255,0.15)` }} />
                      <div className="flex gap-[3px] mt-1.5" aria-hidden>
                        {[10, 16, 12, 8, 6].map((h, j) => (
                          <div key={j} className="rounded-full" style={{ width: 1, height: h, background: `rgba(181,76,255,${[0.7,0.5,0.35,0.2,0.1][j]})` }} />
                        ))}
                      </div>
                    </div>

                    {/* Col 3 — card when isRight, empty when isLeft */}
                    <div style={{ display: "flex", justifyContent: isLeft ? "flex-start" : "flex-end", paddingLeft: isLeft ? 24 : 0, paddingRight: isLeft ? 0 : 24 }}>
                      {!isLeft && (
                        <Reveal delay={i * 110} dir={1}>
                          <div
                            className="rounded-2xl p-5"
                            style={{
                              width: "min(100%, 340px)",
                              position: "relative",
                              overflow: "hidden",
                              background: "rgba(255,255,255,0.035)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              backdropFilter: "blur(24px)",
                              WebkitBackdropFilter: "blur(24px)",
                              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.40)",
                            }}
                          >
                            <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "16px 16px 60% 60% / 12px 12px 28px 28px", background: "linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" }} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                            <p className="text-[15px] font-bold text-white mb-3">{step.title}</p>
                            <ul className="flex flex-col gap-1.5">
                              {step.bullets.map((b) => (
                                <li key={b} className="flex items-start gap-2">
                                  <span className="text-[10px] mt-0.5 shrink-0" style={{ color: PURPLE_BRIGHT }}>+</span>
                                  <span className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.48)" }}>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </Reveal>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile zigzag — cards alternate left/right with a narrow centre line */}
          <div className="sm:hidden relative" style={{ paddingLeft: 0, paddingRight: 0 }}>
            {/* Centre spine */}
            <div
              className="absolute top-0 bottom-0"
              style={{ left: "50%", width: 1, transform: "translateX(-50%)", background: `linear-gradient(to bottom, transparent, ${PURPLE_BRIGHT}55, transparent)` }}
              aria-hidden
            />
            <div className="flex flex-col" style={{ gap: 28 }}>
              {timelineSteps.map((step, i) => {
                const isLeft = step.side === "left";
                return (
                  <div
                    key={step.num}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 28px 1fr",
                      alignItems: "start",
                    }}
                  >
                    {/* Col 1 */}
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 10 }}>
                      {isLeft && (
                        <Reveal delay={i * 80} dir={-1}>
                          <div className="rounded-xl p-3" style={{ position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.03), 0 4px 16px rgba(0,0,0,0.38)" }}>
                            <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "12px 12px 60% 60% / 8px 8px 20px 20px", background: "linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" }} />
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                            <p className="text-[12px] font-bold text-white mb-1.5">{step.title}</p>
                            {step.bullets.map((b) => (
                              <p key={b} className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.44)" }}>+ {b}</p>
                            ))}
                          </div>
                        </Reveal>
                      )}
                    </div>
                    {/* Col 2 — dot */}
                    <div className="flex justify-center pt-3" style={{ zIndex: 2 }}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PURPLE_BRIGHT, boxShadow: `0 0 10px 3px ${PURPLE_BRIGHT}55, 0 0 0 2px rgba(181,76,255,0.15)` }} />
                    </div>
                    {/* Col 3 */}
                    <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: 10 }}>
                      {!isLeft && (
                        <Reveal delay={i * 80} dir={1}>
                          <div className="rounded-xl p-3" style={{ position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.03), 0 4px 16px rgba(0,0,0,0.38)" }}>
                            <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "12px 12px 60% 60% / 8px 8px 20px 20px", background: "linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" }} />
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: PURPLE_BRIGHT }}>{step.num}</p>
                            <p className="text-[12px] font-bold text-white mb-1.5">{step.title}</p>
                            {step.bullets.map((b) => (
                              <p key={b} className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.44)" }}>+ {b}</p>
                            ))}
                          </div>
                        </Reveal>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* ── Ecosystem Architecture ── */}
        <Reveal delay={120}>
          <div className="rounded-2xl p-5 sm:p-7" style={{
            background: `linear-gradient(160deg, ${SURFACE} 0%, ${PANEL} 100%)`,
            border: `1px solid ${BORDER_STRONG}`,
          }}>
            <SectionLabel>Ecosystem Architecture</SectionLabel>
            <EcosystemArchitecture />
          </div>
        </Reveal>
      </div>
    );
  }
  if (id === "trading-desk") {
    const memeTotal = portfolio.reduce((acc, t) => acc + t.valueUsd, 0);
    const roster = portfolio.slice(0, 30);
    const neverslandItems = [
      { k: "NFTs", v: veDust ? veDust.nfts.toString() : "---" },
      {
        k: "veDUST",
        v: veDust
          ? veDust.veBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })
          : "---",
      },
      { k: "Value", v: veDust ? formatUsd(veDust.valueUsd) : "$---" },
      { k: "Weekly Yield", v: veDust ? formatUsd(veDust.weeklyUsd) : "$---" },
      { k: "Lifetime Yield", v: veDust ? formatUsd(veDust.lifetimeUsd) : "$---" },
    ];

    const bchogBalance = formatToken(stats.balances.trading, stats.decimals);
    const totalNetworkValue = memeTotal + (veDust?.valueUsd ?? 0);

    return <PhantomWallet
      bchogBalance={bchogBalance}
      totalNetworkValue={totalNetworkValue}
      memeTotal={memeTotal}
      roster={roster}
      neverslandItems={neverslandItems}
      veDust={veDust}
      trades={market.trades}
    />;
  }
  if (id === "contests") {
    return <ContestsCollabs />;
  }
  if (id === "coming-soon") {
    return <ComingSoonBlock />;
  }
  return null;
}

function ContestsCollabs() {
  const [tab, setTab] = useState<"contests" | "collabs">("contests");

  type ContestTab = { id: "contests" | "collabs"; label: string; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> };
  const contestTabs: ContestTab[] = [
    { id: "contests", label: "Active Contests", Icon: Trophy },
    { id: "collabs",  label: "Collabs",          Icon: Users2 },
  ];

  const contestPosts = [
    "https://x.com/BURNINGCHOG/status/2068770674475176411",
  ];

  const glassCard: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.09)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 28px rgba(0,0,0,0.45)",
  };

  const Sheen = () => (
    <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "16px 16px 60% 60% / 10px 10px 24px 24px", background: "linear-gradient(to bottom, rgba(255,255,255,0.09), transparent)", pointerEvents: "none" }} />
  );

  return (
    <Reveal>
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #1a0636 0%, #110426 100%)",
          border: "1px solid rgba(181,76,255,0.25)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Header */}
        <div className="px-5 sm:px-7 pt-6 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: PURPLE_BRIGHT }}>Community</p>
          <p className="text-white font-black leading-none" style={{ fontSize: "clamp(1.4rem,4vw,2rem)", letterSpacing: "-0.02em" }}>
            Contests & Collabs
          </p>
          <p className="text-[12px] mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Compete, win, and build with BCHOG</p>
        </div>

        {/* Tabs */}
        <div className="flex mx-4 sm:mx-6 mb-0 gap-1.5 p-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.02)",
          }}
        >
          {contestTabs.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button key={id} type="button" onClick={() => setTab(id)}
                className="flex-1 py-2 text-[11px] sm:text-[12px] font-semibold transition-all duration-200 rounded-xl flex items-center justify-center gap-1.5"
                style={{
                  position: "relative", overflow: "hidden",
                  background: active ? "rgba(181,76,255,0.18)" : "transparent",
                  border: active ? "1px solid rgba(181,76,255,0.35)" : "1px solid transparent",
                  backdropFilter: active ? "blur(16px)" : "none",
                  WebkitBackdropFilter: active ? "blur(16px)" : "none",
                  boxShadow: active ? "inset 0 1.5px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.04), 0 0 14px rgba(181,76,255,0.20)" : "none",
                  color: active ? "white" : "rgba(255,255,255,0.32)",
                  letterSpacing: "0.04em",
                }}
              >
                {active && <span aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", borderRadius: "12px 12px 50% 50% / 8px 8px 16px 16px", background: "linear-gradient(to bottom, rgba(255,255,255,0.11), transparent)", pointerEvents: "none" }} />}
                <Icon size={13} strokeWidth={2} color={active ? PURPLE_BRIGHT : "rgba(255,255,255,0.32)"} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pb-6 pt-4">

          {/* ── Active Contests ── */}
          {tab === "contests" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {contestPosts.map((p) => (
                  <div key={p} className="rounded-2xl overflow-hidden" style={{ ...glassCard }}>
                    <Sheen />
                    <div className="p-1"><TweetEmbed url={p} /></div>
                  </div>
                ))}
                {/* Second col placeholder */}
                <div className="hidden lg:flex rounded-2xl p-6 flex-col justify-center items-center gap-4" style={{ ...glassCard, minHeight: 220 }}>
                  <Sheen />
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(181,76,255,0.12)", border: "1px solid rgba(181,76,255,0.25)" }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill={PURPLE_BRIGHT} aria-hidden>
                      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.875l-5.38-7.03L4.6 22H1.34l8.02-9.165L1 2h7.05l4.86 6.43L18.244 2Z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-white mb-1">More Contests Dropping</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                      Follow{" "}
                      <a href={SOCIALS.x} target="_blank" rel="noreferrer" className="no-underline font-semibold" style={{ color: PURPLE_BRIGHT }}>@BURNINGCHOG</a>
                      {" "}on X for announcements
                    </p>
                  </div>
                  <a href={SOCIALS.x} target="_blank" rel="noreferrer"
                    className="no-underline px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em]"
                    style={{ background: "rgba(181,76,255,0.18)", border: "1px solid rgba(181,76,255,0.30)", color: "white" }}>
                    Follow on X
                  </a>
                </div>
              </div>
              <div className="flex lg:hidden justify-center">
                <a href={SOCIALS.x} target="_blank" rel="noreferrer"
                  className="no-underline flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-[0.1em]"
                  style={{ ...glassCard, color: "white" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill={PURPLE_BRIGHT} aria-hidden>
                    <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.875l-5.38-7.03L4.6 22H1.34l8.02-9.165L1 2h7.05l4.86 6.43L18.244 2Z" />
                  </svg>
                  Follow for more
                </a>
              </div>
            </div>
          )}

          {/* ── Collabs ── */}
          {tab === "collabs" && (
            <div className="flex flex-col items-center justify-center gap-5 py-10 rounded-2xl" style={{ ...glassCard }}>
              <Sheen />
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(181,76,255,0.10)", border: "1px solid rgba(181,76,255,0.22)" }}>
                <Plus size={28} color="rgba(181,76,255,0.55)" strokeWidth={1.5} />
              </div>
              <div className="text-center px-6">
                <p className="text-[15px] font-bold text-white mb-2">No Collabs Yet</p>
                <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                  We're building. Future partnerships and integrations will be showcased here.
                </p>
              </div>
              <a href={SOCIALS.x} target="_blank" rel="noreferrer"
                className="no-underline flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all hover:scale-[1.02]"
                style={{ background: "rgba(181,76,255,0.14)", border: "1px solid rgba(181,76,255,0.28)", color: "white",
                  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill={PURPLE_BRIGHT} aria-hidden>
                  <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.875l-5.38-7.03L4.6 22H1.34l8.02-9.165L1 2h7.05l4.86 6.43L18.244 2Z" />
                </svg>
                Stay Updated on X
              </a>
            </div>
          )}

        </div>
      </div>
    </Reveal>
  );
}

function ComingSoonBlock() {
  const items = [
    {
      num: "01",
      label: "NFT Collection",
      detail: "Exclusive holder drops",
      color: PURPLE_BRIGHT,
    },
    {
      num: "02",
      label: "BCHOG Gear",
      detail: "Merch & community wear",
      color: CREAM,
    },
    {
      num: "03",
      label: "Staking Program",
      detail: "Earn by holding",
      color: CORAL,
    },
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const blockRef = useRef<HTMLDivElement>(null);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = blockRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const cycle = (idx: number) => {
            const next = (idx + 1) % items.length;
            setPhase("exit");
            cycleRef.current = setTimeout(() => {
              setActiveIdx(next);
              setPhase("enter");
              cycleRef.current = setTimeout(() => {
                setPhase("idle");
                cycleRef.current = setTimeout(() => cycle(next), 2000);
              }, 600);
            }, 500);
          };
          cycleRef.current = setTimeout(() => cycle(0), 2200);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (cycleRef.current) clearTimeout(cycleRef.current);
    };
  }, []);

  const active = items[activeIdx];

  const cardStyle: React.CSSProperties = {
    opacity: phase === "exit" ? 0 : 1,
    transform:
      phase === "exit"
        ? "translateY(-40px) scale(0.96)"
        : phase === "enter"
        ? "translateY(40px) scale(0.96)"
        : "translateY(0) scale(1)",
    transition:
      phase === "exit"
        ? "opacity 450ms ease, transform 450ms ease"
        : phase === "enter"
        ? "opacity 0ms, transform 0ms"
        : "opacity 550ms cubic-bezier(0.22,1,0.36,1), transform 550ms cubic-bezier(0.22,1,0.36,1)",
  };

  return (
    <div
      ref={blockRef}
      className="rounded-3xl overflow-hidden"
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #1a0636 0%, #110426 100%)",
        border: "1px solid rgba(181,76,255,0.22)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.55)",
        padding: "48px 24px 40px",
        minHeight: 0,
      }}
    >
      {/* top glass sheen */}
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "35%", borderRadius: "24px 24px 60% 60% / 12px 12px 32px 32px", background: "linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)", pointerEvents: "none" }} />

      {/* label */}
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] mb-6" style={{ color: "rgba(181,76,255,0.55)" }}>
        What's Next
      </p>

      {/* Animated feature */}
      <div style={{ ...cardStyle, width: "100%", maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] block mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
          {active.num}
        </span>
        <h3
          className="text-white m-0"
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: "clamp(1.4rem, 4.5vw, 2.2rem)",
            letterSpacing: "0.06em",
            lineHeight: 1.1,
          }}
        >
          {active.label}
        </h3>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.38)" }}>{active.detail}</p>
      </div>

      {/* Dot indicator */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              width: activeIdx === i ? 22 : 6,
              height: 6,
              borderRadius: 99,
              background: activeIdx === i ? "rgba(181,76,255,0.7)" : "rgba(255,255,255,0.12)",
              transition: "width 350ms cubic-bezier(0.22,1,0.36,1), background 350ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
