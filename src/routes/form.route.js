import {Router} from 'express'
const router = Router()

import { upload } from '../middlewares/multer.middleware.js';
import { citybyPincode, createDealer, createLocation, designation, pincode ,taxDetails , bankDetails, contactDetails, IFSCBAnkMapping, existingDataforUser, pdfmailer, locationInActive, finalSubmit, LocationbyUserid } from "../controllers/formcontroller.js";


router.route('/designation').get(designation)
router.route('/pincode').get(pincode)
router.route('/ifsc').get(IFSCBAnkMapping)
router.route('/city-state').post(citybyPincode)
router.route('/create-dealer').post(createDealer)
router.route('/create-location').post(createLocation)
router.route('/contact').post(contactDetails)
router.route('/existed-data').post(existingDataforUser)
router.route('/pdf-mail').post(pdfmailer)
router.route('/submit').post(finalSubmit)
router.route('/all-loc').post(LocationbyUserid)
router.route('/loc-inactive').post(locationInActive)
router.post('/tax-details', upload.single('file'), taxDetails);
router.post('/bank-details', upload.single('file'), bankDetails);



export default router