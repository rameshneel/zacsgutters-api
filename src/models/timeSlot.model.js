import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    slots: [
      {
        time: {
          type: String,
          enum: [
            "9:00-9:45 AM",
            "9:45-10:30 AM",
            "10:30-11:15 AM",
            "11:15-12:00 PM",
            "12:00-12:45 PM",
            "12:45-1:30 PM",
            "1:30-2:15 PM",
            "2:15-3:00 PM",
          ],
          required: true,
        },
        bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
        blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional field
      },
    ],
  },
  { timestamps: true }
);

timeSlotSchema.virtual("slotsStatus").get(function () {
  return this.slots.map((slot) => {
    if (slot.blockedBy) {
      return { time: slot.time, status: "Blocked", blockedBy: slot.blockedBy };
    }
    if (slot.bookedBy) {
      return { time: slot.time, status: "Booked", bookedBy: slot.bookedBy };
    }
    return { time: slot.time, status: "Available" };
  });
});

timeSlotSchema.methods.getSlotStatus = function () {
  return this.slots.map((slot) => {
    if (slot.blockedBy) {
      return { time: slot.time, status: "Blocked", blockedBy: slot.blockedBy };
    }
    if (slot.bookedBy) {
      return { time: slot.time, status: "Booked", bookedBy: slot.bookedBy };
    }
    return { time: slot.time, status: "Available" };
  });
};

// Compound index for efficient querying
timeSlotSchema.index({ date: 1 }, { unique: true });

const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);

export default TimeSlot;
