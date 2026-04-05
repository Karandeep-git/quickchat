import mongoose from "mongoose";

// Function to connect to the mongodb database
export const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    mongoose.connection.on("connected", () =>
      console.log("Database connected!"),
    );

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || "chat-app",
    });

  } catch (error) {
    console.log(error);
    throw error;
  }
};
