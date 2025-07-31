const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");

// Chat route
router.post("/", chatController.processChat);

module.exports = router;
