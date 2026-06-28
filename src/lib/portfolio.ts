import { createServerFn } from "@tanstack/react-start";

// The BCHOG Trading Desk wallet — we read whatever Monad tokens it holds.
const TRADING_WALLET = "0x574db938dd0F3C88DDF141E3F39a60803e7526fb";
const BCHOG_TOKEN = "0xFD97581D397622f6E6662917ea3DeEEfB9F57777".toLowerCase();

export type PortfolioToken = {
  address: string;
  symbol: string;
  name: string;
  valueUsd: number;
  quantity: number;
  iconUrl?: string;
};

type ZerionImpl = { chain_id?: string; address?: string };
type ZerionPosition = {
  attributes?: {
    value?: number | null;
    quantity?: { float?: number };
    fungible_info?: {
      name?: string;
      symbol?: string;
      icon?: { url?: string } | null;
      implementations?: ZerionImpl[];
    };
  };
};

/**
 * Reads the Trading Desk wallet's fungible token holdings from Zerion.
 * Runs only on the server so ZERION_API_KEY is never shipped to the client.
 * Returns [] gracefully when the key is missing or the request fails.
 */
export const getPortfolio = createServerFn({ method: "GET" }).handler(
  async (): Promise<PortfolioToken[]> => {
    const key = process.env.ZERION_API_KEY;
    if (!key) return [];

    const auth = `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
    const url =
      `https://api.zerion.io/v1/wallets/${TRADING_WALLET}/positions/` +
      `?filter[positions]=only_simple&filter[trash]=only_non_trash&currency=usd&sort=value`;

    try {
      const res = await fetch(url, {
        headers: { authorization: auth, accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: ZerionPosition[] };

      const tokens: PortfolioToken[] = [];
      for (const p of json.data ?? []) {
        const fi = p.attributes?.fungible_info;
        if (!fi) continue;
        const impls = fi.implementations ?? [];
        const monad = impls.find((i) => i.chain_id?.toLowerCase().includes("monad"));
        const impl = monad ?? impls[0];
        const address = impl?.address?.toLowerCase();
        // keep only Monad tokens with a real address + a USD value
        if (!address || !monad) continue;
        if (address === BCHOG_TOKEN) continue; // BCHOG is tracked separately
        const valueUsd = Number(p.attributes?.value ?? 0);
        if (!(valueUsd > 0)) continue;
        tokens.push({
          address,
          symbol: fi.symbol ?? "?",
          name: fi.name ?? "",
          valueUsd,
          quantity: Number(p.attributes?.quantity?.float ?? 0),
          iconUrl: fi.icon?.url,
        });
      }
      return tokens.sort((a, b) => b.valueUsd - a.valueUsd);
    } catch {
      return [];
    }
  },
);
