import express from "express";
import {
  createCustomerByAdmin,
  deleteCustomerById,
  getcustomerBooking,
  getCustomerById,
  updateCustomerByAdmin,
} from "../controllers/customer.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";
import { uploadMultiplePhotos } from "../middlewares/multer.middleware.js";
import {
  blockTimeSlots,
  getAvailableTimeSlots,
  getAvailableTimeSlotsForForm,
  getDisabledDates,
  unblockTimeSlots,
} from "../controllers/timeSlot.controllers.js";

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    // console.log("eroor",err);

    // Multer-specific errors
    if (err instanceof multer.MulterError) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(400).json({ error: "File size exceeds 5MB limit" });
        case "LIMIT_UNEXPECTED_FILE":
          return res
            .status(400)
            .json({ error: "Too many files uploaded or incorrect field name" });
        default:
          return res.status(400).json({ error: "File upload error" });
      }
    }
    // General errors
    return res.status(400).json({ error: err.message });
  }
  next();
};
const router = express.Router();

router.get("/", verifyJWT, getcustomerBooking);
router.get("/:id", getCustomerById);
router.delete("/:id", deleteCustomerById);
router.post(
  "/create",
  verifyJWT,
  uploadMultiplePhotos,
  handleMulterError,
  createCustomerByAdmin
);
router.patch("/unblockTimeSlots", verifyJWT, unblockTimeSlots);
router.patch("/blocktimeslots", verifyJWT, blockTimeSlots);
router.get("/available/slot", verifyJWT, getAvailableTimeSlots);
router.get("/slots/times-slots", getAvailableTimeSlotsForForm);
router.get("/slots/disbale-date", getDisabledDates);
router.patch("/:customerId", verifyJWT, updateCustomerByAdmin);
// router.post('/block-time-slots', blockTimeSlots);

export default router;
