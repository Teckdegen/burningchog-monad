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

const HERO_IMAGES = [
  {
    src: "https://www.image2url.com/r2/default/images/1782680314666-954b3ebf-5b98-427a-b773-5ca1a515e950.png",
  },
  {
    src: "https://www.image2url.com/r2/default/images/1782680438614-e357bdfd-e2cb-4602-8f32-5c006e54df5b.png",
  },
  {
    src: "https://www.image2url.com/r2/default/images/1782680595507-99146ec2-4bd7-477b-b276-4f7c9e476485.png",
  },
] as const;

const CAROUSEL_EASE = "cubic-bezier(0.4,0,0.2,1)";
const CAROUSEL_MS = "650ms";

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

function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    HERO_IMAGES.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const scrollable = Math.max(el.offsetHeight - window.innerHeight, 1);
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), scrollable);
      setProgress(scrolled / scrollable);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const maxIndex = HERO_IMAGES.length - 1;
  const activeIndex = Math.min(Math.round(progress * maxIndex), maxIndex);

  const carouselTransition = `transform ${CAROUSEL_MS} ${CAROUSEL_EASE}, filter ${CAROUSEL_MS} ${CAROUSEL_EASE}, opacity ${CAROUSEL_MS} ${CAROUSEL_EASE}, left ${CAROUSEL_MS} ${CAROUSEL_EASE}, height ${CAROUSEL_MS} ${CAROUSEL_EASE}, bottom ${CAROUSEL_MS} ${CAROUSEL_EASE}`;

  function getRole(imageIndex: number): "center" | "left" | "right" | "hidden" {
    const diff = (imageIndex - activeIndex + HERO_IMAGES.length) % HERO_IMAGES.length;
    if (diff === 0) return "center";
    if (diff === 1) return "right";
    if (diff === 2) return "left";
    return "hidden";
  }

  function roleStyle(role: "center" | "left" | "right" | "hidden"): CSSProperties {
    const base: CSSProperties = {
      position: "absolute",
      aspectRatio: "0.6 / 1",
      transition: carouselTransition,
      willChange: "transform, filter, opacity",
    };

    if (role === "hidden") {
      return {
        ...base,
        transform: "translateX(-50%) scale(0.6)",
        filter: "blur(6px)",
        opacity: 0,
        zIndex: 1,
        left: "50%",
        height: isMobile ? "10%" : "18%",
        bottom: isMobile ? "32%" : "12%",
        pointerEvents: "none",
      };
    }

    if (role === "center") {
      return {
        ...base,
        transform: `translateX(-50%) scale(${isMobile ? 1.25 : 1.68})`,
        filter: "none",
        opacity: 1,
        zIndex: 20,
        left: "50%",
        height: isMobile ? "60%" : "92%",
        bottom: isMobile ? "22%" : 0,
      };
    }

    if (role === "left") {
      return {
        ...base,
        transform: "translateX(-50%) scale(1)",
        filter: "blur(2px)",
        opacity: 0.85,
        zIndex: 10,
        left: isMobile ? "20%" : "30%",
        height: isMobile ? "16%" : "28%",
        bottom: isMobile ? "32%" : "12%",
      };
    }

    return {
      ...base,
      transform: "translateX(-50%) scale(1)",
      filter: "blur(2px)",
      opacity: 0.85,
      zIndex: 10,
      left: isMobile ? "80%" : "70%",
      height: isMobile ? "16%" : "28%",
      bottom: isMobile ? "32%" : "12%",
    };
  }

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative w-full overflow-hidden"
      style={{
        height: `${100 + maxIndex * 85}vh`,
        backgroundColor: BG,
        fontFamily: "'Inter', sans-serif",
        transition: `background-color ${CAROUSEL_MS} ${CAROUSEL_EASE}`,
      }}
    >
      <div className="sticky top-0 w-full overflow-hidden" style={{ height: "100vh" }}>
        <div className="absolute inset-0 bchog-grid-bg opacity-40 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("${GRAIN_SVG}")`,
            backgroundSize: "200px 200px",
            opacity: 0.4,
            zIndex: 50,
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

        <div
          className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none"
          style={{ top: "18%", zIndex: 2 }}
        >
          <span
            className="uppercase whitespace-nowrap text-white"
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: "clamp(90px, 28vw, 380px)",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              opacity: 1,
            }}
          >
            BCHOG
          </span>
        </div>

        <div className="absolute inset-0" style={{ zIndex: 3 }}>
          {HERO_IMAGES.map((item, i) => {
            const role = getRole(i);
            return (
              <div key={item.src} style={roleStyle(role)}>
                <img
                  src={item.src}
                  alt=""
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "bottom center",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div
          className="absolute bottom-6 left-4 sm:bottom-20 sm:left-24 max-w-[320px]"
          style={{ zIndex: 60 }}
        >
          <p
            className="font-bold uppercase tracking-widest mb-2 sm:mb-3 text-base sm:text-[22px] text-white"
            style={{ opacity: 0.95, letterSpacing: "0.02em" }}
          >
            Burning Chog
          </p>
          <p
            className="hidden sm:block text-xs sm:text-sm text-white mb-4 sm:mb-5"
            style={{ opacity: 0.85, lineHeight: 1.6 }}
          >
            Deflationary. Rewarding. Unstoppable. Always less — always more for those who get it.
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
            className="flex flex-col items-start gap-1 bg-transparent border-0 cursor-pointer p-0"
            style={{ color: "rgba(255,255,255,0.55)" }}
            aria-label="Scroll to dashboard"
          >
            <span className="text-[10px] uppercase tracking-[0.16em]">Scroll</span>
            <ChevronDown size={18} strokeWidth={1.5} className="animate-bounce" />
          </button>
        </div>
      </div>
    </section>
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
          <SocialButton href={NADFUN_TOKEN_URL} label="Buy on Nad.fun">
            <img src={nadfunLogo} alt="" className="w-full h-full object-cover" draggable={false} />
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
        className="relative px-4 sm:px-8 lg:px-14 pt-24 sm:pt-28 pb-20 w-full max-w-7xl mx-auto"
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
                style={{ color: MUTED, border: `1px solid ${BORDER}` }}
              >
                In Development
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

// ---- dashboard charts (monochrome, reference-style) ----

const CHART_STROKE = "rgba(255,255,255,0.85)";
const CHART_FILL = "rgba(255,255,255,0.12)";
const CHART_MUTED = "rgba(255,255,255,0.28)";

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
      className={`rounded-xl p-4 sm:p-5 flex flex-col min-h-[132px] ${className}`}
      style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: MUTED }}>
        {title}
      </p>
      <p className="bchog-stat-value text-[clamp(1.35rem,3.5vw,1.85rem)] font-semibold text-white mt-2">
        {value}
      </p>
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

function SparkBars({ values, highlight }: { values: number[]; highlight?: number }) {
  const max = Math.max(...values, 1);
  return (
    <svg viewBox="0 0 80 36" className="w-full h-9" aria-hidden>
      {values.map((v, i) => {
        const h = (v / max) * 28;
        const active = highlight === i;
        return (
          <rect
            key={i}
            x={4 + i * 18}
            y={32 - h}
            width={12}
            height={h}
            rx={2}
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
      const y = 32 - (v / max) * 26;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `M1,32 L${pts.split(" ").join(" L")} L79,32 Z`;
  return (
    <svg viewBox="0 0 80 36" className="w-full h-9" aria-hidden>
      <path d={area} fill={CHART_FILL} />
      <polyline points={pts} fill="none" stroke={CHART_STROKE} strokeWidth="1.5" strokeLinejoin="round" />
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
      <svg viewBox="0 0 40 40" className="w-10 h-10 shrink-0" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" stroke={CHART_MUTED} strokeWidth="5" />
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
              strokeWidth="5"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 20 20)"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="flex flex-col gap-0.5 text-[9px]" style={{ color: MUTED }}>
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
    <svg viewBox="0 0 40 40" className="w-10 h-10 ml-auto" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke={CHART_MUTED} strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={CHART_STROKE}
        strokeWidth="4"
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
    <div className="relative h-9 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: `${pct}%`, background: "rgba(255,255,255,0.18)" }}
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

function SupplyTimeline({
  milestones,
  progressPct,
}: {
  milestones: { label: string; value: string; pct: number }[];
  progressPct: number;
}) {
  const bars = 72;
  return (
    <div className="mt-6">
      <div className="relative h-16 flex items-end gap-[2px]">
        {Array.from({ length: bars }).map((_, i) => {
          const t = i / (bars - 1);
          const lit = t <= progressPct / 100;
          const intensity = lit ? 0.15 + t * 0.85 : 0.08;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${28 + Math.sin(i * 0.35) * 8 + (lit ? 12 : 0)}px`,
                background: `rgba(255,255,255,${intensity})`,
              }}
            />
          );
        })}
        {milestones.map((m) => (
          <div
            key={m.label}
            className="absolute bottom-full flex flex-col items-center"
            style={{ left: `${m.pct}%`, transform: "translateX(-50%)" }}
          >
            <span className="text-[10px] font-medium text-white whitespace-nowrap">{m.value}</span>
            <span className="text-[9px] mt-0.5 whitespace-nowrap" style={{ color: MUTED }}>
              {m.label}
            </span>
            <div className="w-px h-3 mt-1" style={{ background: CHART_STROKE }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TypewriterText({ lines, speed = 42 }: { lines: string[]; speed?: number }) {
  const full = lines.join("\n");
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setStarted(true);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started || count >= full.length) return;
    const t = window.setTimeout(() => setCount((c) => c + 1), speed);
    return () => window.clearTimeout(t);
  }, [started, count, full.length, speed]);

  const shown = full.slice(0, count);
  return (
    <div ref={ref} className="font-mono text-sm sm:text-base leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.88)" }}>
      {shown}
      {started && count < full.length && (
        <span className="bchog-typewriter-cursor inline-block w-[2px] h-[1em] align-[-2px] ml-0.5 bg-white" />
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

// per-node accent — monochrome professional
const NODE_COLOR: Record<string, string> = {
  treasury: "rgba(255,255,255,0.85)",
  lock: "rgba(255,255,255,0.7)",
  rewards: "rgba(255,255,255,0.7)",
  trading: "rgba(255,255,255,0.7)",
  burn: "rgba(255,255,255,0.55)",
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
        <circle cx={s * 0.5} cy={s * 0.68} r={s * 0.09} fill={BG} />
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
          stroke={BG}
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
            stroke={dashed ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.65)"}
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
                stroke={NODE_COLOR[n.id] ?? "rgba(255,255,255,0.7)"}
                strokeWidth="1.5"
              />
              <WalletIcon
                id={n.icon}
                cx={n.cx}
                cy={n.cy}
                size={n.r * 1.0}
                color={NODE_COLOR[n.id] ?? "rgba(255,255,255,0.7)"}
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
                  fill={MUTED}
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
                  fill={MUTED}
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
          <line x1="0" y1="6" x2="24" y2="6" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" strokeLinecap="round" />
          <polygon points="21,3 28,6 21,9" fill="rgba(255,255,255,0.65)" />
          <text x="32" y="10" fontFamily="Inter, sans-serif" fontSize="8" fill={MUTED} letterSpacing="0.08em">
            FLOW
          </text>
          <line
            x1="90"
            y1="6"
            x2="114"
            y2="6"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
          <polygon points="111,3 118,6 111,9" fill="rgba(255,255,255,0.35)" />
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
      outcome: "Burned forever",
    },
    {
      label: "+50k → Lock Holding",
      sub: "Accumulates until 1M, then locked 1 yr with Atlantis",
      outcome: "The Vault",
      progress: true,
    },
    {
      label: "+50k → Rewards",
      sub: "Fuels community contests & engagement",
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
          <Flame size={28} strokeWidth={1.5} color="rgba(255,255,255,0.85)" />
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
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-white" />
              <span className="text-xs font-medium uppercase tracking-[0.08em]">{b.label}</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
              {b.sub}
            </p>
            {b.progress ? (
              <div className="mt-4">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: BG }}>
                  <div className="h-full rounded-full bg-white" style={{ width: `${lockProgress}%` }} />
                </div>
                <p className="text-[10px] mt-2 uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                  {formatToken(lockBalance, decimals)} / 1M target
                </p>
              </div>
            ) : null}
            <p className="mt-auto pt-3 text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED, borderTop: `1px solid ${BORDER}` }}>
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
    const lockProgress = percentOf(
      stats.balances.lockHolding,
      LOCK_TARGET * scaledDivisor(stats.decimals),
    );
    const burnedPct = percentOf(stats.balances.burn, stats.totalSupply);
    const treasuryPct = percentOf(stats.balances.treasury, stats.totalSupply);
    const tradingPct = percentOf(stats.balances.trading, stats.totalSupply);
    const lockPct = percentOf(lockedTotal, stats.totalSupply);
    const circPct = percentOf(circulating, stats.totalSupply);
    const holderPct = market.holders ? Math.min((market.holders / 500) * 100, 100) : 0;

    const burnBars = [42, 58, 48, 72, 65, 88, 76, 94];
    const capArea = [22, 28, 25, 34, 31, 38, 42, 45];
    const treasuryCurrent = Number(stats.balances.treasury ?? 0n) / Number(scaledDivisor(stats.decimals));
    const lockTargetNum = Number(LOCK_TARGET);

    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <DashCard title="Total Burned" value={formatToken(stats.balances.burn, stats.decimals)}>
              <SparkBars values={burnBars} highlight={6} />
            </DashCard>
            <DashCard title="Supply Locked" value={`${Math.round(lockPct)}%`}>
              <DonutChart
                segments={[
                  { value: lockPct, label: "locked" },
                  { value: Math.max(100 - lockPct, 1), label: "free" },
                ]}
              />
            </DashCard>
            <DashCard title="Holders" value={formatCount(market.holders)}>
              <RingProgress pct={holderPct} />
            </DashCard>
            <DashCard title="Market Cap" value={formatUsd(market.marketCapUsd)}>
              <SparkArea values={capArea} />
            </DashCard>
            <DashCard
              title="Treasury"
              value={formatToken(stats.balances.treasury, stats.decimals)}
              className="col-span-2 lg:col-span-1"
            >
              <TargetCompare current={treasuryCurrent} target={lockTargetNum * 0.25} />
            </DashCard>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div
            className="rounded-xl p-5 sm:p-8"
            style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="max-w-lg">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                  Lock holding target
                </p>
                <p className="bchog-stat-value text-[clamp(1.75rem,5vw,2.75rem)] font-semibold text-white mt-2">
                  {formatToken(stats.balances.lockHolding, stats.decimals)}
                </p>
                <p className="text-sm mt-3 leading-relaxed" style={{ color: MUTED }}>
                  Lock holding accumulates toward a 1M BCHOG target. Once reached, tokens are locked for one year
                  with Atlantis — reducing circulating supply and strengthening the flywheel.
                </p>
              </div>
              <div className="flex flex-wrap gap-6 lg:gap-10 shrink-0">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
                    Lock target
                  </p>
                  <p className="text-lg font-semibold text-white mt-1">1M BCHOG</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
                    Progress
                  </p>
                  <p className="text-lg font-semibold text-white mt-1">{Math.round(lockProgress)}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
                    Circulating
                  </p>
                  <p className="text-lg font-semibold text-white mt-1">
                    {formatToken(circulating, stats.decimals)}
                  </p>
                </div>
              </div>
            </div>

            <SupplyTimeline
              progressPct={lockProgress}
              milestones={[
                { label: "Burn milestone", value: `${Math.round(burnedPct)}%`, pct: 18 },
                { label: "Treasury reserve", value: formatToken(stats.balances.treasury, stats.decimals), pct: 48 },
                { label: "1M lock target", value: "1M", pct: 82 },
              ]}
            />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div
            className="rounded-xl p-5 sm:p-6"
            style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}
          >
            <SectionLabel>Supply breakdown</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-5">
              {[
                { label: "Burned", pct: burnedPct },
                { label: "Treasury", pct: treasuryPct },
                { label: "Trading", pct: tradingPct },
                { label: "Locked", pct: lockPct },
                { label: "Circulating", pct: circPct },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                    {s.label}
                  </p>
                  <p className="text-xl font-semibold text-white mt-1">{Math.round(s.pct)}%</p>
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full bg-white rounded-full" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div
            className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] pt-1"
            style={{ color: MUTED }}
          >
            <span>Live on-chain data · refreshes every 60s</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Live
            </span>
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
      <ComingSoonBlock
        lines={[
          "> Initializing BCHOG roadmap...",
          "> NFT Collection — exclusive drops for holders",
          "> BCHOG Gear — merch and community wear",
          "> Staking Program — earn by holding",
          "",
          "Status: In development. Stay tuned.",
        ]}
      />
    );
  }
  return null;
}

function ComingSoonBlock({ lines }: { lines: string[] }) {
  return (
    <Reveal>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}
      >
        <div
          className="px-5 sm:px-8 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            Roadmap terminal
          </span>
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Pending
          </span>
        </div>
        <div className="px-5 sm:px-8 py-8 sm:py-10 min-h-[220px]">
          <TypewriterText lines={lines} speed={36} />
        </div>
        <div
          className="px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <a
            href={NADFUN_TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium uppercase tracking-[0.1em] no-underline transition-opacity hover:opacity-70"
            style={{ color: "white" }}
          >
            Buy on Nad.fun →
          </a>
          <span className="text-[10px]" style={{ color: MUTED }}>
            Updates posted on X & Telegram
          </span>
        </div>
      </div>
    </Reveal>
  );
}
