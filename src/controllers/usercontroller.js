import { findUserService , createUserService, userinfoService, dealerIdbyuserId } from "../services/userservices.js";
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
    if (existingUserId) {
        await transaction.rollback();
      return res.status(400).json({ message: `Email already exists` });
    }

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


// const login = async(req,res)=>{
//     const { email } = req.body;
//     const pool = await getPool1();
//     const transaction = await pool.transaction()
//     if(!email || !validator.isEmail(email)){
//         return res.status(400).json({
//             message:`Invalid Email`
//         })
//     }
//     await transaction.begin();
//     const existingUserId = await findUserService(pool, email);
//     if (!existingUserId) {
//         await transaction.rollback();
//       return res.status(400).json({ message: `Email Not Registered` });
//     }
//     const OTP = Math.floor(100000 + Math.random() * 900000); 
//     const mailOptions = generateMailOptions(email, OTP);

//     await transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.error('Error sending email:', error);
//         return res.status(500).json({ Error: 'Failed to send mail' });
//       }
//     });
//     const hashedOTP = await bcrypt.hash(OTP.toString(), 10);
//     // const isMatch = await bcrypt.compare(OTP.toString(),hashedOTP.toString());
//     // console.log(isMatch);
//     const data = await existingLoginData(existingUserId)
//     const rawData = data; // e.g., res.recordset
// const grouped = {};

// rawData.forEach(row => {
//   const locId = row.LocationID;

//   if (!grouped[locId]) {
//     grouped[locId] = {
//       LocationID: row.LocationID,
//       Brandid: row.Brandid,
//       Dealerid: row.Dealerid,
//       Dealer: row.Dealer,
//       OEMCode: row.OEMCode,
//       Location: row.Location,
//       Address: row.Address,
//       Landmark: row.Landmark,
//       PincodeID: row.PincodeID,
//       CityID: row.CityID,
//       StateID: row.StateID,
//       Latitude: row.Latitude,
//       Longitude: row.Longitude,
//       Contacts: [],
//       TaxDetails: {
//         TAN: row.TAN,
//         PAN: row.PAN,
//         GST: row.GST,
//         GSTCertificate: row.GSTCertificate
//       },
//       BankDetails: {
//         AccountHolderName: row.AccountHolderName,
//         AccountNumber: row.AccountNumber,
//         BankName: row.BankName,
//         BranchName: row.BranchName,
//         IFSCCode: row.IFSCCode,
//         CheckImg: row.CheckImg
//       }
//     };
//   }

//   // Add contact if Name and Email exist
//   if (row.Name || row.Email) {
//     grouped[locId].Contacts.push({
//       DesignationID: row.DesignationID,
//       Name: row.Name,
//       MobileNo: row.MobileNo,
//       Email: row.Email
//     });
//   }
// });

// const finalResult = Object.values(grouped);

// // res.status(200).json({
// //   success: true,
// //   message: "Onboarding data fetched successfully",
// //   data: finalResult
// // });

//     await transaction.commit();
//     return res.status(200).json({
//       message: "User LoggedIn successfully",
//       otp: hashedOTP ,
//       userId:existingUserId,
//       Data:finalResult
//     });
// }
const login = async (req, res) => {
  const { email } = req.body;

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ message: "Invalid Email" });
  }

  try {
    const pool = await getPool1();
    const existingUserId = await findUserService(pool, email);

    if (!existingUserId) {
      return res.status(400).json({ message: "Email Not Registered" });
    }

    const OTP = Math.floor(100000 + Math.random() * 900000);
    const hashedOTP = await bcrypt.hash(OTP.toString(), 10);

    const mailOptions = generateMailOptions(email, OTP);
    await transporter.sendMail(mailOptions); // ✅ properly awaited

    const dealerID = await dealerIdbyuserId(existingUserId)
    return res.status(200).json({
      message: "User LoggedIn successfully",
      otp: hashedOTP,
      userId: existingUserId,
      dealerId:dealerID
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: error.message });
  }
};

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