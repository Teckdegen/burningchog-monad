import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, Children, type CSSProperties, type ReactNode } from "react";
import { Menu, X, Flame, ChevronDown } from "lucide-react";
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

// Premium dark palette — RAILGUN-inspired, BCHOG brand colors
const BG = "#0A0612";
const BG_DEEP = "#12052A";
const SURFACE = "#141020";
const PANEL = "#1A0B35";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_STRONG = "rgba(255,255,255,0.12)";
const PURPLE = "#7A2DFF";
const PURPLE_BRIGHT = "#B54CFF";
const CREAM = "#FFE8B4";
const MUTED = "rgba(255,255,255,0.5)";
const FOOTER_BG = "#07040E";
const TOKEN_LOGO = "/bchoglogo.png";
const MASCOT_HERO = "/photo_2026-06-25_20-11-35-removebg-preview.png";

const STAT_DOTS = {
  purple: PURPLE_BRIGHT,
  cream: CREAM,
  green: "#5EE6A8",
  pink: "#FF5C8A",
  blue: "#5EC8FF",
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
  dashboard: "Live on-chain stats. Built for the community.",
  "how-it-works": "The deflationary engine behind BCHOG.",
  "trading-desk": "Market support and portfolio activity.",
  contests: "Community contests and collaborations.",
  "coming-soon": "What's next for the ecosystem.",
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

      <LandingHero stats={stats} market={market} />

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
      <header
        className="fixed top-0 inset-x-0 z-[100] h-14 flex items-center justify-between px-4 sm:px-6 lg:px-10"
        style={{
          background: "rgba(10,6,18,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <a href="#top" className="flex items-center gap-2.5 no-underline shrink-0" style={{ color: "white" }}>
          <img src={TOKEN_LOGO} alt="BCHOG" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-sm font-semibold tracking-[0.18em] uppercase">BCHOG</span>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {SECTIONS.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => scrollToId(s.id)}
              className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors hover:text-white"
              style={{ color: MUTED }}
            >
              {s.short}
              {s.soon && (
                <span
                  className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle"
                  style={{ background: CREAM }}
                />
              )}
            </button>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="lg:hidden w-9 h-9 flex items-center justify-center"
          style={{ color: "white" }}
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{ background: "rgba(10,6,18,0.92)", backdropFilter: "blur(16px)" }}
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

function LandingHero({ stats, market }: { stats: BchogStats; market: MarketExtras }) {
  const lockedTotal = (stats.balances.lockHolding ?? 0n) + (stats.balances.atlantisLock ?? 0n);
  const landingStats = [
    {
      dot: STAT_DOTS.purple,
      label: "Total Burned",
      value: formatToken(stats.balances.burn, stats.decimals),
    },
    {
      dot: STAT_DOTS.cream,
      label: "Total Locked",
      value: formatToken(lockedTotal || undefined, stats.decimals),
    },
    {
      dot: STAT_DOTS.green,
      label: "Holders",
      value: formatCount(market.holders),
    },
    {
      dot: STAT_DOTS.pink,
      label: "Market Cap",
      value: formatUsd(market.marketCapUsd),
    },
  ];

  return (
    <section
      id="top"
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ backgroundColor: BG }}
    >
      <div className="absolute inset-0 bchog-grid-bg opacity-40 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("${GRAIN_SVG}")`,
          backgroundSize: "200px 200px",
          opacity: 0.5,
        }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={MASCOT_HERO}
          alt=""
          className="absolute right-[-8%] bottom-[-8%] w-[min(85vw,520px)] max-h-[70vh] object-contain opacity-[0.14] blur-[48px] saturate-[0.85]"
          draggable={false}
        />
      </div>

      <div className="relative flex-1 flex flex-row pt-14 min-h-0">
        <div className="w-1/2 flex flex-col justify-center px-4 sm:px-8 lg:px-14 py-8 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mb-3" style={{ color: PURPLE_BRIGHT }}>
            Burning Chog
          </p>
          <h2
            className="bchog-section-title text-[clamp(2rem,7vw,4.5rem)] text-white"
            style={{ fontWeight: 600 }}
          >
            BCHOG
          </h2>
          <p className="mt-3 sm:mt-4 text-[11px] sm:text-sm font-medium uppercase tracking-[0.14em] leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
            Deflationary. Rewarding. Unstoppable.
          </p>
          <p className="mt-2 text-[11px] sm:text-xs italic hidden sm:block" style={{ color: MUTED }}>
            Always less. Always more, for those who get it.
          </p>
        </div>

        <div
          className="w-1/2 grid grid-cols-2 grid-rows-2 min-h-0"
          style={{ borderLeft: `1px solid ${BORDER}` }}
        >
          {landingStats.map((s, i) => (
            <MetricCell
              key={s.label}
              dot={s.dot}
              label={s.label}
              value={s.value}
              bordered={i % 2 === 0}
              borderedTop={i >= 2}
            />
          ))}
        </div>
      </div>

      <div className="relative flex justify-center pb-6 pt-2" style={{ color: MUTED }}>
        <button
          type="button"
          onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
          className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer"
          style={{ color: MUTED }}
          aria-label="Scroll to dashboard"
        >
          <span className="text-[10px] uppercase tracking-[0.16em]">Scroll</span>
          <ChevronDown size={18} strokeWidth={1.5} className="animate-bounce" />
        </button>
      </div>
    </section>
  );
}

// CA + copy + the single buy link (Nad.fun). Only place the CA is shown.
function BuyBlock() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(BCHOG_TOKEN);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Reveal dir={1}>
      <Panel>
        <div className="flex justify-center mb-6">
          <img src={TOKEN_LOGO} alt="BCHOG token" className="w-16 h-16 rounded-full object-cover" />
        </div>
        <SectionLabel>Contract Address</SectionLabel>
        <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-3">
          <div
            className="flex-1 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm flex items-center justify-center text-center break-all"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "white" }}
          >
            <span className="hidden sm:inline">{BCHOG_TOKEN}</span>
            <span className="sm:hidden">{shortAddress(BCHOG_TOKEN)}</span>
          </div>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-[0.08em] transition-colors hover:bg-white/10"
            style={{ background: PURPLE, color: "white", border: "none" }}
          >
            {copied ? "Copied" : "Copy CA"}
          </button>
        </div>
        <div className="my-6" style={{ borderTop: `1px solid ${BORDER}` }} />
        <div className="flex items-center justify-center gap-4">
          <SectionLabel>Buy on</SectionLabel>
          <a
            href={NADFUN_TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Buy BCHOG on Nad.fun (opens in a new tab)"
            className="inline-flex items-center justify-center w-12 h-12 rounded-full overflow-hidden transition-opacity hover:opacity-80"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <img src={nadfunLogo} alt="Nad.fun" className="w-full h-full object-cover" />
          </a>
        </div>
        <a
          href={explorerToken(BCHOG_TOKEN)}
          target="_blank"
          rel="noreferrer"
          className="block text-center mt-4 text-[11px] font-medium uppercase tracking-[0.12em] no-underline"
          style={{ color: MUTED }}
        >
          View on Explorer
        </a>
      </Panel>
    </Reveal>
  );
}

function Footer() {
  return (
    <footer
      className="relative w-full"
      style={{ background: FOOTER_BG, color: "white", borderTop: `1px solid ${BORDER}` }}
    >
      <div className="px-4 py-10 flex flex-col items-center justify-center gap-5">
        <img src={TOKEN_LOGO} alt="BCHOG" className="w-12 h-12 rounded-full object-cover" />
        <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
          Deflationary. Rewarding. Unstoppable.
        </p>
        <div className="flex items-center justify-center gap-3">
          <SocialButton href={SOCIALS.x} label="X">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" aria-hidden>
              <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.875l-5.38-7.03L4.6 22H1.34l8.02-9.165L1 2h7.05l4.86 6.43L18.244 2Zm-1.205 18h1.9L7.05 3.9H5.01L17.04 20Z" />
            </svg>
          </SocialButton>
          <SocialButton href={SOCIALS.telegram} label="Telegram">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" aria-hidden>
              <path
                d="M21.95 4.27 18.6 20.06c-.25 1.1-.91 1.38-1.84.86l-5.1-3.76-2.46 2.37c-.27.27-.5.5-1.02.5l.36-5.18 9.42-8.51c.41-.36-.09-.56-.64-.2L5.05 13.18l-5.01-1.57c-1.09-.34-1.11-1.09.23-1.61l19.59-7.55c.91-.34 1.7.2 1.41 1.82Z"
                transform="translate(1 0)"
              />
            </svg>
          </SocialButton>
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
          Built on Monad
        </p>
      </div>
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
      className="w-10 h-10 flex items-center justify-center no-underline transition-opacity hover:opacity-70"
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
  return (
    <section
      id={section.id}
      className="relative w-full overflow-hidden"
      style={{
        minHeight: section.id === "coming-soon" ? undefined : "100vh",
        backgroundColor: BG,
        color: "white",
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <div className="absolute inset-0 bchog-grid-bg opacity-20 pointer-events-none" />
      <div
        className="relative px-4 sm:px-8 lg:px-14 pt-24 sm:pt-28 pb-20 w-full max-w-6xl mx-auto"
        style={{ zIndex: 2 }}
      >
        <div className="mb-10 sm:mb-12">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="bchog-section-title text-[clamp(2rem,6vw,3.5rem)] text-white m-0">
              {section.title}
            </h2>
            {section.soon && (
              <span
                className="text-[10px] font-medium uppercase px-2.5 py-1 tracking-[0.14em]"
                style={{ color: CREAM, border: `1px solid ${BORDER_STRONG}` }}
              >
                Coming Soon
              </span>
            )}
          </div>
          {SECTION_SUBTITLES[section.id] && (
            <p className="mt-3 text-sm" style={{ color: MUTED }}>
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

function FlowArrow({ direction = "down" }: { direction?: "down" | "right" }) {
  return (
    <div className="flex justify-center py-1" aria-hidden style={{ color: MUTED }}>
      {direction === "down" ? (
        <ChevronDown size={20} strokeWidth={1.5} />
      ) : (
        <span className="text-lg">→</span>
      )}
    </div>
  );
}

// ---- ecosystem diagrams (How It Works) ----

const DG = PURPLE_BRIGHT;

/* ── Node metadata ── */
const WALLET_NODES = [
  {
    id: "treasury",
    cx: 250,
    cy: 130,
    r: 54,
    label: "TREASURY WALLET",
    sub: "Ecosystem Engine",
    desc: "The engine that powers the BCHOG ecosystem.",
    icon: "cog",
    href: (w: typeof WALLETS) => explorerAddr(w.treasury),
  },
  {
    id: "lock",
    cx: 82,
    cy: 250,
    r: 44,
    label: "LOCK HOLDING",
    sub: "The Vault",
    desc: "Accumulating lock tokens, locked with Atlantis at 1M.",
    icon: "lock",
    href: (w: typeof WALLETS) => explorerAddr(w.lockHolding),
  },
  {
    id: "rewards",
    cx: 418,
    cy: 250,
    r: 44,
    label: "REWARDS WALLET",
    sub: "Community Rewards",
    desc: "Funds community engagement, contests, and rewards.",
    icon: "gift",
    href: () => undefined,
  },
  {
    id: "trading",
    cx: 250,
    cy: 370,
    r: 44,
    label: "TRADING WALLET",
    sub: "Market Support",
    desc: "Investing in the community, profits feed the BCHOG flywheel.",
    icon: "trending",
    href: (w: typeof WALLETS) => explorerAddr(w.trading),
  },
  {
    id: "burn",
    cx: 82,
    cy: 370,
    r: 36,
    label: "BUYBACK & BURN",
    sub: "",
    desc: "Tokens permanently removed from circulation to drive deflation.",
    icon: "flame",
    href: () => undefined,
  },
] as const;

// per-node comic accent colors (adds color to the flow diagram)
const NODE_COLOR: Record<string, string> = {
  treasury: "#FFD23F",
  lock: "#FFCF6B",
  rewards: "#5EE6A8",
  trading: "#C28BFF",
  burn: "#FF5E5E",
};

function WalletIcon({
  id,
  cx,
  cy,
  size,
  color = DG,
}: {
  id: string;
  cx: number;
  cy: number;
  size: number;
  color?: string;
}) {
  const s = size * 0.48;
  const x = cx - s / 2;
  const y = cy - s / 2;
  if (id === "cog")
    return (
      <g transform={`translate(${cx},${cy})`}>
        <circle r={s * 0.45} fill="none" stroke={color} strokeWidth={s * 0.1} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect
            key={a}
            x={-s * 0.07}
            y={-s * 0.52}
            width={s * 0.14}
            height={s * 0.18}
            rx={s * 0.04}
            fill={color}
            transform={`rotate(${a})`}
          />
        ))}
        <circle r={s * 0.18} fill={color} />
      </g>
    );
  if (id === "lock")
    return (
      <g transform={`translate(${x},${y})`}>
        <rect
          x={s * 0.18}
          y={s * 0.44}
          width={s * 0.64}
          height={s * 0.48}
          rx={s * 0.09}
          fill={color}
        />
        <path
          d={`M${s * 0.28} ${s * 0.44} V${s * 0.26} a${s * 0.22} ${s * 0.22} 0 0 1 ${s * 0.44} 0 V${s * 0.44}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.11}
          strokeLinecap="round"
        />
        <circle cx={s * 0.5} cy={s * 0.68} r={s * 0.09} fill="#12052A" />
      </g>
    );
  if (id === "gift")
    return (
      <g transform={`translate(${x},${y})`}>
        <rect
          x={s * 0.1}
          y={s * 0.4}
          width={s * 0.8}
          height={s * 0.52}
          rx={s * 0.08}
          fill={color}
        />
        <rect
          x={s * 0.15}
          y={s * 0.28}
          width={s * 0.7}
          height={s * 0.18}
          rx={s * 0.06}
          fill={color}
        />
        <line
          x1={s * 0.5}
          y1={s * 0.28}
          x2={s * 0.5}
          y2={s * 0.92}
          stroke="#12052A"
          strokeWidth={s * 0.1}
        />
        <path
          d={`M${s * 0.5} ${s * 0.28} C${s * 0.5} ${s * 0.12} ${s * 0.22} ${s * 0.12} ${s * 0.28} ${s * 0.28}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.1}
          strokeLinecap="round"
        />
        <path
          d={`M${s * 0.5} ${s * 0.28} C${s * 0.5} ${s * 0.12} ${s * 0.78} ${s * 0.12} ${s * 0.72} ${s * 0.28}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.1}
          strokeLinecap="round"
        />
      </g>
    );
  if (id === "trending")
    return (
      <g transform={`translate(${x},${y})`}>
        <polyline
          points={`${s * 0.08},${s * 0.72} ${s * 0.3},${s * 0.42} ${s * 0.52},${s * 0.58} ${s * 0.82},${s * 0.22}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.12}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={`${s * 0.65},${s * 0.22} ${s * 0.82},${s * 0.22} ${s * 0.82},${s * 0.38}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.12}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  if (id === "flame")
    return (
      <g transform={`translate(${x},${y})`}>
        <path
          d={`M${s * 0.5} ${s * 0.95} C${s * 0.1} ${s * 0.75} ${s * 0.15} ${s * 0.45} ${s * 0.35} ${s * 0.38} C${s * 0.28} ${s * 0.55} ${s * 0.42} ${s * 0.62} ${s * 0.42} ${s * 0.62} C${s * 0.42} ${s * 0.42} ${s * 0.55} ${s * 0.22} ${s * 0.65} ${s * 0.1} C${s * 0.7} ${s * 0.35} ${s * 0.6} ${s * 0.42} ${s * 0.72} ${s * 0.52} C${s * 0.88} ${s * 0.32} ${s * 0.78} ${s * 0.1} ${s * 0.78} ${s * 0.1} C${s * 0.98} ${s * 0.32} ${s * 0.95} ${s * 0.65} ${s * 0.75} ${s * 0.82} C${s * 0.88} ${s * 0.58} ${s * 0.82} ${s * 0.48} ${s * 0.82} ${s * 0.48} C${s * 0.92} ${s * 0.72} ${s * 0.88} ${s * 0.85} ${s * 0.5} ${s * 0.95} Z`}
          fill={color}
        />
      </g>
    );
  return null;
}

function EcosystemWalletFlowDiagram() {
  /* Arrow paths: [from-node-id, to-node-id, bend-direction, dashed] */
  const arrows: [string, string, number, boolean][] = [
    ["treasury", "lock", -0.18, false], // engine → vault
    ["treasury", "rewards", 0.18, false], // engine → rewards
    ["treasury", "trading", 0, false], // engine → trading
    ["trading", "rewards", 0.22, false], // profits feed the flywheel
    ["treasury", "burn", 0.16, true], // dashed buyback path
    ["trading", "burn", -0.06, true], // dashed buyback path
  ];

  // build lookup
  const nodeMap = Object.fromEntries(WALLET_NODES.map((n) => [n.id, n]));

  function curvedPath(a: string, b: string, bend: number) {
    const n1 = nodeMap[a],
      n2 = nodeMap[b];
    const dx = n2.cx - n1.cx,
      dy = n2.cy - n1.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // offset start/end to circle edge
    const ratio1 = n1.r / dist,
      ratio2 = n2.r / dist;
    const sx = n1.cx + dx * ratio1,
      sy = n1.cy + dy * ratio1;
    const ex = n2.cx - dx * ratio2,
      ey = n2.cy - dy * ratio2;
    // control point perpendicular to the line
    const mx = (sx + ex) / 2 - dy * bend;
    const my = (sy + ey) / 2 + dx * bend;
    return `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto mt-6">
      <svg
        viewBox="0 0 500 470"
        className="w-full h-auto"
        style={{ overflow: "visible" }}
        aria-label="BCHOG Ecosystem Wallet Flow Diagram"
      >
        <defs>
          <marker
            id="ew-arr"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M1,2 L10,6 L1,10 Z" fill="context-stroke" />
          </marker>
          <marker
            id="ew-arr-d"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M1,2 L10,6 L1,10 Z" fill="context-stroke" />
          </marker>
        </defs>

        {arrows.map(([a, b, bend, dashed], i) => (
          <path
            key={i}
            d={curvedPath(a, b, bend)}
            fill="none"
            stroke={dashed ? "rgba(181,76,255,0.45)" : PURPLE_BRIGHT}
            strokeWidth={dashed ? 1.2 : 1.5}
            strokeLinecap="round"
            strokeDasharray={dashed ? "5 4" : undefined}
            markerEnd={dashed ? "url(#ew-arr-d)" : "url(#ew-arr)"}
            opacity={dashed ? 0.55 : 0.85}
          />
        ))}

        {WALLET_NODES.map((n) => {
          const href = n.href(WALLETS as unknown as typeof WALLETS);
          const nodeEl = (
            <g key={n.id} className="cursor-pointer">
              <circle
                cx={n.cx}
                cy={n.cy}
                r={n.r + 1}
                fill={SURFACE}
                stroke={NODE_COLOR[n.id] ?? PURPLE_BRIGHT}
                strokeWidth="1.5"
              />
              <WalletIcon
                id={n.icon}
                cx={n.cx}
                cy={n.cy}
                size={n.r * 1.0}
                color={NODE_COLOR[n.id] ?? PURPLE_BRIGHT}
              />
            </g>
          );

          const label = (
            <g key={`lbl-${n.id}`}>
              <text
                x={n.cx}
                y={n.cy + n.r + 18}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize={n.id === "treasury" ? 10 : 8.5}
                fontWeight="600"
                fill="white"
                letterSpacing="0.06em"
              >
                {n.label}
              </text>
              {n.sub && (
                <text
                  x={n.cx}
                  y={n.cy + n.r + 30}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize={8}
                  fill="rgba(200,180,255,0.65)"
                  letterSpacing="0.04em"
                >
                  ({n.sub})
                </text>
              )}
              {/* Description — wrap manually at ~22 chars */}
              {n.desc.match(/.{1,22}(\s|$)/g)?.map((line, li) => (
                <text
                  key={li}
                  x={n.cx}
                  y={n.cy + n.r + 46 + li * 12}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize={7.5}
                  fill="rgba(180,160,255,0.55)"
                >
                  {line.trim()}
                </text>
              ))}
            </g>
          );

          return href ? (
            <a key={n.id} href={href} target="_blank" rel="noreferrer">
              {nodeEl}
              {label}
            </a>
          ) : (
            <g key={n.id}>
              {nodeEl}
              {label}
            </g>
          );
        })}

        {/* ── Legend ── */}
        <g transform="translate(130, 450)">
          <line x1="0" y1="6" x2="24" y2="6" stroke={PURPLE_BRIGHT} strokeWidth="1.2" strokeLinecap="round" />
          <polygon points="21,3 28,6 21,9" fill={PURPLE_BRIGHT} />
          <text x="32" y="10" fontFamily="Inter, sans-serif" fontSize="8" fill={MUTED} letterSpacing="0.08em">
            FLOW
          </text>
          <line
            x1="90"
            y1="6"
            x2="114"
            y2="6"
            stroke="rgba(181,76,255,0.45)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
          <polygon points="111,3 118,6 111,9" fill="rgba(181,76,255,0.45)" />
          <text x="122" y="10" fontFamily="Inter, sans-serif" fontSize="8" fill={MUTED} letterSpacing="0.08em">
            BUYBACK PATH
          </text>
        </g>
      </svg>
    </div>
  );
}

function DeflationaryFlywheelDiagram({
  lockProgress,
  lockBalance,
  decimals,
}: {
  lockProgress: number;
  lockBalance: bigint | undefined;
  decimals: number;
}) {
  const branches = [
    {
      label: "+100k Bonus Burn",
      sub: "Extra supply torched forever",
      accent: STAT_DOTS.pink,
      outcome: "Burned forever",
    },
    {
      label: "+50k → Lock Holding",
      sub: "Accumulates until 1M, then locked 1 yr with Atlantis",
      accent: CREAM,
      outcome: "The Vault",
      progress: true,
    },
    {
      label: "+50k → Rewards",
      sub: "Fuels community contests & engagement",
      accent: STAT_DOTS.green,
      outcome: "Rewards",
    },
  ];

  const nodeCard: CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
  };

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="rounded-lg p-5 text-center" style={nodeCard}>
        <SectionLabel>Trigger</SectionLabel>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Flame size={28} strokeWidth={1.5} color={STAT_DOTS.pink} />
          <span className="bchog-section-title text-3xl sm:text-4xl text-white">Burn</span>
        </div>
        <p className="text-xs mt-3 max-w-md mx-auto leading-relaxed" style={{ color: MUTED }}>
          Every 100k $BCHOG burned automatically by the Nad.fun 1% fee
        </p>
      </div>

      <FlowArrow />

      <div className="rounded-lg p-5 text-center" style={nodeCard}>
        <SectionLabel>Treasury Response</SectionLabel>
        <p className="text-lg sm:text-xl font-semibold text-white mt-2">200% Match</p>
        <p className="text-xs mt-2" style={{ color: MUTED }}>
          Treasury deploys matched supply across three outcomes
        </p>
      </div>

      <FlowArrow />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: BORDER, border: `1px solid ${BORDER}` }}>
        {branches.map((b) => (
          <div key={b.label} className="p-4 sm:p-5 flex flex-col" style={{ background: SURFACE }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: b.accent }} />
              <span className="text-xs font-medium uppercase tracking-[0.08em]">{b.label}</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
              {b.sub}
            </p>
            {b.progress ? (
              <div className="mt-4">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: BG }}>
                  <div className="h-full rounded-full" style={{ width: `${lockProgress}%`, background: PURPLE }} />
                </div>
                <p className="text-[10px] mt-2 uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                  {formatToken(lockBalance, decimals)} / 1M target
                </p>
              </div>
            ) : null}
            <p className="mt-auto pt-3 text-[10px] uppercase tracking-[0.1em]" style={{ color: b.accent, borderTop: `1px solid ${BORDER}` }}>
              {b.outcome}
            </p>
          </div>
        ))}
      </div>

      <FlowArrow />

      <p className="text-center text-[11px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
        Flywheel spins — supply keeps shrinking
      </p>
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
    const supply = [
      { label: "Atlantis Lock", value: stats.balances.atlantisLock, color: CREAM },
      { label: "Lock Holding", value: stats.balances.lockHolding, color: "#FFCF6B" },
      { label: "Treasury", value: stats.balances.treasury, color: STAT_DOTS.green },
      { label: "Trading Desk", value: stats.balances.trading, color: PURPLE_BRIGHT },
      { label: "Circulating", value: circulating, color: "#FFFFFF" },
    ];
    const lockProgress = percentOf(
      stats.balances.lockHolding,
      LOCK_TARGET * scaledDivisor(stats.decimals),
    );
    return (
      <div className="flex flex-col gap-8">
        <Stagger>
          <StatGrid cols={2}>
            <StatTile
              dot={STAT_DOTS.purple}
              label="Trading Desk"
              value={formatToken(stats.balances.trading, stats.decimals)}
              sub="BCHOG"
            />
            <StatTile
              dot={STAT_DOTS.green}
              label="Treasury"
              value={formatToken(stats.balances.treasury, stats.decimals)}
              sub="BCHOG"
            />
            <StatTile
              dot={STAT_DOTS.cream}
              label="Total Supply"
              value={formatToken(stats.totalSupply, stats.decimals)}
              sub="BCHOG"
            />
            <StatTile
              dot={STAT_DOTS.blue}
              label="Atlantis Lock"
              value={formatToken(stats.balances.atlantisLock, stats.decimals)}
              sub="BCHOG"
            />
          </StatGrid>

          <Panel>
            <SectionLabel>Lock Holding · 1M Target</SectionLabel>
            <div className="bchog-stat-value text-[clamp(1.5rem,5vw,2.5rem)] font-semibold text-white mt-3">
              {formatToken(stats.balances.lockHolding, stats.decimals)}
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden mt-4"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${lockProgress}%`, background: PURPLE }}
              />
            </div>
            <p className="text-[11px] mt-2 uppercase tracking-[0.1em]" style={{ color: MUTED }}>
              {formatToken(stats.balances.lockHolding, stats.decimals)} / 1M target · {Math.round(lockProgress)}%
            </p>
          </Panel>

          <Panel>
            <SectionLabel>Supply Breakdown</SectionLabel>
            <div className="flex flex-col gap-4 mt-5">
              {supply.map((s) => {
                const pct = percentOf(s.value, stats.totalSupply);
                return (
                  <div key={s.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-medium uppercase tracking-[0.08em]">{s.label}</span>
                      <span className="text-xs font-medium" style={{ color: MUTED }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: SURFACE }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>Ecosystem Wallets</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mt-5" style={{ background: BORDER }}>
              {[
                ["Trading Wallet", WALLETS.trading, stats.balances.trading],
                ["Lock Holding", WALLETS.lockHolding, stats.balances.lockHolding],
                ["Treasury", WALLETS.treasury, stats.balances.treasury],
                ["Atlantis Lock", WALLETS.atlantisLock, stats.balances.atlantisLock],
              ].map(([k, address, value]) => (
                <a
                  key={k as string}
                  href={explorerAddr(address as string)}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 no-underline text-white transition-colors hover:bg-white/[0.02]"
                  style={{ background: SURFACE }}
                >
                  <SectionLabel>{k as string}</SectionLabel>
                  <div className="bchog-stat-value text-xl font-semibold mt-2">
                    {formatToken(value as bigint | undefined, stats.decimals)}
                  </div>
                  <div className="text-[10px] mt-1 font-mono" style={{ color: MUTED }}>
                    {shortAddress(address as string)}
                  </div>
                </a>
              ))}
            </div>
          </Panel>

          <div
            className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] pt-2"
            style={{ color: MUTED, borderTop: `1px solid ${BORDER}` }}
          >
            <span>Deflationary. Rewarding. Unstoppable.</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: STAT_DOTS.green }} />
              Live
            </span>
          </div>
        </Stagger>
      </div>
    );
  }
  if (id === "how-it-works") {
    const lockProgress = percentOf(
      stats.balances.lockHolding,
      LOCK_TARGET * scaledDivisor(stats.decimals),
    );
    return (
      <div className="flex flex-col gap-8">
        <Stagger>
          <Panel>
            <SectionLabel>Deflationary Flywheel</SectionLabel>
            <DeflationaryFlywheelDiagram
              lockProgress={lockProgress}
              lockBalance={stats.balances.lockHolding}
              decimals={stats.decimals}
            />
          </Panel>

          <Panel>
            <SectionLabel>Ecosystem Wallet Flow</SectionLabel>
            <EcosystemWalletFlowDiagram />
          </Panel>
        </Stagger>
      </div>
    );
  }
  if (id === "trading-desk") {
    const memeTotal = portfolio.reduce((acc, t) => acc + t.valueUsd, 0);
    const roster = portfolio.slice(0, 30);
    const vault = [
      { k: "Number of NFTs", v: veDust ? veDust.nfts.toString() : "---" },
      {
        k: "veDUST Balance",
        v: veDust
          ? veDust.veBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : "---",
      },
      { k: "Current Value", v: veDust ? formatUsd(veDust.valueUsd) : "$---" },
      { k: "Weekly USDC Yield", v: veDust ? formatUsd(veDust.weeklyUsd) : "$---" },
      { k: "Lifetime USDC Yield", v: veDust ? formatUsd(veDust.lifetimeUsd) : "$---" },
    ];
    return (
      <div className="flex flex-col gap-8">
        <Stagger>
          <StatGrid>
            <StatTile
              dot={STAT_DOTS.green}
              label="Trading Wallet"
              value={formatToken(stats.balances.trading, stats.decimals)}
              sub="BCHOG balance"
            />
            <StatTile
              dot={STAT_DOTS.purple}
              label="Meme Portfolio"
              value={memeTotal > 0 ? formatUsd(memeTotal) : "$---"}
            />
            <StatTile
              dot={STAT_DOTS.cream}
              label="veDUST Portfolio"
              value={veDust?.valueUsd ? formatUsd(veDust.valueUsd) : "$---"}
            />
            <StatTile
              dot={STAT_DOTS.blue}
              label="Recent Trades"
              value={market.trades.length ? String(market.trades.length) : "---"}
              sub="Last 5 swaps"
            />
          </StatGrid>

          <Panel>
            <SectionLabel>Meme Portfolio</SectionLabel>
            {roster.length === 0 ? (
              <div className="text-sm py-6" style={{ color: MUTED }}>
                Loading holdings…
              </div>
            ) : (
              <div
                className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1 snap-x"
                style={{ scrollbarWidth: "none" }}
              >
                {roster.map((t) => (
                  <a
                    key={t.address}
                    href={explorerToken(t.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="snap-start shrink-0 w-24 sm:w-28 rounded-lg p-3 text-center no-underline text-white transition-opacity hover:opacity-80"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  >
                    <div
                      className="w-9 h-9 rounded-full mx-auto mb-2 overflow-hidden"
                      style={{ background: PANEL, border: `1px solid ${BORDER}` }}
                    >
                      {t.iconUrl ? (
                        <img src={t.iconUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                      ) : null}
                    </div>
                    <div className="text-xs font-medium uppercase truncate">{t.symbol}</div>
                    <div className="bchog-stat-value text-base font-semibold mt-1">{formatUsd(t.valueUsd)}</div>
                    <div className="text-[10px] mt-1" style={{ color: MUTED }}>
                      {memeTotal > 0 ? Math.round((t.valueUsd / memeTotal) * 100) : "--"}%
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionLabel>Neverland veDUST Vault</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px mt-5" style={{ background: BORDER }}>
              {vault.map((r) => (
                <div key={r.k} className="p-4" style={{ background: SURFACE }}>
                  <SectionLabel>{r.k}</SectionLabel>
                  <div className="bchog-stat-value text-lg font-semibold mt-2">{r.v}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>Recent Trades</SectionLabel>
            <div className="mt-4 flex flex-col gap-1">
              {market.trades.length === 0 ? (
                <div className="text-sm py-4" style={{ color: MUTED }}>
                  Loading recent trades…
                </div>
              ) : (
                market.trades.map((t) => (
                  <a
                    key={t.hash}
                    href={explorerTx(t.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 no-underline rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                    style={{ color: "white", borderBottom: `1px solid ${BORDER}` }}
                  >
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium uppercase shrink-0"
                      style={{
                        background: t.type === "BUY" ? "rgba(94,230,168,0.15)" : "rgba(255,92,138,0.15)",
                        color: t.type === "BUY" ? STAT_DOTS.green : STAT_DOTS.pink,
                      }}
                    >
                      {t.type}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {compactAmount(t.tokenAmount)} BCHOG
                    </span>
                    <span className="text-sm font-mono shrink-0" style={{ color: MUTED }}>
                      {formatUsd(t.valueUsd)}
                    </span>
                    <span className="text-[10px] w-7 text-right shrink-0" style={{ color: MUTED }}>
                      {timeAgo(t.ts)}
                    </span>
                  </a>
                ))
              )}
            </div>
          </Panel>
        </Stagger>
      </div>
    );
  }
  if (id === "contests") {
    const posts = ["https://x.com/BURNINGCHOG/status/2068770674475176411"];
    return (
      <div className="flex flex-col gap-8">
        <Stagger>
          <Panel>
            <SectionLabel>Active Contests · From X</SectionLabel>
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {posts.map((p) => (
                <TweetEmbed key={p} url={p} />
              ))}
            </div>
          </Panel>
        </Stagger>
      </div>
    );
  }
  if (id === "coming-soon") {
    return (
      <div className="flex flex-col gap-8">
        <ComingSoonBlock
          items={["NFT Collection", "BCHOG Gear", "Staking Program"]}
          caption="Drops, fresh gear and staking rewards are on the way"
        />
        <BuyBlock />
      </div>
    );
  }
  return null;
}

function ComingSoonBlock({ items, caption }: { items: string[]; caption: string }) {
  return (
    <Reveal>
      <Panel>
        <div className="text-center py-10 sm:py-14">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {items.map((it) => (
              <span
                key={it}
                className="text-[10px] sm:text-[11px] font-medium uppercase px-3 py-1.5 tracking-[0.1em]"
                style={{ border: `1px solid ${BORDER_STRONG}`, color: CREAM }}
              >
                {it}
              </span>
            ))}
          </div>
          <h3 className="bchog-section-title text-[clamp(2rem,6vw,3rem)] text-white mt-8">Stay Tuned</h3>
          <p className="text-sm mt-3 max-w-md mx-auto" style={{ color: MUTED }}>
            {caption}
          </p>
        </div>
      </Panel>
    </Reveal>
  );
}
