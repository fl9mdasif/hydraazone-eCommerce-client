"use client";

import { DollarSign, Package, Clock, CheckCircle2, Boxes } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getAllOrders,
  getDashboardSummary,
  getSalesAnalytics,
  type DashboardSummary,
  type SalesPoint,
} from "@/lib/api/orders";
import { getProductsForAdmin } from "@/lib/api/products";
import { ApiError } from "@/lib/api/client";
import type { Order, PaymentStatus } from "@/lib/api/schemas/order";
import type { Product } from "@/lib/api/schemas/product";
import { useSession } from "@/lib/hooks/use-session";
import { formatCurrency } from "@/lib/utils/format";
import { FormError } from "@/components/ui/field";
import { StatCard } from "./stat-card";
import { RevenueChart, type Period } from "./revenue-chart";
import { StatusDonut, type DonutSegment } from "./status-donut";
import { RecentOrdersTable, TopProductsTable } from "./dashboard-tables";
import { WarehousePanel } from "./warehouse-panel";

const PAYMENT_STATUSES: { status: PaymentStatus; label: string; color: string }[] = [
  { status: "paid", label: "Paid", color: "var(--success)" },
  { status: "pending", label: "Pending", color: "var(--warning)" },
  { status: "refunded", label: "Refunded", color: "var(--accent-warm)" },
  { status: "failed", label: "Failed", color: "var(--danger)" },
];

interface CatalogStats {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

/**
 * The dashboard overview — every number here traces back to a real API
 * response. See the plan/AGENTS.md audit: the reference mockup's Conversion
 * Rate, Returning Customers % and period-over-period change on every card
 * don't exist anywhere on the server, so they aren't here either. What
 * replaces them (Delivered Orders count, a real revenue trend from the last
 * two sales-analytics buckets, a genuinely-computed Stock Health %) is
 * derived from data the server actually returns.
 *
 * Shared verbatim by both `/dashboard/admin` and `/dashboard/superadmin` —
 * the two roles see identical dashboard content, per the confirmed ~95%
 * permission overlap between them.
 */
export function DashboardOverview() {
  const { token } = useSession();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deliveredCount, setDeliveredCount] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");
  const [salesData, setSalesData] = useState<SalesPoint[] | null>(null);
  const [paymentCounts, setPaymentCounts] = useState<Record<PaymentStatus, number> | null>(
    null,
  );
  const [recentOrders, setRecentOrders] = useState<Order[] | null>(null);
  const [topProducts, setTopProducts] = useState<Product[] | null>(null);
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null);

  /*
   * One error slot per widget rather than a single page-level error — a
   * failure in, say, the donut shouldn't blank out the stat cards next to
   * it. Every `load*` below funnels its failure through this so nothing
   * fails silently: without this, a thrown error (a network blip, a zod
   * mismatch on one unexpected document) left the corresponding state
   * permanently `null` with no `catch` anywhere — the widget just sat on
   * its skeleton forever with only an unhandled-rejection line in the
   * console to explain why.
   */
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  function describe(error: unknown): string {
    return error instanceof ApiError ? error.message : "Could not load this.";
  }

  // Summary + delivered count — the five stat cards' primary source.
  const loadSummary = useCallback(async () => {
    if (!token) return;
    try {
      const [summaryResult, deliveredResult] = await Promise.all([
        getDashboardSummary(token),
        getAllOrders(token, { status: "delivered", limit: 1 }),
      ]);
      setSummary(summaryResult);
      setDeliveredCount(deliveredResult.meta?.total ?? 0);
      setErrors((current) => ({ ...current, summary: null }));
    } catch (error) {
      console.error("[dashboard] summary load failed:", error);
      setErrors((current) => ({ ...current, summary: describe(error) }));
    }
  }, [token]);

  // Revenue chart — re-fetched whenever the period control changes.
  const loadSales = useCallback(async () => {
    if (!token) return;
    setSalesData(null);
    try {
      const points = await getSalesAnalytics(token, period);
      setSalesData(points);
      setErrors((current) => ({ ...current, sales: null }));
    } catch (error) {
      console.error("[dashboard] sales load failed:", error);
      setSalesData([]);
      setErrors((current) => ({ ...current, sales: describe(error) }));
    }
  }, [token, period]);

  // Order overview donut — four cheap `limit=1` calls, one per real payment
  // status, reading `meta.total` for each.
  const loadPaymentBreakdown = useCallback(async () => {
    if (!token) return;
    try {
      const results = await Promise.all(
        PAYMENT_STATUSES.map(({ status }) =>
          getAllOrders(token, { paymentStatus: status, limit: 1 }),
        ),
      );
      const counts = {} as Record<PaymentStatus, number>;
      PAYMENT_STATUSES.forEach(({ status }, index) => {
        counts[status] = results[index].meta?.total ?? 0;
      });
      setPaymentCounts(counts);
      setErrors((current) => ({ ...current, donut: null }));
    } catch (error) {
      console.error("[dashboard] payment breakdown load failed:", error);
      setPaymentCounts({ pending: 0, paid: 0, failed: 0, refunded: 0 });
      setErrors((current) => ({ ...current, donut: describe(error) }));
    }
  }, [token]);

  const loadRecentOrders = useCallback(async () => {
    if (!token) return;
    try {
      const { orders } = await getAllOrders(token, { limit: 5 });
      setRecentOrders(orders);
      setErrors((current) => ({ ...current, recentOrders: null }));
    } catch (error) {
      console.error("[dashboard] recent orders load failed:", error);
      setRecentOrders([]);
      setErrors((current) => ({ ...current, recentOrders: describe(error) }));
    }
  }, [token]);

  const loadTopProducts = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getProductsForAdmin({ sort: "-rating", limit: 5 }, token);
      setTopProducts(result.data);
      setErrors((current) => ({ ...current, topProducts: null }));
    } catch (error) {
      console.error("[dashboard] top products load failed:", error);
      setTopProducts([]);
      setErrors((current) => ({ ...current, topProducts: describe(error) }));
    }
  }, [token]);

  // Stock health / warehouse panel — pages through the FULL admin catalog
  // (not just page 1) to keep the total variant count honest at any
  // catalogue size, since the server has no endpoint that returns this
  // directly. `lowStockVariants` (from the summary call above) already
  // gives the low/out-of-stock split; this only needs the grand total.
  const loadCatalogStats = useCallback(async () => {
    if (!token || !summary) return;
    try {
      let page = 1;
      let totalVariants = 0;
      // Guard against an unbounded loop if `totalPages` is ever wrong.
      for (let safety = 0; safety < 50; safety += 1) {
        const result = await getProductsForAdmin({ page, limit: 100 }, token);
        totalVariants += result.data.reduce(
          (sum, product) => sum + product.variants.length,
          0,
        );
        if (page >= result.meta.totalPages) break;
        page += 1;
      }

      const outOfStock = summary.lowStockVariants.filter((v) => v.stock === 0).length;
      const lowStock = summary.lowStockVariants.length - outOfStock;
      const inStock = Math.max(0, totalVariants - summary.lowStockVariants.length);

      setCatalogStats({ inStock, lowStock, outOfStock });
      setErrors((current) => ({ ...current, catalog: null }));
    } catch (error) {
      console.error("[dashboard] catalog stats load failed:", error);
      setCatalogStats({ inStock: 0, lowStock: 0, outOfStock: 0 });
      setErrors((current) => ({ ...current, catalog: describe(error) }));
    }
  }, [token, summary]);

  useEffect(() => {
    // Each `load*` catches its own errors internally now (see the try/catch
    // above), so none of these are the synchronous-setState-in-effect
    // pattern the rule targets — it no longer flags them.
    void loadSummary();
    void loadPaymentBreakdown();
    void loadRecentOrders();
    void loadTopProducts();
  }, [loadSummary, loadPaymentBreakdown, loadRecentOrders, loadTopProducts]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  useEffect(() => {
    void loadCatalogStats();
  }, [loadCatalogStats]);

  // A real, historically-grounded revenue trend — the only stat card that
  // gets one, since it's the only metric with a genuine prior-period
  // baseline available from the server (the last two sales-analytics
  // buckets), not an invented percentage.
  const revenueTrend = (() => {
    if (!salesData || salesData.length < 2) return null;
    const previous = salesData[salesData.length - 2].revenue;
    const latest = salesData[salesData.length - 1].revenue;
    if (previous === 0) return null;
    return {
      percent: ((latest - previous) / previous) * 100,
      label: `vs previous ${period === "yearly" ? "year" : period === "monthly" ? "month" : "day"}`,
    };
  })();

  const donutSegments: DonutSegment[] = PAYMENT_STATUSES.map(({ status, label, color }) => ({
    label,
    color,
    value: paymentCounts?.[status] ?? 0,
  }));

  // Whatever failed, named plainly, ABOVE the section it belongs to — never
  // an eternal skeleton with the reason stuck in the console only.
  const failures = Object.values(errors).filter((message): message is string => Boolean(message));

  return (
    <div className="flex flex-col gap-5">
      {failures.length > 0 ? (
        <FormError
          message={`Some dashboard data couldn't be loaded: ${failures.join(" ")}`}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total revenue"
          value={summary?.totalRevenue ?? 0}
          format={formatCurrency}
          icon={DollarSign}
          trend={revenueTrend}
          loading={!summary && !errors.summary}
        />
        <StatCard
          label="Total orders"
          value={summary?.totalOrders ?? 0}
          icon={Package}
          loading={!summary && !errors.summary}
        />
        <StatCard
          label="Pending orders"
          value={summary?.pendingOrders ?? 0}
          icon={Clock}
          loading={!summary && !errors.summary}
        />
        <StatCard
          label="Delivered orders"
          value={deliveredCount ?? 0}
          icon={CheckCircle2}
          loading={deliveredCount === null && !errors.summary}
        />
        <StatCard
          label="Stock health"
          value={
            catalogStats
              ? Math.round(
                  (catalogStats.inStock /
                    Math.max(1, catalogStats.inStock + catalogStats.lowStock + catalogStats.outOfStock)) *
                    100,
                )
              : 0
          }
          format={(n) => `${Math.round(n)}%`}
          icon={Boxes}
          loading={!catalogStats && !errors.catalog}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <RevenueChart
          data={salesData ?? []}
          period={period}
          onPeriodChange={setPeriod}
          loading={salesData === null}
        />
        <StatusDonut segments={donutSegments} loading={!paymentCounts && !errors.donut} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentOrdersTable
          orders={recentOrders ?? []}
          loading={recentOrders === null}
          viewAllHref="orders"
        />
        <TopProductsTable
          products={topProducts ?? []}
          loading={topProducts === null}
          viewAllHref="products"
        />
      </div>

      <WarehousePanel
        inStock={catalogStats?.inStock ?? 0}
        lowStock={catalogStats?.lowStock ?? 0}
        outOfStock={catalogStats?.outOfStock ?? 0}
        loading={!catalogStats && !errors.catalog}
      />
    </div>
  );
}
