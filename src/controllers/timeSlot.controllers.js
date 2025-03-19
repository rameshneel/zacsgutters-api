import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import TimeSlot from "../models/timeSlot.model.js";

async function getAvailableSlots(date) {
  const timeSlot = await TimeSlot.findOne({ date })
    .populate("slots.bookedBy")
    .populate("slots.blockedBy");

  if (!timeSlot) {
    return "No time slots available for this date.";
  }

  const availableSlots = timeSlot.slots.map((slot) => {
    if (slot.blockedBy) {
      return { time: slot.time, status: "Blocked", blockedBy: slot.blockedBy };
    }
    if (slot.bookedBy) {
      return { time: slot.time, status: "Booked", bookedBy: slot.bookedBy };
    }
    return { time: slot.time, status: "Available" };
  });
  console.log("avddd", availableSlots);

  return availableSlots;
}
const DEFAULT_TIME_SLOTS = [
  "9:00-9:45 AM",
  "9:45-10:30 AM",
  "10:30-11:15 AM",
  "11:15-12:00 PM",
  "12:00-12:45 PM",
  "12:45-1:30 PM",
  "1:30-2:15 PM",
  "2:15-3:00 PM",
];
const getAvailableSlotsForDate = async (date) => {
  const timeSlot = await TimeSlot.findOne({ date });

  return DEFAULT_TIME_SLOTS.map((slotTime) => {
    const existingSlot = timeSlot?.slots.find((s) => s.time === slotTime);

    if (existingSlot) {
      if (existingSlot.bookedBy)
        return {
          time: slotTime,
          status: "Booked",
          bookedBy: existingSlot.bookedBy,
        };
      if (existingSlot.blockedBy)
        return {
          time: slotTime,
          status: "Blocked",
          blockedBy: existingSlot.blockedBy,
        };
    }

    return { time: slotTime, status: "Available" };
  });
};
const getAvailableTimeSlotsForForm = asyncHandler(async (req, res) => {
  console.log("testing");

  const { date } = req.query;
  if (!date) throw new ApiError(400, "Date is required.");

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0); // Normalize the date

  const slotsWithStatus = await getAvailableSlotsForDate(parsedDate);
  res
    .status(200)
    .json(
      new ApiResponse(200, slotsWithStatus, "Time slots fetched successfully")
    );
});
const getDisabledDates = asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    throw new ApiError(400, "Year aur month required hai.");
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  console.log("Start Date:", startDate);
  console.log("End Date:", endDate);

  const disabledDates = await TimeSlot.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $addFields: {
        totalSlots: { $size: { $ifNull: ["$slots", []] } },
        unavailableSlots: {
          $size: {
            $filter: {
              input: { $ifNull: ["$slots", []] },
              as: "slot",
              cond: { $ne: ["$$slot.blockedBy", null] },
            },
          },
        },
      },
    },
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ["$totalSlots", { $literal: DEFAULT_TIME_SLOTS.length }] },
            { $eq: ["$totalSlots", "$unavailableSlots"] },
          ],
        },
      },
    },
    {
      $project: {
        date: 1,
        _id: 0,
      },
    },
  ]);

  console.log("Disabled Dates:", disabledDates); // Debugging line to check output

  res.json(
    new ApiResponse(200, disabledDates, "Disabled dates fetched successfully")
  );
});
const blockTimeSlots = asyncHandler(async (req, res) => {
  const { date, slots } = req.body;
  if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      400,
      "Invalid input. Please provide a date and an array of slots to block."
    );
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  // Find the time slot for the given date
  let timeSlot = await TimeSlot.findOne({ date: parsedDate });

  if (!timeSlot) {
    // If no time slot exists for the date, create a new one
    timeSlot = new TimeSlot({ date: parsedDate, slots: [] });
  }

  // Check and block the requested slots
  slots.forEach((slot) => {
    const existingSlot = timeSlot.slots.find((s) => s.time === slot);

    if (existingSlot) {
      if (existingSlot.bookedBy) {
        throw new ApiError(
          400,
          `Slot ${slot} is already booked and cannot be blocked.`
        );
      }
      if (existingSlot.blockedBy) {
        throw new ApiError(400, `Slot ${slot} is already blocked.`);
      }
      existingSlot.blockedBy = req.user._id; // Track who blocked it
    } else {
      // If the slot doesn't exist, create it as blocked
      timeSlot.slots.push({ time: slot, blockedBy: req.user._id });
    }
  });

  await timeSlot.save();
  res.json(new ApiResponse(200, timeSlot, "Time slots blocked successfully"));
});
const unblockTimeSlots = asyncHandler(async (req, res) => {
  const { date, slots } = req.body;

  if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      400,
      "Invalid input. Please provide a date and an array of slots to unblock."
    );
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  const timeSlot = await TimeSlot.findOne({ date: parsedDate });

  if (!timeSlot) {
    throw new ApiError(404, "No time slots found for the given date.");
  }

  slots.forEach((slot) => {
    const existingSlot = timeSlot.slots.find((s) => s.time === slot);

    if (!existingSlot) {
      throw new ApiError(404, `Slot ${slot} not found on this date.`);
    }

    // Check if the slot is blocked
    if (existingSlot.blockedBy) {
      if (String(existingSlot.blockedBy) !== String(req.user._id)) {
        throw new ApiError(403, "You cannot unblock a slot you didn't block.");
      }
      // Unblock the slot
      existingSlot.blockedBy = null;
    } else {
      throw new ApiError(400, `Slot ${slot} is not blocked.`);
    }
  });

  await timeSlot.save();
  res.json(new ApiResponse(200, timeSlot, "Time slots unblocked successfully"));
});
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  const { date } = req.query; // Date ko query parameter se lete hain

  if (!date) {
    throw new ApiError(400, "Date is required.");
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  // Default time slots
  const defaultSlots = [
    "9:00-9:45 AM",
    "9:45-10:30 AM",
    "10:30-11:15 AM",
    "11:15-12:00 PM",
    "12:00-12:45 PM",
    "12:45-1:30 PM",
    "1:30-2:15 PM",
    "2:15-3:00 PM",
  ];

  // Fetch time slots for the given date
  const timeSlot = await TimeSlot.findOne({ date: parsedDate });

  // Initialize slots with their statuses
  const slotsWithStatus = defaultSlots.map((slotTime) => {
    const existingSlot = timeSlot
      ? timeSlot.slots.find((s) => s.time === slotTime)
      : null;

    if (existingSlot) {
      if (existingSlot.bookedBy) {
        return {
          time: slotTime,
          status: "Booked",
          bookedBy: existingSlot.bookedBy,
        };
      }
      if (existingSlot.blockedBy) {
        return {
          time: slotTime,
          status: "Blocked",
          blockedBy: existingSlot.blockedBy,
        };
      }
    }

    return { time: slotTime, status: "Available" };
  });

  res.json(
    new ApiResponse(200, slotsWithStatus, "Time slots fetched successfully")
  );
});

export {
  blockTimeSlots,
  unblockTimeSlots,
  getAvailableTimeSlots,
  getAvailableTimeSlotsForForm,
  getDisabledDates,
};
