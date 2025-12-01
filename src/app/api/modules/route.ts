import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCookie } from "@/utils/cookie-parser";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    // Get barangayId from query params (for filtering)
    const { searchParams } = new URL(req.url);
    const barangayId = searchParams.get('barangayId');

    // Get user's assigned barangay and role from cookies
    const assignedBarangayId = getCookie(req, 'als_assigned_barangay');
    const userRole = getCookie(req, 'als_user_role');
    
    // Build filter:
    // - For master_admin: preserve existing behavior and allow global modules + barangay-specific
    // - For admin: restrict strictly to their assigned barangay (no global modules)
    // - For unauthenticated/other roles: fall back to barangayId filter or all
    let filter: Record<string, unknown> = {};

    if (userRole === 'admin') {
      const effectiveBarangayId = barangayId || assignedBarangayId || null;

      if (!effectiveBarangayId) {
        // Admin without a barangay should not see any modules
        filter = { _id: null };
      } else {
        filter = { barangayId: effectiveBarangayId };
      }
    } else {
      // Master admin or other roles
      // If barangayId is provided, filter by it and also include legacy/global modules without barangayId
      // Otherwise, return all modules
      filter = barangayId
        ? { $or: [{ barangayId: barangayId }, { barangayId: { $exists: false } }] }
        : {};
    }
    
    const modules = await db.collection("modules")
      .find(filter)
      .sort({ title: 1 })
      .toArray();
    
    return NextResponse.json(modules, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Failed to fetch modules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const moduleData = await req.json();

    // Get user's assigned barangay and role from cookies
    const assignedBarangayId = getCookie(req, 'als_assigned_barangay');
    const userRole = getCookie(req, 'als_user_role');

    // Validate required fields
    if (!moduleData.title || !moduleData.title.trim()) {
      return NextResponse.json(
        { success: false, error: "Module title is required" },
        { status: 400 }
      );
    }

    if (!moduleData.levels || !Array.isArray(moduleData.levels) || moduleData.levels.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one program level is required" },
        { status: 400 }
      );
    }

    // Validate predefinedActivities if provided
    if (moduleData.predefinedActivities && Array.isArray(moduleData.predefinedActivities)) {
      for (const activity of moduleData.predefinedActivities) {
        if (!activity.name || !activity.type || !activity.total) {
          return NextResponse.json(
            { success: false, error: "Each activity must have name, type, and total points" },
            { status: 400 }
          );
        }
      }
    }

    // Determine barangayId: use provided one, or assigned barangay for admins, or null for master_admin
    let barangayId: string | undefined = moduleData.barangayId;
    
    // If admin, use their assigned barangay (override any provided barangayId for security)
    if (userRole === 'admin' && assignedBarangayId) {
      barangayId = assignedBarangayId;
    } else if (userRole === 'master_admin') {
      // Master admin can create modules for any barangay or global modules
      barangayId = moduleData.barangayId || undefined;
    } else if (userRole === 'admin' && !assignedBarangayId) {
      return NextResponse.json(
        { success: false, error: "Admin must have an assigned barangay to create modules" },
        { status: 403 }
      );
    }

    // Insert the new module into the database
    const insertData: any = {
      title: moduleData.title.trim(),
      levels: moduleData.levels,
      predefinedActivities: moduleData.predefinedActivities || [],
    };
    
    // Only add barangayId if it's provided (don't add undefined/null)
    if (barangayId) {
      insertData.barangayId = barangayId;
    }
    
    const result = await db.collection("modules").insertOne(insertData);

    return NextResponse.json({ 
      success: true, 
      data: {
        _id: result.insertedId.toString(),
        title: insertData.title,
        levels: insertData.levels,
        predefinedActivities: insertData.predefinedActivities,
        barangayId: insertData.barangayId
      }
    });
  } catch (error: any) {
    console.error("Error inserting module:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create module" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const moduleData = await req.json();

    const { _id, title, levels, predefinedActivities, barangayId } = moduleData || {};

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Module ID is required" },
        { status: 400 }
      );
    }

    // Get user's assigned barangay and role from cookies
    const assignedBarangayId = getCookie(req, 'als_assigned_barangay');
    const userRole = getCookie(req, 'als_user_role');

    // First, get the existing module to check its barangayId
    const isObjectId = ObjectId.isValid(_id);
    const existingModule = await db.collection("modules").findOne({
      _id: isObjectId ? new ObjectId(_id) : _id
    });

    if (!existingModule) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    // Validate admin can only edit modules for their assigned barangay
    if (userRole === 'admin') {
      if (!assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "Admin must have an assigned barangay to edit modules" },
          { status: 403 }
        );
      }

      const moduleBarangayId = existingModule.barangayId;
      // Admin can only edit modules that belong to their barangay
      // Global/legacy modules without barangayId can only be edited by master_admin
      if (!moduleBarangayId || moduleBarangayId !== assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "You can only edit modules for your assigned barangay" },
          { status: 403 }
        );
      }
    }

    if (title && !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Module title cannot be empty" },
        { status: 400 }
      );
    }

    if (levels && (!Array.isArray(levels) || levels.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Levels must contain at least one entry" },
        { status: 400 }
      );
    }

    if (predefinedActivities && Array.isArray(predefinedActivities)) {
      for (const activity of predefinedActivities) {
        if (!activity.name || !activity.type || !activity.total) {
          return NextResponse.json(
            { success: false, error: "Each activity must have name, type, and total points" },
            { status: 400 }
          );
        }
      }
    }

    const filter = { _id: isObjectId ? new ObjectId(_id) : _id };

    const updatePayload: Record<string, unknown> = {};
    if (title !== undefined) {
      updatePayload.title = title.trim();
    }
    if (levels !== undefined) {
      updatePayload.levels = levels;
    }
    if (predefinedActivities !== undefined) {
      updatePayload.predefinedActivities = predefinedActivities;
    }
    
    // Handle barangayId update: admins can't change barangayId, master_admin can
    if (barangayId !== undefined && userRole === 'master_admin') {
      updatePayload.barangayId = barangayId || null; // Allow setting to null for global modules
    } else if (userRole === 'admin' && assignedBarangayId) {
      // Ensure admin's modules stay assigned to their barangay
      updatePayload.barangayId = assignedBarangayId;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields provided to update" },
        { status: 400 }
      );
    }

    const result = await db.collection("modules").findOneAndUpdate(
      filter,
      { $set: updatePayload },
      { returnDocument: "after", upsert: true }
    );

    // Handle potential null result
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Failed to update module - no result returned" },
        { status: 500 }
      );
    }

    const updatedDocument = result.value ?? {
      _id: result.lastErrorObject?.upserted || filter._id,
      ...updatePayload,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...updatedDocument,
        _id: updatedDocument._id?.toString?.() ?? updatedDocument._id,
      }
    });
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update module" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const body = await req.json();
    const { _id } = body || {};

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Module ID is required" },
        { status: 400 }
      );
    }

    // Get user's assigned barangay and role from cookies
    const assignedBarangayId = getCookie(req, 'als_assigned_barangay');
    const userRole = getCookie(req, 'als_user_role');

    const isObjectId = ObjectId.isValid(_id);
    
    // First, get the existing module to check its barangayId
    const existingModule = await db.collection("modules").findOne({
      _id: isObjectId ? new ObjectId(_id) : _id
    });

    if (!existingModule) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    // Validate admin can only delete modules for their assigned barangay
    if (userRole === 'admin') {
      if (!assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "Admin must have an assigned barangay to delete modules" },
          { status: 403 }
        );
      }

      const moduleBarangayId = existingModule.barangayId;
      // Admin can only delete modules that belong to their barangay
      // Global/legacy modules without barangayId can only be deleted by master_admin
      if (!moduleBarangayId || moduleBarangayId !== assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "You can only delete modules for your assigned barangay" },
          { status: 403 }
        );
      }
    }

    const filter = { _id: isObjectId ? new ObjectId(_id) : _id };

    const result = await db.collection("modules").deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete module" },
      { status: 500 }
    );
  }
}