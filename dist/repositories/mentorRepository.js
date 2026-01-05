"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MentorRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const uuid_1 = require("uuid");
class MentorRepository {
    constructor(tableName, region = 'ap-south-1') {
        this.client = new client_dynamodb_1.DynamoDBClient({ region });
        this.tableName = tableName;
    }
    async findAll(filters) {
        try {
            const command = new client_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: '#status = :active',
                ExpressionAttributeNames: {
                    '#status': 'status',
                },
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({ ':active': 'active', }),
            });
            const response = await this.client.send(command);
            if (!response.Items || response.Items.length === 0) {
                return [];
            }
            return response.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
        }
        catch (error) {
            console.error(`Error fetching mentors:`, error);
            throw new Error(`Failed to fetch mentors from database`);
        }
    }
    async findById(mentorId) {
        try {
            const command = new client_dynamodb_1.GetItemCommand({ TableName: this.tableName,
                Key: (0, util_dynamodb_1.marshall)({ mentorId }),
            });
            const response = await this.client.send(command);
            if (!response.Item) {
                return null;
            }
            return (0, util_dynamodb_1.unmarshall)(response.Item);
        }
        catch (error) {
            console.error(`Error fetching mentor `, error);
            throw new Error(`Failed to fetch mentor with ${mentorId} from database`);
        }
    }
    async create(input) {
        try {
            const body = { mentorId: (0, uuid_1.v4)(), ...input, status: 'active', createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const command = new client_dynamodb_1.PutItemCommand({
                TableName: this.tableName,
                Item: (0, util_dynamodb_1.marshall)(body),
            });
            await this.client.send(command);
            return body;
        }
        catch (error) {
            console.error(`Error in creating mentor `, error);
            throw (`Error in creating mentor with name : ${input.name} `);
        }
    }
}
exports.MentorRepository = MentorRepository;
