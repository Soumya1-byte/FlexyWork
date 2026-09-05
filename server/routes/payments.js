import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Attendance } from "../models/Attendance.js";
import { Notification } from "../models/Notification.js";
import { Payment } from "../models/Payment.js";
import { Shift } from "../models/Shift.js";
import { WorkerProfile } from "../models/Profile.js";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyRazorpaySignature
} from "../services/razorpay.js";

const router = express.Router();

async function completeShiftAfterPayment(shift) {
  shift.status = "completed";
  await shift.save();

  const attendances = await Attendance.find({
    shiftId: shift._id,
    checkInAt: { $exists: true, $ne: null }
  });
  const now = new Date();

  await Promise.all(
    attendances.map(async (attendance) => {
      // Guard: skip if already completed to prevent double-counting
      if (attendance.status === "completed") return;

      if (!attendance.checkOutAt) {
        attendance.checkOutAt = now;
      }
      attendance.status = "completed";
      attendance.durationMinutes = Math.max(
        1,
        Math.round((attendance.checkOutAt - attendance.checkInAt) / 60000)
      );
      await attendance.save();
      await WorkerProfile.findOneAndUpdate(
        { userId: attendance.workerId },
        { $inc: { completedShifts: 1 } }
      );
      await Notification.create({
        userId: attendance.workerId,
        message: `Your shift "${shift.title}" is complete. Payment has been received.`
      });
    })
  );
}

function serializePayment(payment) {
  const shift = payment.shiftId;
  const statusMap = {
    marked_paid: "completed",
    failed: "failed",
    cancelled: "cancelled",
    authorized: "pending",
    pending: "pending"
  };
  return {
    id: payment._id.toString(),
    userId: payment.workerId.toString(),
    date: payment.paidAt ? payment.paidAt.toISOString().slice(0, 10) : payment.createdAt.toISOString().slice(0, 10),
    amount: payment.amount,
    type: "earnings",
    description: shift?.title ? `Earnings: ${shift.title}` : "Shift earnings",
    status: statusMap[payment.status] || "pending",
    gateway: payment.gateway,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId
  };
}

async function resolveShiftWorkers(shift) {
  const attendances = await Attendance.find({ shiftId: shift._id });
  if (attendances.length) {
    return attendances.map((a) => a.workerId);
  }
  if (shift.assignedWorkerIds?.length) {
    return shift.assignedWorkerIds;
  }
  return [];
}

/**
 * Public Razorpay configuration.
 * Returns ONLY the public key id. The key secret is never exposed.
 */
router.get("/config", (_req, res) => {
  res.json({
    configured: isRazorpayConfigured(),
    keyId: getRazorpayKeyId(),
    currency: "INR",
    companyName: "FlexyWork"
  });
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const query = req.user.role === "worker" ? { workerId: req.user._id } : { employerId: req.user._id };
    const payments = await Payment.find(query).populate("shiftId").sort({ createdAt: -1 });
    res.json({ payments: payments.map(serializePayment) });
  } catch (error) {
    next(error);
  }
});

/**
 * Return the payment records for a specific shift. Either party
 * (employer or worker) can read this if they own the shift, plus admins.
 */
router.get("/by-shift/:shiftId", requireAuth, async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.shiftId);
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    const userId = req.user._id;
    const isEmployer = shift.employerId.equals(userId);
    const isAssignedWorker = (shift.assignedWorkerIds || []).some((id) => id.equals(userId));
    if (!isEmployer && !isAssignedWorker && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const payments = await Payment.find({ shiftId: shift._id }).populate("shiftId").sort({ createdAt: -1 });
    res.json({ payments: payments.map(serializePayment) });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a Razorpay order for paying all assigned workers of a shift.
 * The employer calls this after the shift has been completed. The order
 * is created server-side using the key secret; the order id + key id
 * are returned so the frontend can launch the Razorpay Checkout widget.
 */
router.post("/:shiftId/create-order", requireAuth, requireRole(["employer", "admin"]), async (req, res, next) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: "Razorpay is not configured on the server" });
    }

    const shift = await Shift.findById(req.params.shiftId);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (!shift.employerId.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!["in_progress", "completed", "filled"].includes(shift.status)) {
      const hasCheckedIn = await Attendance.exists({
        shiftId: shift._id,
        checkInAt: { $exists: true, $ne: null }
      });
      if (!hasCheckedIn) {
        return res.status(409).json({ message: "Worker must check in with the arrival OTP before initiating payment" });
      }
    }

    const workerIds = await resolveShiftWorkers(shift);
    if (!workerIds.length) {
      return res.status(409).json({ message: "No assigned workers found for this shift" });
    }

    const amountPerWorker = Number(shift.paymentAmount);
    if (!Number.isFinite(amountPerWorker) || amountPerWorker < 1) {
      return res.status(400).json({ message: "Invalid shift payment amount" });
    }

    // Idempotency guard: if all workers are already paid, refuse to double-charge.
    const existing = await Payment.find({ shiftId: shift._id });
    const alreadyPaid = existing.filter((p) => p.status === "marked_paid");
    if (alreadyPaid.length >= workerIds.length) {
      return res.status(409).json({ message: "All workers for this shift have already been paid" });
    }

    // Single Razorpay order covering the total payout. Receipt id is
    // short and unique so it fits Razorpay's 40-char receipt limit.
    const totalAmount = amountPerWorker * workerIds.length;
    const receipt = `shift_${shift._id.toString().slice(-12)}_${Date.now()}`;

    const order = await createRazorpayOrder({
      amount: totalAmount,
      receipt,
      notes: {
        shiftId: shift._id.toString(),
        employerId: shift.employerId.toString(),
        workerCount: String(workerIds.length)
      }
    });

    // Persist a payment record per worker. Upsert so re-clicks update
    // the order id but keep the unique (shiftId, workerId) constraint.
    const paymentRecords = await Promise.all(
      workerIds.map(async (workerId) => {
        const doc = await Payment.findOneAndUpdate(
          { shiftId: shift._id, workerId },
          {
            $set: {
              employerId: shift.employerId,
              amount: amountPerWorker,
              currency: "INR",
              status: "authorized",
              gateway: "razorpay",
              razorpayOrderId: order.id,
              paidAt: null
            }
          },
          { upsert: true, returnDocument: "after" }
        );
        return doc;
      })
    );

    res.json({
      orderId: order.id,
      amount: order.amount, // paise
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      receipt: order.receipt,
      totalAmount,
      workersCount: workerIds.length,
      amountPerWorker,
      paymentIds: paymentRecords.map((p) => p._id.toString())
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify the Razorpay checkout signature and mark related payment
 * records as paid. This is the ONLY path that flips status to
 * "marked_paid" when going through the Razorpay gateway.
 *
 * Request body:
 *   {
 *     razorpay_order_id:   string,
 *     razorpay_payment_id: string,
 *     razorpay_signature:  string,
 *     shiftId:             string
 *   }
 */
router.post("/verify", requireAuth, requireRole(["employer", "admin"]), async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shiftId } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !shiftId) {
      return res.status(400).json({ message: "Missing required Razorpay verification fields" });
    }

    // 1. Verify the HMAC signature using the key secret on the backend.
    const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      await Payment.updateMany(
        { razorpayOrderId: razorpay_order_id, status: "authorized" },
        { $set: { status: "failed", razorpayError: "signature_mismatch" } }
      );
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // 2. Defense in depth: confirm with Razorpay that the payment was captured.
    let gatewayPayment = null;
    try {
      gatewayPayment = await fetchRazorpayPayment(razorpay_payment_id);
    } catch (gatewayError) {
      // Don't expose the gateway error to the client.
      console.warn("Razorpay payment fetch failed during verification");
    }

    if (gatewayPayment && gatewayPayment.status && gatewayPayment.status !== "captured") {
      await Payment.updateMany(
        { razorpayOrderId: razorpay_order_id, status: "authorized" },
        { $set: { status: "failed", razorpayError: `gateway_status_${gatewayPayment.status}` } }
      );
      return res.status(409).json({ message: "Payment was not captured by the gateway" });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    const updated = await Payment.find({ shiftId: shift._id, razorpayOrderId: razorpay_order_id });
    const now = new Date();

    await Promise.all(
      updated.map(async (payment) => {
        payment.status = "marked_paid";
        payment.paidAt = now;
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        await payment.save();
        await Notification.create({
          userId: payment.workerId,
          message: `Payment of ₹${payment.amount} received for ${shift.title}`
        });
      })
    );

    await completeShiftAfterPayment(shift);

    const refreshed = await Payment.find({ shiftId: shift._id }).populate("shiftId");
    res.json({
      verified: true,
      payments: refreshed.map(serializePayment)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:shiftId/mark-paid", requireAuth, requireRole(["employer", "admin"]), async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_MANUAL_PAYMENTS !== "true") {
      return res.status(403).json({ message: "Manual payment marking is disabled in production. Use Razorpay." });
    }
    const shift = await Shift.findById(req.params.shiftId);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (!shift.employerId.equals(req.user._id) && req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

    const hasCheckedIn = await Attendance.exists({
      shiftId: shift._id,
      checkInAt: { $exists: true, $ne: null }
    });
    if (!hasCheckedIn) {
      return res.status(409).json({ message: "Worker must check in with the arrival OTP before payment" });
    }

    const workerIds = await resolveShiftWorkers(shift);
    if (!workerIds.length) {
      return res.status(409).json({ message: "No assigned workers found for this shift" });
    }

    const payments = await Promise.all(
      workerIds.map(async (workerId) => {
        const payment = await Payment.findOneAndUpdate(
          { shiftId: shift._id, workerId },
          {
            employerId: shift.employerId,
            amount: shift.paymentAmount,
            status: "marked_paid",
            paidAt: new Date(),
            gateway: "manual"
          },
          { upsert: true, returnDocument: "after" }
        ).populate("shiftId");

        await Notification.create({ userId: workerId, message: `Payment of ₹${shift.paymentAmount} marked paid for ${shift.title}` });
        return serializePayment(payment);
      })
    );

    await completeShiftAfterPayment(shift);

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

export default router;
