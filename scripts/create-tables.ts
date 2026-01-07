import 'dotenv/config';
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { createDynamoDBClient } from '../src/config/dynamodb';

const client = createDynamoDBClient();

async function createTables() {
    const tables = [
        { name: process.env.MENTORS_TABLE || 'Mentors-Local', key: 'mentorId' },
        { name: process.env.TIMESLOTS_TABLE || 'TimeSlots-Local', key: 'slotId' },
        { name: process.env.BOOKINGS_TABLE || 'Bookings-Local', key: 'bookingId' }
    ];

    console.log('📋 Creating tables in DynamoDB Local...\n');

    for (const table of tables) {
        try {
            await client.send(new CreateTableCommand({
                TableName: table.name,
                KeySchema: [{ AttributeName: table.key, KeyType: 'HASH' }],
                AttributeDefinitions: [{ AttributeName: table.key, AttributeType: 'S' }],
                BillingMode: 'PAY_PER_REQUEST',
            }));
            
            console.log(`✅ Created table: ${table.name}`);
        } catch (error: any) {
            if (error.name === 'ResourceInUseException') {
                console.log(`Table "${table.name}" already exists`);
            } else {
                console.error(`Error creating ${table.name}:`, error.message);
            }
        }
    }

    console.log('\n Table setup complete!\n');
}

createTables().catch(console.error);
