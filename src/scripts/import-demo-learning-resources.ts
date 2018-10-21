import LearningResource, { LearningResourceModel } from "../models/LearningResource";
import { MONGODB_URI } from "../util/secrets";
import mongoose from "mongoose";
import bluebird from "bluebird";
import dotenv from "dotenv";

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

const data = [
    {
        name: "Hello Demo 1",
        url: "https://github.com/",
        tags: ["demo-subject", "state-california", "grade-5"]
    },
    {
        name: "Hello Demo 2",
        url: "https://github.com/",
        tags: ["demo-topic", "state-new-york", "grade-9"]
    },
    {
        name: "Hello Demo 2",
        url: "https://github.com/",
        tags: ["demo-thing", "state-california", "grade-9"]
    }
] as LearningResourceModel[];

const runImport = async () => {
    for (let record of data) {
        let resource = new LearningResource(record);
        try {
            console.log("Importing: ", record);
            await resource.save();
            console.log("Imported record");
        } catch (err) {
            console.log("Error importing: ", err);
        }
    }
    return null;
};

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
(<any>mongoose).Promise = bluebird;
mongoose.connect(mongoUrl, {useMongoClient: true}).then(
    () => {
        runImport().then(() => {
            console.log('Import done');
            process.exit(0);
        });
    },
).catch(err => {
    console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
    // process.exit();
});

