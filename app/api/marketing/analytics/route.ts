// app/api/marketing/analytics/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/marketing/analytics
 * Query params: from, to (YYYY-MM-DD)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase.from("marketing_inputs").select("*");

    if (profile.role !== "superadmin") {
      query = query.eq("user_id", profile.id);
    }

    if (from) query = query.gte("input_date", from);
    if (to) query = query.lte("input_date", to);

    const { data: inputs, error } = await query;

    if (error) {
      console.error("[GET /api/marketing/analytics]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data analitik" },
        { status: 500 },
      );
    }

    if (!inputs || inputs.length === 0) {
      return NextResponse.json({
        data: {
          summary: {
            totalOmset: 0,
            totalBiayaMarketing: 0,
            totalLeadSerius: 0,
            totalLeadAll: 0,
            totalClosing: 0,
            grossProfit: 0,
            roi: 0,
            crSerius: 0,
            crAll: 0,
            cpls: 0,
            cpla: 0,
            cac: 0,
            basketSize: 0,
            bmPerOmset: 0,
            gpPerBm: 0,
            totalInputs: 0,
          },
          channelMetrics: [],
          recommendations: [],
        },
      });
    }

    // Calculate summary metrics
    const totalOmset = inputs.reduce((sum, item) => sum + (item.omset || 0), 0);
    const totalBiayaMarketing = inputs.reduce(
      (sum, item) => sum + (item.biaya_marketing || 0),
      0,
    );
    const totalLeadSerius = inputs.reduce(
      (sum, item) => sum + (item.lead_serius || 0),
      0,
    );
    const totalLeadAll = inputs.reduce(
      (sum, item) => sum + (item.lead_all || 0),
      0,
    );
    const totalClosing = inputs.reduce(
      (sum, item) => sum + (item.closing || 0),
      0,
    );

    const grossProfit = totalOmset * 0.5; // Assuming 50% margin
    const roi =
      totalBiayaMarketing > 0
        ? ((grossProfit - totalBiayaMarketing) / totalBiayaMarketing) * 100
        : 0;
    const crSerius =
      totalLeadSerius > 0 ? (totalClosing / totalLeadSerius) * 100 : 0;
    const crAll = totalLeadAll > 0 ? (totalClosing / totalLeadAll) * 100 : 0;
    const cpls =
      totalLeadSerius > 0 ? totalBiayaMarketing / totalLeadSerius : 0;
    const cpla = totalLeadAll > 0 ? totalBiayaMarketing / totalLeadAll : 0;
    const cac = totalClosing > 0 ? totalBiayaMarketing / totalClosing : 0;
    const basketSize = totalClosing > 0 ? totalOmset / totalClosing : 0;
    const bmPerOmset =
      totalOmset > 0 ? (totalBiayaMarketing / totalOmset) * 100 : 0;
    const gpPerBm =
      totalBiayaMarketing > 0 ? grossProfit / totalBiayaMarketing : 0;

    // Calculate channel performance
    const channelMap = new Map();

    inputs.forEach((item) => {
      if (!channelMap.has(item.channel)) {
        channelMap.set(item.channel, {
          channel: item.channel,
          omset: 0,
          biayaMarketing: 0,
          leadSerius: 0,
          leadAll: 0,
          closing: 0,
          count: 0,
        });
      }

      const channel = channelMap.get(item.channel);
      channel.omset += item.omset || 0;
      channel.biayaMarketing += item.biaya_marketing || 0;
      channel.leadSerius += item.lead_serius || 0;
      channel.leadAll += item.lead_all || 0;
      channel.closing += item.closing || 0;
      channel.count++;
    });

    const channelMetrics = Array.from(channelMap.values()).map((channel) => {
      const gp = channel.omset * 0.5;
      const channelRoi =
        channel.biayaMarketing > 0
          ? ((gp - channel.biayaMarketing) / channel.biayaMarketing) * 100
          : 0;
      const channelCr =
        channel.leadSerius > 0
          ? (channel.closing / channel.leadSerius) * 100
          : 0;
      const channelCac =
        channel.closing > 0 ? channel.biayaMarketing / channel.closing : 0;

      return {
        ...channel,
        roi: channelRoi,
        crSerius: channelCr,
        cac: channelCac,
        gp,
        gpPerBm: channel.biayaMarketing > 0 ? gp / channel.biayaMarketing : 0,
      };
    });

    // Sort by ROI
    channelMetrics.sort((a, b) => b.roi - a.roi);

    // Generate recommendations
    const recommendations = [];

    if (channelMetrics.length > 0 && channelMetrics[0].roi > 50) {
      recommendations.push({
        type: "increase",
        channel: channelMetrics[0].channel,
        reason: `ROI tertinggi (${channelMetrics[0].roi.toFixed(1)}%)`,
        action: "Tingkatkan budget untuk channel ini",
      });
    }

    const worstChannel = channelMetrics[channelMetrics.length - 1];
    if (worstChannel && worstChannel.roi < 0) {
      recommendations.push({
        type: "decrease",
        channel: worstChannel.channel,
        reason: `ROI negatif (${worstChannel.roi.toFixed(1)}%)`,
        action: "Kurangi atau hentikan budget",
      });
    }

    if (bmPerOmset > 30) {
      recommendations.push({
        type: "warning",
        channel: "Overall",
        reason: `Rasio marketing terhadap omzet ${bmPerOmset.toFixed(1)}% (target <30%)`,
        action: "Optimasi efisiensi biaya marketing",
      });
    }

    const lowCrChannels = channelMetrics.filter(
      (c) => c.crSerius < 15 && c.closing > 0,
    );
    if (lowCrChannels.length > 0) {
      recommendations.push({
        type: "improve",
        channel: lowCrChannels.map((c) => c.channel).join(", "),
        reason: "Conversion rate rendah (<15%)",
        action: "Perbaiki kualitas lead atau proses follow-up",
      });
    }

    return NextResponse.json({
      data: {
        summary: {
          totalOmset,
          totalBiayaMarketing,
          totalLeadSerius,
          totalLeadAll,
          totalClosing,
          grossProfit,
          roi,
          crSerius,
          crAll,
          cpls,
          cpla,
          cac,
          basketSize,
          bmPerOmset,
          gpPerBm,
          totalInputs: inputs.length,
        },
        channelMetrics,
        recommendations,
      },
    });
  } catch (error) {
    console.error("[GET /api/marketing/analytics] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
