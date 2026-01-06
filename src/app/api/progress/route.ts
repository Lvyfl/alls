import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    
    // Use projection to only fetch needed fields for better performance
    const progress = await db
      .collection("progress")
      .find(
        { studentId: studentId },
        {
          projection: {
            _id: 1,
            studentId: 1,
            moduleId: 1,
            activities: 1,
          }
        }
      )
      .toArray();
    
    return NextResponse.json(progress, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const progressData = await req.json();

    // Validate that student exists in masterlist before creating progress
    const studentExists = await db.collection("students").findOne({
      lrn: progressData.studentId
    });

    if (!studentExists) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Student with LRN ${progressData.studentId} does not exist in masterlist. Please add the student to the masterlist first.` 
        },
        { status: 400 }
      );
    }

    // Log the data being inserted for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Creating progress in database:`, {
        studentId: progressData.studentId,
        moduleId: progressData.moduleId,
        activitiesCount: progressData.activities?.length || 0
      });
    }

    // Insert the new progress into the database
    const result = await db.collection("progress").insertOne(progressData);

    // Verify the progress was actually inserted by fetching it back
    const insertedProgress = await db.collection("progress").findOne({
      _id: result.insertedId
    });

    if (!insertedProgress) {
      console.error("❌ Progress insertion failed - progress not found after insert");
      return NextResponse.json(
        { success: false, error: "Failed to verify progress creation" },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Progress successfully saved to database with _id: ${result.insertedId.toString()}`);
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        insertedId: result.insertedId,
        progress: {
          ...insertedProgress,
          _id: result.insertedId.toString()
        }
      }
    });
  } catch (error) {
    console.error("Error inserting progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to insert progress" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const { studentId, moduleId, activityIndex, activity, action } = await req.json();
    
    // Handle adding a new activity
    if (action === 'add') {
      const result = await db
        .collection("progress")
        .updateOne(
          { studentId, moduleId },
          { $push: { activities: activity } }
        );

      if (result.modifiedCount === 0) {
        // Progress record doesn't exist, validate student exists in masterlist first
        const studentExists = await db.collection("students").findOne({
          lrn: studentId
        });

        if (!studentExists) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Student with LRN ${studentId} does not exist in masterlist. Please add the student to the masterlist first.` 
            },
            { status: 400 }
          );
        }

        // Create it
        await db.collection("progress").insertOne({
          studentId,
          moduleId,
          activities: [activity]
        });
      }

      return NextResponse.json({ success: true });
    }
    
    // Handle updating an existing activity
    if (activityIndex !== undefined && activityIndex >= 0) {
      const result = await db
        .collection("progress")
        .updateOne(
          { studentId, moduleId },
          { $set: { [`activities.${activityIndex}`]: activity } }
        );

      if (result.modifiedCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No progress record found or no changes made",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid request parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const { studentId, moduleId, activityIndex } = await req.json();

    // Log deletion attempt
    console.log(`🗑️ Deleting activity from progress:`, {
      studentId,
      moduleId,
      activityIndex
    });

    // Delete the specific activity from the progress record
    const unsetResult = await db
      .collection("progress")
      .updateOne(
        { studentId, moduleId },
        { $unset: { [`activities.${activityIndex}`]: 1 } }
      );

    // Remove nulls from the activities array
    const pullResult = await db
      .collection("progress")
      .updateOne({ studentId, moduleId }, {
        $pull: { activities: null },
      } as any);

    const result = {
      modifiedCount: unsetResult.modifiedCount + pullResult.modifiedCount,
    };

    if (result.modifiedCount === 0) {
      console.error(`❌ Activity deletion failed - no progress record found or no changes made`);
      return NextResponse.json(
        {
          success: false,
          error: "No progress record found or no changes made",
        },
        { status: 404 }
      );
    }

    // Verify the activity was actually deleted
    const progressRecord = await db.collection("progress").findOne({
      studentId,
      moduleId
    });

    if (progressRecord && progressRecord.activities && progressRecord.activities[activityIndex]) {
      console.error(`❌ Activity deletion verification failed - activity still exists`);
      return NextResponse.json(
        { success: false, error: "Activity deletion verification failed" },
        { status: 500 }
      );
    }

    console.log(`✅ Activity successfully deleted from progress`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete progress" },
      { status: 500 }
    );
  }
}
