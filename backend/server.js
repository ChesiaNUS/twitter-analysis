import express from "express";
import OpenAI from "openai";
import bodyParser from "body-parser";
import cors from "cors";
import timeout from "connect-timeout";

console.log("Starting server.js...");

const app = express();
const PORT = process.env.PORT || 3001;

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-85099af742f94f00961922ff2e1add53'
});

// Middleware setup
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Timeout middleware
app.use(timeout("30s"));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// API endpoint to analyze tweets
app.post("/analyze", async (req, res) => {
  console.log("Received request at /analyze");
  try {
    const { data, keyword, referenceTweet } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      console.error("Invalid data format: data must be a non-empty array");
      return res.status(400).json({ error: "Invalid data format: data must be a non-empty array" });
    }

    console.log("Request body validated. Processing data...");
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    console.log(`Data split into ${chunks.length} chunks`);

    const allResults = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      const chunk = chunks[i];

      try {
        // Create a chat completion request to Deepseek
        const completion = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a helpful assistant that analyzes tweets." },
            { role: "user", content: JSON.stringify({ data: chunk, keyword, referenceTweet }) }
          ]
        });

        // The expected response is in the form of a JSON string from the API.
        const messageContent = completion.choices[0].message.content;
        console.log(`Received response for chunk ${i + 1}:`, messageContent);

        // Attempt to parse the response as JSON.
        let analysisResult;
        try {
          analysisResult = JSON.parse(messageContent);
        } catch (parseError) {
          console.error("Error parsing JSON from deepseek response:", parseError.message);
          continue; // Skip this chunk if parsing fails
        }

        // Assuming the response includes an array "generatedTweets"
        if (Array.isArray(analysisResult.generatedTweets)) {
          allResults.push(...analysisResult.generatedTweets);
        } else {
          console.error("Unexpected response structure:", analysisResult);
        }
        console.log(`Chunk ${i + 1} processed successfully`);
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError.message);
      }
    }

    console.log(`All chunks processed. Total results: ${allResults.length}`);
    return res.json({ generatedTweets: allResults });
  } catch (error) {
    console.error("Error in /analyze endpoint:", error.message);
    return res.status(500).json({ error: "Failed to process request", details: error.message });
  }
});

// Default route for testing server status
app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("Failed to start server:", err.message);
});
