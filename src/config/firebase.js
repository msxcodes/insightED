import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "fs";
import "dotenv/config";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET,
});

const storage = getStorage().bucket();

export { storage };
