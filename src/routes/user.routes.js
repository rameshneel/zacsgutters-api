import { Router } from "express";

import {
  loginUser,
  logoutUser,
  // registerUser,
  resetPasswordForForget,
  forgetPasswordToken,
  forgetPassword,
  updateAccountDetails,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
// import { uploadForfile } from "../middlewares/multer.middleware.js";

const router = Router();
// router.route("/")
//     .post(
//         registerUser
//     );
router.route("/login").post(loginUser);
//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/forget").post(forgetPassword);
router.route("/reset-password-token/:token").get(forgetPasswordToken);
router.route("/reset-password/").patch(resetPasswordForForget);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);

export default router;
