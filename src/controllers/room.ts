import { Request, Response } from "express";
import { default as Room, RoomModel } from "../models/Room";
import { Transporter } from "../config/mailer";
import { PlatformConfig } from "../config/platform";
import LearningResource from "../models/LearningResource";
import User, { UserModel } from "../models/User";
import * as mongoose from "mongoose";

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

    let learners = JSON.parse(req.body.learners) as {[key: string]: {parent_emails: string[]}};
    let syllabusInput = JSON.parse(req.body.syllabus) as string[];

    let syllabus = [];
    let initSyllabusLearners = {};
    for (let learnerEmail of Object.keys(learners)) {
        initSyllabusLearners[learnerEmail] = {
            allowed: false,
            viewed: false
        }
    }
    for (let resId of syllabusInput) {
        syllabus.push({
            resource_id: resId,
            learners: initSyllabusLearners
        })
    }

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
        for (let parentEmail of learners[learnerEmail].parent_emails) {
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

export let getCreateRoom = async (req: Request, res: Response) => {
    let learningResources = await LearningResource.find({}).exec();
    return res.render("create-room", {
        title: "Create Room",
        resources: learningResources
    })
};

export let getRoom = async (req: Request, res: Response) => {
    let room = await Room.findById(req.params.roomId).exec() as RoomModel;
    let role = "none";
    let kidEmail = null;
    if (room.admin_id === req.user.id) {
        role = "admin";
    } else if (Object.keys(room.learners).indexOf(req.user.email) > -1) {
        role = "learner";
    } else {
        Object.keys(room.learners).forEach(learnerEmail => {
            if (room.learners[learnerEmail].parent_emails.indexOf(req.user.id) > -1) {
                role = "parent";
                kidEmail = learnerEmail;
            }
        })
    }

    let admin = await User.findById(room.admin_id).exec() as UserModel;

    if (role === "none") {
        return res.redirect("/rooms")
    }

    let resources = await LearningResource.find({
        '_id': { $in: room.syllabus.map(item => mongoose.Types.ObjectId(item.resource_id)) }
    });

    let respData = {
        title: room.name,
        admin: admin.profile,
        role
    } as any;

    if (role === "admin") {
        respData.syllabus = room.syllabus.map(item => {
            return Object.assign({resource: resources.find(resource => resource.id === item.resource_id)}, item)
        });
    } else if (role === "learner") {
        let syllabus = [];
        for (let item of room.syllabus) {
            if (item.learners[req.user.email].allowed) {
                syllabus.push({
                    resource: resources.find(resource => resource.id === item.resource_id),
                    viewed: item.learners[req.user.email].viewed
                })
            }
        }
        respData.syllabus = syllabus;
    } else if (role === "parent") {
        let syllabus = [];
        for (let item of room.syllabus) {
            syllabus.push({
                resource: resources.find(resource => resource.id === item.resource_id),
                allowed: item.learners[kidEmail].allowed
            })
        }
        respData.syllabus = syllabus;
    }

    return res.render("view-room", respData);
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
