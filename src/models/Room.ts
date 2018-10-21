import mongoose from "mongoose";

export type RoomModel = mongoose.Document & {
    name: string
    admin_id: string
    learner_ids: string[]
    parent_ids: string[]
    syllabus: {[key: string]: {
            user_id: string
            viewed: boolean
        }
    }
};

const roomSchema = new mongoose.Schema({
    name: String,
    admin_id: String,
    learner_ids: [String],
    parent_ids: [String],
    syllabus: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;
