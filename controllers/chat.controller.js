const asyncHandler = require("../middleware/async");
const OpenAI = require("openai");
const fetch = require("node-fetch"); // required for custom fetch

// ✅ Configure OpenAI with OpenRouter + custom auth
const openai = new OpenAI({
  apiKey: "not-needed", // dummy, real key added manually below
  baseURL: "https://openrouter.ai/api/v1",
  fetch: (url, options) => {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // important
    };
    return fetch(url, options);
  },
});

/**
 * @desc    Process chat message with OpenRouter (like OpenAI)
 * @route   POST /api/chat
 * @access  Public
 */
exports.processChat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  console.log("Received message:", message);

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Please provide a message",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      success: false,
      message: "OpenRouter API key is not configured",
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "mistralai/mistral-7b-instruct:free", // Or any OpenRouter model
      messages: [
        {
          role: "system",
          content:
            "You are a helpful, polite customer support agent for QuickMart online store. Respond concisely and clearly.",
        },
        { role: "user", content: message },
      ],
    });

    res.status(200).json({
      success: true,
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenRouter API Error:", error);

    res.status(500).json({
      success: false,
      message: "Error processing chat request",
      error: error.message,
    });
  }
});
