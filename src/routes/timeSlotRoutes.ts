import { Router , Request , Response} from "express";
import { TimeSlotService } from "../services/timeSlotService";


const router = Router();

const timeSlotService = new TimeSlotService(
    process.env.TIME_SLOT_TABLE_NAME || 'TimeSlot',
    process.env.AWS_REGION  || 'ap-soth-1',
);

router.post('/' , async (req , res) => {
//mentorId : string , startTime : string , endTime : string

    try {
        const  {mentorId , startTime , endTime}  = req.body;
        if(!mentorId || startTime || endTime){
            throw new Error(`PLease provide missing inputs mentorId , startTime , endTime`);
        }
        const booking = await timeSlotService.createTimeSlot(mentorId , startTime , endTime);
    
    
        return res.status(200).json(booking);
    } catch (error) {
        console.error(`Error in creating booking`);
        return res.status(500).json(`Internal server error`);
    }
})