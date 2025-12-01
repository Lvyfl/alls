import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, profilePicture } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!profilePicture) {
      return NextResponse.json(
        { success: false, error: "Profile picture is required" },
        { status: 400 }
      );
    }

    // Validate that profilePicture is a base64 string
    if (typeof profilePicture !== 'string' || !profilePicture.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: "Invalid image format. Please upload a valid image." },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    let client;
    try {
      client = await clientPromise;
      if (!client) {
        throw new Error("MongoDB client is not initialized");
      }
    } catch (dbError) {
      console.error("MongoDB connection error:", dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Database connection failed. Please check your MongoDB configuration."
        },
        { status: 500 }
      );
    }

    const db = client.db("main");

    // Update user's profile picture
    const result = await db
      .collection("users")
      .updateOne(
        { _id: ObjectId.createFromHexString(userId) },
        { 
          $set: { 
            profilePicture: profilePicture,
            updatedAt: new Date().toISOString()
          } 
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch updated user
    const updatedUser = await db
      .collection("users")
      .findOne({ _id: ObjectId.createFromHexString(userId) });

    // Convert MongoDB _id to string
    if (updatedUser) {
      updatedUser._id = updatedUser._id.toString();
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedUser 
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update profile picture";
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    let client;
    try {
      client = await clientPromise;
      if (!client) {
        throw new Error("MongoDB client is not initialized");
      }
    } catch (dbError) {
      console.error("MongoDB connection error:", dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Database connection failed. Please check your MongoDB configuration."
        },
        { status: 500 }
      );
    }

    const db = client.db("main");

    // Remove profile picture
    const result = await db
      .collection("users")
      .updateOne(
        { _id: ObjectId.createFromHexString(userId) },
        { 
          $unset: { profilePicture: "" },
          $set: { updatedAt: new Date().toISOString() }
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Profile picture removed successfully"
    });
  } catch (error) {
    console.error("Error removing profile picture:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove profile picture";
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

