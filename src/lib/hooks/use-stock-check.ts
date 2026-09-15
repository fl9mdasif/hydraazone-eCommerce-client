"use client";

import { useCallback, useEffect, useState } from "react";
import { getProduct } from "@/lib/api/products";
import type { CartLine } from "@/stores/cart";

/**
 * Revalidates cart lines against LIVE product/variant data before checkout
 * is allowed to submit.
 *
 * `CartLine.stock` is a snapshot taken whenever the item was added — it can
 * be minutes or days stale, and `POST /carts` never checks stock either
 * (only `POST /orders` does, server-side, at the moment of submission). This
 * closes that gap proactively instead of letting the customer fill out the
 * whole address form and only then discover a 400 from the server.
 */

export interface StockIssue {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  requested: number;
  /** 0 when the variant no longer exists at all. */
  available: number;
  isAvailable: boolean;
}

export type StockCheckStatus = "idle" | "checking" | "ok" | "blocked";

export function useStockCheck(lines: CartLine[], ready: boolean) {
  const [status, setStatus] = useState<StockCheckStatus>("idle");
  const [issues, setIssues] = useState<StockIssue[]>([]);

  const check = useCallback(async () => {
    if (lines.length === 0) {
      setStatus("ok");
      setIssues([]);
      return;
    }

    setStatus("checking");

    const productIds = Array.from(new Set(lines.map((line) => line.productId)));

    const products = await Promise.all(
      productIds.map((id) =>
        getProduct(id, { revalidate: false }).catch(() => null),
      ),
    );
    const byId = new Map(
      products
        .filter((product): product is NonNullable<typeof product> => product !== null)
        .map((product) => [product._id, product]),
    );

    const found: StockIssue[] = [];

    for (const line of lines) {
      const product = byId.get(line.productId);
      // Custom-size lines carry a synthetic `variantId` — the real one to
      // check against the live product is `realVariantId`.
      const variantId = line.realVariantId ?? line.variantId;
      const variant = product?.variants.find((candidate) => candidate._id === variantId);

      if (!product || !variant) {
        found.push({
          productId: line.productId,
          variantId: line.variantId,
          name: line.name,
          variantName: line.customLabel ?? line.variantName,
          requested: line.quantity,
          available: 0,
          isAvailable: false,
        });
        continue;
      }

      if (!variant.isAvailable || variant.stock < line.quantity) {
        found.push({
          productId: line.productId,
          variantId: line.variantId,
          name: line.name,
          variantName: line.customLabel ?? line.variantName,
          requested: line.quantity,
          available: variant.isAvailable ? variant.stock : 0,
          isAvailable: variant.isAvailable,
        });
      }
    }

    setIssues(found);
    setStatus(found.length > 0 ? "blocked" : "ok");
  }, [lines]);

  useEffect(() => {
    if (!ready) return;
    // `check` only calls setState after its own internal `await` calls —
    // the standard fetch-on-mount pattern, not the synchronous-setState
    // footgun this rule targets (the same reasoning applied in
    // orders-panel.tsx / wishlist-panel.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    // Deliberately `[ready]` only, not `[ready, check]` — this should run
    // once when the cart becomes ready, not on every `check` identity
    // change (i.e. every `lines` change). Callers re-invoke `check()`
    // explicitly via the returned `recheck` after a fix action instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return { status, issues, recheck: check };
}
