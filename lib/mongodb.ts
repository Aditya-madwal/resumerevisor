import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  // Reuse one client across hot reloads and serverless invocations.
  globalForMongo._mongoClient ??= new MongoClient(uri).connect();
  return globalForMongo._mongoClient;
}

export interface UserProfile {
  clerkUserId: string;
  baseResumeLatex: string;
  updatedAt: Date;
}

export async function profiles() {
  const client = await getClient();
  return client
    .db(process.env.MONGODB_DB_NAME)
    .collection<UserProfile>("profiles");
}
