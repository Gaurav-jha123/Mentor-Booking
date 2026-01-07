import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export function createDynamoDBClient(): DynamoDBClient {
    const region = process.env.AWS_REGION || 'ap-south-1';
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    
    if (endpoint) {
        console.log(`Using LOCAL DynamoDB at ${endpoint}`);
        return new DynamoDBClient({
            region,
            endpoint,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'fakeAccessKey',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'fakeSecretKey',
            },
        });
    }
    
    console.log(`Using AWS DynamoDB in region ${region}`);
    return new DynamoDBClient({ region });
}
