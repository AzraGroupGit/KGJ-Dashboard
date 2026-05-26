// components/pdf/OrderFormPDF.tsx

"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { CsOrder } from "@/types/cs-orders";

// ── Register fonts for engraving ──────────────────────────────────────────

const FONT_SRC: Record<string, string> = {
  "Alex Brush": "/fonts/AlexBrush.ttf",
  "Brush Script": "/fonts/BrushScript.ttf",
  "Faradisa Script": "/fonts/FaradisaScript.ttf",
  "Kingsman Demo": "/fonts/KingsmanDemo.ttf",
  Pristina: "/fonts/Pristina.TTF",
  "Palatino Linotype": "/fonts/PalatinoLinotype.ttf",
  Gabriola: "/fonts/Gabriola.ttf",
  Constantia: "/fonts/Constantia.ttf",
};

Object.entries(FONT_SRC).forEach(([name, src]) => {
  Font.register({ family: name, src });
});

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: "#1f2937",
    padding: 14,
    paddingBottom: 26,
    backgroundColor: "#ffffff",
  },

  // ── Header ──
  headerBar: {
    backgroundColor: "#111827",
    paddingVertical: 5,
    alignItems: "center",
    marginBottom: 5,
  },
  headerText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1,
  },

  // ── Info row ──
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    paddingBottom: 4,
    marginBottom: 5,
  },
  infoCell: { flex: 1, paddingRight: 6 },
  infoCellBordered: {
    flex: 1,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
  },
  infoCellLast: {
    flex: 1,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
  },
  infoLabel: { fontSize: 5.5, fontFamily: "Helvetica-Bold", color: "#374151" },
  infoBoldValue: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 1,
    marginBottom: 3,
  },
  infoBlank: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#9ca3af",
    height: 11,
    marginBottom: 3,
  },

  // ── Main 2-column body ──
  bodyRow: { flexDirection: "row", marginBottom: 5 },
  photoCol: { flex: 65, paddingRight: 6 },
  specCol: {
    flex: 35,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
    paddingLeft: 6,
  },

  // ── Photos ──
  photoRow: { flexDirection: "row" },
  photoCard: { flex: 1 },
  photoCardRight: { flex: 1, marginLeft: 3 },
  photoBadge: {
    backgroundColor: "#1f2937",
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    alignItems: "center",
    marginBottom: 2,
  },
  photoBadgeText: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  photoImg: { width: "100%", height: 110 },
  photoPlaceholder: {
    height: 110,
    backgroundColor: "#f3f4f6",
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: { fontSize: 5.5, color: "#9ca3af" },

  // ── Spec column ──
  specBlock: {
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  specBlockFlat: {
    marginBottom: 4,
    paddingBottom: 3,
  },
  specBlockTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 1.5,
  },
  specLine: { flexDirection: "row", marginBottom: 1.5 },
  specKey: { fontSize: 6, color: "#6b7280", width: 32 },
  specVal: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    flex: 1,
  },
  specSingleLine: { flexDirection: "row" },
  specSingleLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  specSingleValue: { fontSize: 6.5, color: "#111827" },
  specFullBlank: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#9ca3af",
    height: 10,
    marginTop: 1,
    marginBottom: 3,
  },

  // ── Keterangan Tambahan (pink box) ──
  ketTambahan: {
    backgroundColor: "#fdf2f8",
    borderWidth: 0.5,
    borderColor: "#f9a8d4",
    borderRadius: 2,
    padding: 3,
    marginTop: 3,
  },
  ketTambahanLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: "#9d174d",
    marginBottom: 1.5,
  },
  ketTambahanText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#831843",
  },

  // ── Engraving strip ──
  engravingStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#9ca3af",
    borderBottomColor: "#9ca3af",
    marginBottom: 5,
  },
  engravingCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  engravingCellRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: "#9ca3af",
  },
  engravingLabel: { fontSize: 6.5, color: "#6b7280", width: 24 },
  engravingText: {
    fontSize: 14,
    fontFamily: "Helvetica-Oblique",
    color: "#111827",
    flex: 1,
  },

  // ── Bottom Keterangan Cincin table ──
  ketTableRow: { flexDirection: "row" },
  ketColLeft: { flex: 1, borderWidth: 0.5, borderColor: "#9ca3af" },
  ketColRight: {
    flex: 1,
    borderTopWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: "#9ca3af",
    borderRightColor: "#9ca3af",
    borderBottomColor: "#9ca3af",
  },
  ketTableHeader: {
    backgroundColor: "#111827",
    paddingVertical: 3,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  ketTableHeaderText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  ketRowOrange: {
    backgroundColor: "#fed7aa",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  ketRowBlue: {
    backgroundColor: "#dbeafe",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  ketRowYellow: {
    backgroundColor: "#fef9c3",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  ketRowGreen: {
    backgroundColor: "#dcfce7",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  ketRowPlain: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  ketRowText: { fontSize: 6.5, color: "#111827" },
  ketBulletsArea: {
    paddingHorizontal: 4,
    paddingTop: 3,
    paddingBottom: 2,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  ketBulletOrange: {
    backgroundColor: "#fed7aa",
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginBottom: 1,
  },
  ketBulletYellow: {
    backgroundColor: "#fef9c3",
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginBottom: 1,
  },
  ketBulletGreen: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginBottom: 1,
  },
  ketBulletBlue: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginBottom: 1,
  },
  ketBulletText: { fontSize: 6.5, color: "#111827" },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 5.5, color: "#9ca3af" },
});

// ── Main PDF component ─────────────────────────────────────────────────────

export function OrderFormPDF({ order }: { order: CsOrder }) {
  const generatedAt = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const modelPria = order.model_bentuk_pria ?? [];
  const microPria = order.microsetting_pria ?? [];
  const laserPria = order.detail_laser_pria ?? [];
  const finishPria = order.detail_finishing_pria ?? [];

  const modelWanita = order.model_bentuk_wanita ?? [];
  const microWanita = order.microsetting_wanita ?? [];
  const laserWanita = order.detail_laser_wanita ?? [];
  const finishWanita = order.detail_finishing_wanita ?? [];

  const engravingFont = order.font && FONT_SRC[order.font] ? order.font : "Helvetica-Oblique";

  return (
    <Document title={`Form Tukang — ${order.order_number}`}>
      <Page size="A5" orientation="landscape" style={s.page}>
        {/* ── Header ── */}
        <View style={s.headerBar}>
          <Text style={s.headerText}>
            PT KOTAGEDE JEWELLERY GROUP - FORM TUKANG
          </Text>
        </View>

        {/* ── Info row ── */}
        <View style={s.infoRow}>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Order ID</Text>
            <Text style={s.infoBoldValue}>{order.order_number}</Text>
            <Text style={s.infoLabel}>Kategori</Text>
            <Text style={s.infoBoldValue}>
              {(order.kategori ?? "—").toUpperCase()}
            </Text>
          </View>
          <View style={s.infoCellBordered}>
            <Text style={s.infoLabel}>Tukang</Text>
            <View style={s.infoBlank} />
            <Text style={s.infoLabel}>Nama</Text>
            <Text style={s.infoBoldValue}>{order.customer_name}</Text>
          </View>
          <View style={s.infoCellBordered}>
            <Text style={s.infoLabel}>Opr Micro</Text>
            <View style={s.infoBlank} />
            <Text style={s.infoLabel}>Tgl Pesan</Text>
            <Text style={s.infoBoldValue}>
              {fmtDate(order.tgl_order || order.tgl_chat)}
            </Text>
          </View>
          <View style={s.infoCellLast}>
            <Text style={s.infoLabel}>Opr Finishing</Text>
            <View style={s.infoBlank} />
            <Text style={s.infoLabel}>Deadline</Text>
            <Text style={s.infoBoldValue}>{fmtDate(order.deadline)}</Text>
          </View>
        </View>

        {/* ── Body: Left (photos + engraving + ket) | Right (specs) ── */}
        <View style={s.bodyRow}>
          {/* Left column: photos + engraving + ket */}
          <View style={s.photoCol}>
            <View style={s.photoRow}>
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

            <View style={{ flex: 1 }} />

            {/* ── Engraving strip (inside left column) ── */}
            <View style={s.engravingStrip}>
              <View style={s.engravingCell}>
                <Text style={s.engravingLabel}>Pria</Text>
                <Text style={[s.engravingText, { fontFamily: engravingFont }]}>{order.ukiran_pria || "—"}</Text>
              </View>
              <View style={s.engravingCellRight}>
                <Text style={s.engravingLabel}>Wanita</Text>
                <Text style={[s.engravingText, { fontFamily: engravingFont }]}>{order.ukiran_wanita || "—"}</Text>
              </View>
            </View>

            {/* ── Keterangan Cincin table (inside left column) ── */}
            <View style={s.ketTableRow}>
              {/* Pria column */}
              <View style={s.ketColLeft}>
                <View style={s.ketTableHeader}>
                  <Text style={s.ketTableHeaderText}>Keterangan Cincin Pria</Text>
                </View>
                <View style={s.ketRowOrange}>
                  <Text style={s.ketRowText}>
                    Model / Bentuk : {modelPria[0] ?? "—"}
                  </Text>
                </View>
                <View style={s.ketRowYellow}>
                  <Text style={s.ketRowText}>
                    Microsetting : {microPria[0] ?? "—"}
                  </Text>
                </View>
                <View style={s.ketRowGreen}>
                  <Text style={s.ketRowText}>Laser : {laserPria[0] ?? "—"}</Text>
                </View>
                <View style={s.ketRowBlue}>
                  <Text style={s.ketRowText}>
                    Finishing : {finishPria[0] ?? "—"}
                  </Text>
                </View>
                <View style={s.ketBulletsArea}>
                  {modelPria.slice(1).map((v, i) => (
                    <View key={`mbp-${i}`} style={s.ketBulletOrange}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                  {microPria.slice(1).map((v, i) => (
                    <View key={`msp-${i}`} style={s.ketBulletYellow}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                  {laserPria.slice(1).map((v, i) => (
                    <View key={`dlp-${i}`} style={s.ketBulletGreen}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                  {finishPria.slice(1).map((v, i) => (
                    <View key={`dfp-${i}`} style={s.ketBulletBlue}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Wanita column */}
              <View style={s.ketColRight}>
                <View style={s.ketTableHeader}>
                  <Text style={s.ketTableHeaderText}>Keterangan Cincin Wanita</Text>
                </View>
                <View style={s.ketRowOrange}>
                  <Text style={s.ketRowText}>
                    Model / Bentuk : {modelWanita[0] ?? "—"}
                  </Text>
                </View>
                <View style={s.ketRowYellow}>
                  <Text style={s.ketRowText}>
                    Microsetting : {microWanita[0] ?? "—"}
                  </Text>
                </View>
                <View style={s.ketRowGreen}>
                  <Text style={s.ketRowText}>Laser : {laserWanita[0] ?? "—"}</Text>
                </View>
                <View style={s.ketRowBlue}>
                  <Text style={s.ketRowText}>
                    Finishing : {finishWanita[0] ?? "—"}
                  </Text>
                </View>
                <View style={s.ketBulletsArea}>
                  {modelWanita.slice(1).map((v, i) => (
                    <View key={`mbw-${i}`} style={s.ketBulletOrange}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                  {microWanita.slice(1).map((v, i) => (
                    <View key={`msw-${i}`} style={s.ketBulletYellow}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                  {laserWanita.slice(1).map((v, i) => (
                    <View key={`dlw-${i}`} style={s.ketBulletGreen}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                  {finishWanita.slice(1).map((v, i) => (
                    <View key={`dfw-${i}`} style={s.ketBulletBlue}>
                      <Text style={s.ketBulletText}>• {v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Spec column */}
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
                <Text style={s.specVal}>
                  {order.gramasi_pria ? `${order.gramasi_pria}g` : "—"}
                </Text>
              </View>
              <View style={s.specLine}>
                <Text style={s.specKey}>Wanita:</Text>
                <Text style={s.specVal}>
                  {order.gramasi_wanita ? `${order.gramasi_wanita}g` : "—"}
                </Text>
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

            <View style={s.specBlockFlat}>
              <Text style={s.specBlockTitle}>
                Diinput Oleh : {order.users?.full_name ?? "—"}
              </Text>
              <View style={s.specFullBlank} />
              <Text style={s.specBlockTitle}>Closing by : {order.users?.full_name ?? "—"}</Text>
              <View style={s.specFullBlank} />
            </View>

            {order.keterangan_tambahan ? (
              <View style={s.ketTambahan}>
                <Text style={s.ketTambahanLabel}>Keterangan Tambahan :</Text>
                <Text style={s.ketTambahanText}>
                  {order.keterangan_tambahan}
                </Text>
              </View>
            ) : null}
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
