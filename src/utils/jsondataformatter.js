
// Below function is formatting json data which is used in generating pdf
function transformDealerData(flatData) {
  if (!Array.isArray(flatData) || flatData.length === 0) {
    return { "no value": 0 };
  }

  const first = flatData[0];

  const locationMap = new Map();

  for (const row of flatData) {
    const locationId = row.LocationID;

    if (!locationMap.has(locationId)) {
      locationMap.set(locationId, {
        LocationName: row.Location,
        Address: {
          Street: row.Address,
          Landmark: row.Landmark,
          PincodeID: row.PincodeID,
          CityID: row.CityID,
          StateID: row.StateID
        },
        Coordinates: {
          Latitude: row.Latitude,
          Longitude: row.Longitude
        },
        Contacts: [],
        TaxDetails: {
          TAN: row.TAN || "",
          PAN: row.PAN || "",
          GST: row.GST || "",
          GSTCertificateURL: row.GSTCertificate || ""
        },
        BankDetails: {
          AccountHolderName: row.AccountHolderName || "",
          AccountNumber: row.AccountNumber || "",
          BankName: row.BankName || "",
          BranchName: row.BranchName || "",
          IFSCCode: row.IFSCCode || "",
          CancelledChequeURL: row.CheckImg || ""
        }
      });
    }

    const locObj = locationMap.get(locationId);

    // Add contact if not already in list
    if (
      row.DesignationID &&
      row.Name &&
      !locObj.Contacts.some(c => c.DesignationID === row.DesignationID && c.Name === row.Name)
    ) {
      locObj.Contacts.push({
        DesignationID: row.DesignationID,
        Name: row.Name,
        MobileNo: row.MobileNo,
        Email: row.Email
      });
    }
  }

  return {
    Dealer: {
      Name: first.Dealer,
      OEMCode: first.OEMCode,
      BrandID: first.Brandid,
      DealerID: first.Dealerid,
      Locations: Array.from(locationMap.values())
    }
  };
}

export {transformDealerData}