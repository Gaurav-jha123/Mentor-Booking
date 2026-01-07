import { TimeSlot } from "../models/timeslot";
import { TimeSlotRepository } from "../repositories/timeRepository";


export class TimeSlotService{
    private timeSlotRepository : TimeSlotRepository;


    constructor(timeSlotsTableName : string , region? : string ){
        this.timeSlotRepository = new TimeSlotRepository(timeSlotsTableName, region);
    }


    async createTimeSlot(mentorId : string , startTime : string , endTime : string): Promise<TimeSlot> {
        if(!mentorId || !startTime || !endTime){
            throw new Error(`Missing filed required`);
        }
        
        if(new Date(startTime) >= new Date(endTime)){
            throw new Error(`End tine must be after start time`);
        }

        return await this.timeSlotRepository.create({
            mentorId,
            startTime,
            endTime
        })

    }


    async getMentorSlots(mentorId : string , avaialbleOnly : boolean = true) : Promise<TimeSlot[]> {
        if(!mentorId){
            throw new Error(`Mentor id is required`);
        }
        return await this.timeSlotRepository.findByMentor(mentorId, avaialbleOnly);
    }

    async updateTimeSlot(slotId : string , mentorId : string , updates : {startTime ?: string; endTime ?: string})
    : Promise<void>{
        if(!slotId || !mentorId){
            throw new Error(`Slot Id andMenotr Id are required`);
        }

        const slot = await this.timeSlotRepository.findById(slotId);
        if(!slot){
            throw new Error(`Time slot not found`);
        }

        if(slot.mentorId !== mentorId){
            throw new Error(`Unauthorized: Not your time slot`);
        }

        if(slot.isBooked){
            throw new Error(`CAnnot update a booked time slot`);
        }

        if(updates.startTime && updates.endTime){
            if(new Date(updates.startTime) >= new Date(updates.endTime)){
                throw new Error(`End time must be after start time`);
            }
        }
    }

    async deleteTimeSlot(slotId : string , mentorId : string) : Promise<void> {
        if(!slotId || !mentorId){
            throw new Error(`Slot id and mentor id are required`);
            }
            const slot = await this.timeSlotRepository.findById(slotId);
            if(!slot){
                throw new Error(`Time slot not found`);
            }

            if(slot.isBooked){
                throw new Error(`Cannot delete a booked time slot`);
            }

            if(slot.mentorId !== mentorId){
            throw new Error(`Unauthorized : Not your time slot`);
            }

            await this.timeSlotRepository.delete(slotId);
    }
    
    async getTimeSlot(slotId: string): Promise<TimeSlot | null> {
    if (!slotId) {
        throw new Error('Slot ID is required');
    }
    return await this.timeSlotRepository.findById(slotId);
    }

}