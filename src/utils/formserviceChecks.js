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

export {checkLocationOwnership}