const express = require("express");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { VoiceResponse } = require("twilio").twiml;
const Transcriber = require("./transcription");
const Bot = require("./bot");
const fs = require("fs");
const path = require("path");
const { generateTTS } = require("./elevenlabs.js");

const host_url = "d341a86d-7325-4bae-9c8b-455b16810130-00-1mhsrwc7eda79.picard.replit.dev";

const Database = require("@replit/database");
const db = new Database();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.set('view engine', 'ejs');

// Configure session to use filesystem (instead of signed cookies)
app.use(
  session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using https
  }),
);

// Assuming Transcriber and Bot are similar classes/modules as in the Flask app
const assistants = {};

// Define the directory that will be served
const audioDirectory = path.join(__dirname, 'audio');

// Serve all static files in the audio directory
app.use('/audio', express.static(audioDirectory));

app.post("/start_call", (req, res) => {
  const callSid = req.body.CallSid;
  const startTimestamp = new Date();
  
  req.session.callSid = callSid;

  const conversationKey = `conversation_${callSid}`;
  db.set(conversationKey, { startTimestamp, messages: [], isActive: true });

  const response = new VoiceResponse();
  response.play({}, `https://${host_url}/audio/greeting.mp3`);
  const gather = response.gather({
    input: "speech",
    action: "/process_speech",
    speechTimeout: "auto",
    speechModel: "phone_call",
  });
  response.redirect("/process_speech");

  res.type("text/xml");
  res.send(response.toString());
});

app.post("/process_speech", async (req, res) => {
  try {
    const callSid = req.session.callSid;
    console.log("Call SID:", callSid);

    if (!assistants[callSid]) {
      assistants[callSid] = new Assistant(callSid);
    }

    const userText = req.body.SpeechResult;
    const response = new VoiceResponse();

    if (!userText) {
      response.play({}, `https://${host_url}/audio/cutout.mp3`);
      // Sorry, can you repeat yourself? You cut out.
      const gather = response.gather({
        input: "speech",
        action: "/process_speech",
        method: "POST",
        speechModel: "phone_call",
      });
      response.redirect("/process_speech");
    } else {
      const conversationKey = `conversation_${callSid}`;
      let conversation = await db.get(conversationKey) || { messages: [] };

      // Add the new user message to the conversation history
      conversation.messages.push({
        role: "user",
        content: userText,
        timestamp: Date.now() // Add the current timestamp
      });

      // Process the conversation to get a suggestion from the AI
      const suggestionPromise = assistants[callSid].processAudio(conversation.messages);

      // Save the updated conversation with the AI's response back to the database
      const saveConversationPromise = db.set(conversationKey, conversation);

      // Execute both the suggestion and save operations concurrently
      const [suggestion] = await Promise.all([suggestionPromise, saveConversationPromise]);

      // Add the AI's response to the conversation history
      conversation.messages.push({
        role: "system",
        content: suggestion,
        timestamp: Date.now() // Add the current timestamp
      });

      // Generate TTS from the AI's response
      // const text_to_speech = await generateTTS(suggestion); // Uncomment if TTS generation is required

      // Since we are not using the TTS file, we directly use the 'say' verb
      response.say(suggestion);

      // If you are generating an audio file and want to use it, uncomment the following line
      // response.play({}, `https://${host_url}/audio/audio.mp3`);

      const gather = response.gather({
        input: "speech",
        action: "/process_speech",
        method: "POST",
        speechModel: "phone_call",
      });

      response.redirect("/process_speech");
    }

    console.log("Response:", response.toString());
    res.type("text/xml");
    res.send(response.toString());
  } catch (e) {
    console.error("Error:", e);
    const response = new VoiceResponse();
    response.play({}, `https://${host_url}/audio/error.mp3`);
    res.type("text/xml");
    res.send(response.toString());
  }
});

app.post("/save_transcription", async (req, res) => {
  try {
    const { callSid, userText, suggestion } = req.body;

    // Retrieve the existing conversation from the database or start a new one
    const conversationKey = `conversation_${callSid}`;
    let conversation = await db.get(conversationKey) || [];

    // Append the new messages to the conversation
    conversation.messages.push({
      role: "user",
      content: userText,
      timestamp: Date.now() // Add the current timestamp
    });
    conversation.messages.push({
      role: "system",
      content: suggestion,
      timestamp: Date.now() // Add the current timestamp
    });

    // Save the updated conversation back to the database
    await db.set(conversationKey, conversation);

    res.send("success");
  } catch (e) {
    console.error("Error:", e);
    res.send("error");
  }
});

app.post("/call_status", async (req, res) => {
  const callSid = req.body.CallSid;
  const endTimestamp = new Date(); // Record the end timestamp

  // Retrieve the existing conversation from the database
  const conversationKey = `conversation_${callSid}`;
  let conversation = await db.get(conversationKey);

  if (conversation) {
    // Update the conversation with the end timestamp and isActive status
    conversation.endTimestamp = endTimestamp;
    conversation.isActive = false;

    // Save the updated conversation back to the database
    await db.set(conversationKey, conversation);
  }

  res.status(200).send('Call status updated');
});

app.get("/calls", async (req, res) => {
  try {
    // Extract query parameters
    const { startDate, endDate, isActive } = req.query;

    // Retrieve all keys from the database
    const keys = await db.list();

    // Filter keys that represent call conversations
    const callKeys = keys.filter(key => key.startsWith('conversation_'));

    // Fetch all conversations
    let calls = [];
    for (const key of callKeys) {
      const callData = await db.get(key);
      const callSid = key.replace('conversation_', '');

      // Check if the call is active and if the last message is older than 3 minutes
      const now = Date.now();
      const threeMinutesAgo = now - 3 * 60 * 1000; // 3 minutes in milliseconds
      const lastMessage = callData.messages[callData.messages.length - 1];
      if (callData.isActive && lastMessage && lastMessage.timestamp < threeMinutesAgo) {
        // Update the call to be inactive and set the end timestamp
        callData.isActive = false;
        callData.endTimestamp = now;
        await db.set(key, callData);
      }

      // Construct a call object
      let call = {
        callSid: callSid,
        messages: callData.messages,
        isActive: callData.isActive,
        startTimestamp: callData.startTimestamp,
        endTimestamp: callData.endTimestamp,
        // ... any other data you want to include
      };

      // Add to calls array if it matches the query parameters
      if ((isActive === undefined || call.isActive === (isActive === 'true')) &&
          (!startDate || new Date(call.startTimestamp) >= new Date(startDate)) &&
          (!endDate || !call.endTimestamp || new Date(call.endTimestamp) <= new Date(endDate))) {
        calls.push(call);
      }
    }

    // Send the filtered calls as a response
    res.json(calls);
  } catch (e) {
    console.error("Error fetching call data:", e);
    res.status(500).send("Internal Server Error");
  }
});

// index.js - Add this endpoint somewhere in your existing code
app.get("/stats", async (req, res) => {
  try {
    // Retrieve all keys from the database
    const keys = await db.list('conversation_');

    let totalCalls = keys.length;
    let totalMessages = 0;
    let totalCallDuration = 0;

    for (const key of keys) {
      const callData = await db.get(key);
      totalMessages += callData.messages.length;

      if (callData.startTimestamp && callData.endTimestamp) {
        const start = new Date(callData.startTimestamp);
        const end = new Date(callData.endTimestamp);
        totalCallDuration += (end - start);
      }
    }

    const averageCallDuration = totalCalls > 0 ? totalCallDuration / totalCalls : 0;

    // Convert averageCallDuration from milliseconds to a more readable format (e.g., minutes)
    const averageCallDurationMinutes = averageCallDuration / (1000 * 60);

    res.json({
      totalCalls: totalCalls,
      totalMessages: totalMessages,
      averageCallDuration: averageCallDurationMinutes.toFixed(2),
    });
  } catch (e) {
    console.error("Error fetching stats:", e);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

// Assistant class (should be in a separate file like assistant.js)
class Assistant {
  constructor(callSid) {
    this.callSid = callSid;
    this.transcriber = new Transcriber();
    this.bot = new Bot();
  }

  async processAudio(conversation) {
    if (conversation && conversation.length > 0) {
      console.log("User:", conversation[conversation.length - 1].content);
      const suggestion = await this.bot.getSuggestion(conversation);
      console.log("Response:", suggestion);
      return suggestion;
    }
  }
}