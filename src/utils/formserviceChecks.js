import { getPool1 } from "../db/db.js";
import sql from 'mssql'

const checkLocationOwnership = async (locationId, userId) => {
  const pool = await getPool1();
  const result = await pool.request()
    .input('LocationID', sql.Int, locationId)
    .input('UserID', sql.Int, userId)
    .query(`
      SELECT 1 FROM SCS_ONB_LocationDetails 
      WHERE LocationID = @LocationID AND AddedBy = @UserID
    `);
  return result.recordset.length > 0;
};

const emailbyuserID = async(userid)=>{
try {
        const pool = await getPool1()
        const query = `use [z_scope] select Email from SCS_ONB_User where UserId = ${userid}`
        const result = await pool.request().query(query)
        
        return result.recordset[0].Email
} catch (error) {
    throw new Error(`emailbyuserID failed : ${error.message}`);
}

}

// const updateMailforUser = async(userid)=>{
//   try {
//     const pool = await getPool1()
//     const query = `use [z_scope] Update SCS_ONB_USER set isFinalMailSent = 1 , MailSentON = getdate() where userid = ${userid}`
//     await pool.request().query(query)
//     return 1;
//     }
//    catch (error) {
//     throw new Error(`updateMailforUser failed : ${error.message}`)
//   }
// }


const updateMailforUser = async (userid, transaction) => {
  try {
    const request = transaction.request(); // Use the active transaction
    const query = `
      UPDATE SCS_ONB_USER
      SET isFinalMailSent = 1, MailSentON = GETDATE()
      WHERE userid = @userid
    `;
    await request.input('userid', sql.Int, userid).query(query);
    return 1;
  } catch (error) {
    throw new Error(`updateMailforUser failed: ${error.message}`);
  }
};

const isMailSent = async(userid)=>{
  const pool = await getPool1()
  const query = ` use [z_scope] select isFinalMailSent from SCS_ONB_User where UserId = ${userid} `
  const result = await pool.request().query(query)
  const isSent = result.recordset[0].isFinalMailSent
  if(isSent == 1){
    return 1
  }
}
export {checkLocationOwnership, emailbyuserID , updateMailforUser , isMailSent}