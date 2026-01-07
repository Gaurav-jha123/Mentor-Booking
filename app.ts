import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mentorRoutes from './src/routes/mentorRoutes';
import timeSlotRoutes from './src/routes/timeSlotRoutes';
import bookingRoutes from './src/routes/bookingRoutes';

const app = express();

app.use(express.json());

app.use(cors());

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Mentor Booking API',
    });
});

app.use('/api/mentors', mentorRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api/bookings', bookingRoutes);

app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method,
    });
});

// GLOBAL ERROR HANDLER

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

export default app;
