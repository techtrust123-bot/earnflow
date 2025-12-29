const Tasks = require("../models/adminTasks")

// const Tasks = require("../models/adminTasks")

exports.createTask = async (req, res) => {
  const { platform, title, link, reward, maxCompletions, verification } = req.body

  // Basic validation
  if (!platform || !title || !link || reward === undefined || maxCompletions === undefined) {
    return res.status(400).json({ message: 'All input fields are required' })
  }

  // Reward validation
  if (isNaN(reward) || Number(reward) <= 0) {
    return res.status(400).json({ message: 'Reward must be a positive number' })
  }

  // Verification validation: require a verification.type
  if (!verification || !verification.type) {
    return res.status(400).json({ message: 'verification.type is required' })
  }

  // Normalize verification type and accept common aliases
  const vType = String(verification.type).toLowerCase()
  const aliasMap = { reply: 'comment' }
  const normalizedType = aliasMap[vType] || vType
  const allowed = ['follow', 'like', 'retweet', 'repost', 'comment']
  if (!allowed.includes(normalizedType)) {
    return res.status(400).json({ message: `Unsupported verification.type: ${verification.type}` })
  }

  const verificationObj = {
    type: normalizedType,
    targetId: verification.targetId || verification.targetUserId || verification.target || undefined,
    targetTweetId: verification.targetTweetId || verification.tweetId || undefined
  }

  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized access"
      })
    }

    const newTask = await Tasks.create({
      platform,
      title,
      link,
      maxCompletions: Number(maxCompletions),
      reward: Number(reward),
      createdBy: req.user.id,
      verification: verificationObj
    })

    res.status(201).json({ message: 'Task created successfully', task: newTask })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: error.message
    })
  }
}


exports.fetchAll = async(req,res)=>{
    
    try {
        const tasks = await Tasks.find().sort({createdAt:-1})
        if(!tasks){
            return res.status(404).json({message:"tasks not found..."})
        }

        res.status(200).json({
             success: true,
            count: tasks.length,
            tasks
        })
    } catch (error) {
        console.error(error.message)
    res.status(500).json({
      message: error.message
    })
    }
}

exports.fetchById = async(req,res)=>{
    const id = req.params.id

    try {
        const task = await Tasks.findById(id)
        if(!task){
            return res.status(404).json({message:"tasks not found"})
        }

        res.status(200).json({
            success:true,
            count:task.length,
            task
        })
    } catch (error) {
            console.error(error.message)
            res.status(500).json({message:error.message})
    }
}


exports.update = async(req,res)=>{
    const id = req.params.id

    try {
        const tasks = await Tasks.findById(id)
        if(!tasks){
            return res.status(404).json({message:"tasks not found"})
        }

        const edit = await Tasks.findByIdAndUpdate(id,req.body,{new:true})
        await edit.save()

        res.status(200).json({message:"tasks updated successfull"})
    } catch (error) {
          console.error(error.message)
            res.status(500).json({
             message: error.message
        })
    }
}

exports.del = async(req,res)=>{
    const id = req.params.id

    try {
        const task = await Tasks.findById(id)
        if(!task){
            return res.status(404).json({message:"task not found"})
        }

        const delt = await Tasks.findByIdAndDelete(id)

        res.status(200).json({message:"task deleted successful"})

    } catch (error) {
         console.error(error.message)
            res.status(500).json({
             message: error.message
        })
    }
}

exports.toggle = async(req,res)=>{
  const id = req.params.id

  try {
    const task = await Tasks.findById(id)
    
    if(!task){
      return res.status(404).json({message:"tasks not found"})
    }

    task.isActive =!task.isActive
   await task.save() 

   res.status(200).json({
    success: true,
      message: `Task ${task.isActive ? 'activated' : 'deactivated'} successfully`,
      task: {
        _id: task._id,
        title: task.title,
        isActive: task.isActive
      }
   })
  } catch (error) {
    console.error("Toggle task error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error. Could not update task status."
    })
  }
}

exports.fetchTask = async(req,res)=>{
  try {
    const tasks = await Tasks.find({isActive:true}).sort({createdAt:-1})

    res.status(200).json({
      success:true,
      tasks
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({message:error.message})
  }
}