import { Request, Response } from "express";
import { default as Room, RoomModel } from "../models/Room";
import { Transporter } from "../config/mailer";
import { PlatformConfig } from "../config/platform";

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

    let learners = JSON.parse(req.body.learners);
    let syllabus = JSON.parse(req.body.syllabus);

    const room = new Room({
        name: req.body.name,
        admin_id: req.user.id,
        learners,
        syllabus
    }) as RoomModel;

    try {
        await room.save();
    } catch (err) {
        req.flash("errors", [{msg: err}]);
        return res.redirect("/rooms/create");
    }

    let mailErrors = [];

    for (let learnerEmail of Object.keys(learners)) {
        const mailOptions = {
            to: learnerEmail,
            from: `More You Know <no-reply@moreyouknow.co>`,
            subject: `Join the ${room.name} Room as a Learner`,
            text: `Join the ${room.name} Room Here: <a href="${PlatformConfig.url}/rooms/${room.id}/learners/${learnerEmail}/join">Join!</a>`
        };
        Transporter.sendMail(mailOptions, (err) => {
            if (err) {
                mailErrors.push({ msg: err.message })
            }
        });
        for (let parentEmail of learners[learnerEmail]) {
            const mailOptions = {
                to: parentEmail,
                from: `More You Know <no-reply@moreyouknow.co>`,
                subject: `Join the ${room.name} Room as a Parent`,
                text: `Join the ${room.name} Room Here: <a href="${PlatformConfig.url}/rooms/${room.id}/learners/${learnerEmail}/parental-join">Join!</a>`
            };
            Transporter.sendMail(mailOptions, (err) => {
                if (err) {
                    mailErrors.push({ msg: err.message })
                }
            });
        }
    }

    if (mailErrors) {
        req.flash("errors", mailErrors);
        return res.redirect("/rooms/create");
    }

    return res.redirect(`/rooms/${room.id}`);
};

export let getMyRooms = async (req: Request, res: Response) => {
    let allRooms = await Room.find({}).exec() as RoomModel[];
    let myRooms = allRooms.filter(room => {
        if (room.admin_id === req.user.id) {
            return true;
        }
        if (Object.keys(room.learners).indexOf(req.user.email) > -1) {
            return true;
        }
        let isParentInRoom = false;
        Object.keys(room.learners).forEach(learnerEmail => {
            if (room.learners[learnerEmail].parent_emails.indexOf(req.user.email) > -1) {
                isParentInRoom = true;
            }
        });
        if (isParentInRoom) {
            return true;
        }
    });
    console.log(myRooms);
    return res.render("my-rooms", {
        title: "My Rooms",
        myRooms
    })
};