import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    // Use projection to only fetch needed fields for better performance
    // Only fetch essential fields to reduce payload size
    const students = await db.collection("students")
      .find({}, {
        projection: {
          _id: 1,
          lrn: 1,
          name: 1,
          status: 1,
          gender: 1,
          barangayId: 1,
          program: 1,
          address: 1,
          enrollmentDate: 1,
          modality: 1,
          // Exclude large fields that aren't always needed
          // assessment: 0,
          // pisScore: 0,
        }
      })
      .sort({ name: 1 }) // Sort by name for consistent ordering
      .toArray();
    
    // Add cache headers for better performance (students don't change frequently)
    return NextResponse.json(students, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const studentData = await req.json();

    // Best-effort: ensure unique index exists, but don't fail request if it can't be created (e.g., existing duplicates)
    try {
      await db.collection("students").createIndex({ lrn: 1 }, { unique: true, name: "unique_lrn" });
    } catch (e) {
      // Ignore index creation errors; we still explicitly check below
    }

    // Check for existing LRN explicitly to provide a friendly message
    if (studentData?.lrn) {
      const existing = await db.collection("students").findOne({ lrn: studentData.lrn });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "This LRN is already taken." },
          { status: 409 }
        );
      }
    }

    // Log the data being inserted for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Creating student in database:`, {
        name: studentData.name,
        lrn: studentData.lrn,
        barangayId: studentData.barangayId || 'none'
      });
    }

    // Insert the new student into the database
    const result = await db.collection("students").insertOne(studentData);

    // Verify the student was actually inserted by fetching it back
    const insertedStudent = await db.collection("students").findOne({
      _id: result.insertedId
    });

    if (!insertedStudent) {
      console.error("❌ Student insertion failed - student not found after insert");
      return NextResponse.json(
        { success: false, error: "Failed to verify student creation" },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Student successfully saved to database with _id: ${result.insertedId.toString()}`);
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        insertedId: result.insertedId,
        student: {
          ...insertedStudent,
          _id: result.insertedId.toString()
        }
      }
    });
  } catch (error: any) {
    console.error("Error inserting student:", error);
    // Handle duplicate key error from MongoDB
    if (error?.code === 11000 && error?.keyPattern?.lrn) {
      return NextResponse.json(
        { success: false, error: "This LRN is already taken." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to insert student" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const studentData = await req.json();
    const documentId = studentData._id;
    delete studentData._id; // Remove _id for update operation

    // If updating LRN, ensure it remains unique across other documents
    if (studentData?.lrn) {
      const conflict = await db.collection("students").findOne({
        lrn: studentData.lrn,
        _id: { $ne: ObjectId.createFromHexString(documentId) }
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: "This LRN is already taken." },
          { status: 409 }
        );
      }
    }

    // Update the student in the database
    const result = await db
      .collection("students")
      .updateOne(
        { _id: ObjectId.createFromHexString(documentId) },
        { $set: studentData }
      );

    // Check if the update was successful
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to update student" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update student" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const { _id } = await req.json();

    // First, get the student's LRN before deleting
    const student = await db.collection("students").findOne({
      _id: ObjectId.createFromHexString(_id),
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    const studentLrn = student.lrn;

    // Delete all progress records for this student (using LRN as studentId)
    if (studentLrn) {
      const progressDeleteResult = await db.collection("progress").deleteMany({
        studentId: studentLrn,
      });
      console.log(`Deleted ${progressDeleteResult.deletedCount} progress records for student with LRN: ${studentLrn}`);
    }

    // Log deletion attempt
    console.log(`🗑️ Deleting student from database:`, {
      _id,
      lrn: studentLrn,
      name: student.name
    });

    // Delete the student from the database
    const result = await db.collection("students").deleteOne({
      _id: ObjectId.createFromHexString(_id),
    });

    // Check if the deletion was successful
    if (result.deletedCount === 0) {
      console.error(`❌ Student deletion failed - student not found or already deleted`);
      return NextResponse.json(
        { success: false, error: "Failed to delete student" },
        { status: 404 }
      );
    }

    // Verify the student was actually deleted
    const deletedStudent = await db.collection("students").findOne({
      _id: ObjectId.createFromHexString(_id),
    });

    if (deletedStudent) {
      console.error(`❌ Student deletion verification failed - student still exists`);
      return NextResponse.json(
        { success: false, error: "Student deletion verification failed" },
        { status: 500 }
      );
    }

    console.log(`✅ Student successfully deleted from database`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete student" },
      { status: 500 }
    );
  }
}