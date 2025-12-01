import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const events = await db.collection("events").find({}).toArray();
    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const eventData = await req.json();
    // Insert the new event into the database
    const result = await db.collection("events").insertOne(eventData);

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error("Error inserting event:", e);
    return NextResponse.json(
      { success: false, error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const eventData = await req.json();
    const eventId = eventData._id;
    delete eventData._id; // Remove _id for update operation

    // Update the event in the database
    const result = await db
      .collection("events")
    .updateOne({ _id: ObjectId.createFromHexString(eventId) }, { $set: eventData });

    // Check if the update was successful
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to update student" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error updating event:", e);
    return NextResponse.json(
      { success: false, error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const { _id } = await req.json();

    // Delete the event from the database
    const result = await db.collection("events").deleteOne({ _id: ObjectId.createFromHexString(_id) });

    // Check if the deletion was successful
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to delete event" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error deleting event:", e);
    return NextResponse.json(
      { success: false, error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
