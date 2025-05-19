import { Router } from "express";
import { createUser, login } from "../controllers/usercontroller.js";
import { citybyPincode, createDealer, createLocation, designation } from "../controllers/formcontroller.js";
const router = Router()

//
router.route('/create-user').post(createUser)
router.route('/login').post(login)


//form
router.route('/designation').get(designation)
router.route('/city-state').post(citybyPincode)
router.route('/create-dealer').post(createDealer)
router.route('/create-location').post(createLocation)
export default router