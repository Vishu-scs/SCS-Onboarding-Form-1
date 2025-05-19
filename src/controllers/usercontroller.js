import { findUserService , createUserService, userinfoService } from "../services/userservices.js";
import { transporter, generateMailOptions } from "../services/mailservice.js"; // adjusted import
import bcrypt from "bcryptjs";
import { getPool1 } from "../db/db.js";
import  validator  from "validator";

const createUser = async (req, res) => {
  try {
    const { email } = req.body;
    const pool = await getPool1();
    const transaction = await pool.transaction()
    if(!email || !validator.isEmail(email)){
        return res.status(400).json({
            message:`Invalid Email`
        })
    }
    await transaction.begin();
    const existingUserId = await findUserService(pool, email);
    // if (existingUserId) {
    //     await transaction.rollback();
    //   return res.status(400).json({ message: `Email already exists` });
    // }

    const newUserId = await createUserService(pool,email);
    if (!newUserId) {
        await transaction.rollback();
      return res.status(500).json({ message: `Unable to create user` });
    }

    const OTP = Math.floor(100000 + Math.random() * 900000); 
    const mailOptions = generateMailOptions(email, OTP);

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ Error: 'Failed to send mail' });
      }
    });
    const hashedOTP = await bcrypt.hash(OTP.toString(), 10);
    // const isMatch = await bcrypt.compare(OTP.toString(),hashedOTP.toString());
    // console.log(isMatch);
    
    await transaction.commit();
    return res.status(200).json({
      message: "User created successfully",
      userId: newUserId,
      otp: hashedOTP 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const login = async(req,res)=>{
    const { email } = req.body;
    const pool = await getPool1();
    const transaction = await pool.transaction()
    if(!email || !validator.isEmail(email)){
        return res.status(400).json({
            message:`Invalid Email`
        })
    }
    await transaction.begin();
    const existingUserId = await findUserService(pool, email);
    if (!existingUserId) {
        await transaction.rollback();
      return res.status(400).json({ message: `Email Not Registered` });
    }
    const OTP = Math.floor(100000 + Math.random() * 900000); 
    const mailOptions = generateMailOptions(email, OTP);

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ Error: 'Failed to send mail' });
      }
    });
    const hashedOTP = await bcrypt.hash(OTP.toString(), 10);
    // const isMatch = await bcrypt.compare(OTP.toString(),hashedOTP.toString());
    // console.log(isMatch);
    
    await transaction.commit();
    return res.status(200).json({
      message: "User LoggedIn successfully",
      otp: hashedOTP ,
      userId:existingUserId
    });
}

// const userInfo = async(req,res)=>{
// try {
//         const {userId} = req.body
//         if(!userId){
//             return res.status(400).json({
//                 message:`userId is required`
//             })
//         }
//         const data = await userinfoService(userId)
//         console.log(data.recordset[0].Role);
        
// } catch (error) {
//     res.status(500).json({

//     })   
// }
    
// }

export {createUser , login}