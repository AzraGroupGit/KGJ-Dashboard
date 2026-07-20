"use client";

import { useState } from "react";
import { Check, Link } from "lucide-react";
import type { CsOrder } from "@/types/cs-orders";

export function CopyLinkButton({
  order,
  getFormUrl,
}: {
  order: CsOrder;
  getFormUrl: (o: CsOrder) => string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getFormUrl(order));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={copy}
      title={copied ? "Tersalin!" : "Salin link form"}
      className={`p-1.5 rounded-lg transition-colors ${copied ? "text-emerald-300 bg-emerald-500/10" : "text-white/50 hover:bg-indigo-50 hover:text-indigo-600"}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
    </button>
  );
}
