import { createServerFn } from "@tanstack/react-start";

// Reads the Trading Desk's Neverland veDUST positions, USD value, and the
// USDC revenue yield (Velodrome-v2-style epoch distributor). All public RPC.

const RPC = "https://rpc.monad.xyz";
const DUSTLOCK = "0xBB4738D05AD1b3Da57a4881baE62Ce9bb1eEeD6C";
const DUST_HELPER = "0x3c31deb0ECEA2Bd3210318586a9777A67939E0B4";
const REVENUE_REWARD = "0xff20ac10eb808b1e31f5cfca58d80ede2ba71c43";
const USDC = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603".toLowerCase();
const TRADING = "0x574db938dd0F3C88DDF141E3F39a60803e7526fb";
const WEEK = 604800n;
const MAX_WEEKS = 60; // bound the lifetime scan

// function selectors (keccak-verified)
const SEL = {
  balanceOf: "0x70a08231", // balanceOf(address)
  ownerToId: "0x8bf9d84c", // ownerToNFTokenIdList(address,uint256)
  locked: "0xb45a3c0e", // locked(uint256) -> (int256 amount, ...)
  balanceOfNFT: "0xe7e242d4", // balanceOfNFT(uint256)
  balanceOfNFTAt: "0xe0514aba", // balanceOfNFTAt(uint256,uint256)
  totalSupplyAt: "0x981b24d0", // totalSupplyAt(uint256)
  tokenMintTime: "0x83b81ebd", // tokenMintTime(uint256)
  dustUsd: "0x13950ece", // getDustValueInUSD(uint256) -> 8-decimal USD
  perEpoch: "0x92777b29", // tokenRewardsPerEpoch(address,uint256)
};

const padA = (a: string) => a.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const padU = (n: bigint) => n.toString(16).padStart(64, "0");

async function call(to: string, data: string): Promise<bigint> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const j = (await r.json()) as { result?: string; error?: unknown };
  if (j.error || !j.result || j.result === "0x") return 0n;
  return BigInt(j.result);
}

export type VeDustData = {
  nfts: number;
  veBalanceTokens: number;
  valueUsd: number;
  weeklyUsd: number;
  lifetimeUsd: number;
};

const EMPTY: VeDustData = {
  nfts: 0,
  veBalanceTokens: 0,
  valueUsd: 0,
  weeklyUsd: 0,
  lifetimeUsd: 0,
};

export const getVeDust = createServerFn({ method: "GET" }).handler(
  async (): Promise<VeDustData> => {
    try {
      const count = Number(await call(DUSTLOCK, SEL.balanceOf + padA(TRADING)));
      if (!count) return EMPTY;

      // enumerate the lock NFTs
      const ids = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          call(DUSTLOCK, SEL.ownerToId + padA(TRADING) + padU(BigInt(i))),
        ),
      );

      // locked DUST + current veDUST balance + earliest mint time
      let totalLocked = 0n;
      let veBalance = 0n;
      let earliestMint = BigInt(Math.floor(Date.now() / 1000));
      await Promise.all(
        ids.map(async (id) => {
          const [lk, ve, mint] = await Promise.all([
            fetch(RPC, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [{ to: DUSTLOCK, data: SEL.locked + padU(id) }, "latest"],
              }),
            })
              .then((r) => r.json())
              .then((j: { result?: string }) => j.result ?? "0x"),
            call(DUSTLOCK, SEL.balanceOfNFT + padU(id)),
            call(DUSTLOCK, SEL.tokenMintTime + padU(id)),
          ]);
          if (lk.length >= 66) {
            let amt = BigInt(`0x${lk.slice(2, 66)}`);
            if (amt >= 1n << 255n) amt -= 1n << 256n;
            totalLocked += amt;
          }
          veBalance += ve;
          if (mint > 0n && mint < earliestMint) earliestMint = mint;
        }),
      );

      const usdRaw = await call(DUST_HELPER, SEL.dustUsd + padU(totalLocked));
      const valueUsd = Number(usdRaw) / 1e8;

      // USDC revenue yield by epoch: share = perEpoch(USDC,ep) * myVeAt(ep) / totalSupplyAt(ep)
      const now = BigInt(Math.floor(Date.now() / 1000));
      const curEpoch = (now / WEEK) * WEEK;
      const firstEpoch = (earliestMint / WEEK) * WEEK;
      let weeklyUsd = 0;
      let lifetime = 0n;
      let scanned = 0;
      for (let ep = curEpoch; ep >= firstEpoch && scanned < MAX_WEEKS; ep -= WEEK, scanned++) {
        const total = await call(REVENUE_REWARD, SEL.perEpoch + padA(USDC) + padU(ep));
        if (total === 0n) continue;
        const supply = await call(DUSTLOCK, SEL.totalSupplyAt + padU(ep));
        if (supply === 0n) continue;
        const bals = await Promise.all(
          ids.map((id) => call(DUSTLOCK, SEL.balanceOfNFTAt + padU(id) + padU(ep))),
        );
        const myBal = bals.reduce((a, b) => a + b, 0n);
        const share = (total * myBal) / supply;
        lifetime += share;
        if (ep === curEpoch) weeklyUsd = Number(share) / 1e6;
      }

      return {
        nfts: count,
        veBalanceTokens: Number(veBalance) / 1e18,
        valueUsd,
        weeklyUsd,
        lifetimeUsd: Number(lifetime) / 1e6,
      };
    } catch {
      return EMPTY;
    }
  },
);
