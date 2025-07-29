const asyncHandler = require("../middleware/async");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @desc    Process chat message with OpenAI
 * @route   POST /api/chat
 * @access  Public
 */
exports.processChat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  console.log("object", req.body);

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Please provide a message",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      success: false,
      message: "OpenAI API key is not configured",
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
    console.error("OpenAI API Error:", error);

    res.status(500).json({
      success: false,
      message: "Error processing chat request",
      error: error.message,
    });
  }
});
