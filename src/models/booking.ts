export interface Booking {
    bookingId : string;
    studentId : string;
    mentorId : string;
    slotId : string;
    sessionDate : string;
    sessionStartTime : string;
    sessionEndTime : string;
    createdAt : string;
    updatedAt: string; 
    cancelledAt?: string;
     status: 'confirmed' | 'cancelled';
}


export interface CreateBookingInput {
    studentId : string;
    mentorId : string;
    slotId :  string;
}
