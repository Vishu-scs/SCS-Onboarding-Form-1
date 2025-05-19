import sql from 'mssql'
import { getPool1, getPool2 } from '../db/db.js';



const pincodeService = async(pincode)=>{
try {
        const pool = getPool2()
        const query = `
        select pm.PinCodeName ,cm.CityName , sm.StateName from pincodemaster pm
        join citymaster cm on cm.CityCode = pm.CityCode
        join statemaster sm on sm.StateCode = cm.StateCode
        where PinCodeName = ${pincode}`

        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`pincodeService failed: ${error.message}`);
    
}
}
const createDealerService = async (brandid, dealer, userid, oemcode) => {
    try {
      const pool = await getPool1();
  
      // First check if the dealer already exists for the brand
      const existingDealer = `
        SELECT DealerID FROM SCS_ONB_Dealer 
        WHERE Brandid = @brandid AND Dealer = @dealer AND OEMCode = @oemcode
      `;
      const existingDealerResult = await pool.request()
        .input('brandid', brandid)
        .input('dealer', dealer)
        .input('oemcode', oemcode)
        .query(existingDealer);
  
      if (existingDealerResult.recordset.length > 0) {
        return {
          alreadyExists: true,
          dealerId: existingDealerResult.recordset[0].DealerID
        };
      }
  
      // Insert if not exists
      const insertResult = await pool.request()
        .input('brandid', brandid)
        .input('dealer', dealer)
        .input('oemcode', oemcode)
        .input('userid', userid)
        .query(`
          INSERT INTO SCS_ONB_Dealer (Brandid, Dealer, OEMCode, AddedBy, UserID)
          OUTPUT INSERTED.DealerID
          VALUES (@brandid, @dealer, @oemcode, @userid, @userid)
        `);
  
      return {
        created: true,
        dealerId: insertResult.recordset[0].DealerID
      };
  
    } catch (error) {
      throw new Error(`createDealerService failed: ${error.message}`);
    }
  };

const createLocationService = async (
  dealerid, location, address, landmark, pincodeid, cityid, stateid,
  latitude, longitude, sims, gainer, audit, userid
) => {
  try {
    const pool = await getPool1();

    // Check if location already exists for this dealer and user
    const existingLocationQuery = `
      SELECT LocationID FROM SCS_ONB_LocationDetails
      WHERE DealerID = @dealerid AND Addedby = @userid
    `;
    const existingLocationResult = await pool.request()
      .input('dealerid', dealerid)
      .input('userid', userid)
      .query(existingLocationQuery);

    if (existingLocationResult.recordset.length > 0) {
      return {
        alreadyExists: true,
        locationId: existingLocationResult.recordset[0].LocationID
      };
    }

    // Insert new location if not exists
    const insertResult = await pool.request()
      .input('Dealerid', dealerid)
      .input('Location', location)
      .input('Address', address)
      .input('Landmark', landmark)
      .input('PincodeID', pincodeid)
      .input('CityID', cityid)
      .input('StateID', stateid)
      .input('Latitude', latitude)
      .input('Longitude', longitude)
      .input('SIMS', sims)
      .input('Gainer', gainer)
      .input('Audit', audit)
      .input('Addedby', userid)
      .query(`
        INSERT INTO SCS_ONB_LocationDetails
          (Dealerid, Location, Address, Landmark, PincodeID, CityID, StateID,
           Latitude, Longitude, SIMS, Gainer, Audit, Addedby)
        OUTPUT INSERTED.LocationID, INSERTED.Location
        VALUES
          (@Dealerid, @Location, @Address, @Landmark, @PincodeID, @CityID, @StateID,
           @Latitude, @Longitude, @SIMS, @Gainer, @Audit, @Addedby)
      `);

    return {
      created: true,
      LocationID: insertResult.recordset[0].LocationID,
      Location: insertResult.recordset[0].Location
    };

  } catch (error) {
    throw new Error(`createLocationService failed: ${error.message}`);
  }
};
const designationService = async()=>{
try {
        const pool = await getPool1()
        const query = `select ID , Designation from SCS_ONB_DesignationMaster`
        const result = await pool.request().query(query)
        return result
} catch (error) {
        throw new Error(`designationService failed : ${error.message}`);
    }
}

const contactDetailsbyLocationService = async(locationId,designationId,Name,MobileNo,Email,userId)=>{
try {
        const pool = await getPool1()
        const query = `
        INSERT INTO SCS_ONB_ContactDetails(LocationID,DesignationID,Name,MobileNo,Email,Addedby)
        Values(@LocationID,@DesignationID,@Name,@MobileNo,@Email,@Addedby)
        `
        const result = await pool.request()
        .input('LocationID',locationId)
        .input('DesignationID',designationId)
        .input('Name',Name)
        .input('MobileNo',MobileNo)
        .input('Email',Email)
        .input('Addedby',userId)
        .query(query)
        return result 
} catch (error) {
    throw new Error(`contactDetailsbyLocationService failed: ${error.message}`);   
}
}

const taxdetailsService = async(locationId,tan,pan,gst)=>{
  const pool = await getPool1()


}
const bankdetailsService = async(locationId,name,accno,bankname,branchname,ifsc)=>{
  const pool = await getPool1()


}


export {pincodeService,createDealerService,createLocationService,designationService,contactDetailsbyLocationService,taxdetailsService,bankdetailsService}