import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, Children, type CSSProperties, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
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
  dashboard: "Live on-chain stats.",
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
          className="pointer-events-auto w-[70%] max-w-[880px] min-w-[260px] h-12 sm:h-[52px] rounded-full flex items-center justify-between px-4 sm:px-6"
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
            <span className="text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase">BCHOG</span>
          </a>

          <nav className="hidden lg:flex items-center gap-0.5">
            {SECTIONS.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => scrollToId(s.id)}
                className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] rounded-full transition-colors hover:text-white hover:bg-white/[0.06]"
                style={{ color: MUTED }}
              >
                {s.short}
                {s.soon && (
                  <span
                    className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle"
                    style={{ background: CORAL }}
                  />
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
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const scrollable = Math.max(el.offsetHeight - window.innerHeight, 1);
        const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), scrollable);
        setProgress(scrolled / scrollable);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const maxIndex = HERO_IMAGES.length - 1;
  const activeIndex = Math.min(Math.floor(progress * HERO_IMAGES.length), maxIndex);

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
        transform: "translateX(-50%) scale(0.3)",
        filter: "blur(6px)",
        opacity: 0,
        zIndex: 1,
        left: "50%",
        height: isMobile ? "5%" : "9%",
        bottom: isMobile ? "32%" : "12%",
        pointerEvents: "none",
      };
    }

    if (role === "center") {
      return {
        ...base,
        transform: `translateX(-50%) scale(${isMobile ? 0.625 : 0.84})`,
        filter: "none",
        opacity: 1,
        zIndex: 20,
        left: "50%",
        height: isMobile ? "30%" : "46%",
        bottom: isMobile ? "22%" : 0,
      };
    }

    if (role === "left") {
      return {
        ...base,
        transform: "translateX(-50%) scale(0.5)",
        filter: "blur(2px)",
        opacity: 0.85,
        zIndex: 10,
        left: isMobile ? "20%" : "30%",
        height: isMobile ? "8%" : "14%",
        bottom: isMobile ? "32%" : "12%",
      };
    }

    return {
      ...base,
      transform: "translateX(-50%) scale(0.5)",
      filter: "blur(2px)",
      opacity: 0.85,
      zIndex: 10,
      left: isMobile ? "80%" : "70%",
      height: isMobile ? "8%" : "14%",
      bottom: isMobile ? "32%" : "12%",
    };
  }

  const scrollTrackVh = maxIndex * 40;

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative w-full overflow-hidden"
      style={{
        height: `calc(100dvh + ${scrollTrackVh}dvh)`,
        backgroundColor: BG,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="sticky top-0 w-full overflow-hidden" style={{ height: "100dvh" }}>
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
          <div className="h-1 rounded-full overflow-hidden" style={{ background: INDIGO }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: PURPLE_BRIGHT }} />
          </div>
        </div>
      )}
    </div>
  );
}

function DeflationaryFlywheelDiagram({ lockProgress }: { lockProgress: number }) {
  return (
    <div className="mt-6 overflow-x-auto pb-1">
      <div className="flex items-stretch min-w-[min(100%,680px)]">
        <FlyStep step="01" title="100k Burn" />
        <FlyConnector />
        <FlyStep step="02" title="200% Match" />
        <FlyConnector />
        <div className="flex-1 grid grid-cols-3 gap-2 min-w-[240px]">
          <FlyOutcome amount="+100k" label="Burn" />
          <FlyOutcome amount="+50k" label="Lock" progress={lockProgress} />
          <FlyOutcome amount="+50k" label="Rewards" />
        </div>
      </div>
    </div>
  );
}

function ArchBox({
  label,
  sub,
  href,
  highlight = false,
}: {
  label: string;
  sub?: string;
  href?: string;
  highlight?: boolean;
}) {
  const box = (
    <div
      className="rounded-xl px-4 py-3.5 text-center transition-opacity hover:opacity-90"
      style={{
        background: highlight ? PANEL : SURFACE,
        border: `1px solid ${highlight ? PURPLE_BRIGHT : BORDER_STRONG}`,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">{label}</p>
      {sub && (
        <p className="text-[10px] mt-1 uppercase tracking-[0.06em]" style={{ color: MUTED }}>
          {sub}
        </p>
      )}
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block no-underline">
        {box}
      </a>
    );
  }
  return box;
}

function EcosystemArchitecture() {
  return (
    <div className="mt-6 max-w-md mx-auto flex flex-col items-stretch gap-0">
      <ArchBox
        label="Treasury"
        sub="Ecosystem engine"
        href={explorerAddr(WALLETS.treasury)}
        highlight
      />
      <div className="flex justify-center py-1" aria-hidden>
        <div className="w-px h-5" style={{ background: PURPLE }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ArchBox label="Lock Holding" sub="Vault" href={explorerAddr(WALLETS.lockHolding)} />
        <ArchBox label="Rewards" sub="Community" />
      </div>
      <div className="relative h-5 mx-[25%]" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: PURPLE }} />
        <div className="absolute left-0 top-0 w-px h-full" style={{ background: PURPLE }} />
        <div className="absolute right-0 top-0 w-px h-full" style={{ background: PURPLE }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ArchBox label="Trading Desk" sub="Market support" href={explorerAddr(WALLETS.trading)} />
        <ArchBox label="Buyback & Burn" sub="Deflation" />
      </div>
      <div className="flex items-center justify-center gap-6 mt-5 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
        <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
          <span className="w-4 h-px" style={{ background: PURPLE_BRIGHT }} />
          Flow
        </span>
        <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
          <span className="w-4 h-px border-t border-dashed" style={{ borderColor: CORAL }} />
          Buyback
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
            className="rounded-xl px-5 py-4"
            style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                Lock Holding
              </p>
              <p className="bchog-stat-value text-xl sm:text-2xl font-semibold text-white">
                {formatToken(stats.balances.lockHolding, stats.decimals)}
              </p>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ background: INDIGO }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${lockProgress}%`, background: PURPLE_BRIGHT }}
              />
            </div>
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
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: INDIGO }}>
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: PURPLE_BRIGHT }} />
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
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PURPLE_BRIGHT }} />
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
      <div className="flex flex-col gap-6">
        <Reveal>
          <div className="rounded-xl p-5 sm:p-6" style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}>
            <SectionLabel>Deflationary Flywheel</SectionLabel>
            <DeflationaryFlywheelDiagram lockProgress={lockProgress} />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-xl p-5 sm:p-6" style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}>
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
    return <ComingSoonBlock />;
  }
  return null;
}

function ComingSoonBlock() {
  const items = [
    { title: "NFT Collection", detail: "Exclusive holder drops" },
    { title: "BCHOG Gear", detail: "Merch & community wear" },
    { title: "Staking Program", detail: "Earn by holding" },
  ];

  return (
    <Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-xl p-6 flex flex-col"
            style={{ background: SURFACE, border: `1px solid ${BORDER_STRONG}` }}
          >
            <span
              className="text-[10px] font-medium uppercase tracking-[0.12em] w-fit px-2 py-0.5 rounded-full"
              style={{ color: CREAM, background: "rgba(61, 20, 136, 0.5)" }}
            >
              Soon
            </span>
            <h3 className="text-lg font-semibold text-white mt-4">{item.title}</h3>
            <p className="text-sm mt-2" style={{ color: MUTED }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <a
          href={NADFUN_TOKEN_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium uppercase tracking-[0.1em] no-underline transition-opacity hover:opacity-70"
          style={{ color: CREAM }}
        >
          Buy on Nad.fun →
        </a>
        <span className="text-[10px]" style={{ color: MUTED }}>
          Follow X & Telegram for updates
        </span>
      </div>
    </Reveal>
  );
}
