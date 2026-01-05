"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const uuid_1 = require("uuid");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
class BookingRepository {
    constructor(bookingsTableName, timeSlotsTable, region) {
        const awsRegion = region || process.env.AWS_REGION || 'ap-south-1';
        this.client = new client_dynamodb_1.DynamoDBClient({ region: awsRegion });
        this.bookingsTableName = bookingsTableName;
        this.timeSlotsTableName = timeSlotsTable;
    }
    async create(input) {
        try {
            // to create booking you need to get time slot of the mmentor 
            const slotCommand = new client_dynamodb_1.GetItemCommand({
                TableName: this.timeSlotsTableName,
                Key: (0, util_dynamodb_1.marshall)({ slotId: input.slotId }),
                // we will have slotId because that will be avaialble on frontend
            });
            const slotResponse = await this.client.send(slotCommand);
            if (!slotResponse.Item) {
                throw new Error('Time slot not found');
            }
            const slot = (0, util_dynamodb_1.unmarshall)(slotResponse.Item);
            if (slot.isBooked) {
                throw new Error('Time slot already booked');
            }
            const booking = {
                bookingId: (0, uuid_1.v4)(),
                studentId: input.studentId,
                mentorId: slot.mentorId,
                slotId: input.slotId,
                sessionDate: slot.startTime.split('T')[0],
                sessionStartTime: slot.startTime,
                sessionEndTime: slot.endTime,
                status: 'confirmed',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            //transaction
            const transactionCommand = new client_dynamodb_1.TransactWriteItemsCommand({
                TransactItems: [
                    {
                        Put: {
                            TableName: this.bookingsTableName,
                            Item: (0, util_dynamodb_1.marshall)(booking),
                        },
                    },
                    {
                        Update: {
                            TableName: this.timeSlotsTableName,
                            Key: (0, util_dynamodb_1.marshall)({ slotId: input.slotId }),
                            UpdateExpression: 'SET isBooked = :isBooked, udpatedAt = :updatedAt',
                            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                                ':isBooked': true,
                                ':updatedAt': new Date().toISOString(),
                                ':false': false, // to add slot as unavailabel no further booking think like a spread operator
                            }),
                            ConditionExpression: 'isBooked = :false', // atomic check ony excute thsi update if booked i currently false to avoid race codnition double blookgin what i fboth user see slot avialable and try booking concurrently clcikign simulataneously
                        },
                    },
                ],
            });
            await this.client.send(transactionCommand);
            return booking;
        }
        catch (error) {
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
    async findById(bookingId) {
        try {
            const command = new client_dynamodb_1.GetItemCommand({
                TableName: this.bookingsTableName,
                Key: (0, util_dynamodb_1.marshall)({ bookingId }),
            });
            const response = await this.client.send(command);
            if (!response.Item) {
                return null;
            }
            return (0, util_dynamodb_1.unmarshall)(response.Item);
        }
        catch (error) {
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
    async findByStudentId(studentId, status) {
        try {
            let filterExpression = 'studentId = :studentId';
            const expressionValues = {
                ':studentId': studentId,
            };
            // Optional: filter by status (e.g., only show confirmed bookings)
            if (status) {
                filterExpression += ' AND #status = :status';
                expressionValues[':status'] = status;
            }
            const command = new client_dynamodb_1.ScanCommand({
                TableName: this.bookingsTableName,
                FilterExpression: filterExpression,
                // Using ExpressionAttributeNames because 'status' is a reserved word in DynamoDB
                ExpressionAttributeNames: status ? { '#status': 'status' } : undefined,
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)(expressionValues),
            });
            const response = await this.client.send(command);
            if (!response.Items || response.Items.length === 0) {
                return [];
            }
            return response.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
        }
        catch (error) {
            console.error(`Error fetching bookings for student ${studentId}:`, error);
            throw new Error('Failed to fetch student bookings');
        }
    }
    /**
     * Find all bookings for a specific mentor
     * Used for: GET /mentors/{mentorId}/bookings endpoint
     * Mentors can view sessions students have booked with them
     */
    async findByMentorId(mentorId, status) {
        try {
            let filterExpression = 'mentorId = :mentorId';
            const expressionValues = {
                ':mentorId': mentorId,
            };
            if (status) {
                filterExpression += ' AND #status = :status';
                expressionValues[':status'] = status;
            }
            const command = new client_dynamodb_1.ScanCommand({
                TableName: this.bookingsTableName,
                FilterExpression: filterExpression,
                ExpressionAttributeNames: status ? { '#status': 'status' } : undefined,
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)(expressionValues),
            });
            const response = await this.client.send(command);
            if (!response.Items || response.Items.length === 0) {
                return [];
            }
            return response.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
        }
        catch (error) {
            console.error(`Error fetching bookings for mentor ${mentorId}:`, error);
            throw new Error('Failed to fetch mentor bookings');
        }
    }
    /**
     * Find all bookings in the system
     * Used for: POST /exports/bookings endpoint (admin export)
     * Returns all bookings for CSV export functionality
     */
    async findAll() {
        try {
            const command = new client_dynamodb_1.ScanCommand({
                TableName: this.bookingsTableName,
            });
            const response = await this.client.send(command);
            if (!response.Items || response.Items.length === 0) {
                return [];
            }
            return response.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
        }
        catch (error) {
            console.error('Error fetching all bookings:', error);
            throw new Error('Failed to fetch bookings');
        }
    }
    /**
     * Cancel/Delete a booking
     * Used for: DELETE /bookings/{bookingId} endpoint
     *
     * This uses a TRANSACTION to ensure atomicity:
     * 1. Updates the booking status to 'cancelled' (soft delete)
     * 2. Sets the cancelledAt timestamp
     * 3. Restores the time slot to available (isBooked = false)
     *
     * Why transaction? If either operation fails, both are rolled back.
     * This prevents orphaned bookings or incorrectly marked slots.
     *
     * @param bookingId - The ID of the booking to cancel
     * @param studentId - Optional: For ownership verification (security)
     */
    async delete(bookingId, studentId) {
        try {
            // First, fetch the booking to get the slotId and verify ownership
            const booking = await this.findById(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
            // Security check: verify the student owns this booking
            if (studentId && booking.studentId !== studentId) {
                throw new Error('Unauthorized: You can only cancel your own bookings');
            }
            // Can't cancel an already cancelled booking
            if (booking.status === 'cancelled') {
                throw new Error('Booking is already cancelled');
            }
            const now = new Date().toISOString();
            // Use transaction to atomically:
            // 1. Update booking status to cancelled
            // 2. Free up the time slot
            const transactionCommand = new client_dynamodb_1.TransactWriteItemsCommand({
                TransactItems: [
                    {
                        // Update the booking to cancelled status
                        Update: {
                            TableName: this.bookingsTableName,
                            Key: (0, util_dynamodb_1.marshall)({ bookingId }),
                            UpdateExpression: 'SET #status = :cancelled, cancelledAt = :cancelledAt, updatedAt = :updatedAt',
                            ExpressionAttributeNames: {
                                '#status': 'status', // 'status' is a reserved word
                            },
                            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                                ':cancelled': 'cancelled',
                                ':cancelledAt': now,
                                ':updatedAt': now,
                            }),
                        },
                    },
                    {
                        // Free up the time slot so others can book it
                        Update: {
                            TableName: this.timeSlotsTableName,
                            Key: (0, util_dynamodb_1.marshall)({ slotId: booking.slotId }),
                            UpdateExpression: 'SET isBooked = :isBooked, updatedAt = :updatedAt',
                            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                                ':isBooked': false,
                                ':updatedAt': now,
                            }),
                        },
                    },
                ],
            });
            await this.client.send(transactionCommand);
        }
        catch (error) {
            if (error.message === 'Booking not found' ||
                error.message === 'Unauthorized: You can only cancel your own bookings' ||
                error.message === 'Booking is already cancelled') {
                throw error; // Re-throw known errors
            }
            console.error('Error cancelling booking:', error);
            throw new Error('Failed to cancel booking');
        }
    }
}
exports.BookingRepository = BookingRepository;
