import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, Children, type CSSProperties, type ReactNode } from "react";
import { Menu, X, Cog, Lock, Gift, Briefcase, Flame } from "lucide-react";
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
  const sectionRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  // imageIndex: which image is currently centered (0, 1, 2)
  const [imageIndex, setImageIndex] = useState(0);
  // locked: true means scroll is hijacked for image cycling
  const [locked, setLocked] = useState(true);
  const lockedRef = useRef(true);
  const imageIndexRef = useRef(0);
  const advancingRef = useRef(false);

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

  // Keep refs in sync with state
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  useEffect(() => {
    imageIndexRef.current = imageIndex;
  }, [imageIndex]);

  // Advance image index forward, unlock scroll after last image is shown
  const advanceImage = () => {
    if (advancingRef.current) return;
    const cur = imageIndexRef.current;
    const next = cur + 1;
    if (next >= HERO_IMAGES.length) {
      // last image already shown — unlock page scroll
      lockedRef.current = false;
      setLocked(false);
      return;
    }
    advancingRef.current = true;
    imageIndexRef.current = next;
    setImageIndex(next);
    setTimeout(() => { advancingRef.current = false; }, 800);
    if (next === HERO_IMAGES.length - 1) {
      setTimeout(() => {
        lockedRef.current = false;
        setLocked(false);
      }, 900);
    }
  };

  // Go back one image (scroll up while on hero or when page is at top)
  const retreatImage = () => {
    if (advancingRef.current) return;
    const cur = imageIndexRef.current;
    if (cur <= 0) return; // already at first image
    // re-lock scroll so user can cycle again
    if (!lockedRef.current) {
      lockedRef.current = true;
      setLocked(true);
    }
    advancingRef.current = true;
    const prev = cur - 1;
    imageIndexRef.current = prev;
    setImageIndex(prev);
    setTimeout(() => { advancingRef.current = false; }, 800);
  };

  // Intercept wheel and touch events while locked
  useEffect(() => {
    let touchStartY = 0;

    const onWheel = (e: WheelEvent) => {
      // When page is scrolled back to the very top, intercept upward scroll to retreat images
      if (!lockedRef.current) {
        if (e.deltaY < 0 && window.scrollY <= 0 && imageIndexRef.current > 0) {
          e.preventDefault();
          e.stopPropagation();
          retreatImage();
          return;
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) {
        advanceImage();
      } else if (e.deltaY < 0) {
        retreatImage();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!lockedRef.current) {
        const dy = touchStartY - e.touches[0].clientY;
        if (dy < -30 && window.scrollY <= 0 && imageIndexRef.current > 0) {
          e.preventDefault();
          retreatImage();
        }
        return;
      }
      const dy = touchStartY - e.touches[0].clientY;
      if (dy > 30) {
        e.preventDefault();
        advanceImage();
      } else if (dy < -30) {
        e.preventDefault();
        retreatImage();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const activeIndex = imageIndex;

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
        height: isMobile ? "60%" : "92%",
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
        height: isMobile ? "16%" : "28%",
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
      height: isMobile ? "16%" : "28%",
      bottom: isMobile ? "32%" : "12%",
    };
  }

  const scrollTrackVh = 0; // images advance via scroll hijack, no scroll track needed

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden"
      style={{
        height: `100dvh`,
        backgroundColor: BG,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="w-full overflow-hidden" style={{ height: "100dvh", position: "relative" }}>
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
              fontSize: "clamp(76px, 23.8vw, 323px)",
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

        {/* Scroll hint — visible while locked, fades out when unlocked */}
        <div
          className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-2 pointer-events-none"
          style={{ zIndex: 10, opacity: locked ? 1 : 0, transition: "opacity 600ms ease" }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            {imageIndex < HERO_IMAGES.length - 1 ? "Scroll to reveal" : "Scroll to continue"}
          </span>
          <div className="flex flex-col gap-0.5 items-center" aria-hidden>
            <div className="w-px h-6 rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${PURPLE_BRIGHT})` }} />
            <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `6px solid ${PURPLE_BRIGHT}` }} />
          </div>
          {/* Dot progress for images */}
          <div className="flex items-center gap-1.5 mt-1">
            {HERO_IMAGES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: imageIndex === i ? 18 : 5,
                  height: 5,
                  borderRadius: 99,
                  background: imageIndex === i ? PURPLE_BRIGHT : "rgba(181,76,255,0.3)",
                  transition: "width 300ms ease, background 300ms ease",
                }}
              />
            ))}
          </div>
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
  const G_BG        = "rgba(255,255,255,0.035)";
  const G_BDR       = "rgba(255,255,255,0.08)";
  const G_SHINE_TOP = "rgba(255,255,255,0.14)";
  const G_SHINE_BOT = "rgba(255,255,255,0.03)";
  const HL_BG       = "rgba(181,76,255,0.10)";
  const HL_BDR      = "rgba(181,76,255,0.32)";
  const HL_GLOW     = "rgba(181,76,255,0.22)";
  const PUB         = PURPLE_BRIGHT;            // #B54CFF
  const ARW         = PUB;
  const DASH_CLR    = "rgba(181,76,255,0.55)";

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

  const NodeCard = ({ node, compact = false }: { node: NodeDef; compact?: boolean }) => {
    const { Icon } = node;
    const isHL = !!node.highlight;
    const inner = (
      <div
        className="rounded-2xl flex flex-col items-center text-center transition-all duration-200 hover:scale-[1.03]"
        style={{
          padding: compact ? "10px 8px" : "16px 12px",
          gap: compact ? 5 : 7,
          position: "relative",
          overflow: "hidden",
          background: isHL ? HL_BG : G_BG,
          border: `1px solid ${isHL ? HL_BDR : G_BDR}`,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: isHL
            ? `inset 0 1.5px 0 ${G_SHINE_TOP}, inset 0 -1px 0 ${G_SHINE_BOT}, 0 0 28px ${HL_GLOW}, 0 12px 32px rgba(0,0,0,0.45)`
            : `inset 0 1.5px 0 ${G_SHINE_TOP}, inset 0 -1px 0 ${G_SHINE_BOT}, 0 8px 24px rgba(0,0,0,0.4)`,
        }}
      >
        {/* top glass sheen stripe */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: "38%",
            borderRadius: "16px 16px 60% 60% / 12px 12px 32px 32px",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)",
            pointerEvents: "none",
          }}
        />
        {/* icon pill */}
        <div
          className="rounded-xl flex items-center justify-center shrink-0"
          style={{
            width: compact ? 28 : 38,
            height: compact ? 28 : 38,
            background: isHL ? "rgba(181,76,255,0.18)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${isHL ? "rgba(181,76,255,0.30)" : "rgba(255,255,255,0.10)"}`,
            boxShadow: isHL ? `0 0 14px rgba(181,76,255,0.30)` : "none",
          }}
        >
          <Icon size={compact ? 13 : 18} color={isHL ? PUB : "rgba(255,255,255,0.65)"} strokeWidth={1.75} />
        </div>
        <p
          className="font-bold uppercase leading-tight text-white"
          style={{ fontSize: compact ? 8 : 9.5, letterSpacing: "0.13em" }}
        >
          {node.label}
        </p>
        <p
          style={{
            fontSize: compact ? 7 : 8,
            color: isHL ? PUB : "rgba(255,255,255,0.32)",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          {node.sub}
        </p>
        {!compact && (
          <p
            className="leading-snug"
            style={{ fontSize: 9, color: "rgba(255,255,255,0.36)", marginTop: 1 }}
          >
            {node.desc}
          </p>
        )}
      </div>
    );
    return node.href ? (
      <a href={node.href} target="_blank" rel="noreferrer" className="no-underline block">
        {inner}
      </a>
    ) : inner;
  };

  // ── Flywheel flow (matching the reference image) ──
  // Treasury  ──solid──►  Lock    (top-centre → mid-left)
  // Treasury  ──solid──►  Rewards (top-centre → mid-right)
  // Treasury  ──solid──►  Trading (top-centre → bottom-centre)
  // Trading   ──dashed──► Burn    (bottom-centre → bottom-left)
  // Burn      ──dashed──► Lock    (bottom-left  → mid-left)   [cycle closes]

  // We render a 3-row layout with an SVG overlay for arrows:
  // Row 0  (centre):        Treasury
  // Row 1  (3-col):         Lock | [space] | Rewards
  // Row 2  (centre):        Trading
  // Row 3  (left-of-centre): Burn

  // SVG coordinate assumptions (maxWidth 600):
  // Treasury centre  ≈ (300, 70)
  // Lock centre      ≈ (80, 210)
  // Rewards centre   ≈ (520, 210)
  // Trading centre   ≈ (300, 340)
  // Burn centre      ≈ (80, 460)

  const SVG_W = 600;
  const T  = { x: 300, y:  70 };
  const LK = { x:  80, y: 210 };
  const RW = { x: 520, y: 210 };
  const TR = { x: 300, y: 340 };
  const BN = { x:  80, y: 460 };

  function arrowHead(x: number, y: number, angle: number, fill: string) {
    const size = 7;
    const rad = (angle * Math.PI) / 180;
    const tip = { x, y };
    const left  = { x: x - size * Math.cos(rad - 0.5), y: y - size * Math.sin(rad - 0.5) };
    const right = { x: x - size * Math.cos(rad + 0.5), y: y - size * Math.sin(rad + 0.5) };
    return <polygon points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`} fill={fill} />;
  }

  return (
    <div className="mt-4 w-full">
      <div className="text-center mb-6">
        <p
          className="text-white font-bold uppercase"
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: "clamp(0.85rem,2.5vw,1.2rem)",
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          BCHOG ECOSYSTEM WALLET FLOW
        </p>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden sm:block">
        <div className="relative" style={{ maxWidth: SVG_W, margin: "0 auto" }}>

          {/* Absolute SVG arrow layer — covers full diagram height */}
          <svg
            aria-hidden
            viewBox={`0 0 ${SVG_W} 530`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {/* Treasury → Lock (solid) */}
            <path d={`M${T.x},${T.y} Q${T.x},${LK.y} ${LK.x+8},${LK.y}`} fill="none" stroke={ARW} strokeWidth="1.6" />
            {arrowHead(LK.x + 8, LK.y, 180, ARW)}

            {/* Treasury → Rewards (solid) */}
            <path d={`M${T.x},${T.y} Q${T.x},${RW.y} ${RW.x-8},${RW.y}`} fill="none" stroke={ARW} strokeWidth="1.6" />
            {arrowHead(RW.x - 8, RW.y, 0, ARW)}

            {/* Treasury → Trading (solid) */}
            <line x1={T.x} y1={T.y} x2={TR.x} y2={TR.y - 10} stroke={ARW} strokeWidth="1.6" />
            {arrowHead(TR.x, TR.y - 10, 90, ARW)}

            {/* Trading → Burn (dashed) */}
            <path d={`M${TR.x},${TR.y} Q${TR.x},${BN.y} ${BN.x+8},${BN.y}`} fill="none" stroke={DASH_CLR} strokeWidth="1.6" strokeDasharray="5 4" />
            {arrowHead(BN.x + 8, BN.y, 180, DASH_CLR)}

            {/* Burn → Lock (dashed — cycle closes) */}
            <line x1={BN.x} y1={BN.y - 8} x2={LK.x} y2={LK.y + 8} stroke={DASH_CLR} strokeWidth="1.4" strokeDasharray="4 4" />
            {arrowHead(LK.x, LK.y + 8, 270, DASH_CLR)}
          </svg>

          {/* Row 0 — Treasury (centred) */}
          <div className="flex justify-center" style={{ position: "relative", zIndex: 2 }}>
            <div style={{ width: 160 }}>
              <NodeCard node={nodes[0]} />
            </div>
          </div>

          {/* Row 1 — Lock | gap | Rewards */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr",
              maxWidth: SVG_W,
              margin: "80px auto 0",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div className="flex justify-start">
              <div style={{ width: 150 }}><NodeCard node={nodes[1]} /></div>
            </div>
            <div />
            <div className="flex justify-end">
              <div style={{ width: 150 }}><NodeCard node={nodes[3]} /></div>
            </div>
          </div>

          {/* Row 2 — Trading (centred) */}
          <div className="flex justify-center" style={{ marginTop: 80, position: "relative", zIndex: 2 }}>
            <div style={{ width: 160 }}>
              <NodeCard node={nodes[2]} />
            </div>
          </div>

          {/* Row 3 — Burn (left) */}
          <div className="flex justify-start" style={{ marginTop: 80, paddingLeft: 5, position: "relative", zIndex: 2 }}>
            <div style={{ width: 150 }}>
              <NodeCard node={nodes[4]} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="sm:hidden flex flex-col items-center gap-3">
        {/* Treasury */}
        <div style={{ width: "min(100%,220px)" }}><NodeCard node={nodes[0]} compact /></div>

        {/* Arrow */}
        <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden>
          <line x1="8" y1="0" x2="8" y2="12" stroke={ARW} strokeWidth="1.5" />
          <polygon points="4,12 12,12 8,20" fill={ARW} />
        </svg>

        {/* Lock + Rewards side by side */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <NodeCard node={nodes[1]} compact />
          <NodeCard node={nodes[3]} compact />
        </div>

        {/* Arrow */}
        <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden>
          <line x1="8" y1="0" x2="8" y2="12" stroke={ARW} strokeWidth="1.5" />
          <polygon points="4,12 12,12 8,20" fill={ARW} />
        </svg>

        {/* Trading */}
        <div style={{ width: "min(100%,220px)" }}><NodeCard node={nodes[2]} compact /></div>

        {/* Dashed arrow */}
        <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden>
          <line x1="8" y1="0" x2="8" y2="12" stroke={DASH_CLR} strokeWidth="1.5" strokeDasharray="4 3" />
          <polygon points="4,12 12,12 8,20" fill={DASH_CLR} />
        </svg>

        {/* Burn */}
        <div style={{ width: "min(100%,220px)" }}><NodeCard node={nodes[4]} compact /></div>
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-8 mt-6 pt-4"
        style={{ borderTop: "1px solid rgba(181,76,255,0.10)" }}
      >
        <span
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          <span className="inline-block w-5 h-px" style={{ background: PUB }} />
          Wallet Flow
        </span>
        <span
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
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
  const [walletTab, setWalletTab] = useState<"network" | "tokens" | "defi" | "activity">("network");

  const walletTabs: { id: "network" | "tokens" | "defi" | "activity"; label: string }[] = [
    { id: "network", label: "Networth" },
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
          <div
            className="flex mx-4 sm:mx-6 mb-0 rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {walletTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setWalletTab(t.id)}
                className="flex-1 py-2.5 text-[11px] sm:text-[12px] font-semibold transition-all"
                style={{
                  background: walletTab === t.id
                    ? "rgba(181,76,255,0.2)"
                    : "transparent",
                  color: walletTab === t.id ? "white" : "rgba(255,255,255,0.35)",
                  borderBottom: walletTab === t.id ? `2px solid ${PURPLE_BRIGHT}` : "2px solid transparent",
                  letterSpacing: "0.02em",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="px-4 sm:px-6 pb-5 pt-1">

            {/* Networth tab — total network summary */}
            {walletTab === "network" && (
              <div className="flex flex-col gap-3 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "BCHOG Balance", value: bchogBalance, sub: "BCHOG" },
                    { label: "Meme Tokens", value: memeTotal > 0 ? formatUsd(memeTotal) : "$---", sub: `${roster.length} tokens` },
                    { label: "Neverland veDUST", value: veDust?.valueUsd ? formatUsd(veDust.valueUsd) : "$---", sub: veDust ? `${veDust.nfts} NFTs` : "---" },
                    { label: "Weekly Yield", value: veDust?.weeklyUsd ? formatUsd(veDust.weeklyUsd) : "$---", sub: "USDC" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl p-3 sm:p-4 flex flex-col gap-0.5"
                      style={{
                        background: "rgba(181,76,255,0.07)",
                        border: "1px solid rgba(181,76,255,0.15)",
                      }}
                    >
                      <p className="text-[9px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
                      <p className="text-sm sm:text-base font-bold text-white leading-tight">{s.value}</p>
                      <p className="text-[9px]" style={{ color: PURPLE_BRIGHT }}>{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tokens tab — all wallet tokens */}
            {walletTab === "tokens" && (
              <div className="flex flex-col pt-2" style={{ maxHeight: 420, overflowY: "auto", scrollbarWidth: "none" }}>
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
                      className="flex items-center justify-between py-3.5 no-underline hover:bg-white/[0.03] transition-colors rounded-xl px-1"
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
                    background: "rgba(181,76,255,0.07)",
                    border: "1px solid rgba(181,76,255,0.18)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                      style={{ background: PANEL, border: `1px solid rgba(181,76,255,0.3)` }}
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
                        style={{ background: "rgba(0,0,0,0.2)" }}
                      >
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
                    Live
                  </span>
                </div>
                {trades.length === 0 ? (
                  <div className="py-8 text-sm text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Loading transactions…
                  </div>
                ) : (
                  <div className="flex flex-col" style={{ maxHeight: 400, overflowY: "auto", scrollbarWidth: "none" }}>
                    {trades.map((t, idx) => (
                      <a
                        key={t.hash}
                        href={explorerTx(t.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 sm:gap-4 py-3.5 no-underline hover:bg-white/[0.03] transition-colors rounded-xl"
                        style={{ borderBottom: idx < trades.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined, color: "white" }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: t.type === "BUY" ? "rgba(74,222,174,0.1)" : "rgba(181,76,255,0.1)",
                            border: `1px solid ${t.type === "BUY" ? "rgba(74,222,174,0.25)" : "rgba(181,76,255,0.25)"}`,
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                            stroke={t.type === "BUY" ? DB_GREEN : PURPLE_BRIGHT} strokeWidth="2.2" aria-hidden>
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
                            style={{ color: t.type === "BUY" ? DB_GREEN : PURPLE_BRIGHT }}>
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
      <div className="flex flex-col gap-4">
        {/* Glass stat cards — 2×2 mobile, 4-across desktop */}
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Market Cap */}
            <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-1.5" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>Market Cap</p>
              <p className="font-black text-white leading-none" style={{
                fontSize: "clamp(1.5rem,5.5vw,2.4rem)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
                textShadow: `0 0 24px rgba(181,76,255,0.5)`,
              }}>{formatUsd(market.marketCapUsd)}</p>
              <p className="text-[11px] font-medium" style={{ color: "rgba(181,76,255,0.9)" }}>Live</p>
            </div>

            {/* Holders */}
            <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-1.5" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>Holders</p>
              <p className="font-black text-white leading-none" style={{
                fontSize: "clamp(1.5rem,5.5vw,2.4rem)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
                textShadow: `0 0 24px rgba(181,76,255,0.5)`,
              }}>{formatCount(market.holders)}</p>
              <p className="text-[11px] font-medium" style={{ color: "rgba(181,76,255,0.9)" }}>Boblievers</p>
            </div>

            {/* Total Burned */}
            <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-1.5" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>Total Burned</p>
              <p className="font-black text-white leading-none" style={{
                fontSize: "clamp(1.5rem,5.5vw,2.4rem)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
                textShadow: `0 0 24px rgba(255,92,138,0.5)`,
              }}>{formatToken(stats.balances.burn, stats.decimals)}</p>
              <p className="text-[11px] font-medium" style={{ color: "rgba(255,92,138,0.9)" }}>Deflationary</p>
            </div>

            {/* Supply Locked */}
            <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-1.5" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>Supply Locked</p>
              <p className="font-black text-white leading-none" style={{
                fontSize: "clamp(1.5rem,5.5vw,2.4rem)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
                textShadow: `0 0 24px rgba(181,76,255,0.5)`,
              }}>{Math.round(lockPct)}%</p>
              {/* iOS glass progress bar */}
              <div
                className="relative h-3.5 rounded-full overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${lockPct}%`,
                    background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_BRIGHT} 60%, rgba(255,255,255,0.55) 100%)`,
                    boxShadow: `0 0 12px 2px ${PURPLE_BRIGHT}88`,
                  }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
                  style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)" }}
                />
              </div>
              <p className="text-[11px] font-medium" style={{ color: "rgba(181,76,255,0.9)" }}>Lock progress</p>
            </div>

          </div>
        </Reveal>

        {/* Lock Holding Progress — full-width glass card */}
        <Reveal delay={60}>
          <div className="rounded-2xl px-5 py-5" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                Lock Holding Progress
              </p>
              <p className="text-base font-black text-white" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
                {formatToken(stats.balances.lockHolding, stats.decimals)}
              </p>
            </div>
            {/* Thick iOS glass bar */}
            <div
              className="relative h-5 rounded-full overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.06)",
                boxShadow: "inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 1px rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${lockProgress}%`,
                  background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_BRIGHT} 55%, rgba(255,255,255,0.65) 100%)`,
                  boxShadow: `0 0 16px 4px ${PURPLE_BRIGHT}88, 0 0 32px 8px ${PURPLE}44`,
                }}
              />
              {/* Glass sheen */}
              <div
                className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
                style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)" }}
              />
            </div>
            <div className="flex justify-between mt-2.5 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>{Math.round(lockProgress)}% of 1M target</span>
              <span>1,000,000</span>
            </div>
          </div>
        </Reveal>

        {/* Supply Breakdown — glass card, 3-col mobile / 5-col desktop */}
        <Reveal delay={100}>
          <div className="rounded-2xl p-4 sm:p-5" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              Supply Breakdown
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: "Burned",      pct: burnedPct,   color: CORAL },
                { label: "Treasury",    pct: treasuryPct, color: PURPLE_BRIGHT },
                { label: "Trading",     pct: tradingPct,  color: PURPLE },
                { label: "Locked",      pct: lockPct,     color: PURPLE_BRIGHT },
                { label: "Circulating", pct: circPct,     color: "rgba(255,255,255,0.4)" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[9px] uppercase tracking-[0.08em] mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
                  <p
                    className="font-black text-white leading-none"
                    style={{
                      fontSize: "clamp(1.1rem,4vw,1.7rem)",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.02em",
                      textShadow: `0 0 16px ${s.color}88`,
                    }}
                  >
                    {Math.round(s.pct)}%
                  </p>
                  {/* iOS glass progress bar */}
                  <div
                    className="relative h-3 rounded-full mt-2 overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.45), inset 0 -1px 1px rgba(255,255,255,0.04)",
                    }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${s.pct}%`,
                        background: `linear-gradient(90deg, ${s.color}cc 0%, ${s.color} 60%, rgba(255,255,255,0.5) 100%)`,
                        boxShadow: `0 0 8px 2px ${s.color}66`,
                      }}
                    />
                    <div
                      className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
                      style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.16), transparent)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
          "Deflationary pressure builds",
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
          "Multiplied deflationary impact",
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
    const posts = ["https://x.com/BURNINGCHOG/status/2068770674475176411"];
    return (
      <div className="flex flex-col gap-6">
        <Reveal>
          <div
            className="rounded-xl p-5 sm:p-6"
            style={{ background: `linear-gradient(160deg, ${SURFACE} 0%, ${PANEL} 100%)`, border: `1px solid ${BORDER_STRONG}` }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: PURPLE_BRIGHT }}>
              Active Contests · From X
            </span>
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              {posts.map((p) => (
                <div key={p} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER_STRONG}` }}>
                  <TweetEmbed url={p} />
                </div>
              ))}
              {/* Placeholder card on desktop so it doesn't look one-sided */}
              <div
                className="hidden lg:flex rounded-xl p-6 flex-col justify-center items-center gap-3"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, minHeight: 200 }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: PANEL, border: `1px solid ${BORDER_STRONG}` }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill={PURPLE_BRIGHT} aria-hidden>
                    <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.875l-5.38-7.03L4.6 22H1.34l8.02-9.165L1 2h7.05l4.86 6.43L18.244 2Z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">More Contests Coming</p>
                <p className="text-[11px] text-center" style={{ color: MUTED }}>Follow <a href={SOCIALS.x} target="_blank" rel="noreferrer" className="no-underline" style={{ color: PURPLE_BRIGHT }}>@BURNINGCHOG</a> on X for the latest</p>
              </div>
            </div>
          </div>
        </Reveal>
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
    <div ref={blockRef} className="flex flex-col items-center" style={{ minHeight: 0, paddingBottom: 8 }}>
      {/* Feature — bare text only, no card/box */}
      <div style={{ ...cardStyle, width: "100%", maxWidth: 420, textAlign: "center" }}>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.25em] block mb-2"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
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
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>{active.detail}</p>
      </div>

      {/* Dot indicator */}
      <div className="flex items-center gap-2 mt-4">
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              width: activeIdx === i ? 22 : 6,
              height: 6,
              borderRadius: 99,
              background: activeIdx === i ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)",
              transition: "width 350ms cubic-bezier(0.22,1,0.36,1), background 350ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
