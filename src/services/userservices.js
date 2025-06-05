import { getPool1 } from "../db/db.js";

const createUserService = async (pool , email) => {
    try {
    //   const pool = await getPool1();
      const result = await pool.request()
        .input('email', email)
        .query(`
          INSERT INTO SCS_ONB_User (Email)
          OUTPUT INSERTED.UserID
          VALUES (@email)
        `);
  
      return result.recordset[0]?.UserID || null;
    } catch (error) {
      throw new Error(`createUserService failed: ${error.message}`);
    }
  };
  
const findUserService = async (pool ,email) => {
    try {
    //   const pool = await getPool1();
      const result = await pool.request()
        .input('email', email)
        .query(`SELECT UserID FROM SCS_ONB_User WHERE Email = @email`);
      return result.recordset[0]?.UserID || null;
    } catch (error) {
      throw new Error(`findUserService failed: ${error.message}`);
    }
};

const userinfoService = async(userid)=>{
try {
        const pool = await getPool1()
        const query = `select rm.Role from adminmaster_gen amg 
                        join Role_Master rm on rm.bigid = amg.Designation
                        where bintId_Pk = ${userid}`
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`userinfoService failed: ${error.message}`);
}
}

const dealerIdbyuserId = async(userId)=>{
try {
    const pool = await getPool1()
    const query = `select * from SCS_ONB_Dealer where  addedby = ${userId}`
    const result = await pool.request().query(query)
    return result.recordset[0].Dealerid
} catch (error) {
  
}
}

export {findUserService , createUserService , userinfoService , dealerIdbyuserId}