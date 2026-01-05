"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeSlotRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const uuid_1 = require("uuid");
class TimeSlotRepository {
    constructor(tableName, region) {
        const awsRegion = region || process.env.AWS_REGION || 'ap-south-1';
        this.client = new client_dynamodb_1.DynamoDBClient({ region: awsRegion });
        this.tableName = tableName;
    }
    async create(input) {
        try {
            const timeSlot = { slotId: (0, uuid_1.v4)(), ...input,
                isBooked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            const command = new client_dynamodb_1.PutItemCommand({
                TableName: this.tableName,
                Item: (0, util_dynamodb_1.marshall)(timeSlot),
            });
            await this.client.send(command);
            return timeSlot;
        }
        catch (error) {
            console.error('Error creating time slot:', error);
            throw new Error('Failed to create time slot');
        }
    }
    async findByMentor(mentorId, availableOnly = true) {
        try {
            let filterExpression = 'mentorId = :mentorId';
            const expressionValues = { ':mentorId': mentorId, };
            if (availableOnly) {
                filterExpression += ' AND isBooked = :available';
                expressionValues[':available'] = false;
            }
            const command = new client_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: filterExpression,
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)(expressionValues),
            });
            const response = await this.client.send(command);
            if (!response.Items || response.Items.length === 0) {
                return [];
            }
            return response.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
        }
        catch (error) {
            console.error(`Error fetching slots for mentor ${mentorId}:`, error);
            throw new Error('Failed to fetch time slots');
        }
    }
    async findById(slotId) {
        try {
            const command = new client_dynamodb_1.GetItemCommand({
                TableName: this.tableName,
                Key: (0, util_dynamodb_1.marshall)({ slotId }),
            });
            const response = await this.client.send(command);
            if (!response.Item) {
                return null;
            }
            return (0, util_dynamodb_1.unmarshall)(response.Item);
        }
        catch (error) {
            console.error(`Error fetching slot ${slotId}:`, error);
            throw new Error('Failed to fetch time slot');
        }
    }
    async updateBookingStatus(slotId, isBooked) {
        try {
            const command = new client_dynamodb_1.UpdateItemCommand({
                TableName: this.tableName,
                Key: (0, util_dynamodb_1.marshall)({ slotId }),
                UpdateExpression: 'SET isBooked = :isBooked, updatedAt = :updatedAt',
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                    ':isBooked': isBooked,
                    ':updatedAt': new Date().toISOString(),
                }),
            });
            await this.client.send(command);
        }
        catch (error) {
            console.error(`Error updating slot ${slotId}:`, error);
            throw new Error('Failed to update time slot status');
        }
    }
}
exports.TimeSlotRepository = TimeSlotRepository;
