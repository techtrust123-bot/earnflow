const { withdraw } = require("../controllers/withdrawController");
const { authMiddlewere } = require("../middleweres/authmiddlewere");
const { withdrawalAttempts } = require("../middleweres/rateLimiter");
const { validateWithdrawal } = require("../middleweres/inputValidation");

const router = require("express").Router();


router.post("/request", authMiddlewere, withdrawalAttempts, validateWithdrawal, withdraw)

module.exports = router;