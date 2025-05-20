import {Router} from 'express'
const router = Router()

import { upload } from '../middlewares/multer.middleware.js';
import { citybyPincode, createDealer, createLocation, designation, pincode ,taxDetails , bankDetails, contactDetails } from "../controllers/formcontroller.js";


router.route('/designation').get(designation)
router.route('/pincode').get(pincode)
router.route('/city-state').post(citybyPincode)
router.route('/create-dealer').post(createDealer)
router.route('/create-location').post(createLocation)
router.route('/contact').post(contactDetails)
router.post('/tax-details', upload.single('file'), taxDetails);
router.post('/bank-details', upload.single('file'), bankDetails);



export default router