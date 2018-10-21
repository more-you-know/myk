import { Request, Response } from "express";
import { default as Room, RoomModel } from "../models/Room";

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
export let postCreateRoom = async (req: Request, res: Response) => {
    req.assert("name", "Room name cannot be blank").notEmpty();
    req.assert("learners", "You must add learners to the room").notEmpty();
    req.assert("syllabus", "You must add curriculum to the room").notEmpty();

    const errors = req.validationErrors();

    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/rooms/create");
    }

    const room = new Room({
        name: req.body.name,
        admin_id: req.user.id,
        learners: JSON.parse(req.body.learners),
        syllabus: JSON.parse(req.body.syllabus),
    } as RoomModel);

    try {
        await room.save();
        return res.redirect(`/rooms/${room.id}`);
    } catch (err) {
        req.flash("errors", [{msg: err}]);
        return res.redirect("/rooms/create");
    }
};

