import { Booking } from "../models/booking";
import { BookingRepository } from "../repositories/BookingRepository";
import { TimeSlotRepository } from "../repositories/timeRepository";



export class BookingService{
    private bookingRepository : BookingRepository;
    private timeSlotRepository : TimeSlotRepository;

    constructor(bookingTableName : string, timeSlotsTableName : string, region ?: string){
        this.bookingRepository = new BookingRepository(bookingTableName,
            timeSlotsTableName, region
        );

        this.timeSlotRepository = new TimeSlotRepository(
            timeSlotsTableName, region);

    }


    async createBooking(studentId : string, slotId : string) : Promise<Booking> {

        const slot = await this.timeSlotRepository.findById(slotId);
        if(!slot){
            throw new Error(`Time slot not found`);
        }

        if(slot.isBooked){
            throw new Error(`Time slot already Booked`);
        }
        const booking  = await this.bookingRepository.create({
            studentId , 
            slotId , 
            mentorId : slot.mentorId
        });

        return booking;
    }

    async getStudentBookings(studentId : string): Promise<Booking[]> {
        if(!studentId){
            throw new Error(`Student ID is required`)
        }
        const bookings = await this.bookingRepository.findByStudentId(studentId);

        return bookings;
    }

    async getBooking(bookingId : string) : Promise<Booking | null> {
        if(!bookingId){
            throw new Error(`Bookign Id is required`);
        }
        return await this.bookingRepository.findById(bookingId);
    }

    async cancelBooking(bookingId : string , studentId : string) : Promise<void>{
        if(!bookingId || !studentId){
            throw new Error(`Booking ID and student ID are required`);
        }

        const booking = await this.bookingRepository.findById(bookingId);
        if(!booking){
            throw new Error(`No Booking Found`);
        }

        if(booking.studentId !== studentId){
            throw new Error(`You do not have this bookign Unauthorized: You can only cancel your own bookings`);
        }

        if(booking.status === 'cancelled'){
            throw new Error(`Booking is already cancelled`);
        }
        return await this.bookingRepository.delete(bookingId , studentId);
    };
}