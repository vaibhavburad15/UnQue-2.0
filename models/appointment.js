import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    time: { type: Date, required: true },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled"],
      default: "booked",
    },
  },
  { timestamps: true }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
export { Appointment };
