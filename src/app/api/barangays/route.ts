import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const barangays = await db.collection("barangays")
      .find({})
      .sort({ name: 1 }) // Sort by name for consistent ordering
      .toArray();
    
    // Add cache headers for better performance (barangays rarely change)
    return NextResponse.json(barangays, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Failed to fetch barangays" }, { status: 500 });
  }
}
