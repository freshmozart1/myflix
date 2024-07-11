const { MongoClient } = require('mongodb');
const fs = require('fs');

async function main() {
    const client = new MongoClient('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.11');
    try {
        await client.connect();
        const db = client.db('myflix');
        (await db.listCollections().toArray()).forEach(collection => {
            db.collection(collection.name).drop();
        });
        await db.collection('movies').insertMany(
            JSON.parse(
                fs.readFileSync(__dirname + '/movies.json', 'utf8')
            )
        );
    } catch (err) {
        console.error(err);
    }
    finally {
        await client.close();
    }
}

main();