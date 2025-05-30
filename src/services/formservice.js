import { getPool1, getPool2 } from '../db/db.js';
import { uploadToS3 ,deleteFromS3} from '../middlewares/multer.middleware.js';
import PdfPrinter from 'pdfmake';
import path from 'path';
import fs from 'fs'
import { fileURLToPath } from 'url';
import { dirname } from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pincodeService = async(pincode)=>{
try {
        const pool = getPool2()
        const query = `
        select pm.PinCodeName ,cm.CityName , sm.StateName ,pm.PinCodeCode, cm.CityCode , sm.StateCode  from pincodemaster pm
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
      WHERE DealerID = @dealerid AND Addedby = @userid AND Location = @location
    `;
    const existingLocationResult = await pool.request()
      .input('dealerid', dealerid)
      .input('userid', userid)
      .input('location', location)
      .query(existingLocationQuery);

    if (existingLocationResult.recordset.length > 0) {
      return {
        alreadyExists: true,
        locationId: existingLocationResult.recordset[0].LocationID
      };
    }

    const pincodeResult = await pool.request().query(`select PinCodeCode from PinCodeMaster where PinCodeName = ${pincodeid}`)
    const pincode = pincodeResult.recordset[0].PinCodeCode
    // Insert new location if not exists
    const insertResult = await pool.request()
      .input('Dealerid', dealerid)
      .input('Location', location)
      .input('Address', address)
      .input('Landmark', landmark)
      .input('PincodeID', pincode)
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

const pincodemasterService = async()=>{
try {
        const pool = await getPool1()
        const query = `select PinCodeCode,PinCodeName from PinCodeMaster where status = 1`
        const result = await pool.request().query(query)
        return result
} catch (error) {
        throw new Error(`pincodeService failed : ${error.message}`);
    }
}

const contactDetailsbyLocationService = async(locationId,designationId,Name,MobileNo,Email,userId)=>{
try {
        const pool = await getPool1()
        const checkQuery = `
      SELECT 1 FROM SCS_ONB_ContactDetails WHERE LocationID = @LocationID and DesignationID = @designationId
    `;
    const existing = await pool.request()
      .input('LocationID', locationId)
      .input('designationId',designationId )
      .query(checkQuery);

    if (existing.recordset.length > 0) {
      return {
        alreadyExists: true,
        message: "Contact details already exist for this LocationID and Designation"
      };
    }
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

// const taxdetailsService = async(locationId,tan,pan,gst,gstimg,userId)=>{
//   let url , key
// try {
//     const pool = await getPool1()
//         // Check if entry already exists for this LocationID
//     const checkQuery = `
//       SELECT 1 FROM SCS_ONB_TaxDetails WHERE LocationID = @LocationID
//     `;
//     const existing = await pool.request()
//       .input('LocationID', locationId)
//       .query(checkQuery);

//     if (existing.recordset.length > 0) {
//       return {
//         alreadyExists: true,
//         message: "Tax details already exist for this LocationID"
//       };
//     }
//   try {
//        const uploadResult  = await uploadToS3(gstimg);
//        url = uploadResult.url
//        key = uploadResult.key
//       //  console.log(url,key);
       

//   } catch (error) {
//     throw new Error(`Error in uploading gstimage to aws-s3: ${error.message}`);
//   }
//   const query = `
//                 INSERT INTO SCS_ONB_TaxDetails(LocationID,TAN,PAN,GST,GSTCertificate,Addedby)
//                 Values(@Locationid,@tan,@pan,@gst,@url,@userid)
//   `
//   const result = await pool.request()
//           .input('LocationID',locationId)
//           .input('tan',tan)
//           .input('pan',pan)
//           .input('gst',gst)
//           .input('url',url)
//           .input('userid',userId)
//           .query(query)
//   return result
// } catch (error) {
//   if(key){
//     await deleteFromS3(key);
//   }
//   throw new Error(`taxdetailsService failed : ${error.message}`);
// }
// }
const taxdetailsService = async (locationId, tan, pan, gst, fileObj, userId) => {
  let key = fileObj.key;
  let url = fileObj.url;

  try {
    const pool = await getPool1();

    // Check if tax details already exist
    const checkQuery = `SELECT 1 FROM SCS_ONB_TaxDetails WHERE LocationID = @LocationID`;
    const existing = await pool.request()
      .input('LocationID', locationId)
      .query(checkQuery);

    if (existing.recordset.length > 0) {
      return {
        alreadyExists: true,
        message: "Tax details already exist for this LocationID"
      };
    }

    // Use uploaded URL/key directly (skip S3 upload here)
    const query = `
      INSERT INTO SCS_ONB_TaxDetails(LocationID, TAN, PAN, GST, GSTCertificate, Addedby)
      VALUES (@Locationid, @tan, @pan, @gst, @url, @userid)
    `;

    const result = await pool.request()
      .input('Locationid', locationId)
      .input('tan', tan)
      .input('pan', pan)
      .input('gst', gst)
      .input('url', url)
      .input('userid', userId)
      .query(query);

    return result;

  } catch (error) {
    // Clean up uploaded image if first insert fails
    if (key) {
      await deleteFromS3(key);
    }
    throw new Error(`taxdetailsService failed: ${error.message}`);
  }
};

const bankdetailsService = async(locationId,accholdername , accno , bankname ,branchname, ifsc ,fileObj , userId)=>{
  let key = fileObj.key;
  let url = fileObj.url;

try {
    const pool = await getPool1()
        // ✅ Step 1: Check if entry already exists for this LocationID
    const checkQuery = `
      SELECT 1 FROM SCS_ONB_BankDetails WHERE LocationID = @LocationID
    `;
    const existing = await pool.request()
      .input('LocationID', locationId)
      .query(checkQuery);

    if (existing.recordset.length > 0) {
      return {
        alreadyExists: true,
        message: "Bank details already exist for this LocationID"
      };
    }
  const query = `
                INSERT INTO SCS_ONB_BankDetails(LocationID,AccountHolderName,AccountNumber,BankName,BranchName,IFSCCode,CheckImg,Addedby)
                Values(@Locationid,@Name,@accno,@bank,@branch,@ifsc,@checkimg,@userid)
  `
  const result = await pool.request()
          .input('LocationID',locationId)
          .input('Name',accholdername)
          .input('accno',accno)
          .input('bank',bankname)
          .input('branch',branchname)
          .input('ifsc',ifsc)
          .input('checkimg',url)
          .input('userid',userId)
          .query(query)
  return result
} catch (error) {
  if(key){
    await deleteFromS3(key);
  }
  throw new Error(`bankdetailsService failed : ${error.message}`);
}
}

const existingUserDataService = async(userid)=>{
try {
    const pool = await getPool1();
    const query = `
    select Brandid ,d.Dealerid , ld.LocationID, Dealer , OEMCode , Location , Address ,Landmark, PincodeID , CityID , StateID , Latitude , Longitude , DesignationID ,Name, MobileNo , Email , TAN , PAN , GST , GSTCertificate , AccountHolderName , AccountNumber, BankName , BranchName , IFSCCode , CheckImg
    from SCS_ONB_Dealer d 
    join  SCS_ONB_LocationDetails ld on ld.Dealerid = d.Dealerid
    left join SCS_ONB_ContactDetails cd  on cd.LocationID = ld.LocationID
    left join SCS_ONB_TaxDetails td  on td.LocationID = ld.LocationID
    left join SCS_ONB_BankDetails bd  on bd.LocationID = ld.LocationID
    where userid = ${userid}
    `
  const result = await pool.request().query(query)
  return result.recordset 
} catch (error) {
  throw new Error(`existingUserDataService failed : ${error.message}`);
}
}

const fetchContactDetailsService = async(isSame,designationId)=>{
try {
    const pool = await getPool1()
    const query = `select Name , MobileNo , Email from SCS_ONB_ContactDetails where locationid = ${isSame} and DesignationID = ${designationId}`
    const result = await pool.request().query(query)
    return result
} catch (error) {
  throw new Error(`fetchContactDetailsService failed: ${error.message}`);
}
}

const IFSCBAnkMappingService = async(ifsc)=>{
try {
    const pool = await getPool1()
    const query = `select IFSC , Bank from SCS_ONB_IFSCBAnkMapping where status = 1`
    const result = await pool.request().query(query)
    return result
} catch (error) {
  throw new Error(`IFSCBAnkMappingService failed: ${error.message}`);
}
}

const jsontoPDF = async (userid) => {
  try {
    const data = await existingUserDataService(userid);

    // ✅ Deduplicated and filtered arrays
    const uniqueDealers = Array.from(new Map(data.map(row => [row.Dealerid, row])).values());

    const uniqueLocations = Array.from(new Map(data.map(row => [row.LocationID, row])).values());

    const uniqueContacts = Array.from(
      new Map(data.map(row => [`${row.LocationID}-${row.DesignationID}`, row])).values()
    ).filter(row => row.Name || row.Email || row.MobileNo || row.DesignationID);

    const uniqueTax = Array.from(new Map(data.map(row => [row.LocationID, row])).values())
      .filter(row => row.TAN || row.PAN || row.GST || row.GSTCertificate);

    const uniqueBank = Array.from(new Map(data.map(row => [row.LocationID, row])).values())
      .filter(row =>
        row.AccountHolderName ||
        row.AccountNumber ||
        row.BankName ||
        row.BranchName ||
        row.IFSCCode ||
        row.CheckImg
      );

    // ✅ Table Definitions
    const dealerTable = [
      [{ text: 'Dealer Info', style: 'subheader', colSpan: 5, alignment: 'center' }, {}, {}, {}, {}],
      ['DealerID', 'BrandID', 'Dealer', 'OEMCode', 'UserID'],
      ...uniqueDealers.map(row => [row.Dealerid, row.Brandid, row.Dealer, row.OEMCode, userid])
    ];

    const locationTable = [
      [{ text: 'Location Info', style: 'subheader', colSpan: 7, alignment: 'center' }, {}, {}, {}, {}, {}, {}],
      ['LocationID', 'Location', 'Address', 'Landmark', 'CityID', 'StateID', 'PincodeID'],
      ...uniqueLocations.map(row => [row.LocationID, row.Location, row.Address, row.Landmark, row.CityID, row.StateID, row.PincodeID])
    ];

    const contactTable = [
      [{ text: 'Contact Info', style: 'subheader', colSpan: 4, alignment: 'center' }, {}, {}, {}],
      ['Name', 'Email', 'MobileNo', 'DesignationID'],
      ...uniqueContacts.map(row => [row.Name, row.Email, row.MobileNo, row.DesignationID])
    ];

    const taxTable = [
      [{ text: 'Tax Info', style: 'subheader', colSpan: 4, alignment: 'center' }, {}, {}, {}],
      ['TAN', 'PAN', 'GST', 'GST Certificate'],
      ...uniqueTax.map(row => [row.TAN, row.PAN, row.GST, row.GSTCertificate])
    ];

    const bankTable = [
      [{ text: 'Bank Info', style: 'subheader', colSpan: 6, alignment: 'center' }, {}, {}, {}, {}, {}],
      ['Account Holder', 'Account No', 'Bank Name', 'Branch', 'IFSC', 'Check Image'],
      ...uniqueBank.map(row => [
        row.AccountHolderName,
        row.AccountNumber,
        row.BankName,
        row.BranchName,
        row.IFSCCode,
        row.CheckImg
      ])
    ];

    // ✅ Font Setup (ensure these fonts exist in the specified folder)
    const fonts = {
      Roboto: {
        normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, 'fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, 'fonts/Roboto-MediumItalic.ttf')
      }
    };

    const printer = new PdfPrinter(fonts);

    // ✅ PDF Document Layout
    const docDefinition = {
      content: [
        { text: `User Data Report - UserID: ${userid}`, style: 'header' },

        { table: { body: dealerTable }, layout: 'lightHorizontalLines' },
        { text: '', pageBreak: 'after' },

        { table: { body: locationTable }, layout: 'lightHorizontalLines' },
        { text: '', pageBreak: 'after' },

        { table: { body: contactTable }, layout: 'lightHorizontalLines' },
        { text: '', pageBreak: 'after' },

        { table: { body: taxTable }, layout: 'lightHorizontalLines' },
        { text: '', pageBreak: 'after' },

        { table: { body: bankTable }, layout: 'lightHorizontalLines' }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 10]
        }
      },
      defaultStyle: {
        fontSize: 9
      }
    };

    // ✅ Create PDF and return path
    const pdfPath = `./pdf/user_${userid}_report.pdf`;
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(pdfPath));
    pdfDoc.end();

    console.log(`✅ PDF created at: ${pdfPath}`);
    return pdfPath;

  } catch (error) {
    throw new Error(`jsontoPDF failed: ${error.message}`);
  }
};


export {IFSCBAnkMappingService,fetchContactDetailsService,jsontoPDF,existingUserDataService,pincodemasterService,pincodeService,createDealerService,createLocationService,designationService,contactDetailsbyLocationService,taxdetailsService,bankdetailsService}