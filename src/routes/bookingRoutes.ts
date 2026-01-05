import { Router, Request, Response } from 'express';
import { BookingService } from '../services/bookingService';

const router = Router();

// Initialize service (will be initialized in app.ts ideally)
const bookingService = new BookingService(
    process.env.BOOKINGS_TABLE || 'Bookings',
    process.env.TIMESLOTS_TABLE || 'TimeSlots',
    process.env.AWS_REGION || 'ap-south-1'
);

// POST /api/bookings - Create booking
router.post('/', async (req: Request, res: Response) => {
    try {
        const { studentId, slotId } = req.body;

        // Call SERVICE layer (all business logic here!)
        const booking = await bookingService.createBooking(studentId, slotId);

        return res.status(201).json(booking);
    } catch (error: any) {
        // Service throws with clear messages - just map to HTTP status
        if (error.message.includes('not found') ||
            error.message.includes('already booked') ||
            error.message.includes('just booked by another user')) {
            return res.status(400).json({ error: error.message });
        }

        console.error('Error creating booking:', error);
        return res.status(500).json({ error: 'Failed to create booking' });
    }
});

// GET /api/bookings/:id - Get booking by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Call SERVICE layer
        const booking = await bookingService.getBooking(id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        return res.status(200).json(booking);
    } catch (error: any) {
        console.error('Error fetching booking:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/bookings?studentId=S001 - Get student's bookings
router.get('/', async (req: Request, res: Response) => {
    try {
        const studentId = req.query.studentId as string;

        // Call SERVICE layer
        const bookings = await bookingService.getStudentBookings(studentId);

        return res.status(200).json(bookings);
    } catch (error: any) {
        if (error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }

        console.error('Error fetching bookings:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/bookings/:id - Cancel booking
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { studentId } = req.body;

        // Call SERVICE layer (all business logic here!)
        await bookingService.cancelBooking(id, studentId);

        return res.status(204).send();
    } catch (error: any) {
        // Service throws specific errors - map to HTTP status
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({ error: error.message });
        }

        if (error.message.includes('already cancelled')) {
            return res.status(400).json({ error: error.message });
        }

        console.error('Error cancelling booking:', error);
        return res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

export default router;
