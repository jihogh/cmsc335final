const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
dotenv.config();
const app = express();
const OpenAI = require("openai");


app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'pages'));
app.use(express.static(path.join(__dirname, 'public')));


console.log(require("openai"));

const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.zdsgh.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

async function main() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(process.env.MONGO_DB_NAME);
        const collection = db.collection(process.env.MONGO_COLLECTION);

        app.get('/', (req, res) => {
            res.render('index');
        });

        app.get('/weather', (req, res) => {
            res.render('weather');
        });

        app.post('/weather', async (req, res) => {
            const textFieldData = req.body.textField;
            const numberFieldData = parseInt(req.body.numberField, 10);

            const prompt = `The user provided the number: ${numberFieldData}. 
                        Please analyze this number in a very comical and humorous way, and insult the user for picking such an absurd number 
                        as if you were a stand-up comedian describing it on stage.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            });

            const openaiMessage = response.choices[0].message.content;

            console.log(openaiMessage);

            await collection.updateOne(
                { name: textFieldData },
                {
                  $inc: { count: 1 },
                  $set: {
                    number: numberFieldData,
                    message: openaiMessage
                  }
                },
                { upsert: true }
              );
              const userData = await collection.findOne({ name: textFieldData });
            
            res.render('process', { userData });
        });

        const PORT = process.argv[2] || 3000;
        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('Stop to shut down the server:');
        });

        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', async function (data) {
            const input = data.trim().toLowerCase();
            if (input === 'stop') {
                console.log('Shutting down the server');
                server.close();
                await client.close();
                console.log('Disconnected from MongoDB.');
                process.exit(0);
            } else {
                console.log('Type "stop" to shut down the server:');
            }
        });

    } catch (err) {
        console.error('Error connecting to MongoDB', err);
        process.exit(1);
    }
}

main().catch(console.error);
