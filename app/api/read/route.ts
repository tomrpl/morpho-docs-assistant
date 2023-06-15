import { NextRequest, NextResponse } from "next/server";
import { PineconeClient } from "@pinecone-database/pinecone";
import { queryPineconeVectorStoreAndQueryLLM } from "../../../utils/utils";
import { indexName } from "../../../config";
import { Ratelimit } from "@upstash/ratelimit";
import redis from "../../../utils/redis";
import { headers } from "next/headers";

// Create a new ratelimiter, that allows 5 requests per 24 hours
const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.fixedWindow(5, "1440 m"),
      analytics: true,
    })
  : undefined;

export async function POST(req: NextRequest) {
  if (ratelimit) {
    const headersList = headers();
    const ipIdentifier = headersList.get("x-real-ip");

    const result = await ratelimit.limit(ipIdentifier ?? "");
    console.log("result =", result);
    if (!result.success) {
      const linksSet = new Set();
      linksSet.add({
        link: "https://docs.morpho.org",
        title: "Morpho Official Docs",
      });
      const links = Array.from(linksSet);
      return new NextResponse(
        JSON.stringify({
          data: "Too many uploads in 1 day. Please try again in a 24 hours. Check the doc below in the meantime",
          links: links,
        })
      );
    }

    const body = await req.json();
    const client = new PineconeClient();
    await client.init({
      apiKey: process.env.PINECONE_API_KEY || "",
      environment: process.env.PINECONE_ENVIRONMENT || "",
    });

    const { answer, links } = await queryPineconeVectorStoreAndQueryLLM(
      client,
      indexName,
      body
    );
    return new NextResponse(
      JSON.stringify({
        data: answer,
        links: links,
      })
    );
  }
}
