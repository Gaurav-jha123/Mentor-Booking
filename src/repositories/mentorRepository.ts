
import {  DynamoDBClient,  ScanCommand,GetItemCommand,PutItemCommand,} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Mentor, CreateMentorInput } from '../models/mentor';
import { v4 as uuidv4 } from 'uuid';

export class MentorRepository{
    private client : DynamoDBClient;
    private tableName : string;

    constructor(tableName : string, region : string = 'ap-south-1'){
        this.client = new DynamoDBClient({region });
        this.tableName = tableName;
    }


    async findAll(filters ?: { skills ?: string[]}) : Promise<Mentor[]> {
        try {
            const command = new ScanCommand({
                TableName: this.tableName,
                FilterExpression: '#status = :active',
                ExpressionAttributeNames : {
                    '#status' : 'status',
                },
                ExpressionAttributeValues : marshall({':active' : 'active',}),
            });

            const response = await this.client.send(command);

            if(!response.Items || response.Items.length === 0){
                return [];
            }

            return response.Items.map((item) => unmarshall(item) as Mentor);
        } catch (error) {
            console.error(`Error fetching mentors:`, error);
            throw new Error(`Failed to fetch mentors from database`);        }
    }


    async findById(mentorId : string) : Promise<Mentor | null>{
        try {
            const command = new GetItemCommand({TableName: this.tableName,
                Key : marshall({mentorId }),
            });

            const response = await this.client.send(command);
            if(!response.Item){
                return null;
            }

            return unmarshall(response.Item) as Mentor;
        } catch (error) {
            console.error(`Error fetching mentor `, error);
            throw new Error(`Failed to fetch mentor with ${mentorId} from database`);
        }
    }


    async create(input : CreateMentorInput) : Promise<Mentor>{

        try {
            const body : Mentor = {mentorId : uuidv4() , ...input , status : 'active' , createdAt : new Date().toISOString(),
                updatedAt : new Date().toISOString(),
            }
            const command = new PutItemCommand({
                TableName : this.tableName,
                Item : marshall(body), });
    
                await this.client.send(command);
    
                return body;
        } catch (error) {
            console.error(`Error in creating mentor ` , error);
            throw(`Error in creating mentor with name : ${input.name} `);
        }

    }
}


