import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();

    console.log("Request body:", body);

    // Hash the password for safe storage while keeping initial value for master admins
    const password = body?.password;
    const hash = bcrypt.hashSync(password, 10);

    const userData = await db.collection("users").insertOne({
      ...body,
      password: hash,
      initialPassword: password,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Check if user was created
    if (!userData.acknowledged) {
      return NextResponse.json(
        { success: false, error: "User not created" },
        { status: 404 }
      );
    }

    console.log("User registered:", userData.insertedId);
    return NextResponse.json({ success: true, body: userData });
  } catch (error) {
    console.error("Error inserting user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to Create User" },
      { status: 500 }
    );
  }
}