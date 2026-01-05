export interface TimeSlot {
    slotId : string;
    mentorId : string;
    startTime : string;
    endTime : string;
    isBooked : boolean;
    createdAt : string;
    updatedAt: string; 
}

export interface CreateTimeSlotInput {
    mentorId : string;
    startTime : string;
    endTime : string;
}