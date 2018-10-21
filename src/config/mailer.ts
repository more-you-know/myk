import nodemailer from "nodemailer";

export const Transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.sendgrid.net",
    secure: true,
    auth: {
        user: "apikey",
        pass: process.env.SG_API_KEY
    },
    authMethod: "PLAIN"
});
