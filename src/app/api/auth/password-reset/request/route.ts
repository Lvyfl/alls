import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

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
      return NextResponse.json(
        { success: false, error: "No account found for this email" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forgot password requests are only available for regular admins",
        },
        { status: 403 }
      );
    }

    const existingPending = await db.collection("password_reset_requests").findOne({
      userId: user._id.toString(),
      status: "pending",
    });

    if (existingPending) {
      return NextResponse.json({
        success: true,
        message: "A password reset request is already pending approval.",
      });
    }

    const now = new Date().toISOString();

    await db.collection("password_reset_requests").insertOne({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolvedBy: null,
    });

    return NextResponse.json({
      success: true,
      message: "Your request has been sent to the master admin for approval.",
    });
  } catch (error) {
    console.error("Error creating password reset request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit password reset request" },
      { status: 500 }
    );
  }
}

