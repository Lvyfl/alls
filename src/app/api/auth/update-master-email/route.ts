import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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
    const newEmail = body?.newEmail?.toLowerCase()?.trim();

    const isAuthorized = await validateAuthKey(authKey);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!newEmail) {
      return NextResponse.json(
        { success: false, error: "New email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");

    // Find the master admin user
    const masterAdmin = await db.collection("users").findOne({
      role: "master_admin",
      email: "master@example.com"
    });

    if (!masterAdmin) {
      return NextResponse.json(
        { success: false, error: "Master admin with email 'master@example.com' not found" },
        { status: 404 }
      );
    }

    // Check if new email already exists
    const existingUser = await db.collection("users").findOne({
      email: newEmail,
      _id: { $ne: masterAdmin._id }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already in use by another user" },
        { status: 409 }
      );
    }

    // Update the master admin email
    const result = await db.collection("users").updateOne(
      { _id: masterAdmin._id },
      {
        $set: {
          email: newEmail,
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to update email" },
        { status: 500 }
      );
    }

    // Fetch and return the updated user
    const updatedUser = await db.collection("users").findOne({
      _id: masterAdmin._id
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch updated user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Master admin email updated from 'master@example.com' to '${newEmail}'`,
      data: {
        ...updatedUser,
        _id: updatedUser._id.toString()
      }
    });
  } catch (error) {
    console.error("Error updating master admin email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update master admin email" },
      { status: 500 }
    );
  }
}