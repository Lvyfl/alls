import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = { appName: "devrel.template.nextjs" };

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient> | undefined;

// Create a function to get the client promise
function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set!');
    return Promise.reject(new Error('Invalid/Missing environment variable: "MONGODB_URI"'));
  }

  console.log('🔌 Attempting to connect to MongoDB...');

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClient?: MongoClient;
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      console.log('📦 Creating new MongoDB client...');
      globalWithMongo._mongoClient = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = globalWithMongo._mongoClient.connect()
        .then(() => {
          console.log('✅ MongoDB connected successfully!');
          return globalWithMongo._mongoClient!;
        })
        .catch((error) => {
          console.error('❌ MongoDB connection failed:', error);
          throw error;
        });
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!client) {
      client = new MongoClient(uri, options);
    }
    if (!clientPromise) {
      clientPromise = client.connect()
        .then(() => {
          console.log('✅ MongoDB connected successfully!');
          return client!;
        })
        .catch((error) => {
          console.error('❌ MongoDB connection failed:', error);
          throw error;
        });
    }
    return clientPromise;
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
// This will be lazily initialized when first accessed.
// Create the promise only when uri exists
export default uri ? getClientPromise() : Promise.reject(new Error('Invalid/Missing environment variable: "MONGODB_URI"'));