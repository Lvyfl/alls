import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    const progress = await db
      .collection("progress")
      .find({ studentId: studentId })
      .toArray();
    return NextResponse.json(progress);
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

    // Insert the new progress into the database
    const result = await db.collection("progress").insertOne(progressData);

    return NextResponse.json({ success: true, data: result });
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
      return NextResponse.json(
        {
          success: false,
          error: "No progress record found or no changes made",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete progress" },
      { status: 500 }
    );
  }
}
