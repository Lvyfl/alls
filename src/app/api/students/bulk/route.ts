import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { studentIds, action }: { studentIds: string[]; action: 'archive' | 'delete' | 'retrieve' } = await request.json();
    const client = await clientPromise;
    const db = client.db('main');
    const studentsCollection = db.collection('students');

    if (!studentIds || studentIds.length === 0) {
      return NextResponse.json({ message: 'No students selected' }, { status: 400 });
    }

    const objectIds = studentIds.map(id => new ObjectId(id));

    let result;
    if (action === 'archive') {
      result = await studentsCollection.updateMany(
        { _id: { $in: objectIds } },
        { $set: { status: 'inactive' } }
      );
    } else if (action === 'retrieve') {
      result = await studentsCollection.updateMany(
        { _id: { $in: objectIds } },
        { $set: { status: 'active' } }
      );
    } else if (action === 'delete') {
      result = await studentsCollection.deleteMany({ _id: { $in: objectIds } });
    } else {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error during bulk action:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
