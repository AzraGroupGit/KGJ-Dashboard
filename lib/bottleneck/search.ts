import type { BottleneckItem, StageBottleneck } from "@/types/bottleneck";

function matchesBottleneckItem(item: BottleneckItem, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  if (!normalizedQuery) return true;
  return [
    item.order_number,
    item.customer_name,
    item.product_name,
    item.proses_produksi,
    item.proses_produksi_label,
  ].some((value) => value?.toLocaleLowerCase("id-ID").includes(normalizedQuery));
}

function isApprovalStage(stage: StageBottleneck): boolean {
  return stage.stage_group === "approval" || stage.stage.startsWith("approval_");
}

export function filterBottleneckStages(
  stages: StageBottleneck[],
  query: string,
): StageBottleneck[] {
  if (!query.trim()) return stages;

  return stages.flatMap((stage) => {
    const approval = isApprovalStage(stage);
    const matches = (approval ? stage.orders : stage.bottlenecks)
      .filter((item) => matchesBottleneckItem(item, query));
    if (matches.length === 0) return [];

    return [{
      ...stage,
      order_count: matches.length,
      orders: approval ? matches : stage.orders,
      bottlenecks: approval ? stage.bottlenecks : matches,
    }];
  });
}
