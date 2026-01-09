import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCookie } from "@/utils/cookie-parser";
import { geocodeAddress } from "@/utils/geocoding";
import bcrypt from "bcryptjs";

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

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    // Get user role from cookies - only admins can add barangays
    const userRole = getCookie(req, 'als_user_role');
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Only admins can add barangays" },
        { status: 403 }
      );
    }
    
    const barangayData = await req.json();
    
    // Validate required fields
    if (!barangayData.name || !barangayData.name.trim()) {
      return NextResponse.json(
        { success: false, error: "Barangay name is required" },
        { status: 400 }
      );
    }
    
    // Check if barangay with the same name already exists
    const existingBarangay = await db.collection("barangays")
      .findOne({ name: barangayData.name.trim() });
    
    if (existingBarangay) {
      return NextResponse.json(
        { success: false, error: "A barangay with this name already exists" },
        { status: 400 }
      );
    }
    
    // Try to geocode address if coordinates are not provided but address is
    let latitude = barangayData.latitude;
    let longitude = barangayData.longitude;
    
    if ((!latitude || !longitude) && barangayData.address?.trim()) {
      console.log(`🔍 Attempting to geocode address: ${barangayData.address.trim()}`);
      try {
        const geocodeResult = await geocodeAddress(barangayData.address.trim());
        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
          console.log(`✅ Geocoded successfully: ${latitude}, ${longitude}`);
        } else {
          console.log(`⚠️ Geocoding failed for address: ${barangayData.address.trim()}`);
        }
      } catch (geocodeError) {
        console.error("Error during geocoding:", geocodeError);
        // Continue without coordinates if geocoding fails
      }
    }
    
    // Prepare barangay document
    const newBarangay = {
      name: barangayData.name.trim(),
      address: barangayData.address?.trim() || "",
      latitude: latitude || null,
      longitude: longitude || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Insert the new barangay into the database
    const result = await db.collection("barangays").insertOne(newBarangay);
    
    // Verify insertion by fetching the created barangay
    const createdBarangay = await db.collection("barangays").findOne({
      _id: result.insertedId
    });
    
    if (!createdBarangay) {
      return NextResponse.json(
        { success: false, error: "Failed to create barangay" },
        { status: 500 }
      );
    }
    
    console.log(`✅ Barangay created: ${createdBarangay.name} (${result.insertedId})`);
    
    // Return the created barangay with _id as string
    return NextResponse.json({
      success: true,
      data: {
        ...createdBarangay,
        _id: result.insertedId.toString(),
      }
    }, {
      headers: {
        'Cache-Control': 'no-store', // Invalidate cache after creation
      },
    });
  } catch (e) {
    console.error("Error creating barangay:", e);
    return NextResponse.json(
      { success: false, error: "Failed to create barangay" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    // Get user role from cookies - only admins can delete barangays
    const userRole = getCookie(req, 'als_user_role');
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Only admins can delete barangays" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const barangayId = body?.barangayId;
    const email = body?.email;
    const password = body?.password;
    
    // Validate required fields
    if (!barangayId) {
      return NextResponse.json(
        { success: false, error: "Barangay ID is required" },
        { status: 400 }
      );
    }
    
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required for verification" },
        { status: 400 }
      );
    }
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required for verification" },
        { status: 400 }
      );
    }
    
    // Verify email and password
    const user = await db.collection("users").findOne({ email: email.trim() });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }
    
    // Verify user is an admin
    if (user.role !== 'admin' && (user.role as string) !== 'master_admin') {
      return NextResponse.json(
        { success: false, error: "Only admins can delete barangays" },
        { status: 403 }
      );
    }
    
    // Check if barangay exists
    let barangayObjectId;
    try {
      barangayObjectId = ObjectId.createFromHexString(barangayId);
    } catch (idError) {
      return NextResponse.json(
        { success: false, error: "Invalid barangay ID" },
        { status: 400 }
      );
    }
    
    const barangay = await db.collection("barangays").findOne({
      _id: barangayObjectId
    });
    
    if (!barangay) {
      return NextResponse.json(
        { success: false, error: "Barangay not found" },
        { status: 404 }
      );
    }
    
    // Check if there are any students associated with this barangay
    const studentsCount = await db.collection("students").countDocuments({
      barangayId: barangayId
    });
    
    if (studentsCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete barangay. There are ${studentsCount} student(s) associated with this barangay. Please reassign or remove students first.` 
        },
        { status: 400 }
      );
    }
    
    // Delete the barangay
    const result = await db.collection("barangays").deleteOne({
      _id: barangayObjectId
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to delete barangay" },
        { status: 500 }
      );
    }
    
    // Verify deletion
    const deletedBarangay = await db.collection("barangays").findOne({
      _id: barangayObjectId
    });
    
    if (deletedBarangay) {
      return NextResponse.json(
        { success: false, error: "Barangay deletion verification failed" },
        { status: 500 }
      );
    }
    
    console.log(`✅ Barangay deleted: ${barangay.name} (${barangayId}) by ${email}`);
    
    return NextResponse.json({
      success: true,
      message: "Barangay deleted successfully"
    }, {
      headers: {
        'Cache-Control': 'no-store', // Invalidate cache after deletion
      },
    });
  } catch (e) {
    console.error("Error deleting barangay:", e);
    return NextResponse.json(
      { success: false, error: "Failed to delete barangay" },
      { status: 500 }
    );
  }
}
