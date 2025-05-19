import { createDealerService , createLocationService, designationService, pincodeService} from "../services/formservice.js";


const citybyPincode = async(req,res)=>{
try {
        const {pincode} = req.body
          if (!pincode ) {
            return res.status(400).json({
              message: "pincode are required"
            });
          }
          const data = await pincodeService(pincode)
          res.status(200).json({
            Data:data.recordset
          })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}
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
    if (!dealerid || !location || !address || !pincodeid || !cityid || !stateid || !userid) {
      return res.status(400).json({
        message: "dealerid, location, address, pincodeid, cityid, stateid, and userid are required"
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
    console.error("createLocation error:", error);
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

export {citybyPincode,createDealer,createLocation ,designation}