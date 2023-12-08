

const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const ddbClient = new DynamoDBClient({ region: 'us-east-1'});
const eventBridgeClient = new EventBridgeClient({ region: 'us-east-1'});

module.exports.eventCounter = async (event) => {
    const currentTime = new Date().toISOString();
    const params = {
        TableName: 'eventCounter',
        Key: {
            'counterId': { S: 'play' }
        },
        UpdateExpression: 'SET counterValue = if_not_exists(counterValue, :initial) + :incr, ' +
                          'updatedAt = :updatedAt',
        ExpressionAttributeValues: {
            ':initial': { N: '0' },
            ':incr': { N: '1' },
            ':updatedAt': { S: currentTime }
        },
        ReturnValues: 'UPDATED_NEW'
    };

    try {
        const updateCommand = new UpdateItemCommand(params);
        const updatedCounter = await ddbClient.send(updateCommand);

        console.log('Counter updated:', updatedCounter.Attributes.counterValue.N);

        const putEventsCommand = new PutEventsCommand({
            Entries: [{
                Source: 'custom.counterUpdate',
                DetailType: 'CounterUpdated',
                Detail: JSON.stringify({ counterValue: updatedCounter.Attributes.counterValue.N })
            }]
        });
        await eventBridgeClient.send(putEventsCommand);

        return { statusCode: 200, body: JSON.stringify(updatedCounter.Attributes.counterValue.N) };
    } catch (err) {
        console.error('Error updating counter:', err);
        return { statusCode: 500, body: 'Error updating counter' };
    }
};