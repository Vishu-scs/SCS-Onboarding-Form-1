import {getPool1} from '../db/db.js'
import { designationService } from '../services/formservice.js';

const getPincodeMap = async () => {
  const pool = await getPool1();
  const result = await pool.request().query(`
        select PinCodeCode , PinCodeName from PinCodeMaster where status = 1
  `);

  const pincodeMap = {};
  result.recordset.forEach(row => {
    pincodeMap[row.PinCodeCode] = row.PinCodeName;
  });

  return pincodeMap;
};
const getCityMap = async () => {
  const pool = await getPool1();
  const result = await pool.request().query(`
        select CityCode , CityName from CityMaster  where status = 1
  `);

  const cityMap = {};
  result.recordset.forEach(row => {
    cityMap[row.CityCode] = row.CityName;
  });

  return cityMap;
};
const getStateMap = async () => {
  const pool = await getPool1();
  const result = await pool.request().query(`
        Select StateCode , StateName from StateMaster where status = 1
  `);

  const stateMap = {};
  result.recordset.forEach(row => {
    stateMap[row.StateCode] = row.StateName;
  });

  return stateMap;
};

const getDesignationMap = async()=>{
    const result = await designationService()
    const designationMap = {};
    result.recordset.forEach(row=>{
        designationMap[row.ID] = row.Designation;
    });
}

const pdfmappingFunction = async (data) => {
  const [pincodeMap, cityMap, stateMap] = await Promise.all([
    getPincodeMap(),
    getCityMap(),
    getStateMap()
  ]);

  const designationResult = await designationService();
  const designationMap = {};
  designationResult.recordset.forEach(row => {
    designationMap[row.ID] = row.Designation;
  });

  // Map locations
  data.Dealer.Locations = data.Dealer.Locations.map(loc => {
    return {
      ...loc,
      Address: {
        ...loc.Address,
        Pincode: pincodeMap[loc.Address.PincodeID] || loc.Address.PincodeID,
        City: cityMap[loc.Address.CityID] || loc.Address.CityID,
        State: stateMap[loc.Address.StateID] || loc.Address.StateID,
      },
      Contacts: loc.Contacts.map(contact => ({
        ...contact,
        Designation: designationMap[contact.DesignationID] || contact.DesignationID
      }))
    };
  });
  return data;
};
export {pdfmappingFunction}