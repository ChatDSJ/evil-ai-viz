import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  activeVisitors: defineTable({
    sessionId: v.string(),
    city: v.string(),
    region: v.string(),
    country: v.string(),
    countryCode: v.string(),
    lat: v.number(),
    lon: v.number(),
    lastSeen: v.number(), // timestamp
  }).index("by_session", ["sessionId"]),
});

export default schema;
