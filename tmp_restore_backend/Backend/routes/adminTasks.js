const express = require("express")
// const { create } = require("../models/adminTasks")
const { authMiddlewere } = require("../middleweres/authmiddlewere")
const authorizeRoles = require("../middleweres/roleMiddlewere")
const { createTask, fetchAll, fetchById, update, del, toggle, fetchTask } = require("../controllers/adminTasks")
const router = express.Router()

router.post("/addtasks",authMiddlewere,authorizeRoles("admin"),createTask)
router.get("/fetch",authMiddlewere,authorizeRoles("admin","user"),fetchAll)
router.get("/fetchById/:id",authMiddlewere,authorizeRoles("admin","user"),fetchById)
router.put("/update/:id",authMiddlewere,authorizeRoles("admin"),update)
router.delete("/del/:id",authMiddlewere,authorizeRoles("admin"),del)
router.patch("/:id/toggle",authMiddlewere,authorizeRoles("admin"),toggle)
router.get("/activeTasks",authMiddlewere,authorizeRoles("admin","user"),fetchTask)

module.exports = router