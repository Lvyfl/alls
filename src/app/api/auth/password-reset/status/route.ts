import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.toLowerCase()?.trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return NextResponse.json({
        success: true,
        data: { status: "none", bypassApproved: false },
      });
    }

    const latestRequest = await db
      .collection("password_reset_requests")
      .find({ userId: user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    const request = latestRequest[0];
    const bypassApproved =
      user.passwordBypassApproved === true &&
      user.passwordBypassExpiresAt &&
      new Date(user.passwordBypassExpiresAt) > new Date();

    let status: string = "none";
    if (request) {
      status = request.status;
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        bypassApproved,
        bypassExpiresAt: user.passwordBypassExpiresAt || null,
      },
    });
  } catch (error) {
    console.error("Error checking password reset status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check request status" },
      { status: 500 }
    );
  }
}

