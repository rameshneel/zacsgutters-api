import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Customer from "../models/customer.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as paypalService from "../services/paypalService.js";
import * as mollieService from "../services/mollieService.js";
import validateCustomerInput from "../validators/bookingValidators.js";
import { calculateTotalPrice } from "../utils/priceCalculator.js";
import logger from "../config/logger.js";
import fs from "fs";
import {
  sendCustomerConfirmationEmail,
  sendAdminNotificationEmail,
  sendCustomerRefundEmail,
  sendAdminRefundNotificationEmail,
} from "../utils/emailService.js";
import TimeSlot from "../models/timeSlot.model.js";
import dotenv from "dotenv";
import { createMollieClient } from "@mollie/api-client";
dotenv.config();
const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY,
});

const checkCustomer = asyncHandler(async (req, res, next) => {
  try {
    const { email, postcode, selectedDate, selectedTimeSlot } = req.body;

    // Joi validation
    const { error, value } = validateCustomerInput(req.body);
    if (error) {
      const errorMessage = error.details.map((err) => err.message).join(", ");
      throw new ApiError(400, `Validation failed: ${errorMessage}`);
    }
    if (req.files && req.files.length > 0) {
      console.log("Files received:", req.files);

      // Process files here
      // For example, you might want to do something with the files before deleting them

      // Delete each file
      let deletePromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          fs.unlink(file.path, (err) => {
            if (err) {
              console.error(`Failed to delete file ${file.path}:`, err);
              return reject(err);
            }
            console.log(`File ${file.path} deleted successfully`);
            resolve();
          });
        });
      });

      // Wait for all deletions to complete
      Promise.all(deletePromises)
        .then(() => {
          // res.status(200).json({ message: 'Files uploaded and deleted successfully' });
        })
        .catch((err) => {
          res.status(500).json({ error: "Failed to delete one or more files" });
        });
    }

    // Convert selectedDate to Date object
    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid date format. Please use YYYY-MM-DD.");
    }

    // Ensure that selectedDate is not today
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of the day
    if (date.toDateString() === currentDate.toDateString()) {
      throw new ApiError(400, "Bookings for today are not allowed.");
    }

    // Ensure that selectedDate is a weekday (Monday to Friday)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 0 = Sunday, 6 = Saturday
      throw new ApiError(
        400,
        "Bookings are only allowed from Monday to Friday."
      );
    }

    // Define valid postcodes and groups
    const postcodeGroups = {
      Crawley: ["RH10", "RH11", "RH6"],
      Horsham: ["RH12", "RH13", "RH6"],
      // Horley:["RH6"]
    };

    // Check if the postcode prefix (first 3 characters) is valid
    const shortPrefix = postcode.substring(0, 3).toUpperCase(); // Check the first 3 characters for "RH6"
    const longPrefix = postcode.substring(0, 4).toUpperCase(); // Check the first 4 characters for other prefixes

    let group = Object.keys(postcodeGroups).find(
      (group) =>
        postcodeGroups[group].includes(longPrefix) || shortPrefix === "RH6"
    );

    if (!group) {
      throw new ApiError(
        400,
        "We do not currently service this postcode area."
      );
    }

    // Check for existing bookings on the selected date
    const formattedDate = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    const existingCustomers = await Customer.find({
      selectedDate: formattedDate,
    });

    if (existingCustomers.length > 0) {
      const existingCustomer = existingCustomers[0];
      // Extract the first 3 or 4 characters of the existing customer's postcode
      const existingCustomerShortPrefix = existingCustomer.postcode
        .substring(0, 3)
        .toUpperCase();
      const existingCustomerLongPrefix = existingCustomer.postcode
        .substring(0, 4)
        .toUpperCase();
      // Find group of existing customer postcode
      const existingCustomerGroup = Object.keys(postcodeGroups).find(
        (group) =>
          postcodeGroups[group].includes(existingCustomerLongPrefix) ||
          existingCustomerShortPrefix === "RH6"
      );
      if (existingCustomerGroup !== group) {
        throw new ApiError(
          400,
          `Bookings are already made for this date. Only customers from the same postcode area group (${existingCustomerGroup}) can book for this date.`
        );
      }
      if (
        existingCustomers.some(
          (customer) => customer.selectedTimeSlot === selectedTimeSlot
        )
      ) {
        throw new ApiError(
          400,
          `The selected time slot is already booked: ${selectedTimeSlot}`
        );
      }
    }
    // Get current date and time
    const currentTime = new Date();

    // Parse selected time slot
    const [startTime, endTime] = selectedTimeSlot.split("-");
    const [startHour, startMinute] = parseTime(startTime);
    const [endHour, endMinute] = parseTime(endTime);

    // Create Date objects for the start and end time of the selected time slot
    const selectedSlotStart = new Date(date);
    selectedSlotStart.setHours(startHour, startMinute, 0, 0);

    const selectedSlotEnd = new Date(date);
    selectedSlotEnd.setHours(endHour, endMinute, 0, 0);

    // Check if the selected time slot is currently in progress
    if (currentTime >= selectedSlotStart && currentTime <= selectedSlotEnd) {
      throw new ApiError(
        400,
        "The selected time slot is currently in progress. Please select a different time slot."
      );
    }

    // Ensure the selected time slot is in the future
    if (selectedSlotStart < currentTime) {
      throw new ApiError(
        400,
        "The selected time slot is in the past. Please select a future time slot."
      );
    }

    logger.info(`Attempting to create customer: ${email}`);
    return res
      .status(201)
      .json(new ApiResponse(200, {}, "Check Availability successful"));
  } catch (error) {
    logger.error(`Error Checking Availability for customer: ${error.message}`);
    next(error);
  }
});

const parseTime = (timeStr) => {
  const [hour, minute] = timeStr.split(":").map(Number);
  return [hour, minute];
};

const createCustomer = asyncHandler(async (req, res, next) => {
  try {
    const {
      customerName,
      email,
      contactNumber,
      firstLineOfAddress,
      town,
      postcode,
      selectedDate,
      selectedTimeSlot,
      selectService,
      gutterCleaningOptions,
      gutterRepairsOptions,
      selectHomeType,
      selectHomeStyle,
      numberOfBedrooms,
      numberOfStories,
      paymentMethod,
      termsConditions,
      message,
    } = req.body;

    // Joi validation
    const { error, value } = validateCustomerInput(req.body);
    if (error) {
      const errorMessage = error.details.map((err) => err.message).join(", ");
      throw new ApiError(400, `Validation failed: ${errorMessage}`);
    }

    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      // Array to store URLs
      for (let file of req.files) {
        const fileUrl = `https://${req.get("host")}/zacks-gutter/api/public/${
          file.filename
        }`;
        photoUrls.push(fileUrl); // Add URL to array
      }
    }
    const date = new Date(selectedDate);

    // Ensure that selectedDate is not today
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of the day
    if (date.toDateString() === currentDate.toDateString()) {
      throw new ApiError(400, "Bookings for today are not allowed.");
    }

    // Ensure that selectedDate is a weekday (Monday to Friday)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new ApiError(
        400,
        "Bookings are only allowed from Monday to Friday."
      );
    }

    // Define postcode groups
    const postcodeGroups = {
      Crawley: ["RH10", "RH11", "RH6"],
      Horsham: ["RH12", "RH13", "RH6"],
      // Horley:["RH6"]
    };

    const shortPrefix = postcode.substring(0, 3).toUpperCase(); // Check the first 3 characters for "RH6"
    const longPrefix = postcode.substring(0, 4).toUpperCase(); // Check the first 4 characters for other prefixes

    let group = Object.keys(postcodeGroups).find(
      (group) =>
        postcodeGroups[group].includes(longPrefix) || shortPrefix === "RH6"
    );

    if (!group) {
      throw new ApiError(
        400,
        "We do not currently service this postcode area."
      );
    }
    const formattedDate = date.toISOString().split("T")[0];
    // Check for existing bookings on the selected date
    const existingBookings = await Customer.find({
      selectedDate: formattedDate,
    });

    if (existingBookings.length > 0) {
      const existingCustomer = existingBookings[0];
      // Extract the first 3 or 4 characters of the existing customer's postcode
      const existingCustomerShortPrefix = existingCustomer.postcode
        .substring(0, 3)
        .toUpperCase();
      const existingCustomerLongPrefix = existingCustomer.postcode
        .substring(0, 4)
        .toUpperCase();
      // Find group of existing customer postcode
      const existingCustomerGroup = Object.keys(postcodeGroups).find(
        (group) =>
          postcodeGroups[group].includes(existingCustomerLongPrefix) ||
          existingCustomerShortPrefix === "RH6"
      );
      if (existingCustomerGroup !== group) {
        throw new ApiError(
          400,
          `Bookings are already made for this date. Only customers from the same postcode area group (${existingCustomerGroup}) can book for this date.`
        );
      }
      if (
        existingBookings.some(
          (customer) => customer.selectedTimeSlot === selectedTimeSlot
        )
      ) {
        throw new ApiError(
          400,
          `The selected time slot is already booked: ${selectedTimeSlot}`
        );
      }
    }

    // Validate that the selected time slot is in the future
    const currentTime = new Date();
    const [startHour, startMinute] = selectedTimeSlot.split("-")[0].split(":");
    const selectedSlotDate = new Date(selectedDate);
    selectedSlotDate.setHours(
      parseInt(startHour, 10),
      parseInt(startMinute, 10)
    );

    if (selectedSlotDate <= currentTime) {
      throw new ApiError(
        400,
        "The selected time slot is in the past or too soon. Please select a future time slot."
      );
    }

    logger.info(`Attempting to create customer: ${email}`);

    // Calculate price
    const price = calculateTotalPrice(req.body);
    if (price == 0) {
      throw new ApiError(
        400,
        "Total price cannot be 0. Please review your selections."
      );
    }
    let timeSlot = await TimeSlot.findOne({ date: date });
    if (timeSlot) {
      const slot = timeSlot.slots.find((s) => s.time === selectedTimeSlot);
      if (slot && (slot.blockedBy || slot.bookedBy)) {
        throw new ApiError(400, "The selected time slot is not available.");
      }
    } else {
      timeSlot = new TimeSlot({ date: date, slots: [] });
    }

    // Create and save new customer
    const newCustomer = new Customer({
      customerName,
      email,
      contactNumber,
      firstLineOfAddress,
      town,
      postcode,
      selectedDate: formattedDate,
      selectedTimeSlot,
      selectService,
      gutterCleaningOptions,
      gutterRepairsOptions,
      selectHomeType,
      selectHomeStyle,
      totalPrice: price,
      numberOfBedrooms,
      numberOfStories,
      message,
      paymentMethod,
      photos: photoUrls,
      isLocked: true,
      bookedBy: "customer",
      termsConditions,
    });
    await newCustomer.save();

    const slotIndex = timeSlot.slots.findIndex(
      (s) => s.time === selectedTimeSlot
    );
    if (slotIndex !== -1) {
      timeSlot.slots[slotIndex].bookedBy = newCustomer._id;
    } else {
      timeSlot.slots.push({
        time: selectedTimeSlot,
        bookedBy: newCustomer._id,
      });
    }

    await timeSlot.save();

    // Handle PayPal payment if applicable
    if (paymentMethod === "PayPal") {
      const order = await paypalService.createOrder(price, {
        selectedDate,
        selectedTimeSlot,
        selectService,
        numberOfBedrooms,
        selectHomeStyle,
      });
      newCustomer.paypalOrderId = order.id;
      await newCustomer.save();

      const approvalUrl = order.links.find(
        (link) => link.rel === "approve"
      ).href;

      logger.info(
        `PayPal order created for customer: ${email}, orderId: ${order.id}`
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            customer: newCustomer,
            paypalOrderId: order.id,
            approvalUrl: approvalUrl,
          },
          "Proceed to PayPal payment"
        )
      );
    }
    if (paymentMethod === "Mollie") {
      try {
        const order = await mollieService.createOrder(price, {
          selectedDate,
          selectedTimeSlot,
          selectService,
          numberOfBedrooms,
          selectHomeStyle,
          id: newCustomer._id,
        });

        const { paymentId, paymentUrl } = order;
        newCustomer.molliePaymentId = paymentId;
        await newCustomer.save();
        // Log Mollie order creation
        logger.info(
          `Mollie order created for customer: ${email}, orderId: ${order.id}`
        );
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              customer: newCustomer,
              mollieOrderId: paymentId,
              approvalUrl: paymentUrl,
            },
            "Proceed to Mollie payment"
          )
        );
      } catch (error) {
        next(error);
      }
    }

    // Success response
    return res
      .status(201)
      .json(
        new ApiResponse(201, { customer: newCustomer }, "Booking successful")
      );
  } catch (error) {
    logger.error(`Error creating customer: ${error.message}`);
    next(error);
  }
});

const capturePayment = asyncHandler(async (req, res, next) => {
  const captureDetails = req.body;
  const { id: orderID, status, purchase_units } = captureDetails;

  // Find the customer based on the PayPal order ID
  const customer = await Customer.findOne({ paypalOrderId: orderID });

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  // Check if payment has already been captured
  if (customer.paymentStatus === "completed") {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { customer }, "Payment has already been captured.")
      );
  }

  try {
    // Process completed payment
    if (status === "COMPLETED") {
      customer.paymentStatus = "completed";
      customer.isBooked = true;
      customer.captureId =
        captureDetails.purchase_units[0].payments.captures[0].id;
      customer.isLocked = false;
      customer.lockExpiresAt = null;

      // Save updated customer details
      await customer.save();

      // Extract booking details
      const bookingDetails = {
        date: customer.selectedDate,
        timeSlot: customer.selectedTimeSlot,
        amount: purchase_units[0].amount.value,
        serviceDescription: customer.selectService,
      };

      // Send confirmation email to the customer
      await sendCustomerConfirmationEmail(customer, bookingDetails);
      // Send notification email to the admin
      await sendAdminNotificationEmail(
        customer,
        bookingDetails,
        captureDetails
      );

      console.log(
        `Payment captured successfully for customer: ${customer.email}`
      );
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { captureDetails, customer },
            "Payment captured successfully."
          )
        );
    } else {
      console.log(`Payment capture failed for customer: ${customer.email}`);
      throw new ApiError(400, "Payment capture failed.");
    }
  } catch (error) {
    next(error);
  }
});
const cancelPayment = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    // Find customer based on booking ID
    const customer = await Customer.findOne({ paypalOrderId: bookingId });
    if (!customer) {
      throw new ApiError(404, "Customer booking not found");
    }

    // Ensure the payment status is 'pending'
    if (customer.paymentStatus !== "pending") {
      throw new ApiError(
        400,
        "This booking's payment has already been processed or cancelled"
      );
    }

    // Delete the customer booking
    await Customer.findByIdAndDelete(customer._id);

    console.log(
      `Payment cancellation processed successfully for customer: ${customer.email}`
    );

    // Extract necessary details for unblocking the time slot
    const { selectedDate, selectedTimeSlot } = customer;

    // Unblock the time slot
    const parsedDate = new Date(selectedDate);
    parsedDate.setUTCHours(0, 0, 0, 0);

    const timeSlot = await TimeSlot.findOne({ date: parsedDate });
    if (!timeSlot) {
      throw new ApiError(404, "No time slots found for the given date.");
    }

    const existingSlot = timeSlot.slots.find(
      (s) => s.time === selectedTimeSlot
    );
    if (!existingSlot) {
      throw new ApiError(
        404,
        `Slot ${selectedTimeSlot} not found on this date.`
      );
    }

    // Unblock the slot by checking `bookedBy` instead of `blockedBy`
    if (existingSlot.bookedBy) {
      existingSlot.bookedBy = null; // Unblock the slot
    } else {
      throw new ApiError(400, `Slot ${selectedTimeSlot} is not blocked.`);
    }

    // Save the updated time slot information
    await timeSlot.save();

    // Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { customer, timeSlot },
          "Payment cancellation and time slot unblocking processed successfully."
        )
      );
  } catch (error) {
    console.error("Cancellation error:", error);
    next(error);
  }
});

const refundPaymentHandler = asyncHandler(async (req, res, next) => {
  const { captureId, refundAmount, refundReason } = req.body;

  if (!captureId || !refundAmount) {
    throw new ApiError(400, "Capture ID and refund amount are required.");
  }

  try {
    // Process refund
    const refundDetails = await paypalService.refundPayment(
      captureId,
      refundAmount
    );
    console.log("refud deatails", refundDetails);

    // Find the customer based on the captureId
    const customer = await Customer.findOne({
      captureId: captureId,
    });

    if (!customer) {
      throw new ApiError(404, "Customer not found.");
    }

    // Update customer record
    customer.refundStatus = "completed";
    customer.refundId = refundDetails.id;
    customer.refundReason = refundReason;
    customer.refundAmount = refundAmount;
    customer.refundDate = new Date();
    customer.isBooked = false;
    customer.isLocked = false;
    customer.lockExpiresAt = null;
    // customer.selectedTimeSlot=null,
    // customer.selectedDate=null
    await customer.save();

    // // Send refund notifications
    await sendCustomerRefundEmail(customer, refundDetails);
    await sendAdminRefundNotificationEmail(customer, refundDetails);

    console.log(
      `Refund processed successfully for customer: ${customer.email}`
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { refundDetails, customer },
          "Refund processed successfully."
        )
      );
  } catch (error) {
    console.error("Refund error:", error);
    next(error);
  }
});
const handleCanceledPayment = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;

  if (!orderId) {
    throw new ApiError(400, "Order ID is required.");
  }
  try {
    // Fetch order details from PayPal
    const order = await paypalService.checkOrderStatus(orderId);

    if (order.status !== "CANCELLED") {
      throw new ApiError(400, "Order is not canceled.");
    }

    // Find the customer based on the PayPal order ID
    const customer = await Customer.findOne({ paypalOrderId: orderId });

    if (!customer) {
      throw new ApiError(404, "Customer not found.");
    }

    // Update customer record
    customer.paymentStatus = "canceled";
    customer.isBooked = false;
    customer.isLocked = false;
    customer.lockExpiresAt = null;

    // Unlock any resources or slots

    // Save updated customer details
    await customer.save();

    // Send cancellation email to the customer
    // await sendCustomerCancellationEmail(customer);

    // Send notification email to the admin
    // await sendAdminCancellationNotificationEmail(customer);

    console.log(
      `Payment cancellation processed successfully for customer: ${customer.email}`
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { order, customer },
          "Payment cancellation processed successfully."
        )
      );
  } catch (error) {
    console.error("Cancellation error:", error);
    next(error);
  }
});

//************************************************ */
//      MOLLIE PAYMENT CONTROLLERS START
//*********************************************** */
// ******helper start ******//
async function handlePaidPayment(payment, bookingId) {
  try {
    // Find and update booking
    const booking = await Customer.findOne({
      molliePaymentId: payment.id,
    });

    if (!booking) {
      logger.warn("Booking not found for paid payment", {
        paymentId: payment.id,
      });
      return;
    }

    // Update booking status
    booking.paymentStatus = "completed";
    await booking.save();

    // Send confirmation email or notification
    const bookingDetails = {
      date: booking.selectedDate,
      timeSlot: booking.selectedTimeSlot,
      amount: payment.amount?.value || booking.totalPrice,
      serviceDescription: payment.description,
    };
    const captureDetails = {
      id: payment.id,
      status: payment.status,
    };

    //  Send confirmation email to the customer
    await sendCustomerConfirmationEmail(booking, bookingDetails);
    //  // Send notification email to the admin
    await sendAdminNotificationEmail(booking, bookingDetails, captureDetails);
    // await sendBookingConfirmationNotification(booking);

    logger.info("Payment confirmed and booking processed", {
      bookingId,
      amount: payment.amount.value,
    });
  } catch (error) {
    logger.error("Error processing paid payment", {
      paymentId: payment.id,
      errorMessage: error.message,
    });
  }
}
async function handleExpiredPayment(payment, bookingId) {
  try {
    // Find and update booking
    const booking = await Customer.findOne({
      molliePaymentId: payment.id,
    });

    if (!booking) {
      logger.warn("Booking not found for expired payment", {
        paymentId: payment.id,
      });
      return;
    }
    await Customer.findByIdAndDelete(booking._id);
    await unblockTimeSlot(booking);
    // Send expiration notification
    // await sendPaymentExpirationNotification(booking);
    logger.info("Payment expired and booking updated", {
      bookingId,
    });
  } catch (error) {
    logger.error("Error processing expired payment", {
      paymentId: payment.id,
      errorMessage: error.message,
    });
  }
}
async function unblockTimeSlot(customer) {
  console.log("*************WELOCME TO UNBLOCK*************** ");

  const { selectedDate, selectedTimeSlot } = customer;
  const parsedDate = new Date(selectedDate);
  parsedDate.setUTCHours(0, 0, 0, 0); // Set to start of the day in UTC

  // Find the time slot
  const timeSlot = await TimeSlot.findOne({ date: parsedDate });
  if (!timeSlot) {
    throw new ApiError(404, "No time slots found for the given date");
  }

  // Find and validate the specific slot
  const existingSlot = timeSlot.slots.find((s) => s.time === selectedTimeSlot);
  if (!existingSlot) {
    throw new ApiError(404, `Slot ${selectedTimeSlot} not found on this date`);
  }

  // Unblock the slot
  if (!existingSlot.bookedBy) {
    throw new ApiError(400, `Slot ${selectedTimeSlot} is already unblocked`);
  }

  existingSlot.bookedBy = null;
  await timeSlot.save();

  logger.info("Time slot unblocked successfully", {
    date: parsedDate,
    timeSlot: selectedTimeSlot,
  });
  await timeSlot.save();
  return timeSlot;
}
// ******helper end ******//
const handleMolliePaymentWebhook = asyncHandler(async (req, res, next) => {
  const paymentId = req.body.id;
  console.log("***************Webhook Welocome*****************");
  try {
    // Validate webhook payload
    if (!paymentId) {
      logger.warn("Received invalid webhook payload", {
        payload: req.body,
      });
      return res.status(400).send("Invalid webhook payload");
    }

    // Retrieve payment details from Mollie
    const payment = await mollieClient.payments.get(paymentId);

    // Extract booking information from payment metadata
    const bookingId = payment.metadata?.bookingId;

    // Comprehensive payment status handling
    switch (payment.status) {
      case "paid":
        await handlePaidPayment(payment, bookingId);
        break;

      // case "open":
      //   await handleOpenPayment(payment, bookingId);
      //   break;

      // case "canceled":
      //   await handleCanceledPayment1(payment, bookingId);
      //   break;

      // case "failed":
      //   await handleFailedPayment(payment, bookingId);
      //   break;

      case "expired":
        await handleExpiredPayment(payment, bookingId);
        break;

      default:
        logger.warn("Unhandled payment status", {
          paymentId,
          status: payment.status,
        });
    }

    // Log successful webhook processing
    logger.info("Mollie webhook processed successfully", {
      paymentId,
      status: payment.status,
      bookingId,
    });

    // Respond immediately to acknowledge webhook
    res.status(200).send("Webhook received");
  } catch (error) {
    // Comprehensive error logging
    logger.error("Error processing Mollie webhook", {
      paymentId,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // Send error response
    res.status(500).send("Error processing webhook");
  }
});
const cancelPaymentForMollie = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  try {
    // Find customer based on booking ID
    const customer = await Customer.findOne({ molliePaymentId: bookingId });
    if (!customer) {
      throw new ApiError(404, "Customer booking not found");
    }

    // Ensure the payment status is 'pending'
    if (customer.paymentStatus !== "pending") {
      throw new ApiError(
        400,
        "This booking's payment has already been processed or cancelled"
      );
    }

    // Delete the customer booking
    await Customer.findByIdAndDelete(customer._id);

    console.log(
      `Payment cancellation processed successfully for customer: ${customer.email}`
    );
    await unblockTimeSlot(customer);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { customer },
          "Payment cancellation and time slot unblocking processed successfully."
        )
      );
  } catch (error) {
    console.error("Cancellation error:", error);
    next(error);
  }
});
const handlePaymentStatusForMollie = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  try {
    const customer = await Customer.findById(bookingId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }
    const payment = await mollieService.handlePaymentStatus(
      customer?.molliePaymentId
    );
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          status: payment.status,
          details: payment,
          paymentDetails: customer,
        },
        "Payment status fetched successfully"
      )
    );
  } catch (error) {
    next(error);
  }
});
const handlePaymentRefundForMollie = asyncHandler(async (req, res, next) => {
  const { bookingId, amount, reason } = req.body;

  if (!amount || !reason) {
    return res.status(400).json({
      success: false,
      message: "Refund amount and reason are required.",
    });
  }

  try {
    // Find the customer using the bookingId
    const customer = await Customer.findById(bookingId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // Check if the customer has a valid Mollie payment ID
    if (!customer.molliePaymentId) {
      return res.status(400).json({
        success: false,
        message: "No Mollie payment ID found for this customer.",
      });
    }

    // Perform the refund via the Mollie service
    const refund = await mollieService.refundPayment(
      customer.molliePaymentId, // Payment ID from Mollie
      amount, // Refund amount
      reason, // Reason for the refund
      next
    );

    // Update customer record with refund information
    customer.refundStatus = "completed";
    customer.refundAmount = amount;
    customer.refundReason = reason;
    customer.refundDate = new Date();
    await customer.save();

    // Return success response with refund details
    return res.status(200).json({
      success: true,
      message: "Payment refunded successfully",
      data: {
        refundDetails: refund, // Refund response from Mollie API
        paymentDetails: customer, // Customer details related to the payment
      },
    });
  } catch (error) {
    console.error("Refund error:", error);
    next(error); // Pass any errors to the error handler middleware
  }
});
//************************************************ */
//      MOLLIE PAYMENT CONTROLLERS END
//*********************************************** */

export {
  cancelPayment,
  capturePayment,
  createCustomer,
  checkCustomer,
  refundPaymentHandler,
  cancelPaymentForMollie,
  handleMolliePaymentWebhook,
  handlePaymentStatusForMollie,
  handlePaymentRefundForMollie,
};
