const { withdraw } = require("../controllers/withdrawController");
const { authMiddlewere } = require("../middleweres/authmiddlewere");

const router = require("express").Router();


router.post("/request",authMiddlewere,withdraw)

module.exports = router;