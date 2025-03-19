// routes/bookingRoutes.js
import express from "express";
import {
  createCustomer,
  cancelPayment,
  capturePayment,
  checkCustomer,
  refundPaymentHandler,
  cancelPaymentForMollie,
  handleMolliePaymentWebhook,
  handlePaymentStatusForMollie,
  handlePaymentRefundForMollie,
} from "../controllers/payment.controller.js";
import { uploadMultiplePhotos } from "../middlewares/multer.middleware.js";

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
//******** */
router.post("/check", uploadMultiplePhotos, handleMulterError, checkCustomer);
router.post("/create", uploadMultiplePhotos, handleMulterError, createCustomer);
router.post("/capture-payment", capturePayment);
router.post("/refund", refundPaymentHandler);
router.post("/:bookingId/cancel", cancelPayment);
//****************** */
router.post("/mollie-webhook", handleMolliePaymentWebhook);
router.post("/:bookingId/mollie/cancel", cancelPaymentForMollie);
router.get("/payment/status/:bookingId", handlePaymentStatusForMollie);
router.post("/mollie/refund", handlePaymentRefundForMollie);
//*************************** */

export default router;
