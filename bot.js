require("dotenv").config();

const axios = require("axios");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const MODEL_NAME = "gemini-1.0-pro";
const API_KEY = "xxx";

class Bot {
  constructor() {
    // You can load environment variables here if needed
    // or perform any setup operations for your transcriber.
  }

  async getSuggestion(conversation) {
    // Your prompt setup remains the same
    let combined = [
      {
        role: "user",
        content:
          "You are Sophie. You are friendly, flirty, and direct. You are at the science fair with the user. Keep responses short. Overall, your personality is designed to be approachable and helpful. Keep responses fairly short and expressive, with human-like language and emotion.",
      },
    ];

    // Add the entire conversation history
    combined = combined.concat(conversation);

    // Send the combined array to the API
    const response = await sendMessage2(combined);
    return response;
  }

  async summarize(text) {
    const messages = [
      { role: "user", content: "Shorten the following text." },
      { role: "user", content: text },
    ];

    const response = await sendMessage2(messages);

    return response;
  }

  async rawApiCall(text) {
    const messages = [
      { role: "user", content: "Answer as concisely as possible." },
      { role: "user", content: text },
    ];

    const response = await sendMessage2(messages);

    return response;
  }
}

async function sendMessage(messages) {
  console.log(`send messages function.`);
  try {
    const response = await axios.post(
      "https://api.naga.ac/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: "Bearer xxx",
        },
      },
    );

    console.log(`response: ${response.data.choices[0].message.content}`);

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

async function sendMessage2(messages) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  const parts = [
    {text: `The following is a phone call between user and the assistant.\n\n${messages.toString()}\n\nPlease write Assistant's response. keep it relatively short, as they are two real people over a phone call and we want to make it realistic. she's customer support so do what shes trained to do. Write it in plain english. \n\nAssistant: `},
  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
    safetySettings,
  });

  const response = result.response;
  return response.text();
}

module.exports = Bot;
