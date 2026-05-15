// components/pdf/OrderFormPDF.tsx

"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CsOrder } from "@/types/cs-orders";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtRupiah(n: number | null): string {
  if (n == null || n === 0) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1f2937",
    padding: 20,
    backgroundColor: "#ffffff",
  },

  // ── Header bar ──
  headerBar: {
    backgroundColor: "#111827",
    paddingVertical: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1.2,
  },

  // ── Info row (4 columns) ──
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    paddingBottom: 7,
    marginBottom: 8,
  },
  infoCell: {
    flex: 1,
    paddingRight: 10,
  },
  infoCellBordered: {
    flex: 1,
    paddingRight: 10,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
  },
  infoCellLast: {
    flex: 1,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
  },
  infoLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  infoValue: {
    fontSize: 8.5,
    color: "#111827",
    marginTop: 1,
    marginBottom: 5,
  },
  infoBoldValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 1,
    marginBottom: 5,
  },
  infoBlank: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#9ca3af",
    height: 14,
    marginBottom: 5,
  },

  // ── Main 2-column body ──
  bodyRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  photoCol: {
    flex: 58,
    paddingRight: 8,
  },
  specCol: {
    flex: 42,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
    paddingLeft: 8,
  },

  // ── Photos (side by side) ──
  photoRow: {
    flexDirection: "row",
  },
  photoCard: {
    flex: 1,
  },
  photoCardRight: {
    flex: 1,
    marginLeft: 4,
  },
  photoBadge: {
    backgroundColor: "#1f2937",
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignItems: "center",
    marginBottom: 2,
  },
  photoBadgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  photoImg: {
    width: "100%",
    height: 148,
  },
  photoPlaceholder: {
    height: 148,
    backgroundColor: "#f3f4f6",
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    fontSize: 7,
    color: "#9ca3af",
  },

  // ── Spec column items ──
  specBlock: {
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  specBlockLast: {
    marginBottom: 6,
  },
  specBlockTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 2,
  },
  specLine: {
    flexDirection: "row",
    marginBottom: 1,
  },
  specKey: {
    fontSize: 7.5,
    color: "#6b7280",
    width: 38,
  },
  specVal: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    flex: 1,
  },
  specBlankVal: {
    flex: 1,
    borderBottomWidth: 0.75,
    borderBottomColor: "#9ca3af",
    height: 11,
  },
  specSingleLine: {
    flexDirection: "row",
  },
  specSingleLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  specSingleValue: {
    fontSize: 8,
    color: "#111827",
  },
  specFullBlank: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#9ca3af",
    height: 14,
    marginTop: 2,
    marginBottom: 4,
  },
  hargaBox: {
    backgroundColor: "#fef3c7",
    borderWidth: 0.5,
    borderColor: "#fcd34d",
    borderRadius: 2,
    padding: 4,
    marginTop: 4,
  },
  hargaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 2,
  },
  hargaText: {
    fontSize: 7.5,
    color: "#78350f",
  },

  // ── Engraving strip ──
  engravingStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#9ca3af",
    borderBottomColor: "#9ca3af",
    marginBottom: 6,
  },
  engravingCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  engravingCellRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#9ca3af",
  },
  engravingLabel: {
    fontSize: 8,
    color: "#6b7280",
    width: 30,
  },
  engravingText: {
    fontSize: 18,
    fontFamily: "Helvetica-Oblique",
    color: "#111827",
    flex: 1,
  },

  // ── Keterangan table ──
  ketRow: {
    flexDirection: "row",
  },
  ketCol: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#9ca3af",
  },
  ketColRight: {
    flex: 1,
    borderTopWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: "#9ca3af",
    borderRightColor: "#9ca3af",
    borderBottomColor: "#9ca3af",
  },
  ketHeader: {
    backgroundColor: "#111827",
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  ketHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  ketItem: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  ketBullet: {
    fontSize: 8.5,
    color: "#374151",
    marginRight: 5,
    lineHeight: 1.3,
  },
  ketText: {
    fontSize: 8,
    color: "#111827",
    flex: 1,
    lineHeight: 1.3,
  },
  ketEmpty: {
    padding: 8,
  },
  ketEmptyText: {
    fontSize: 8,
    color: "#9ca3af",
    fontStyle: "italic",
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 14,
    left: 20,
    right: 20,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 6.5,
    color: "#9ca3af",
  },
});

// ── Main PDF component ─────────────────────────────────────────────────────

export function OrderFormPDF({ order }: { order: CsOrder }) {
  const priaBersih = (order.keterangan_pria ?? []).filter(Boolean);
  const wanitaBersih = (order.keterangan_wanita ?? []).filter(Boolean);

  const generatedAt = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document title={`Form Tukang — ${order.order_number}`}>
      <Page size="A4" style={s.page}>
        {/* ── Header bar ── */}
        <View style={s.headerBar}>
          <Text style={s.headerText}>
            PT KOTAGEDE JEWELLERY GROUP - FORM TUKANG
          </Text>
        </View>

        {/* ── Info row (4 columns) ── */}
        <View style={s.infoRow}>
          {/* Col 1: Order ID + Kategori */}
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Order ID</Text>
            <Text style={s.infoBoldValue}>{order.order_number}</Text>
            <Text style={s.infoLabel}>Kategori</Text>
            <View style={s.infoBlank} />
          </View>
          {/* Col 2: Tukang + Nama */}
          <View style={s.infoCellBordered}>
            <Text style={s.infoLabel}>Tukang</Text>
            <View style={s.infoBlank} />
            <Text style={s.infoLabel}>Nama</Text>
            <Text style={s.infoBoldValue}>{order.customer_name}</Text>
          </View>
          {/* Col 3: Opr Micro + Tgl Pesan */}
          <View style={s.infoCellBordered}>
            <Text style={s.infoLabel}>Opr Micro</Text>
            <View style={s.infoBlank} />
            <Text style={s.infoLabel}>Tgl Pesan</Text>
            <Text style={s.infoBoldValue}>
              {fmtDate(order.tgl_order || order.tgl_chat)}
            </Text>
          </View>
          {/* Col 4: Opr Finishing + Deadline */}
          <View style={s.infoCellLast}>
            <Text style={s.infoLabel}>Opr Finishing</Text>
            <View style={s.infoBlank} />
            <Text style={s.infoLabel}>Deadline</Text>
            <Text style={s.infoBoldValue}>{fmtDate(order.deadline)}</Text>
          </View>
        </View>

        {/* ── Main body: Photos (left) + Specs (right) ── */}
        <View style={s.bodyRow}>
          {/* Left: ring photos side-by-side */}
          <View style={s.photoCol}>
            <View style={s.photoRow}>
              {/* Pria */}
              <View style={s.photoCard}>
                <View style={s.photoBadge}>
                  <Text style={s.photoBadgeText}>COWO</Text>
                </View>
                {order.reference_image_pria_url ? (
                  <Image
                    style={s.photoImg}
                    src={`${order.reference_image_pria_url}?t=${Date.now()}`}
                  />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Text style={s.photoPlaceholderText}>
                      Foto belum diunggah
                    </Text>
                  </View>
                )}
              </View>
              {/* Wanita */}
              <View style={s.photoCardRight}>
                <View style={s.photoBadge}>
                  <Text style={s.photoBadgeText}>CEWE</Text>
                </View>
                {order.reference_image_wanita_url ? (
                  <Image
                    style={s.photoImg}
                    src={`${order.reference_image_wanita_url}?t=${Date.now()}`}
                  />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Text style={s.photoPlaceholderText}>
                      Foto belum diunggah
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Right: spec list */}
          <View style={s.specCol}>
            <View style={s.specBlock}>
              <Text style={s.specBlockTitle}>Ukuran</Text>
              <View style={s.specLine}>
                <Text style={s.specKey}>Pria :</Text>
                <Text style={s.specVal}>{order.ukuran_pria || "—"}</Text>
              </View>
              <View style={s.specLine}>
                <Text style={s.specKey}>Wanita:</Text>
                <Text style={s.specVal}>{order.ukuran_wanita || "—"}</Text>
              </View>
            </View>

            <View style={s.specBlock}>
              <Text style={s.specBlockTitle}>Jenis Bahan</Text>
              <View style={s.specLine}>
                <Text style={s.specKey}>Pria :</Text>
                <Text style={s.specVal}>{order.jenis_cincin_pria || "—"}</Text>
              </View>
              <View style={s.specLine}>
                <Text style={s.specKey}>Wanita:</Text>
                <Text style={s.specVal}>
                  {order.jenis_cincin_wanita || "—"}
                </Text>
              </View>
            </View>

            <View style={s.specBlock}>
              <Text style={s.specBlockTitle}>Ukiran</Text>
              <View style={s.specLine}>
                <Text style={s.specKey}>Pria :</Text>
                <Text style={s.specVal}>{order.ukiran_pria || "—"}</Text>
              </View>
              <View style={s.specLine}>
                <Text style={s.specKey}>Wanita:</Text>
                <Text style={s.specVal}>{order.ukiran_wanita || "—"}</Text>
              </View>
            </View>

            <View style={s.specBlock}>
              <Text style={s.specBlockTitle}>Estimasi Gramasi</Text>
              <View style={s.specLine}>
                <Text style={s.specKey}>Pria :</Text>
                <View style={s.specBlankVal} />
              </View>
              <View style={s.specLine}>
                <Text style={s.specKey}>Wanita:</Text>
                <View style={s.specBlankVal} />
              </View>
            </View>

            <View style={s.specBlock}>
              <Text style={s.specBlockTitle}>Font Grafir</Text>
              <View style={s.specLine}>
                <Text style={s.specKey}>Pria :</Text>
                <Text style={s.specVal}>{order.font || "—"}</Text>
              </View>
              <View style={s.specLine}>
                <Text style={s.specKey}>Wanita:</Text>
                <Text style={s.specVal}>{order.font || "—"}</Text>
              </View>
            </View>

            <View style={s.specBlock}>
              <View style={s.specSingleLine}>
                <Text style={s.specSingleLabel}>Box : </Text>
                <Text style={s.specSingleValue}>{order.box || "—"}</Text>
              </View>
            </View>

            <View style={s.specBlock}>
              <Text style={s.specBlockTitle}>
                Diinput Oleh : {order.users?.full_name ?? "—"}
              </Text>
              <View style={s.specFullBlank} />
              <Text style={s.specBlockTitle}>
                Closing by : {order.users?.full_name ?? "—"}
              </Text>
              <View style={s.specFullBlank} />
            </View>

            <View style={s.hargaBox}>
              <Text style={s.hargaLabel}>Harga & DP :</Text>
              <Text style={s.hargaText}>
                {fmtRupiah(order.harga)} / DP {fmtRupiah(order.dp_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Engraving strip ── */}
        <View style={s.engravingStrip}>
          <View style={s.engravingCell}>
            <Text style={s.engravingLabel}>Pria</Text>
            <Text style={s.engravingText}>{order.ukiran_pria || "—"}</Text>
          </View>
          <View style={s.engravingCellRight}>
            <Text style={s.engravingLabel}>Wanita</Text>
            <Text style={s.engravingText}>{order.ukiran_wanita || "—"}</Text>
          </View>
        </View>

        {/* ── Keterangan table ── */}
        <View style={s.ketRow}>
          {/* Pria */}
          <View style={s.ketCol}>
            <View style={s.ketHeader}>
              <Text style={s.ketHeaderText}>Keterangan Cincin Pria</Text>
            </View>
            {priaBersih.length > 0 ? (
              priaBersih.map((k, i) => (
                <View key={i} style={s.ketItem}>
                  <Text style={s.ketBullet}>•</Text>
                  <Text style={s.ketText}>{k}</Text>
                </View>
              ))
            ) : (
              <View style={s.ketEmpty}>
                <Text style={s.ketEmptyText}>Tidak ada keterangan</Text>
              </View>
            )}
          </View>
          {/* Wanita */}
          <View style={s.ketColRight}>
            <View style={s.ketHeader}>
              <Text style={s.ketHeaderText}>Keterangan Cincin Wanita</Text>
            </View>
            {wanitaBersih.length > 0 ? (
              wanitaBersih.map((k, i) => (
                <View key={i} style={s.ketItem}>
                  <Text style={s.ketBullet}>•</Text>
                  <Text style={s.ketText}>{k}</Text>
                </View>
              ))
            ) : (
              <View style={s.ketEmpty}>
                <Text style={s.ketEmptyText}>Tidak ada keterangan</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Footer (pinned) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            PT Kotagede Jewellery Group · Form Tukang
          </Text>
          <Text style={s.footerText}>Dicetak: {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
