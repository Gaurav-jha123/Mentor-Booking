import { Router, Request, Response } from "express";
import { TimeSlotService } from "../services/timeSlotService";

const router = Router();

const timeSlotService = new TimeSlotService(
    process.env.TIMESLOTS_TABLE || 'TimeSlots',
    process.env.AWS_REGION || 'ap-south-1',
);

// POST /api/timeslots - Create time slot
router.post('/', async (req, res) => {
    try {
        const { mentorId, startTime, endTime } = req.body;
        
        const slot = await timeSlotService.createTimeSlot(mentorId, startTime, endTime);
        
        return res.status(201).json(slot);
    } catch (error: any) {
        if (error.message.includes('required') || error.message.includes('after')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error creating time slot:', error);
        return res.status(500).json({ error: 'Failed to create time slot' });
    }
});

// GET /api/timeslots/:id - Get time slot by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const slot = await timeSlotService.getTimeSlot(id);
        
        if (!slot) {
            return res.status(404).json({ error: 'Time slot not found' });
        }
        
        return res.status(200).json(slot);
    } catch (error: any) {
        console.error('Error fetching time slot:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/timeslots/mentor/:mentorId - Get mentor's slots
router.get('/mentor/:mentorId', async (req: Request, res: Response) => {
    try {
        const { mentorId } = req.params;
        const availableOnly = req.query.availableOnly === 'true';
        
        const slots = await timeSlotService.getMentorSlots(mentorId, availableOnly);
        
        return res.status(200).json(slots);
    } catch (error: any) {
        if (error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error fetching time slots:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/timeslots/:id - Delete time slot
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { mentorId } = req.body;
        
        await timeSlotService.deleteTimeSlot(id, mentorId);
        
        return res.status(204).send();
    } catch (error: any) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('Cannot delete')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error deleting time slot:', error);
        return res.status(500).json({ error: 'Failed to delete time slot' });
    }
});

export default router;
