import { createDealerService , createLocationService, designationService, pincodemasterService, pincodeService, taxdetailsService , bankdetailsService, contactDetailsbyLocationService, fetchContactDetailsService, IFSCBAnkMappingService, existingUserDataService, jsontoPDF, locationInActiveService} from "../services/formservice.js";
import fs from 'fs'
import path from 'path'
import { uploadToS3 } from "../middlewares/multer.middleware.js";
import { getPool1 } from "../db/db.js";
import { transformDealerData } from "../utils/jsondataformatter.js";
import { checkLocationOwnership } from "../utils/formserviceChecks.js";

const citybyPincode = async (req, res) => {
  try {
    const { pincode } = req.body;

    if (!pincode) {
      return res.status(400).json({
        message: "pincode is required"
      });
    }

    const data = await pincodeService(pincode);

    // Transform the data.recordset
    const grouped = {};
    data.recordset.forEach(item => {
      const pin = item.PinCodeName;

      if (!grouped[pin]) {
        grouped[pin] = {
          pincodename: pin,
          pincodecodecode:item.PinCodeCode,
          cityName: [],
          // stateName:[]
          statename: item.StateName,
          stateid: item.StateCode
        };
      }

      grouped[pin].cityName.push({
        cityname: item.CityName,
        cityid: item.CityCode
      });

      // grouped[pin].stateName.push({
      //   statename:item.StateName,
      //   stateid : item.StateCode
      // })
    });

    const transformed = {
      Data: Object.values(grouped)
    };

    res.status(200).json(transformed);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

const createDealer = async (req, res) => {
    try {
      const pool = await getPool1()
      const { brandid, dealer, oemcode, userid } = req.body;
  
      if (!brandid || !dealer || !oemcode || !userid) {
        return res.status(400).json({
          message: "brandid, dealer, oemcode, and userid are required"
        });
      }
      // const query = `select * from SCS_ONB_Dealer where addedby = ${userid}`
      // const check = await pool.request().query(query)
      // const existedDealer = check.recordset[0].Dealer
      // if(check.recordset.length > 0){
      //   return res.status(400).json({
      //     message:`${existedDealer} already onboarded using this email`
      //   })
      // }

      const result = await createDealerService(brandid, dealer, userid, oemcode);
  
      if (result.alreadyExists) {
        return res.status(200).json({
          message: "Dealer already exists",
          dealerId: result.dealerId
        });
      }
  
      res.status(200).json({
        message: "Dealer created successfully",
        dealerId: result.dealerId
      });
  
    } catch (error) {
      console.error("createDealer error:", error);
      res.status(500).json({ error: error.message });
    }
  };

const createLocation = async (req, res) => {
  try {
    const pool = await getPool1()
    const {
      dealerid, location, address, landmark, pincodeid, cityid,
      stateid, latitude, longitude, sims, gainer, audit, userid
    } = req.body;

    // Validate required fields (add/remove as per your business rules)
    if (!dealerid || !location || !address || !pincodeid || !cityid || !stateid || !userid || !latitude || !longitude) {
      return res.status(400).json({
        message: "dealerid, location, address, pincodeid, cityid, stateid, latitude, longitude and userid are required"
      });
    }

    const result = await createLocationService(
      dealerid, location, address, landmark, pincodeid, cityid,
      stateid, latitude, longitude, sims, gainer, audit, userid
    );

    if (result.alreadyExists) {
      return res.status(200).json({
        message: "Location already exists",
        locationId: result.locationId
      });
    }

    res.status(200).json({
      message: "Location created successfully",
      // locationId: result.LocationID,
      // location: result.Location
      Locations:result.Locations
    });

  } catch (error) {
    // console.error("createLocation error:", error);
    res.status(500).json({ error: error.message });
  }
};

const designation = async(req,res)=>{
try {
        const data = await designationService();
        res.status(200).json({
            Data:data.recordset
        })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

const pincode = async(req,res)=>{
try {
        const data = await pincodemasterService();
        res.status(200).json({
            Data:data.recordset
        })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

// const contactDetails = async(req,res)=>{
// try {
//     const {locationId,designationId,Name,MobileNo,Email,isSame,userId} = req.body
//         if (!locationId || !designationId ||!userId) {
//       return res.status(400).json({
//         message: "All fields (locationId, designationId, userId) are required"
//       });
//     }    
//     if((!Name || !MobileNo || !Email) && (!isSame)){
//       return res.status(400).json({
//         message: `(Name , MobileNo and Email) or (isSame) are required`
//       });
//     }
//     let data
//     if(!isSame){
//      data = await contactDetailsbyLocationService(locationId,designationId,Name,MobileNo,Email,userId)
//       if (data?.alreadyExists) {
//       return res.status(200).json({
//         message: data.message,
//         Data: []
//       });
//     }
//   }
//   else{
//       // console.log(isSame);
//       const pool = await getPool1()
//       let SName , SMobileNo , SEmail
//     try {
//             const result = await fetchContactDetailsService(isSame,designationId)
//             SName = result.recordset[0].Name
//             SMobileNo = result.recordset[0].MobileNo
//             SEmail = result.recordset[0].Email
//     } catch (error) {
//       return res.status(500).json({Error:error.message})
//     }
//        data = await contactDetailsbyLocationService(locationId,designationId,SName,SMobileNo,SEmail,userId)
//       if (data?.alreadyExists) {
//       return res.status(200).json({
//         message: data.message,
//         Data: []
//       });
//     }

//   }
//     res.status(200).json({
//       message: "Contact details saved successfully",
//       Data : data.recordset
//     })
// } catch (error) {
//   res.status(500).json({
//     Error:error.message
//   })
// }
// }

const contactDetails = async(req,res)=>{
  const contactArray = req.body
  if(!Array.isArray(contactArray)){
    return res.status(400).json({
      message:`contactArray is not a array`
    })
  }
  const data  = await contactDetailsbyLocationService(contactArray)
  res.status(207).json({
    Data:data
  })
}

const taxDetails = async (req, res) => {
  try {
    let { locationIds, tan, pan, gst, userId } = req.body;
    const file = req.file;

    if(undefined == locationIds ||  !userId){
      return res.status(400).json({
        message:`locationIds is undefined`
      })
    }
    if (!file) {
      return res.status(400).json({ message: `file is required` });
    }
    
    // 1️⃣ Upload only once
    let url, key;
    try {
      const uploadResult = await uploadToS3(file);
      url = uploadResult.url;
      key = uploadResult.key;
    } catch (uploadErr) {
      return res.status(500).json({ error: `Failed to upload GST image: ${uploadErr.message}` });
    }
    const results = [];
    const failed = [];

    // Convert comma-separated string to array of integers
    if (typeof locationIds === 'string') {
      locationIds = locationIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
    }

    //  Loop through locationIds and insert
    for (const locationId of locationIds) {
      try {
        const isOwner = await checkLocationOwnership(locationId, userId);
    if (!isOwner) {
      failed.push({ locationId, message: `Location ${locationId} is not created by user ${userId}` });
      continue;
    }
        const data = await taxdetailsService(locationId, tan, pan, gst, { url, key }, userId);
        if (data?.alreadyExists) {
          failed.push({ locationId, message: "Tax details already exist" });
        } else {
          results.push({ locationId, message: "Saved successfully" });
        }
      } catch (error) {
        failed.push({ locationId, message: error.message });
      }
    }

    res.status(207).json({
      message: "Tax details processed",
      success: results,
      failed: failed
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bankDetails = async (req,res)=>{
try {
  let {locationIds , accholdername , accno , bankname ,branchname, ifsc , userId} = req.body
    const file = req.file
    if(null == file){
      return res.status(400).json({
        message:`file is required`
      })
    }
    // 1️⃣ Upload only once
    let url, key;
    try {

      const uploadResult = await uploadToS3(file);
      url = uploadResult.url;
      key = uploadResult.key;
    } catch (uploadErr) {
      return res.status(500).json({ error: `Failed to upload Check image: ${uploadErr.message}` });
    }
    const results = [];
    const failed = [];

    //Convert comma-separated string to array of integers
    if (typeof locationIds === 'string') {
      locationIds = locationIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
    }

    // Loop through locationIds and insert
    for (const locationId of locationIds) {
      try {
        const isOwner = await checkLocationOwnership(locationId, userId);
    if (!isOwner) {
      failed.push({ locationId, message: `Location ${locationId} is not created by user ${userId}` });
      continue;
    }
        const data = await bankdetailsService(locationId, accholdername , accno , bankname ,branchname, ifsc ,{url , key} , userId);
        if (data?.alreadyExists) {
          failed.push({ locationId, message: "Bank details already exist" });
        } else {
          results.push({ locationId, message: "Saved successfully" });
        }
      } catch (error) {
        failed.push({ locationId, message: error.message });
      }
    }

    res.status(207).json({
      message: "Bank details processed",
      success: results,
      failed: failed
    });

} catch (error) {
  res.status(500).json({
    Error:error.message
  })
}
}

const IFSCBAnkMapping = async (req,res)=>{
try {
    const data = await IFSCBAnkMappingService()
    res.status(200).json({
      Data:data.recordset
    })
} catch (error) {
    res.status(500).json({
      Error:error.message
    })
}
}

const existingDataforUser = async(req,res)=>{
try {
    const {userid} = req.body
    let rawData = await existingUserDataService(userid)
    // data = transformDealerData(data)

    const grouped = {};

      rawData.forEach(row => {
        const locId = row.LocationID;
  
        if (!grouped[locId]) {
          grouped[locId] = {
            LocationID: row.LocationID,
            Brandid: row.Brandid,
            Dealerid: row.Dealerid,
            Dealer: row.Dealer,
            OEMCode: row.OEMCode,
            Location: row.Location,
            Address: row.Address,
            Landmark: row.Landmark,
            PincodeID: row.PincodeID,
            Pincode:row.PinCodeName,  
            CityID: row.CityID,
            City:row.CityName,
            StateID: row.StateID,
            State:row.StateName,
            Latitude: row.Latitude,
            Longitude: row.Longitude,
            Contacts: [],
            TaxDetails: {
              TAN: row.TAN,
              PAN: row.PAN,
              GST: row.GST,
              GSTCertificate: row.GSTCertificate
            },
            BankDetails: {
              AccountHolderName: row.AccountHolderName,
              AccountNumber: row.AccountNumber,
              BankName: row.BankName,
              BranchName: row.BranchName,
              IFSCCode: row.IFSCCode,
              CheckImg: row.CheckImg
            }
          };
        }
  
        if (row.Name || row.Email) {
          grouped[locId].Contacts.push({
            DesignationID: row.DesignationID,
            Name: row.Name,
            MobileNo: row.MobileNo,
            Email: row.Email
          });
        }
      });
  
      const finalResult = Object.values(grouped);
      res.status(200).json({
        Data: finalResult
      })
} catch (error) {
  res.status(500).json({
    Error:error.message
  })
}
}

const pdfmailer = async(req,res)=>{
  try {
    const {userid} = req.body
        //Getting IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
   const pdfPath = await jsontoPDF(userid,ip); // Generate PDF and get file path
    // console.log(`Sending PDF file: ${pdfPath}`);
    // Send the file to the client
     
    return res.send(path.resolve(pdfPath));
    // res.send(pdfPath)
    
  } catch (error) {
    console.error('Error in pdfmailer:', error);
    return res.status(500).send({ error: error.message });
  }
}

const locationInActive = async(req,res)=>{
try {
      const {userId , dealerId  , locationId} = req.body
      const data = await locationInActiveService(userId , dealerId  , locationId)
      res.status(200).json({
        Data:data
      })
} catch (error) {
  res.status(500).json({
    Error:error.message
  })
}

}
export {locationInActive,pdfmailer,IFSCBAnkMapping,citybyPincode,createDealer,createLocation ,designation ,existingDataforUser, contactDetails ,taxDetails , bankDetails , pincode}