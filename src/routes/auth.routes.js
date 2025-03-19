// routes/auth.js
import express from "express";
import {
  refreshToken,
  apiProtect,
} from "../controllers/refreshTokenController.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/refresh-token", refreshToken);
router.post("/protected", apiProtect);

export default router;
