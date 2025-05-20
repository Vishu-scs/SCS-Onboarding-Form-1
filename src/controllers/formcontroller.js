import { createDealerService , createLocationService, designationService, pincodemasterService, pincodeService, taxdetailsService , bankdetailsService, contactDetailsbyLocationService} from "../services/formservice.js";
import fs from 'fs'
import { uploadToS3 } from "../middlewares/multer.middleware.js";

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
      const { brandid, dealer, oemcode, userid } = req.body;
  
      if (!brandid || !dealer || !oemcode || !userid) {
        return res.status(400).json({
          message: "brandid, dealer, oemcode, and userid are required"
        });
      }
  
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
      locationId: result.LocationID,
      location: result.Location
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
const contactDetails = async(req,res)=>{
try {
    const {locationId,designationId,Name,MobileNo,Email,userId} = req.body
        if (!locationId || !designationId || !Name || !MobileNo || !Email || !userId) {
      return res.status(400).json({
        message: "All fields (locationId, designationId, Name, MobileNo, Email, userId) are required"
      });
    }
    const data = await contactDetailsbyLocationService(locationId,designationId,Name,MobileNo,Email,userId)
      if (data?.alreadyExists) {
      return res.status(200).json({
        message: data.message,
        Data: []
      });
    }
    res.status(200).json({
      message: "Contact details saved successfully",
      Data : data.recordset
    })
} catch (error) {
  res.status(500).json({
    Error:error.message
  })
}
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

    // 🔧 Convert comma-separated string to array of integers
    if (typeof locationIds === 'string') {
      locationIds = locationIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
    }

    // 2️⃣ Loop through locationIds and insert
    for (const locationId of locationIds) {
      try {
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
export {citybyPincode,createDealer,createLocation ,designation , contactDetails ,taxDetails , bankDetails , pincode}