import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    // Use projection to only fetch needed fields
    const barangays = await db.collection("barangays")
      .find({}, {
        projection: {
          _id: 1,
          name: 1,
          address: 1,
          latitude: 1,
          longitude: 1,
        }
      })
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
