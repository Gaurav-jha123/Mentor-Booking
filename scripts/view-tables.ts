import 'dotenv/config';
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { createDynamoDBClient } from '../src/config/dynamodb';

const client = createDynamoDBClient();

async function viewTables() {
    console.log('Checking DynamoDB Tables at http://127.0.0.1:8000\n');

    try {
        const response = await client.send(new ListTablesCommand({}));
        
        if (!response.TableNames || response.TableNames.length === 0) {
            console.log('No tables found!\n');
            console.log('Run: npm run setup:tables');
        } else {
            console.log(`Found ${response.TableNames.length} tables:\n`);
            response.TableNames.forEach(name => console.log(`   - ${name}`));
        }
    } catch (error: any) {
        console.error('Connection Error:', error.message);
        console.log('\nIs DynamoDB Local running?');
        console.log('Check: podman ps');
    }
}

viewTables();
