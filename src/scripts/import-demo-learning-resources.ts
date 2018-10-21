import LearningResource, { LearningResourceModel } from "../models/LearningResource";
import { MONGODB_URI } from "../util/secrets";
import mongoose from "mongoose";
import bluebird from "bluebird";
import dotenv from "dotenv";

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

const data = [
    {
        name: "How to Tell if Someone wants to have sex with you.",
        url: "https://www.youtube.com/embed/qNN3nAevQKY",
        tags: ["Consent", "state-california", "grade-5"]
    },
    {
        name: "Having Safer Sex",
        url: "https://www.youtube.com/embed/GTFixZ2Ic9Q",
        tags: ["Safe Sex", "state-california", "grade-5"]
    },
    {
        name: "Where do you stand on sex quiz?",
        url: "https://www.whereyoustandapp.org/",
        tags: ["consent", "state-california", "grade-5"]
    },
    {
        name: "What's your love personality quiz?",
        url: "https://www.lovepersonalityapp.org/",
        tags: ["relationships", "state-california", "grade-5"]
    },
    {
        name: "How will you handle this situation quiz?",
        url: "https://www.kickbackapp.org/",
        tags: ["consent", "state-california", "grade-5"]
    },
    {
        name: "What's your future plan Quiz",
        url: "https://www.yourplanapp.org/",
        tags: ["Safe Sex", "state-california", "grade-5"]
    },
    {
        name: "Where do you stand on sex quiz?",
        url: "https://www.whereyoustandapp.org/",
        tags: ["consent", "state-california", "grade-5"]
    },
    {
        name: "How to tell someone you have an STD",
        url: "https://www.youtube.com/embed/xxV7CiE2Bwc",
        tags: ["Safe Sex", "state-california", "grade-9"]
    },
    {
        name: "STD Screening",
        url: "https://www.youtube.com/embed/tkVcpxOYhd8",
        tags: ["Safe Sex", "state-california", "grade-9"]
    },
    {
        name: "Real Talk on STDS and Sex",
        url: "https://www.beentheredonethatapp.org/",
        tags: ["Safe Sex", "state-california", "grade-9"]
    },
    {
        name: "Birth Control Quiz",
        url: "https://www.mybirthcontrolapp.org/",
        tags: ["Relationships", "state-california", "grade-9"]
    },
    {
        name: "Relationship Quiz",
        url: "https://www.takestwoapp.org/",
        tags: ["Relationships", "state-california", "grade-9"]
    },
    {
        name: "Safe Sexual Education Quiz",
        url: "https://quizlet.com/42707794/test/embed",
        tags: ["Relationships", "state-california", "grade-5"]
    },
    {
        name: "Sexual Education Quiz",
        url: "https://quizlet.com/41152057/test/embed",
        tags: ["consent", "state-california", "grade-5"]
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

