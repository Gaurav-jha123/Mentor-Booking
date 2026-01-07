import { Router, Request, Response } from 'express';
import { MentorService } from '../services/mentorService';

const router = Router();
const mentorService = new MentorService(
    process.env.MENTORS_TABLE || 'Mentors',
    process.env.AWS_REGION || 'ap-south-1'
);

// POST /api/mentors - Create mentor
router.post('/', async (req: Request, res: Response) => {
    try {
        const mentor = await mentorService.createMentor(req.body);
        return res.status(201).json(mentor);
    } catch (error: any) {
        if (error.message.includes('required') || error.message.includes('positive')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error creating mentor:', error);
        return res.status(500).json({ error: 'Failed to create mentor' });
    }
});

// GET /api/mentors - Get all mentors
router.get('/', async (req: Request, res: Response) => {
    try {
        const mentors = await mentorService.getAllMentors();
        return res.status(200).json(mentors);
    } catch (error: any) {
        console.error('Error fetching mentors:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/mentors/:id - Get mentor by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const mentor = await mentorService.getMentor(id);
        
        if (!mentor) {
            return res.status(404).json({ error: 'Mentor not found' });
        }
        
        return res.status(200).json(mentor);
    } catch (error: any) {
        console.error('Error fetching mentor:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
