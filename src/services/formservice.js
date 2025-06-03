import { getPool1, getPool2 } from '../db/db.js';
import { uploadToS3 ,deleteFromS3} from '../middlewares/multer.middleware.js';
import PdfPrinter from 'pdfmake';
import path from 'path';
import fs from 'fs'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { transformDealerData } from '../utils/jsondataformatter.js';
import { text } from 'stream/consumers';


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

// const groupBy = (arr, key) =>
//   arr.reduce((acc, obj) => {
//     const k = obj[key];
//     if (!acc[k]) acc[k] = [];
//     acc[k].push(obj);
//     return acc;
// }, {});

const jsontoPDF = async (userid) => {
    try {
      let data = await existingUserDataService(userid);
      console.log(data);
      
      data = await transformDealerData(data);
      // console.log(data);
    
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
        text: `Generated: ${new Date().toLocaleDateString()}`,
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
              ['Pincode', loc.Address.PincodeID],
              ['City', loc.Address.CityID],
              ['State', loc.Address.StateID],
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
                widths: ['*', '*', '*', '*'],
                body: [
                  ['Name', 'Email', 'Mobile No', 'DesignationID'],
                  ...loc.Contacts.map(c => [
                    c.Name || 'N/A',
                    c.Email || 'N/A',
                    c.MobileNo || 'N/A',
                    c.DesignationID || 'N/A'
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
    widths: ['16%', '16%', '16%', '16%', '16%', '20%'],  // 6 columns
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
  margin: [0, 0, 0, 20]
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
        text: {
          text: 'www.sparecare.in',
          link: 'https://www.sparecare.in',
          color: 'blue',
          decoration: 'underline'
        },
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

    console.log(`✅ PDF created at: ${pdfPath}`);
    return pdfPath;
    
  } catch (error) {
    console.error(error);
    throw new Error(`jsontoPDFGrouped failed: ${error.message}`);
  }
};
//   const jsontoPDF = async (userid) => {
//     try {
//       let data = await existingUserDataService(userid);
//       // console.log(data);
      
//        data = await transformDealerData(data);
//       // console.log(`pdfData: `,pdfData);
      
//       const dealers = groupBy(data, 'Dealerid');
      
//       const content = [];
      
//       for (const [dealerId, dealerData] of Object.entries(dealers)) {
//         const dealerInfo = dealerData[0];
//         content.push(
//           { text: `Dealer: ${dealerInfo.Dealer} (ID: ${dealerId})`, style: 'header' },
//           { text: `OEM Code: ${dealerInfo.OEMCode}\n\n`, style: 'subheader' }
//         );
        
//         const locations = groupBy(dealerData, 'LocationID');
        
//         for (const [locationId, locationGroup] of Object.entries(locations)) {
//           const location = locationGroup[0];
//           content.push(
//             { text: `📍 Location: ${location.Location} (ID: ${locationId})`, style: 'locationHeader' },
//             {
//               table: {
//                 widths: ['*', '*'],
//                 body: [
//                   ['Address', `${location.Address}, ${location.Landmark}`],
//                   ['City / State / Pincode', `${location.CityID} / ${location.StateID} / ${location.PincodeID}`],
//                   ['Coordinates', `${location.Latitude}, ${location.Longitude}`],
//                 ],
//               },
//               layout: 'lightHorizontalLines',
//               margin: [0, 0, 0, 10],
//             }
//           );
          
//           // Contact Info
//           const contacts = locationGroup.filter(r => r.Name || r.Email || r.MobileNo || r.DesignationID);
//           if (contacts.length) {
//             content.push({ text: '👥 Contacts', style: 'subsubheader' });
//             content.push({
//               table: {
//                 widths: ['*', '*', '*', '*'],
//                 body: [
//                   ['Name', 'Email', 'Mobile No', 'DesignationID'],
//                   ...contacts.map(c => [
//                     c.Name || 'N/A',
//                     c.Email || 'N/A',
//                     c.MobileNo || 'N/A',
//                     c.DesignationID || 'N/A',
//                   ]),
//                 ],
//               },
//               layout: 'lightHorizontalLines',
//               margin: [0, 0, 0, 10],
//             });
//           }
          
//           // Tax Info
//           if (location.TAN || location.PAN || location.GST || location.GSTCertificate) {
//             content.push({ text: '💰 Tax Details', style: 'subsubheader' });
//             content.push({
//               table: {
//                 widths: ['*', '*', '*', '*'],
//                 body: [
//                   ['TAN', 'PAN', 'GST', 'GST Certificate'],
//                   [location.TAN || 'N/A', location.PAN || 'N/A', location.GST || 'N/A', location.GSTCertificate || 'N/A'],
//                 ],
//               },
//               layout: 'lightHorizontalLines',
//               margin: [0, 0, 0, 10],
//             });
//           }
          
//           // Bank Info
//           if (location.AccountHolderName || location.AccountNumber || location.BankName || location.BranchName || location.IFSCCode || location.CheckImg) {
//             content.push({ text: '🏦 Bank Details', style: 'subsubheader' });
//             content.push({
//               table: {
//                 widths: ['*', '*', '*', '*', '*', '*'],
//                 body: [
//                   ['Holder', 'Acc No', 'Bank', 'Branch', 'IFSC', 'Cheque Img'],
//                   [
//                     location.AccountHolderName || 'N/A',
//                     location.AccountNumber || 'N/A',
//                     location.BankName || 'N/A',
//                     location.BranchName || 'N/A',
//                     location.IFSCCode || 'N/A',
//                     location.CheckImg || 'N/A',
//                   ],
//                 ],
//               },
//               layout: 'lightHorizontalLines',
//               margin: [0, 0, 0, 10],
//             });
//           }
          
//           content.push({ text: '', margin: [0, 0, 0, 20] });
//         }
        
//         content.push({ text: '', pageBreak: 'after' });
//       }
//       const fonts = {
//       Roboto: {
//         normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
//         bold: path.join(__dirname, 'fonts/Roboto-Medium.ttf'),
//         italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
//         bolditalics: path.join(__dirname, 'fonts/Roboto-MediumItalic.ttf')
//       }
//     };      const printer = new PdfPrinter(fonts);
//     const docDefinition = {
//       content,
//       styles: {
//         header: { fontSize: 16, bold: true, margin: [0, 10, 0, 4] },
//         subheader: { fontSize: 12, bold: true, margin: [0, 0, 0, 10] },
//         locationHeader: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
//         subsubheader: { fontSize: 11, bold: true, margin: [0, 4, 0, 4] },
//       },
//       defaultStyle: {
//         fontSize: 9,
//       },
//     };

//     const pdfPath = `./pdf/user_${userid}_report.pdf`;
//     const pdfDoc = printer.createPdfKitDocument(docDefinition);
//     pdfDoc.pipe(fs.createWriteStream(pdfPath));
//     pdfDoc.end();

//     console.log(`✅ PDF created at: ${pdfPath}`);
//     return pdfPath;
//   } catch (error) {
//     console.error(error);
//     throw new Error(`jsontoPDFGrouped failed: ${error.message}`);
//   }
// };
export {IFSCBAnkMappingService,fetchContactDetailsService,jsontoPDF,existingUserDataService,pincodemasterService,pincodeService,createDealerService,createLocationService,designationService,contactDetailsbyLocationService,taxdetailsService,bankdetailsService}