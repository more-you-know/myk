import { Transporter } from "../config/mailer";
import { Request, Response } from "express";

/**
 * GET /contact
 * Contact form page.
 */
export let getContact = (req: Request, res: Response) => {
  res.render("contact", {
    title: "Contact"
  });
};

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
export let postContact = (req: Request, res: Response) => {
  req.assert("name", "Name cannot be blank").notEmpty();
  req.assert("email", "Email is not valid").isEmail();
  req.assert("message", "Message cannot be blank").notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/contact");
  }

  const mailOptions = {
    to: "your@email.com",
    from: `${req.body.name} <${req.body.email}>`,
    subject: "Contact Form",
    text: req.body.message
  };

  Transporter.sendMail(mailOptions, (err) => {
    if (err) {
      req.flash("errors", { msg: err.message });
      return res.redirect("/contact");
    }
    req.flash("success", { msg: "Email has been sent successfully!" });
    res.redirect("/contact");
  });
};
