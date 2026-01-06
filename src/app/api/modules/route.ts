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

    if (userRole === 'teacher') {
      const effectiveBarangayId = barangayId || assignedBarangayId || null;

      if (!effectiveBarangayId) {
        // Teacher without a barangay should not see any modules
        filter = { _id: null };
      } else {
        // Teachers should see modules for their barangay AND global modules (without barangayId)
        filter = { $or: [{ barangayId: effectiveBarangayId }, { barangayId: { $exists: false } }] };
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

    // Ensure all modules have consistent structure (createdAt is optional for backward compatibility)
    const normalizedModules = modules.map((module: any) => ({
      ...module,
      _id: module._id?.toString() || module._id,
      // createdAt is optional - existing modules without it will still work
      createdAt: module.createdAt || undefined,
    }));

    return NextResponse.json(normalizedModules, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
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
    if (userRole === 'teacher' && assignedBarangayId) {
      barangayId = assignedBarangayId;
    } else if (userRole === 'admin') {
      // Master admin can create modules for any barangay or global modules
      barangayId = moduleData.barangayId || undefined;
    } else if (userRole === 'teacher' && !assignedBarangayId) {
      return NextResponse.json(
        { success: false, error: "Teacher must have an assigned barangay to create modules" },
        { status: 403 }
      );
    }

    // Insert the new module into the database
    const insertData: any = {
      title: moduleData.title.trim(),
      levels: moduleData.levels,
      predefinedActivities: moduleData.predefinedActivities || [],
      createdAt: new Date().toISOString(), // Add creation timestamp
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
        barangayId: insertData.barangayId,
        createdAt: insertData.createdAt
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
    if (userRole === 'teacher') {
      if (!assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "Teacher must have an assigned barangay to edit modules" },
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
    if (barangayId !== undefined && userRole === 'admin') {
      updatePayload.barangayId = barangayId || null; // Allow setting to null for global modules
    } else if (userRole === 'teacher' && assignedBarangayId) {
      // Ensure admin's modules stay assigned to their barangay
      updatePayload.barangayId = assignedBarangayId;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // Preserve createdAt if it exists and is not being updated
    if (!updatePayload.createdAt && existingModule?.createdAt) {
      // Don't include createdAt in updatePayload, it will be preserved automatically
      // MongoDB $set only updates specified fields, so createdAt will remain
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
      // Preserve createdAt from existing module if not in updatePayload
      createdAt: updatePayload.createdAt || existingModule?.createdAt,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...updatedDocument,
        _id: updatedDocument._id?.toString?.() ?? updatedDocument._id,
        // Ensure createdAt is included in response
        createdAt: updatedDocument.createdAt || existingModule?.createdAt,
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
    if (userRole === 'teacher') {
      if (!assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "Teacher must have an assigned barangay to delete modules" },
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