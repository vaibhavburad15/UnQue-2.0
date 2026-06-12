import {HttpError} from "../models/error.js"
import {Availability} from "../models/availability.js"
import { Appointment } from "../models/appointment.js";
import moment from "moment";
import mongoose from "mongoose";

const setAvailability = async (req, res, next) => {
  try {
    console.log(req.user);
    const { startTime, endTime } = req.body;
    if (!req.user || !req.user.id) {
      return next(new HttpError("No professor ID found", 400));
    }
    if (new Date(startTime) >= new Date(endTime)) {
      return next(new HttpError("Start time must be before end time", 400));
    }
    const existingAvailability = await Availability.findOne({
      professorId: req.user.id,
      $or: [
        { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } },
        { startTime: { $lt: new Date(startTime) }, endTime: { $gt: new Date(endTime) } }
      ]
    });
    if (existingAvailability) {
      return next(new HttpError("This time slot is already added for you professor", 400));
    }
    const availability = new Availability({
      professorId: req.user.id,
      startTime,
      endTime,
    });
    await availability.save();
    const formattedStartTime = moment.utc(availability.startTime).format('MMMM Do YYYY, h:mm:ss a');
    const formattedEndTime = moment.utc(availability.endTime).format('MMMM Do YYYY, h:mm:ss a');
    res.status(201).json({
      message: "Availability added successfully",
      availability: {
        _id: availability._id,
        professorId: availability.professorId,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new HttpError("Adding availability failed", 500));
  }
};

const updateAvailability = async (req, res, next) => {
  try {
    const { availabilityId } = req.params;
    const professorId = req.user.id;
    const { newStartTime, newEndTime } = req.body;
    if (!newStartTime || !newEndTime) {
      return next(new HttpError("newStartTime and newEndTime are required", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(availabilityId)) {
      return next(new HttpError("Invalid availability ID format", 400));
    }
    if (new Date(newStartTime) >= new Date(newEndTime)) {
      return next(new HttpError("Start time must be before end time", 400));
    }
    const slot = await Availability.findOne({
      _id: new mongoose.Types.ObjectId(availabilityId),
      professorId: new mongoose.Types.ObjectId(professorId),
    });
    if (!slot) {
      return next(new HttpError("Availability slot not found or you are not authorized to update it", 404));
    }
    const overlap = await Availability.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(availabilityId) },
      professorId: new mongoose.Types.ObjectId(professorId),
      $or: [
        { startTime: { $lt: new Date(newEndTime) }, endTime: { $gt: new Date(newStartTime) } },
        { startTime: { $lt: new Date(newStartTime) }, endTime: { $gt: new Date(newEndTime) } },
      ],
    });
    if (overlap) {
      return next(new HttpError("Updated time overlaps with another existing availability slot", 409));
    }
    const conflictingAppointment = await Appointment.findOne({
      professorId: new mongoose.Types.ObjectId(professorId),
      time: { $gte: slot.startTime, $lte: slot.endTime },
      status: "booked",
      $or: [
        { time: { $lt: new Date(newStartTime) } },
        { time: { $gt: new Date(newEndTime) } },
      ],
    });
    if (conflictingAppointment) {
      return next(new HttpError("Cannot update slot: a student has a booked appointment that falls outside your new time window", 409));
    }
    slot.startTime = new Date(newStartTime);
    slot.endTime = new Date(newEndTime);
    await slot.save();
    res.status(200).json({
      message: "Availability slot updated successfully",
      availability: {
        _id: slot._id,
        professorId: slot.professorId,
        startTime: moment.utc(slot.startTime).format('MMMM Do YYYY, h:mm:ss a'),
        endTime: moment.utc(slot.endTime).format('MMMM Do YYYY, h:mm:ss a'),
      },
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    return next(new HttpError("Failed to update availability slot", 500));
  }
};

const cancelAppointments = async(req,res,next) => {
  try {
    const { studentId } = req.params;
    const professorId = req.user.id;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return next(new HttpError("Invalid or missing student ID", 400));
    }
    const appointments = await Appointment.find({
      studentId: new mongoose.Types.ObjectId(studentId),
      professorId: new mongoose.Types.ObjectId(professorId),
      status: 'booked'
    });
    if (!appointments || appointments.length === 0) {
      return next(new HttpError("No appointments found to cancel", 404));
    }
    await Appointment.updateMany(
      {
        studentId: new mongoose.Types.ObjectId(studentId),
        professorId: new mongoose.Types.ObjectId(professorId),
        status: 'booked'
      },
      { $set: { status: 'cancelled' } }
    );
    res.status(200).json({
      message: `All appointments between professor ${professorId} and student ${studentId} have been cancelled.`
    });
  } catch (error) {
    console.error("Error cancelling appointments:", error);
    return next(new HttpError("Failed to cancel appointments", 500));
  }
};

export { setAvailability, updateAvailability, cancelAppointments };
