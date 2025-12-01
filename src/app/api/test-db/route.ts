import { NextResponse } from 'next/server';
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const hasUri = !!process.env.MONGODB_URI;
    const uriPreview = process.env.MONGODB_URI 
      ? `${process.env.MONGODB_URI.substring(0, 20)}...` 
      : 'NOT SET';

    // Try to connect
    let connectionStatus = 'not_attempted';
    let errorMessage: string | null = null; // Explicitly type as string | null
    
    try {
      const client = await clientPromise;
      if (client) {
        // Test the connection
        await client.db("admin").command({ ping: 1 });
        connectionStatus = 'connected';
      }
    } catch (error) {
      connectionStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json({
      mongodb_uri_set: hasUri,
      uri_preview: uriPreview,
      connection_status: connectionStatus,
      error: errorMessage,
      node_env: process.env.NODE_ENV,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      mongodb_uri_set: !!process.env.MONGODB_URI,
    }, { status: 500 });
  }
}