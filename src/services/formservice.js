import { getPool1, getPool2 } from '../db/db.js';
import { uploadToS3 ,deleteFromS3} from '../middlewares/multer.middleware.js';
import sql from 'mssql'
import PdfPrinter from 'pdfmake';
import path from 'path';
import fs from 'fs'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { transformDealerData } from '../utils/jsondataformatter.js';
import { pdfmappingFunction } from '../utils/mappingfunction.js';
import { formatDateTime } from '../utils/dateformatter.js';



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
       let associatedLocations;
    try {
        const associatedLocationsQuery = `select LocationID , Location from SCS_onb_locationdetails where dealerid = (select dealerid from SCS_onb_locationdetails where locationid = ${insertResult.recordset[0].LocationID}  )and Addedby = ${userid}`
         associatedLocations =  await pool.request().query(associatedLocationsQuery)
    } catch (error) {
        throw new Error(`associatedLocationsQuery failed: Error in Fetching Associated Locations \n ${error.message}`);
    }
    // console.log(associatedLocations);
    // console.log(associatedLocations.recordset);
    // const location = insertResult.recordset[0].LocationID

    if(associatedLocations.recordset.length != 0){
        
      const autoAssignOwner = await assignOwnerforExistingLocation(insertResult.recordset[0].LocationID,userid)
      // console.log(autoAssignOwner);
      
    }
        return {
      created: true,
      Locations : associatedLocations.recordset

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

const contactDetailsbyLocationService = async (contactList) => {
  const pool = await getPool1();
  const transaction = new sql.Transaction(pool); 
  const results = [];

  try {
    await transaction.begin();

    for (const contact of contactList) {
      const { locationName: locationIds, designation, name, phone, email, userId } = contact;

      for (const locationId of locationIds) {
        //  Create request bound to transaction
        const checkRequest = new sql.Request(transaction);

        //Check locationid and userID mapping (Check for locationid which must be created by supplied userId)
         const locationCheckRequest = new sql.Request(transaction);
        const locationCheck = await locationCheckRequest
          .input('LocationID', locationId)
          .input('UserID', userId)
          .query(`
            SELECT 1 FROM SCS_ONB_LocationDetails 
            WHERE LocationID = @LocationID AND AddedBy = @UserID
          `);

        if (locationCheck.recordset.length === 0) {
          results.push({
            locationId,
            designation,
            status: 'error',
            message: `LocationID ${locationId} is not created by userId ${userId}`
          });
          continue;
        }
        
        // Check for existing record
        const checkQuery = `
          SELECT 1 FROM SCS_ONB_ContactDetails 
          WHERE LocationID = @LocationID AND DesignationID = @designationId
        `;
        const existing = await checkRequest
          .input('LocationID', locationId)
          .input('designationId', designation)
          .query(checkQuery);

        if (existing.recordset.length > 0) {
          results.push({
            locationId,
            designation,
            status: 'duplicate',
            message: 'Contact already exists'
          });
          continue;
        }

        
        

        // ✅ Create another request bound to transaction
        const insertRequest = new sql.Request(transaction);
        const insertQuery = `
          INSERT INTO SCS_ONB_ContactDetails 
          (LocationID, DesignationID, Name, MobileNo, Email, Addedby)
          VALUES 
          (@LocationID, @DesignationID, @Name, @MobileNo, @Email, @Addedby)
        `;
        await insertRequest
          .input('LocationID', locationId)
          .input('DesignationID', designation)
          .input('Name', name)
          .input('MobileNo', phone)
          .input('Email', email)
          .input('Addedby', userId)
          .query(insertQuery);

        results.push({
          locationId,
          designation,
          status: 'inserted',
          message: 'Contact inserted successfully'
        });
      }
    }

    await transaction.commit();
    return results;

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    throw new Error(`Transaction failed: ${error.message}`);
  }
};

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
    select Brandid ,d.Dealerid , ld.LocationID, d.Dealer , OEMCode , Location , Address ,Landmark, PincodeID, pm.PinCodeName, CityID ,cm.CityName, StateID ,sm.StateName, Latitude , Longitude , DesignationID ,Name, MobileNo , Email , TAN , PAN , GST , GSTCertificate , AccountHolderName , AccountNumber, BankName , BranchName , IFSCCode , CheckImg
    from SCS_ONB_Dealer d 
    left join  SCS_ONB_LocationDetails ld on ld.Dealerid = d.Dealerid
    left join SCS_ONB_ContactDetails cd  on cd.LocationID = ld.LocationID
    left join SCS_ONB_TaxDetails td  on td.LocationID = ld.LocationID
    left join SCS_ONB_BankDetails bd  on bd.LocationID = ld.LocationID
	  left join z_scope..PinCodeMaster pm  on ld.PincodeID = pm.PinCodeCode
	  left join z_scope..CityMaster cm on ld.CityID = cm.CityCode
	  left join z_scope..StateMaster sm on ld.StateID = sm.StateCode
    where d.Addedby = ${userid} --and ld.status = 1
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

// const groupBy = (arr, key) =>
//   arr.reduce((acc, obj) => {
//     const k = obj[key];
//     if (!acc[k]) acc[k] = [];
//     acc[k].push(obj);
//     return acc;
// }, {});

const jsontoPDF = async (userid,ip) => {
    try {
      let data = await existingUserDataService(userid);
      
      data = transformDealerData(data);
      // console.log(data);
      // console.log(data.Dealer.Locations[0]);

      data = await pdfmappingFunction(data);

      const date = formatDateTime(new Date().toISOString())

      // Extracting Dealer Name from data
    const dealer = data.Dealer;

    const fonts = {
      Roboto: {
        normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, 'fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, 'fonts/Roboto-MediumItalic.ttf')
      }
    };

    const printer = new PdfPrinter(fonts);
    const logoPath = path.join(__dirname, 'Sparecare-Unit.png');
    const getBase64Image = (imgPath) => {
    const file = fs.readFileSync(imgPath);
      return 'data:image/png;base64,' + file.toString('base64');
    };
    const watermarkBase64 = getBase64Image(path.join(__dirname, 'Sparecare-Unit.png'));
    const headerimg = getBase64Image(path.join(__dirname,'2.png'));
    
    const docDefinition = {
       header: {
    margin: [40, 20, 40, 10],
    columns: [
      // {
      //   text: 'Dealer Onboarding Summary',
      //   style: 'headerTitle',
      //   alignment: 'left'
      // },
     {
      image: headerimg,
      width: 150,
      opacity: 1,
      alignment:'left'
    },
      {
        // text: `Auto Generated: ${new Date().toLocaleDateString()}`,
        text: `Auto Generated: ${date}`,
        alignment: 'right',
        fontSize: 8,
        margin: [0, 5, 0, 0]
      }
    ]
  },
  content: [
    {
      text: dealer.Name,
      style: 'title'
    },
    {
      text: `OEM Code: ${dealer.OEMCode}`,
      style: 'subtitle'
    },
    ...dealer.Locations.map((loc, index) => {
      return [
        {
          
          text:  ` Location ${index + 1}: ${loc.LocationName}`,
          style: 'locationHeader'
        },
        {
          style: 'infoTable',
          table: {
            widths: ['30%', '70%'],
            body: [
              ['Address', `${loc.Address.Street}`],
              ['Landmark', loc.Address.Landmark],
              ['Pincode', loc.Address.Pincode],
              ['City', loc.Address.City],
              ['State', loc.Address.State],
              ['Latitude', loc.Coordinates.Latitude],
              ['Longitude', loc.Coordinates.Longitude]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        loc.Contacts.length
          ? {
              text: 'Contacts',
              style: 'sectionHeader'
            }
          : null,
        loc.Contacts.length
          ? {
              table: {
                widths: ['20%', '30%', '23%', '25%'],
                body: [
                  ['Name', 'Email', 'Mobile No', 'Designation'],
                  ...loc.Contacts.map(c => [
                    c.Name || 'N/A',
                    c.Email || 'N/A',
                    c.MobileNo || 'N/A',
                    c.Designation || 'N/A'
                  ])
                ]
              },
              layout: 'lightHorizontalLines'
            }
          : null,
        {
          text: 'Tax Details',
          style: 'sectionHeader'
        },
        {
          style: 'infoTable',
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              ['TAN', 'PAN', 'GST', 'GST Certificate'],
              [
                loc.TaxDetails.TAN || 'N/A',
                loc.TaxDetails.PAN || 'N/A',
                loc.TaxDetails.GST || 'N/A',
                // loc.TaxDetails.GSTCertificateURL || 'N/A'
                {
                text: 'View Certificate',
                link: loc.TaxDetails.GSTCertificateURL || '',
                color: 'blue',
                decoration: 'underline'
              }  
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        {
  text: 'Bank Details',
  style: 'sectionHeader'
},
{
  style: 'infoTable',
  table: {
    widths: ['15%', '15%', '15%', '15%', '15%', '25%'],  // 6 columns
    body: [
      ['Account Holder', 'Account No', 'Bank', 'Branch', 'IFSC', 'Cancelled Cheque'],
      [
        loc.BankDetails.AccountHolderName || 'N/A',
        loc.BankDetails.AccountNumber || 'N/A',
        loc.BankDetails.BankName || 'N/A',
        loc.BankDetails.BranchName || 'N/A',
        loc.BankDetails.IFSCCode || 'N/A',
        {
          text: 'View Cancelled Cheque',
          link: loc.BankDetails.CancelledChequeURL || '',
          color: 'blue',
          decoration: 'underline'
        }
      ]
    ]
  },
  layout: 'lightHorizontalLines',
  margin: [0, 0, 0, 0]
},
        { text: '', pageBreak: 'after' }
      ].filter(Boolean);
    }).flat()
  ],

  styles: {
    title: {
      fontSize: 18,
      bold: true,
      alignment: 'center',
      margin: [0, 25, 0, 4]
    },
    subtitle: {
      fontSize: 12,
      alignment: 'center',
      margin: [0, 2, 0, 0]
    },
    locationHeader: {
      fontSize: 14,
      bold: true,
      margin: [0, 25, 0, 6],
      decoration: 'underline'
    },
    sectionHeader: {
      fontSize: 12,
      bold: true,
      margin: [0, 10, 0, 10]
    },
    infoTable: {
      margin: [0, 0, 0, 10]
    }
  },

  defaultStyle: {
    font: 'Roboto',
    fontSize: 10
  },
  background: function(currentPage, pageSize) {
    return {
      image: watermarkBase64,
      width: 300,
      opacity: 0.15,
      absolutePosition: {
        x: (pageSize.width - 300  ) / 2, // center horizontally
        y: (pageSize.height - 300 ) / 2 // center vertically
      }
    };
  },
  footer: function(currentPage, pageCount) {
  return {
    margin: [40,5, 40, 10],
    columns: [
      {
        width: '*',
        text: 'Sparecare Solutions Pvt. Ltd.\nJMD Pacific Square Sector 15 Part 2 Gurugram, Haryana',
        fontSize: 8,
        alignment: 'left'
      },
      {
        width: 'auto',
        text: `Page ${currentPage} of ${pageCount}`,
        fontSize: 6,
        alignment: 'center'
      },
      {
        width: '*',
                text: [
          { text: 'www.sparecare.in\n', link: 'https://www.sparecare.in', color: 'blue', decoration: 'underline' },
          { text: `IP: ${ip}` }
        ],
        fontSize: 8,
        alignment: 'right'
      }
    ]
  };
},
};
    const pdfPath = path.join(`./pdf/user_${userid}_report.pdf`);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(pdfPath));
    pdfDoc.end();

    // console.log(`✅ PDF created at: ${pdfPath}`);
    return pdfPath;
    
  } catch (error) {
    console.error(error);
    throw new Error(`jsontoPDFGrouped failed: ${error.message}`);
  }
};

const locationInActiveService = async(userId , dealerId  , locationId)=>{
try {
    const pool = await getPool1()
    const query = `select * from SCS_onb_locationdetails where addedby = @userid and dealerid = @dealerid and locationid = @locationid`
    const result = await pool.request()
                .input('dealerid',sql.Int,dealerId)
                .input('userid',sql.Int,userId)
                .input('locationid',sql.Int,locationId)
                .query(query)
    if(result.recordset.length === 0){
      const message = `This Location Does not Exist for this Dealer`
      return message
    }
    else{
        try {
                const query = `Update SCS_onb_locationdetails set status = 0 where addedby = @userid and dealerid = @dealerid and locationid = @locationid`
                await pool.request()
                .input('dealerid',sql.Int,dealerId)
                .input('userid',sql.Int,userId)
                .input('locationid',sql.Int,locationId)
                .query(query)
                  const message =`Location is set to InActive`
                  return message
        } catch (error) {
          throw new Error(`Failed to Inactive the location ${error.message}`);
          
        }
    }
} catch (error) {
  throw new Error(`locationInActiveService failed : ${error.message}`);
  
}
}

const LocationsbyUserid = async (userId) => {
try {
    const pool = await getPool1();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT LocationID , Location FROM SCS_ONB_LocationDetails 
        WHERE  AddedBy = @UserID
      `);
    return result;
} catch (error) {
  throw new Error(`LocationsbyUserid failed: ${error.message}`);
  
}
};


const assignOwnerforExistingLocation = async(locationid , userid)=> {
try {
  const pool = await getPool1()
  const ownerDetailsforExistingLocationQuery  = 
          ` use [z_scope]
        ;with data as (
        select LocationID , Location from SCS_onb_locationdetails where dealerid = (select dealerid from SCS_onb_locationdetails where locationid =  ${locationid}  )and Addedby = ${userid})
        select top 1  cd.LocationID , DesignationID , Name , MobileNo , Email , Addedby from SCS_ONB_ContactDetails cd
        join data d on d.locationid = cd.locationid 
        where cd.designationid = 1 
        order by cd.locationid
          ` 
  
        const result = await pool.request().query(ownerDetailsforExistingLocationQuery)
        // console.log(result.recordset[0]);
  
        const insertQuery = ` use [z_scope]
        insert into SCS_ONB_ContactDetails(LocationID,DesignationID,Name,MobileNo,Email,Addedby)
        values(@locationid,@DesignationID,@Name,@MobileNo,@Email,@Addedby)
        `
        const val  = await pool.request()
        .input('locationid',locationid)
        .input('DesignationID',result.recordset[0].DesignationID)
        .input('Name',result.recordset[0].Name)
        .input('MobileNo',result.recordset[0].MobileNo)
        .input('Email',result.recordset[0].Email)
        .input('Addedby',result.recordset[0].Addedby)
        .query(insertQuery) 

    return 1;
  
} catch (error) {
  throw new Error(`assignOwnerforExistingLocation failed: ${error.message}`); 
}
}
export {LocationsbyUserid,locationInActiveService,IFSCBAnkMappingService,fetchContactDetailsService,jsontoPDF,existingUserDataService,pincodemasterService,pincodeService,createDealerService,createLocationService,designationService,contactDetailsbyLocationService,taxdetailsService,bankdetailsService}