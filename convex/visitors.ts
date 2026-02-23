import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Heartbeat: update or create visitor presence
export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    city: v.string(),
    region: v.string(),
    country: v.string(),
    countryCode: v.string(),
    lat: v.number(),
    lon: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activeVisitors")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
        city: args.city,
        region: args.region,
        country: args.country,
        countryCode: args.countryCode,
        lat: args.lat,
        lon: args.lon,
      });
    } else {
      await ctx.db.insert("activeVisitors", {
        ...args,
        lastSeen: Date.now(),
      });
    }
    return null;
  },
});

// Get all active visitors (seen in last 30 seconds)
export const getActive = query({
  args: {},
  returns: v.array(
    v.object({
      sessionId: v.string(),
      city: v.string(),
      region: v.string(),
      country: v.string(),
      countryCode: v.string(),
      lat: v.number(),
      lon: v.number(),
      lastSeen: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const cutoff = Date.now() - 30_000; // 30 seconds
    const all = await ctx.db.query("activeVisitors").collect();
    return all
      .filter((v) => v.lastSeen > cutoff)
      .map(({ sessionId, city, region, country, countryCode, lat, lon, lastSeen }) => ({
        sessionId,
        city,
        region,
        country,
        countryCode,
        lat,
        lon,
        lastSeen,
      }));
  },
});

// Cleanup: remove stale visitors (called periodically)
export const cleanup = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - 60_000; // 1 minute
    const stale = await ctx.db.query("activeVisitors").collect();
    for (const visitor of stale) {
      if (visitor.lastSeen < cutoff) {
        await ctx.db.delete(visitor._id);
      }
    }
    return null;
  },
});
