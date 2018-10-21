import mongoose from "mongoose";

export type RoomModel = mongoose.Document & {
    name: string
    admin_id: string
    learners: {[email: string]: {
            parent_emails: string[]
        }
    },
    syllabus: {
        resource_id: string
        learners: {[email: string]: {
                allowed: boolean
                viewed: boolean
            }
        }
    }[]
};

const roomSchema = new mongoose.Schema({
    name: String,
    admin_id: String,
    learners: mongoose.Schema.Types.Mixed,
    syllabus: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;
