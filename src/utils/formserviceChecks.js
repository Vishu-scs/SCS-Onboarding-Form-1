import { getPool1 } from "../db/db.js";

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

export {checkLocationOwnership, emailbyuserID }