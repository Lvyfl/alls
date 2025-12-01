import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();
    const authKey = body?.authKey;

    const isAuthenticated = bcrypt.compareSync(
      authKey,
      "$2b$10$hPyu2aRgaW3/MkCADGuNHOtjvo/6uJSDS5YJgwcfUJuZ379gSRwYi"
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await db.collection("users").find({}).toArray();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();
    const authKey = body?.authKey;

    const isAuthenticated = bcrypt.compareSync(
      authKey,
      "$2b$10$hPyu2aRgaW3/MkCADGuNHOtjvo/6uJSDS5YJgwcfUJuZ379gSRwYi"
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!body?.user?._id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const userId = body.user._id;
    
    // Fetch existing user to get current values
    const existingUser = await db.collection("users").findOne({
      _id: ObjectId.createFromHexString(userId),
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const updateData = { ...body.user };
    delete updateData._id; // Remove the user ID from the update body

    // Reconstruct name field from firstName and lastName
    // Use updated values if provided, otherwise use existing values
    const firstName = updateData.firstName !== undefined ? updateData.firstName : existingUser.firstName || '';
    const lastName = updateData.lastName !== undefined ? updateData.lastName : existingUser.lastName || '';
    updateData.name = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();

    // Add updatedAt timestamp
    updateData.updatedAt = new Date().toISOString();

    // Update the user in the database
    const result = await db
      .collection("users")
      .updateOne(
        { _id: ObjectId.createFromHexString(userId) },
        { $set: updateData }
      );

    // Check if the update was successful
    if (result.modifiedCount === 0 && result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch and return the updated user
    const updatedUser = await db.collection("users").findOne({
      _id: ObjectId.createFromHexString(userId),
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch updated user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...updatedUser,
        _id: updatedUser._id.toString()
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();
    const authKey = body?.authKey;

    const isAuthenticated = bcrypt.compareSync(
      authKey,
      "$2b$10$hPyu2aRgaW3/MkCADGuNHOtjvo/6uJSDS5YJgwcfUJuZ379gSRwYi"
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = body?.user._id;

    // Delete the user from the database
    const result = await db.collection("users").deleteOne({
      _id: ObjectId.createFromHexString(userId),
    });

    console.log(result);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}