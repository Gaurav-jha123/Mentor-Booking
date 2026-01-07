import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand,ScanCommand, TransactWriteItemsCommand   } from "@aws-sdk/client-dynamodb";
import { Booking, CreateBookingInput } from "../models/booking";
import {v4 as uuidv4} from 'uuid';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { errorMonitor } from "node:events";
import { createDynamoDBClient } from "../config/dynamodb";



export class BookingRepository{
    private client : DynamoDBClient;
    private timeSlotsTableName : string;
    private bookingsTableName : string;



    constructor(bookingsTableName : string , timeSlotsTable : string,
        region ?: string
    ){
        //const awsRegion = region || process.env.AWS_REGION || 'ap-south-1';
        this.client = createDynamoDBClient();
        this.bookingsTableName =bookingsTableName;
        this.timeSlotsTableName = timeSlotsTable;
    }


    async create(input: CreateBookingInput) : Promise<Booking> {
        
        try {
            // to create booking you need to get time slot of the mmentor 
            const slotCommand = new GetItemCommand({
                TableName : this.timeSlotsTableName,
                Key : marshall({ slotId : input.slotId }),
                // we will have slotId because that will be avaialble on frontend
            });
            const slotResponse = await this.client.send(slotCommand);
    
            if(!slotResponse.Item){
                throw new Error('Time slot not found');
            }
    
            const slot = unmarshall(slotResponse.Item);
    
            if(slot.isBooked){
                throw new Error('Time slot already booked');
            }
    
            const booking : Booking = {
                bookingId : uuidv4(), 
                studentId: input.studentId,
                mentorId: slot.mentorId,
                slotId: input.slotId,
                sessionDate: slot.startTime.split('T')[0],
                sessionStartTime : slot.startTime,
                sessionEndTime: slot.endTime,
                status : 'confirmed',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
             };
    
             //transaction
             const transactionCommand = new TransactWriteItemsCommand({
                TransactItems:[
                    {
                        Put : {
                            TableName: this.bookingsTableName,
                            Item: marshall(booking),
                        },
                    },
                    {
                        Update: {
                            TableName: this.timeSlotsTableName,
                            Key: marshall({ slotId : input.slotId }),
                            UpdateExpression: 'SET isBooked = :isBooked, updatedAt = :updatedAt',
                            ExpressionAttributeValues: marshall({
                                ':isBooked': true,
                                ':updatedAt': new Date().toISOString(),
                                ':false': false, // Placeholder representing 'false' - used to verify slot is available before updating
                            }),
                            ConditionExpression: 'isBooked = :false', // Atomic check: Only execute this update if isBooked is currently false
                            // Prevents race condition where both users see slot available and try booking concurrently
                        },
                    },
                ],
             });
             await this.client.send(transactionCommand);
    
             return booking;
        } catch (error : any) {
            if (error.name === 'TransactionCanceledException') {
            throw new Error('Time slot was just booked by another user');
            }
            console.error('Error creating booking:', error);
            throw new Error('Failed to create booking');   
        }
    }


    /**
     * Find a booking by its ID
     * Used when: You need to fetch a specific booking's details
     * Pattern: Same as MentorRepository.findById - uses GetItemCommand
     */
    async findById(bookingId: string): Promise<Booking | null> {
        try {
            const command = new GetItemCommand({
                TableName: this.bookingsTableName,
                Key: marshall({ bookingId }),
            });

            const response = await this.client.send(command);

            if (!response.Item) {
                return null;
            }

            return unmarshall(response.Item) as Booking;
        } catch (error) {
            console.error(`Error fetching booking ${bookingId}:`, error);
            throw new Error('Failed to fetch booking');
        }
    }


    /**
     * Find all bookings for a specific student
     * Used for: GET /bookings endpoint
     * Students can view their upcoming and past sessions
     * Optional filter for status (confirmed/cancelled)
     */

    async findByStudentId(studentId : string, status ? : 'confirmed' | 'cancelled') : Promise<Booking[]> {
        try {
            let filterExpression = 'studentId = :studentId';
            const expressionValues : Record<string, any> = {
                ':studentId' : studentId,
            };

            if(status){
                filterExpression += ' AND #status = :status';
                expressionValues[':status'] = status;
            };

            const command = new ScanCommand({
                TableName : this.bookingsTableName,
                FilterExpression: filterExpression,
                ExpressionAttributeNames : status ? {'#status' : 'status'} : undefined,
                ExpressionAttributeValues: marshall(expressionValues),
            });

            const response = await this.client.send(command);

            if(!response.Items || response.Items.length === 0){
                return [];
            }

            return response.Items.map((item) => unmarshall(item) as Booking);
        } catch (error) {
            console.error(`Error fetching bookings for student ${studentId}:`, error);
            throw new Error('Failed to fetch student bookings');
        }
    }
    /**
     * Find all bookings for a specific mentor
     * Used for: GET /mentors/{mentorId}/bookings endpoint
     * Mentors can view sessions students have booked with them
     */

    //VVIMP :-> values comes form input where # attribute names used for field names reuired for reserved words
    async findByMentorId(mentorId: string, status?: 'confirmed' | 'cancelled'): Promise<Booking[]> {
        try {
            let filterExpression = 'mentorId = :mentorId';
            const expressionValues: Record<string, any> = {
                ':mentorId': mentorId,
            };

            if (status) {
                filterExpression += ' AND #status = :status';
                expressionValues[':status'] = status;
            }

            const command = new ScanCommand({
                TableName: this.bookingsTableName,
                FilterExpression: filterExpression,
                ExpressionAttributeNames: status ? { '#status': 'status' } : undefined,
                ExpressionAttributeValues: marshall(expressionValues),
            });

            const response = await this.client.send(command);

            if (!response.Items || response.Items.length === 0) {
                return [];
            }

            return response.Items.map((item) => unmarshall(item) as Booking);
        } catch (error) {
            console.error(`Error fetching bookings for mentor ${mentorId}:`, error);
            throw new Error('Failed to fetch mentor bookings');
        }
    }

    async findAll(): Promise<Booking[]> {
        try {
            const command = new ScanCommand({
                TableName: this.bookingsTableName,
            });

            const response = await this.client.send(command);

            if (!response.Items || response.Items.length === 0) {
                return [];
            }

            return response.Items.map((item) => unmarshall(item) as Booking);
        } catch (error) {
            console.error('Error fetching all bookings:', error);
            throw new Error('Failed to fetch bookings');
        }
    }


    async delete(bookingId: string, studentId?: string): Promise<void> {
        try {
            // Step 1: Fetch booking to verify it exists and get slotId
            const booking = await this.findById(bookingId);

            // Step 2: Validation - Booking must exist
            if (!booking) {
                throw new Error('Booking not found');
            }

            // Step 3: Security - Only booking owner can cancel
            // studentId is optional because admin might cancel without studentId check
            if (studentId && booking.studentId !== studentId) {
                throw new Error('Unauthorized: You can only cancel your own bookings');
            }

            // Step 4: Business logic - Can't cancel an already cancelled booking
            if (booking.status === 'cancelled') {
                throw new Error('Booking is already cancelled');
            }

            const now = new Date().toISOString();

            // Step 5: Transaction - Both operations must succeed or both fail (atomicity)
            // Why transaction? Prevents: booking cancelled but slot still marked as booked
            const transactionCommand = new TransactWriteItemsCommand({
                TransactItems: [
                    {
                        // Operation 1: Update booking status to cancelled (soft delete)
                        // Why soft delete? Keeps audit trail, analytics, legal compliance
                        Update: {
                            TableName: this.bookingsTableName,
                            Key: marshall({ bookingId }),
                            
                            // What to update: status, cancelledAt, updatedAt
                            UpdateExpression: 'SET #status = :cancelled, cancelledAt = :cancelledAt, updatedAt = :updatedAt',
                            
                            // Why ExpressionAttributeNames? 'status' is DynamoDB reserved word
                            // #status is placeholder → maps to actual column 'status'
                            ExpressionAttributeNames: {
                                '#status': 'status',
                            },
                            
                            // The actual values to set
                            ExpressionAttributeValues: marshall({
                                ':cancelled': 'cancelled',  // New status value
                                ':cancelledAt': now,        // Timestamp when cancelled
                                ':updatedAt': now,          // Last modified timestamp
                            }),
                        },
                    },
                    {
                        // Operation 2: Free up the time slot so others can book
                        // Why? Make slot available again for other students
                        Update: {
                            TableName: this.timeSlotsTableName,
                            Key: marshall({ slotId: booking.slotId }),
                            
                            // Set isBooked back to false
                            UpdateExpression: 'SET isBooked = :isBooked, updatedAt = :updatedAt',
                            
                            // No ExpressionAttributeNames needed - neither field is reserved
                            ExpressionAttributeValues: marshall({
                                ':isBooked': false,  // Mark slot as available
                                ':updatedAt': now,
                            }),
                        },
                    },
                ],
            });

            // Execute transaction - if either operation fails, both rollback
            await this.client.send(transactionCommand);
            
        } catch (error: any) {
            // Re-throw business logic errors with original message
            // This helps API layer return proper HTTP status codes
            if (error.message === 'Booking not found' || 
                error.message === 'Unauthorized: You can only cancel your own bookings' ||
                error.message === 'Booking is already cancelled') {
                throw error;
            }
            
            // Unexpected errors - log for debugging, throw generic message
            console.error('Error cancelling booking:', error);
            throw new Error('Failed to cancel booking');
        }
    }

}