import mongoose from "mongoose";

export type LearningResourceModel = mongoose.Document & {
    name: string
    url: string
    tags: string[]
};

const learningResourceSchema = new mongoose.Schema({
    name: String,
    url: String,
    tags: [String],
}, { timestamps: true });

const LearningResource = mongoose.model("LearningResource", learningResourceSchema);
export default LearningResource;
