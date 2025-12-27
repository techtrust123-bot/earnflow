exports.blockSuspended = (req, res, next) => {
  if (req.user.isSuspended) {
    return res.status(403).json({
      message: "Account suspended due to fraudulent activity"
    })
  }
  next()
}
