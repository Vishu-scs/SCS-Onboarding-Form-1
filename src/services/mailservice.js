import nodemailer from "nodemailer"
import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

const finalSubmissionMail = (useremail , pdfPath) =>({
  from : process.env.EMAILID,
  to: useremail,
  cc: 'scope@sparecare.in,manish.sharma@sparecare.in',
  subject : `Onboarding With SpareCare`,
  html : `
  <p>Hi Team,</p>

<p>Welcome aboard !!</p>

<p>Thank you for sharing the details for the business association with <strong>Spare Care</strong>.</p>

<p>You may find the file attached to this email for your reference.</p>

<p>In case you find any discrepancies in the data entered, you may please mail the correct details to <a href="mailto:manish.sharma@sparecare.in">manish.sharma@sparecare.in</a>.</p>

<br>

<p>Thanks and Regards,<br>
<strong>Team Spare Care</strong></p>

  `,
    attachments: [
    {
      filename: path.basename(pdfPath),          
      path: path.resolve(__dirname, '../../pdf', path.basename(pdfPath)), 
      contentType: 'application/pdf'
    }
  ]

})
export {transporter,generateMailOptions,finalSubmissionMail}