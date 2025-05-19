import nodemailer from "nodemailer"
import 'dotenv/config'
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAILID,
    pass: process.env.EMAILPASSWORD,
  },
});

const generateMailOptions = (useremail, OTP) => ({
  from: process.env.EMAILID,
  to: useremail,
  subject: `SpareCare Onboarding Login OTP`,
  html: `
    <p>Hi User,</p>
    <p>Thank you for choosing us. This is an automated response so please don't reply.</p>
    <p><strong>Your OTP : ${OTP}</strong></p>
    <p>Regards,<br/>Team SpareCare</p>`
});

export {transporter,generateMailOptions}