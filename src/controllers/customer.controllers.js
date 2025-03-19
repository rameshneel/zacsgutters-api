import Customer from "../models/customer.model.js";
import TimeSlot from "../models/timeSlot.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateTotalPrice } from "../utils/priceCalculator.js";

const getCustomerById = asyncHandler(async (req, res, next) => {
  try {
    // Extract customer ID from request parameters
    const { id } = req.params;

    // Validate the ID (basic validation)
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format.",
      });
    }

    // Fetch the customer by ID
    const customer = await Customer.findById(id);

    // If customer not found, return 404
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // Return the customer data
    return res.status(200).json({
      success: true,
      data: customer,
      message: "Customer data retrieved successfully.",
    });
  } catch (error) {
    console.error("Error fetching customer data by ID:", error);
    next(new ApiError(500, "Internal server error."));
  }
});

const getcustomerBooking = asyncHandler(async (req, res, next) => {
  try {
    // Extract page, limit, and search from query parameters
    let { page = 1, limit = 10, search } = req.query;

    // Convert to integers and set defaults
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    // Calculate the starting index
    const startIndex = (page - 1) * limit;

    // Build the query object for filtering
    const query = {};
    if (search) {
      const regex = new RegExp(search, "i"); // Case-insensitive search
      query.$or = [
        { customerName: { $regex: regex } },
        { email: { $regex: regex } },
        { contactNumber: { $regex: regex } },
        { firstLineOfAddress: { $regex: regex } },
        { town: { $regex: regex } },
        { postcode: { $regex: regex } },
        { selectedTimeSlot: { $regex: regex } },
        { selectService: { $regex: regex } },
        { message: { $regex: regex } },
        { paymentMethod: { $regex: regex } },
        { paymentStatus: { $regex: regex } },
        { refundStatus: { $regex: regex } },
        { bookedBy: { $regex: regex } },
        { numberOfBedrooms: { $regex: regex } },
        // Add any additional fields as needed
      ];
    }

    // Fetch the total number of customers based on query
    const totalCustomers = await Customer.countDocuments(query);

    // Fetch the customers for the current page with filtering
    const customers = await Customer.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalCustomers / limit);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          customers,
          totalCustomers,
          totalPages,
          currentPage: page,
        },
        "Customer data retrieved successfully."
      )
    );
  } catch (error) {
    console.error("Error fetching customer data:", error);
    next(new ApiError(500, "Internal server error."));
  }
});
const deleteCustomerById = asyncHandler(async (req, res, next) => {
  try {
    // Extract customer ID from request parameters
    const { id } = req.params;

    // Validate the ID (basic validation)
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format.",
      });
    }

    // Delete the customer by ID
    const result = await Customer.findByIdAndDelete(id);

    // Unblock the time slot
    const parsedDate = new Date(result.selectedDate);
    parsedDate.setUTCHours(0, 0, 0, 0);

    const timeSlot = await TimeSlot.findOne({ date: parsedDate });
    if (!timeSlot) {
      throw new ApiError(404, "No time slots found for the given date.");
    }

    const existingSlot = timeSlot.slots.find(
      (s) => s.time === result.selectedTimeSlot
    );
    if (!existingSlot) {
      throw new ApiError(
        404,
        `Slot ${result.selectedTimeSlot} not found on this date.`
      );
    }

    // Unblock the slot by checking `bookedBy` instead of `blockedBy`
    if (existingSlot.bookedBy) {
      existingSlot.bookedBy = null; // Unblock the slot
    } else {
      throw new ApiError(
        400,
        `Slot ${result.selectedTimeSlot} is not blocked.`
      );
    }

    // Save the updated time slot information
    await timeSlot.save();

    // If customer not found, return 404
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    next(new ApiError(500, "Internal server error."));
  }
});
const createCustomerByAdmin = asyncHandler(async (req, res, next) => {
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
      message,
    } = req.body;

    // Validate required fields
    if (
      !customerName ||
      !email ||
      !postcode ||
      !selectedDate ||
      !selectedTimeSlot ||
      !selectService
    ) {
      throw new ApiError(400, "Required fields are missing.");
    }

    const date = new Date(selectedDate);
    date.setUTCHours(0, 0, 0, 0);

    // Ensure that selectedDate is not today
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);
    if (date.getTime() === currentDate.getTime()) {
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

    // Check if the time slot is available
    // let timeSlot = await TimeSlot.findOne({ date: date });

    // if (timeSlot) {
    //   const slot = timeSlot.slots.find(s => s.time === selectedTimeSlot);
    //   if (slot && (slot.blockedBy || slot.bookedBy)) {
    //     throw new ApiError(400, "The selected time slot is not available.");
    //   }
    // } else {
    //   timeSlot = new TimeSlot({ date: date, slots: [] });
    // }
    let timeSlot = await TimeSlot.findOne({ date: date });

    if (timeSlot) {
      const slot = timeSlot.slots.find((s) => s.time === selectedTimeSlot);
      if (slot && (slot.blockedBy || slot.bookedBy)) {
        throw new ApiError(400, "The selected time slot is not available.");
      }
    } else {
      timeSlot = new TimeSlot({ date: date, slots: [] });
    }

    // Calculate price
    const price = calculateTotalPrice(req.body);
    if (price === 0) {
      throw new ApiError(
        400,
        "Total price cannot be 0. Please review your selections."
      );
    }

    // Create and save new customer
    const newCustomer = new Customer({
      customerName,
      email,
      contactNumber,
      firstLineOfAddress,
      town,
      postcode,
      selectedDate: date,
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
      isLocked: true,
      termsConditions: true,
      paymentStatus: "completed",
      bookedBy: "admin",
    });

    await newCustomer.save();

    // Update the time slot
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

    return res
      .status(201)
      .json(
        new ApiResponse(201, { customer: newCustomer }, "Booking successful")
      );
  } catch (error) {
    next(error);
  }
});
const updateCustomerByAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { customerId } = req.params; // Assuming customerId is passed in the URL
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
      message,
    } = req.body;

    // Find the existing customer booking
    const existingCustomer = await Customer.findById(customerId);
    if (!existingCustomer) {
      throw new ApiError(404, "Booking not found.");
    }

    // Validate if the selected date and time slot can be updated
    if (selectedDate || selectedTimeSlot) {
      const date = new Date(selectedDate);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // Ensure selectedDate is not today
      if (selectedDate && date.toDateString() === currentDate.toDateString()) {
        throw new ApiError(400, "Cannot update booking to today.");
      }

      // Ensure selectedDate is a weekday
      if (selectedDate && (date.getDay() === 0 || date.getDay() === 6)) {
        throw new ApiError(400, "Bookings can only be updated to weekdays.");
      }

      // Check if the new selected time slot is already booked,
      // but allow if it's the same as the existing booking
      const formattedDate = date.toISOString().split("T")[0];
      const existingBookings = await Customer.find({
        selectedDate: formattedDate,
        selectedTimeSlot: selectedTimeSlot,
      });

      // Allow the update if the existing booking's date and time slot are the same
      const isSameBooking = existingBookings.some(
        (booking) => booking._id.toString() === customerId
      );

      if (!isSameBooking && existingBookings.length > 0) {
        throw new ApiError(
          400,
          `The selected time slot is already booked: ${selectedTimeSlot}`
        );
      }
    }

    // Update fields
    existingCustomer.customerName =
      customerName || existingCustomer.customerName;
    existingCustomer.email = email || existingCustomer.email;
    existingCustomer.contactNumber =
      contactNumber || existingCustomer.contactNumber;
    existingCustomer.firstLineOfAddress =
      firstLineOfAddress || existingCustomer.firstLineOfAddress;
    existingCustomer.town = town || existingCustomer.town;
    existingCustomer.postcode = postcode || existingCustomer.postcode;
    existingCustomer.selectedDate =
      selectedDate || existingCustomer.selectedDate;
    existingCustomer.selectedTimeSlot =
      selectedTimeSlot || existingCustomer.selectedTimeSlot;
    existingCustomer.selectService =
      selectService || existingCustomer.selectService;
    existingCustomer.gutterCleaningOptions =
      gutterCleaningOptions || existingCustomer.gutterCleaningOptions;
    existingCustomer.gutterRepairsOptions =
      gutterRepairsOptions || existingCustomer.gutterRepairsOptions;
    existingCustomer.selectHomeType =
      selectHomeType || existingCustomer.selectHomeType;
    existingCustomer.selectHomeStyle =
      selectHomeStyle || existingCustomer.selectHomeStyle;
    existingCustomer.numberOfBedrooms =
      numberOfBedrooms || existingCustomer.numberOfBedrooms;
    existingCustomer.numberOfStories =
      numberOfStories || existingCustomer.numberOfStories;
    existingCustomer.paymentMethod =
      paymentMethod || existingCustomer.paymentMethod;
    existingCustomer.message = message || existingCustomer.message;

    // Save the updated booking
    await existingCustomer.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { customer: existingCustomer },
          "Booking updated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
});

export {
  getcustomerBooking,
  getCustomerById,
  deleteCustomerById,
  createCustomerByAdmin,
  updateCustomerByAdmin,
};
