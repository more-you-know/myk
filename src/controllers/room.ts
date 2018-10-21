import { Request, Response } from "express";
import { default as Room, RoomModel } from "../models/Room";
import { Transporter } from "../config/mailer";
import { PlatformConfig } from "../config/platform";
import LearningResource from "../models/LearningResource";
import User, { UserModel } from "../models/User";
import { default as mongoose, Types} from "mongoose";
import { base64, unbase64 } from "../util/base64";

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
export let postCreateRoom = async (req: Request, res: Response) => {
    console.log(req.body);
    req.assert("name", "Room name cannot be blank").notEmpty();
    req.assert("student_email", "You must add learners to the room").notEmpty();
    req.assert("student_parent1_email", "You must add parents to the room").notEmpty();
    req.assert("student_parent2_email", "You must add parents to the room").notEmpty();
    req.assert("standard", "You must set a curriculum standard for the room").notEmpty();

    const errors = req.validationErrors();

    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/rooms/create");
    }

    let learners: {[key: string]: {parent_emails: string[]}} = {};

    req.body.student_email.forEach((item, idx) => {
        let learnerEmail = base64(item);
        learners[learnerEmail] = {parent_emails: [base64(req.body.student_parent1_email[idx])]};
        if (req.body.student_parent2_email[idx] && req.body.student_parent2_email[idx] !== '') {
           learners[learnerEmail].parent_emails.push(base64(req.body.student_parent2_email[idx]));
        }
    });

    let syllabusInput: string[] = [];

    for (let key of Object.keys(req.body)) {
        console.log(key);
        if (key.startsWith("resource-check-")) {
            syllabusInput.push(req.body[key]);
        }
    }

    let syllabus = [];
    let initSyllabusLearners = {};
    for (let learnerEmail of Object.keys(learners)) {
        initSyllabusLearners[learnerEmail] = {
            blocked: false,
            viewed: false
        }
    }

    for (let resId of syllabusInput) {
        syllabus.push({
            resource_id: resId,
            learners: initSyllabusLearners
        })
    }

    console.log(syllabus);

    let room = new Room({
        name: req.body.name,
        admin_id: req.user.id,
        open_for_learners: false,
        standard: req.body.standard,
        learners,
        syllabus
    }) as RoomModel;

    try {
        await room.save();
    } catch (err) {
        console.log(err);
        req.flash("errors", [{msg: err}]);
        return res.redirect("/rooms/create");
    }

    let mailErrors = [];

    for (let learnerEmail of Object.keys(learners)) {
        for (let parentEmail of learners[learnerEmail].parent_emails) {
            const mailOptions = {
                to: unbase64(parentEmail),
                from: `More You Know <no-reply@moreyouknow.co>`,
                subject: `Join the ${room.name} Classroom as a Parent`,
                text: `Join the ${room.name} Room Here: <a href="${PlatformConfig.url}/rooms/${room.id}">Join!</a>`
            };
            Transporter.sendMail(mailOptions, (err) => {
                if (err) {
                    console.log("mail error ", err);
                    mailErrors.push({ msg: err.message })
                }
            });
        }
    }

    if (mailErrors.length > 0) {
        req.flash("errors", mailErrors);
        return res.redirect("/rooms/create");
    }

    return res.redirect(`/rooms/${room.id}`);
};

export let downloadCSV = async (req: Request, res: Response) => {
    res.set({"Content-Disposition":"attachment; filename=\"export.csv\""});
    return res.send("demo");
};

export let inviteStudents = async (req: Request, res: Response) => {
    let room = await Room.findById(req.params.roomId).exec() as RoomModel;
    if (room.admin_id !== req.user.id) {
        req.flash("errors", {msg:'Unauthorized to perform this action'});
        return res.redirect(`/rooms/${room.id}`)
    }
    let mailErrors = [];
    for (let learnerEmail of Object.keys(room.learners)) {
        const mailOptions = {
            to: unbase64(learnerEmail),
            from: `More You Know <no-reply@moreyouknow.co>`,
            subject: `Join the ${room.name} Room as a Learner`,
            text: `Join the ${room.name} Room Here: <a href="${PlatformConfig.url}/rooms/${room.id}/learners/${learnerEmail}/join">Join!</a>`
        };
        Transporter.sendMail(mailOptions, (err) => {
            if (err) {
                mailErrors.push({msg: err.message})
            }
        });
    }
    room.open_for_learners = true;
    await room.save();
    if (mailErrors.length > 0) {
        req.flash("errors", mailErrors);
    }
    return res.redirect(`/rooms/${room.id}`);
};

export let getCreateRoom = async (req: Request, res: Response) => {
    let learningResources = await LearningResource.find({}).exec();
    return res.render("create-room", {
        title: "Create Room",
        resources: learningResources,
        standards: [
            "california-grade-9",
            "colorado-grade-5",
            "custom"
        ]
    })
};

export let getRoom = async (req: Request, res: Response) => {
    let room = await Room.findById(req.params.roomId).exec() as RoomModel;
    let role = "none";
    let kidEmail = null;
    if (room.admin_id === req.user.id) {
        role = "admin";
    } else if (Object.keys(room.learners).indexOf(base64(req.user.email)) > -1 && room.open_for_learners) {
        role = "learner";
    } else {
        Object.keys(room.learners).forEach(learnerEmail => {
            if (room.learners[learnerEmail].parent_emails.indexOf(req.user.id) > -1) {
                role = "parent";
                kidEmail = learnerEmail;
            }
        })
    }

    if (role === "none") {
        return res.redirect("/rooms");
    }

    let admin = await User.findById(room.admin_id).exec() as UserModel;

    let resources = await LearningResource.find({
        '_id': { $in: room.syllabus.map(item => Types.ObjectId(item.resource_id)) }
    });

    let respData = {
        title: room.name,
        id: room.id,
        name: room.name,
        admin: admin.profile,
        open_for_learners: room.open_for_learners,
        standard: room.standard,
        role
    } as any;

    if (role === "admin") {
        respData.syllabus = room.syllabus.map(item => {
            return Object.assign({resource: resources.find(resource => resource.id === item.resource_id)}, item)
        });
        respData.learners = [];
        for (let learnerEmail of Object.keys(room.learners)) {
            let prog = [];
            for (let syllabusItem of room.syllabus) {
                prog.push(syllabusItem.learners[learnerEmail]);
            }
            respData.learners.push({
                email: unbase64(learnerEmail),
                progress: prog
            })
        }
    } else if (role === "learner") {
        let syllabus = [];
        for (let item of room.syllabus) {
            if (!item.learners[base64(req.user.email)].blocked) {
                syllabus.push({
                    resource: resources.find(resource => resource.id === item.resource_id),
                    viewed: item.learners[base64(req.user.email)].viewed
                })
            }
        }
        respData.syllabus = syllabus;
    } else if (role === "parent") {
        let syllabus = [];
        for (let item of room.syllabus) {
            syllabus.push({
                resource: resources.find(resource => resource.id === item.resource_id),
                blocked: item.learners[kidEmail].blocked
            })
        }
        respData.syllabus = syllabus;
    }

    console.log(respData);
    return res.render("view-room", respData);
};

export let getMyRooms = async (req: Request, res: Response) => {
    let allRooms = await Room.find({}).exec() as RoomModel[];
    let myRooms = allRooms.filter(room => {
        if (room.admin_id === req.user.id) {
            return true;
        }
        if (Object.keys(room.learners).indexOf(base64(req.user.email)) > -1 && room.open_for_learners) {
            return true;
        }
        let isParentInRoom = false;
        Object.keys(room.learners).forEach(learnerEmail => {
            if (room.learners[learnerEmail].parent_emails.indexOf(base64(req.user.email)) > -1) {
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
    });
};

export let markContentViewed = async(req: Request, res: Response) => {
    let room = await Room.findById(req.params.roomId).exec() as RoomModel;
    let role = "none";
    if (room.admin_id === req.user.id) {
        role = "admin";
    } else if (Object.keys(room.learners).indexOf(base64(req.user.email)) > -1 && room.open_for_learners) {
        role = "learner";
    } else {
        Object.keys(room.learners).forEach(learnerEmail => {
            if (room.learners[learnerEmail].parent_emails.indexOf(req.user.id) > -1) {
                role = "parent";
            }
        })
    }

    if (role !== 'learner') {
        return res.status(200).send();
    }

    let syllabusItemIdx = room.syllabus.findIndex(item => item.resource_id === req.params.resourceId);
    if (!room.syllabus[syllabusItemIdx].learners[base64(req.user.email)].blocked) {
        room.syllabus[syllabusItemIdx].learners[base64(req.user.email)].viewed = true;
        await room.save();
    }
    return res.status(200).send();
};

export let blockContent = async(req: Request, res: Response) => {
    let room = await Room.findById(req.params.roomId).exec() as RoomModel;
    let role = "none";
    if (room.admin_id === req.user.id) {
        role = "admin";
    } else if (Object.keys(room.learners).indexOf(base64(req.user.email)) > -1 && room.open_for_learners) {
        role = "learner";
    } else {
        Object.keys(room.learners).forEach(learnerEmail => {
            if (room.learners[learnerEmail].parent_emails.indexOf(req.user.id) > -1) {
                role = "parent";
            }
        })
    }

    if (role !== 'parent') {
        return res.redirect(`/rooms/${room.id}`)
    }

    // TODO block the content
};
