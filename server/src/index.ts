import { connectDb } from "./db.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3001;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required");
}

await connectDb(mongoUri);
createApp().listen(port, () => {
  console.log(`API listening on port ${port}`);
});
