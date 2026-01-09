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
        // Teachers should see:
        // 1. Modules with barangayId matching their assigned barangay (legacy format)
        // 2. Modules with barangayIds array containing their assigned barangay (new format)
        // 3. Global modules (without barangayId or barangayIds)
        filter = { 
          $or: [
            { barangayId: effectiveBarangayId },
            { barangayIds: effectiveBarangayId },
            { barangayId: { $exists: false }, barangayIds: { $exists: false } }
          ] 
        };
      }
    } else {
      // Master admin or other roles
      // If barangayId is provided, filter by it and also include modules with barangayIds array or global modules
      // Otherwise, return all modules
      if (barangayId) {
        filter = {
          $or: [
            { barangayId: barangayId },
            { barangayIds: barangayId },
            { barangayId: { $exists: false }, barangayIds: { $exists: false } },
            { barangayIds: { $size: 0 } }
          ]
        };
      } else {
        filter = {};
      }
    }

    // Use projection to only fetch needed fields for better performance
    const modules = await db.collection("modules")
      .find(filter, {
        projection: {
          _id: 1,
          title: 1,
          levels: 1,
          predefinedActivities: 1,
          barangayId: 1,
          barangayIds: 1,
          createdAt: 1,
        }
      })
      .sort({ title: 1 })
      .toArray();

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Fetched ${modules.length} modules from database`, {
        userRole,
        assignedBarangayId: assignedBarangayId || 'none',
        barangayIdFilter: barangayId || 'none',
        modulesWithBarangayId: modules.filter((m: any) => m.barangayId).length,
        globalModules: modules.filter((m: any) => !m.barangayId).length
      });
    }

    // Ensure all modules have consistent structure (createdAt is optional for backward compatibility)
    const normalizedModules = modules.map((module: any) => ({
      ...module,
      _id: module._id?.toString() || module._id,
      // Ensure barangayId is included in response
      barangayId: module.barangayId || undefined,
      // Ensure barangayIds array is included in response
      barangayIds: module.barangayIds || undefined,
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

    // Handle barangayIds array (new format - supports multiple barangays)
    if (moduleData.barangayIds && Array.isArray(moduleData.barangayIds) && moduleData.barangayIds.length > 0) {
      insertData.barangayIds = moduleData.barangayIds;
    } else if (barangayId) {
      // Fall back to single barangayId (legacy format)
      insertData.barangayId = barangayId;
    }

    // Log the data being inserted for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Creating module in database:`, {
        title: insertData.title,
        barangayId: insertData.barangayId || 'null (global)',
        userRole,
        assignedBarangayId: assignedBarangayId || 'none',
        levels: insertData.levels
      });
    }

    const result = await db.collection("modules").insertOne(insertData);

    // Verify the module was actually inserted by fetching it back
    const insertedModule = await db.collection("modules").findOne({
      _id: result.insertedId
    });

    if (!insertedModule) {
      console.error("❌ Module insertion failed - module not found after insert");
      return NextResponse.json(
        { success: false, error: "Failed to verify module creation" },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Module successfully saved to database with _id: ${result.insertedId.toString()}`, {
        savedBarangayId: insertedModule.barangayId || 'null (global)',
        savedTitle: insertedModule.title
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId.toString(),
        title: insertData.title,
        levels: insertData.levels,
        predefinedActivities: insertData.predefinedActivities,
        barangayId: insertedModule.barangayId || undefined, // Use the actual saved value
        barangayIds: insertedModule.barangayIds || undefined, // Include barangayIds array
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

    const { _id, title, levels, predefinedActivities, barangayId, barangayIds } = moduleData || {};

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
    let existingModule = await db.collection("modules").findOne({
      _id: isObjectId ? new ObjectId(_id) : _id
    });

    // If module doesn't exist, it might be a hard-coded module from JSON
    // In this case, we'll create it in the database with the provided data
    const isHardCodedModule = !existingModule && !isObjectId && typeof _id === 'string' && _id.startsWith('module-');
    
    if (!existingModule && !isHardCodedModule) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    // For hard-coded modules, we'll create them in the database
    // For existing modules, validate permissions
    if (existingModule) {
      // Validate teacher can edit modules for their assigned barangay OR global modules (new modules)
    if (userRole === 'teacher') {
      if (!assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "Teacher must have an assigned barangay to edit modules" },
          { status: 403 }
        );
      }

      const moduleBarangayId = existingModule.barangayId;
        // Teachers can edit:
        // 1. Modules that belong to their barangay
        // 2. Global modules (without barangayId) - these are "new modules" visible to teachers
        if (moduleBarangayId && moduleBarangayId !== assignedBarangayId) {
          return NextResponse.json(
            { success: false, error: "You can only edit modules for your assigned barangay or global modules" },
            { status: 403 }
          );
        }
        // If moduleBarangayId is undefined/null (global module) OR matches assignedBarangayId, allow editing
      }
    } else if (isHardCodedModule) {
      // For hard-coded modules being created, validate teacher permissions
      if (userRole === 'teacher') {
        if (!assignedBarangayId) {
        return NextResponse.json(
            { success: false, error: "Teacher must have an assigned barangay to create/edit modules" },
          { status: 403 }
        );
        }
        // Teachers can create modules for their barangay or as global modules
        // The barangayId will be set in the updatePayload below
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

    // Handle barangayIds array (new format - supports multiple barangays)
    if (barangayIds !== undefined && userRole === 'admin') {
      if (Array.isArray(barangayIds) && barangayIds.length > 0) {
        updatePayload.barangayIds = barangayIds;
        updatePayload.barangayId = null; // Clear legacy field when using new format
      } else {
        updatePayload.barangayIds = null; // Clear if empty array
      }
    }
    
    // Handle barangayId update (legacy format): only admins can change barangayId
    // Teachers should NOT change module ownership - they can only edit content
    if (barangayId !== undefined && userRole === 'admin' && !barangayIds) {
      updatePayload.barangayId = barangayId || null; // Allow setting to null for global modules
    }
    
    // IMPORTANT: If admin is editing and no barangayId/barangayIds was provided,
    // preserve the existing module's barangay assignment to prevent it from becoming orphaned
    if (userRole === 'admin' && existingModule) {
      // Only preserve if neither barangayId nor barangayIds was explicitly provided in the update
      const hasBarangayUpdate = barangayId !== undefined || barangayIds !== undefined;
      
      if (!hasBarangayUpdate) {
        // Preserve existing barangay assignment
        if (existingModule.barangayIds && existingModule.barangayIds.length > 0) {
          updatePayload.barangayIds = existingModule.barangayIds;
        } else if (existingModule.barangayId) {
          updatePayload.barangayId = existingModule.barangayId;
        }
      }
    }
    
    // Note: Teachers do NOT override barangayId - this preserves global modules as global
    // and prevents duplication issues when teachers edit modules

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // For hard-coded modules, we need to create them with a new MongoDB ObjectId
    // but preserve the original title and structure
    if (isHardCodedModule) {
      // Validate required fields for creation
      if (!title || !title.trim()) {
        return NextResponse.json(
          { success: false, error: "Module title is required" },
          { status: 400 }
        );
      }

      if (!levels || !Array.isArray(levels) || levels.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one program level is required" },
          { status: 400 }
        );
      }

      // Create a new module in the database with the provided data
      const insertData: any = {
        title: title.trim(),
        levels: levels,
        predefinedActivities: predefinedActivities || [],
        createdAt: new Date().toISOString(),
      };

      // Set barangayId based on user role and provided data
      // For hard-coded modules being converted, preserve them as global modules
      // so all teachers can still see them
      if (barangayId !== undefined && userRole === 'admin') {
        insertData.barangayId = barangayId || null;
      } else {
        // Keep as global module (no barangayId) so all users can see it
        // This prevents duplication when teachers edit hard-coded modules
        insertData.barangayId = null;
      }

      console.log(`📝 Creating hard-coded module in database during update:`, {
        title: insertData.title,
        barangayId: insertData.barangayId || 'null (global)'
      });

      const insertResult = await db.collection("modules").insertOne(insertData);
      
      // Verify the module was actually inserted
      const insertedModule = await db.collection("modules").findOne({
        _id: insertResult.insertedId
      });

      if (!insertedModule) {
        console.error("❌ Hard-coded module creation failed during update - module not found after insert");
        return NextResponse.json(
          { success: false, error: "Failed to verify module creation" },
          { status: 500 }
        );
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Hard-coded module successfully created in database with _id: ${insertResult.insertedId.toString()}`);
      }
      
      return NextResponse.json({
        success: true,
        data: {
          _id: insertResult.insertedId.toString(),
          title: insertData.title,
          levels: insertData.levels,
          predefinedActivities: insertData.predefinedActivities,
          barangayId: insertData.barangayId,
          createdAt: insertData.createdAt,
        }
      });
    }

    // Log update attempt
    console.log(`📝 Updating module in database:`, {
      _id,
      title: title || existingModule?.title,
      barangayId: updatePayload.barangayId || existingModule?.barangayId || 'null (global)',
      updateFields: Object.keys(updatePayload)
    });

    // Update the existing module
    const updateResult = await db.collection("modules").updateOne(
      filter,
      { $set: updatePayload }
    );

    // Check if the update matched any document
    if (updateResult.matchedCount === 0) {
      console.error(`❌ Module update failed - no document matched the filter`);
      return NextResponse.json(
        { success: false, error: "Module not found or could not be updated" },
        { status: 404 }
    );
    }

    // Check if the update actually modified anything
    if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
      console.warn(`⚠️ Module update matched but no changes were made (values may be the same)`);
      // This is okay - the values might be the same, so we'll just return the existing module
    }

    // Fetch the updated document to return it
    const updatedDocument = await db.collection("modules").findOne(filter);

    if (!updatedDocument) {
      console.error(`❌ Module update verification failed - module not found after update`);
      return NextResponse.json(
        { success: false, error: "Failed to verify module update" },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Module successfully updated in database`);
    }

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

    // Validate teacher can delete modules for their assigned barangay OR global modules (new modules)
    if (userRole === 'teacher') {
      if (!assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "Teacher must have an assigned barangay to delete modules" },
          { status: 403 }
        );
      }

      const moduleBarangayId = existingModule.barangayId;
      // Teachers can delete:
      // 1. Modules that belong to their barangay
      // 2. Global modules (without barangayId) - these are "new modules" visible to teachers
      if (moduleBarangayId && moduleBarangayId !== assignedBarangayId) {
        return NextResponse.json(
          { success: false, error: "You can only delete modules for your assigned barangay or global modules" },
          { status: 403 }
        );
      }
      // If moduleBarangayId is undefined/null (global module) OR matches assignedBarangayId, allow deletion
    }

    const filter = { _id: isObjectId ? new ObjectId(_id) : _id };

    // Log deletion attempt
    console.log(`🗑️ Deleting module from database:`, {
      _id,
      title: existingModule.title,
      barangayId: existingModule.barangayId || 'null (global)'
    });

    const result = await db.collection("modules").deleteOne(filter);

    if (result.deletedCount === 0) {
      console.error(`❌ Module deletion failed - module not found or already deleted`);
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify the module was actually deleted
    const deletedModule = await db.collection("modules").findOne(filter);

    if (deletedModule) {
      console.error(`❌ Module deletion verification failed - module still exists`);
      return NextResponse.json(
        { success: false, error: "Module deletion verification failed" },
        { status: 500 }
      );
    }

    console.log(`✅ Module successfully deleted from database`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete module" },
      { status: 500 }
    );
  }
}