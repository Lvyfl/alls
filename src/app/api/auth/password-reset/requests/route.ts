import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const AUTH_HASH = "$2b$10$hPyu2aRgaW3/MkCADGuNHOtjvo/6uJSDS5YJgwcfUJuZ379gSRwYi";

async function validateAuthKey(authKey?: string) {
  if (!authKey) return false;
  try {
    return bcrypt.compareSync(authKey, AUTH_HASH);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authKey = body?.authKey;

    const isAuthorized = await validateAuthKey(authKey);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");

    const requests = await db
      .collection("password_reset_requests")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const userIds = [...new Set(requests.map((req) => req.userId))];
    const users = await db
      .collection("users")
      .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const usersById = new Map(
      users.map((user) => [user._id.toString(), user])
    );

    const response = requests.map((request) => ({
      ...request,
      userName: usersById.get(request.userId)?.name || request.email,
      assignedBarangayId: usersById.get(request.userId)?.assignedBarangayId,
    }));

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching password reset requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch password reset requests" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const authKey = body?.authKey;
    const requestId = body?.requestId;
    const action = body?.action;
    const resolvedBy = body?.resolvedBy || "Master Admin";

    const isAuthorized = await validateAuthKey(authKey);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!requestId || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");

    const request = await db
      .collection("password_reset_requests")
      .findOne({ _id: new ObjectId(requestId) });

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Request already processed" },
        { status: 400 }
      );
    }

    const now = new Date();
    const updates: any = {
      status: action === "accept" ? "accepted" : "rejected",
      resolvedAt: now.toISOString(),
      resolvedBy,
      updatedAt: now.toISOString(),
    };

    await db
      .collection("password_reset_requests")
      .updateOne({ _id: new ObjectId(requestId) }, { $set: updates });

    if (action === "accept") {
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      await db.collection("users").updateOne(
        { _id: new ObjectId(request.userId) },
        {
          $set: {
            passwordBypassApproved: true,
            passwordBypassExpiresAt: expiresAt,
          },
        }
      );
    } else {
      await db.collection("users").updateOne(
        { _id: new ObjectId(request.userId) },
        {
          $set: {
            passwordBypassApproved: false,
            passwordBypassExpiresAt: null,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...request,
        ...updates,
      },
    });
  } catch (error) {
    console.error("Error updating password reset request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 }
    );
  }
}

