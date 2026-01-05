const { verifyAccount } = require("../services/paystack")

exports.verifyBankAccount = async (req, res) => {
  const { account_number, bank_code } = req.query

  try {
    const result = await verifyAccount(account_number, bank_code)

    if (!result.requestSuccessful) {
      return res.status(400).json({ success: false })
    }

    return res.json({
      success: true,
      account_name: result.responseBody.accountName
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Account verification failed"
    })
  }
}
