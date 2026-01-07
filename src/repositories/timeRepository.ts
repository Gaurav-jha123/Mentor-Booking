import {  DynamoDBClient,PutItemCommand,ScanCommand,GetItemCommand,UpdateItemCommand, DeleteItemCommand} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { TimeSlot, CreateTimeSlotInput } from '../models/timeslot';
import { v4 as uuidv4 } from 'uuid';
import { createDynamoDBClient } from '../config/dynamodb';


export class TimeSlotRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(tableName: string, region?: string) {
    //const awsRegion = region || process.env.AWS_REGION || 'ap-south-1';
    this.client = createDynamoDBClient();
    this.tableName = tableName;
  }

  async create(input: CreateTimeSlotInput): Promise<TimeSlot> {
    try {
      const timeSlot: TimeSlot = {slotId: uuidv4(),...input,
        isBooked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()};

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(timeSlot),
      });

      await this.client.send(command);

      return timeSlot;
    } catch (error) {
      console.error('Error creating time slot:', error);
      throw new Error('Failed to create time slot');
    }
  }

  async findByMentor(mentorId: string,availableOnly: boolean = true): Promise<TimeSlot[]> {
    try {
      let filterExpression = 'mentorId = :mentorId';
      const expressionValues: any = {':mentorId': mentorId,};

      if (availableOnly) {
        filterExpression += ' AND isBooked = :available';
        expressionValues[':available'] = false;
      }

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: marshall(expressionValues),
      });

      const response = await this.client.send(command);

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map((item) => unmarshall(item) as TimeSlot);
    } catch (error) {
      console.error(`Error fetching slots for mentor ${mentorId}:`, error);
      throw new Error('Failed to fetch time slots');
    }
  }

  async findById(slotId: string): Promise<TimeSlot | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ slotId }),
      });

      const response = await this.client.send(command);

      if (!response.Item) {
        return null;
      }

      return unmarshall(response.Item) as TimeSlot;
    } catch (error) {
      console.error(`Error fetching slot ${slotId}:`, error);
      throw new Error('Failed to fetch time slot');
    }
  }

  async updateBookingStatus(slotId: string, isBooked: boolean): Promise<void> {
    try {
      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ slotId }),
        UpdateExpression: 'SET isBooked = :isBooked, updatedAt = :updatedAt',
        ExpressionAttributeValues: marshall({
          ':isBooked': isBooked,
          ':updatedAt': new Date().toISOString(),
        }),
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`Error updating slot ${slotId}:`, error);
      throw new Error('Failed to update time slot status');
    }
  }

  async delete(slotId : string) : Promise<void> {
    try {
      const command = new DeleteItemCommand({
        TableName : this.tableName,
        Key: marshall({ slotId})
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`Error deleting slot ${slotId}: ` , error);
      throw new Error(`Failed to delte time slot`);
    }
  }
}
