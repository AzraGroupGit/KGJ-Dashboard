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
            totalBiayaMarketing: 0,
            totalLeadSerius: 0,
            totalLeadAll: 0,
            totalClosing: 0,
            roi: 0,
            crSerius: 0,
            crAll: 0,
            cpls: 0,
            cpla: 0,
            cac: 0,
            totalInputs: 0,
          },
          channelMetrics: [],
          recommendations: [],
        },
      });
    }

    // Calculate summary metrics
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

    const crSerius =
      totalLeadSerius > 0 ? (totalClosing / totalLeadSerius) * 100 : 0;
    const crAll = totalLeadAll > 0 ? (totalClosing / totalLeadAll) * 100 : 0;
    const cpls =
      totalLeadSerius > 0 ? totalBiayaMarketing / totalLeadSerius : 0;
    const cpla = totalLeadAll > 0 ? totalBiayaMarketing / totalLeadAll : 0;
    const cac = totalClosing > 0 ? totalBiayaMarketing / totalClosing : 0;

    // Calculate channel performance
    const channelMap = new Map();

    inputs.forEach((item) => {
      if (!channelMap.has(item.channel)) {
        channelMap.set(item.channel, {
          channel: item.channel,
          biayaMarketing: 0,
          leadSerius: 0,
          leadAll: 0,
          closing: 0,
          count: 0,
        });
      }

      const channel = channelMap.get(item.channel);
      channel.biayaMarketing += item.biaya_marketing || 0;
      channel.leadSerius += item.lead_serius || 0;
      channel.leadAll += item.lead_all || 0;
      channel.closing += item.closing || 0;
      channel.count++;

    });

    const channelMetrics = Array.from(channelMap.values()).map((channel) => {
      const channelCr =
        channel.leadSerius > 0
          ? (channel.closing / channel.leadSerius) * 100
          : 0;
      const channelCac =
        channel.closing > 0 ? channel.biayaMarketing / channel.closing : 0;

      return {
        ...channel,
        roi: 0,
        crSerius: channelCr,
        cac: channelCac,
      };
    });

    // Generate recommendations
    const recommendations = [];

    const lowCrChannels = channelMetrics.filter(
      (c) => c.crSerius < 15 && c.closing > 0,
    );
    if (lowCrChannels.length > 0) {
      recommendations.push({
        type: "improve",
        channel: lowCrChannels.map((c: { channel: string }) => c.channel).join(", "),
        reason: "Conversion rate rendah (<15%)",
        action: "Perbaiki kualitas lead atau proses follow-up",
      });
    }

    return NextResponse.json({
      data: {
        summary: {
          totalBiayaMarketing,
          totalLeadSerius,
          totalLeadAll,
          totalClosing,
          roi: 0,
          crSerius,
          crAll,
          cpls,
          cpla,
          cac,
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
