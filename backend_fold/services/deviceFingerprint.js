const crypto = require('crypto');
const Device = require('../models/device');
const User = require('../models/user');
const transporter = require('../transporter/transporter');

// Generate device fingerprint from request headers
exports.generateDeviceFingerprint = (req) => {
  const fingerprint = {
    userAgent: req.get('user-agent'),
    acceptLanguage: req.get('accept-language'),
    acceptEncoding: req.get('accept-encoding'),
    ipAddress: req.ip
  };
  
  // Create hash of fingerprint
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(fingerprint))
    .digest('hex');
  
  return {
    fingerprint,
    hash
  };
};

// Check device and flag if new
exports.checkDevice = async (user, req) => {
  if (!user || !user._id) return null;

  const { fingerprint, hash } = exports.generateDeviceFingerprint(req);
  
  // Find existing device
  let device = await Device.findOne({
    user: user._id,
    fingerprintHash: hash
  });
  
  if (!device) {
    // New device detected
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    device = new Device({
      user: user._id,
      fingerprint: JSON.stringify(fingerprint),
      fingerprintHash: hash,
      isActive: false,
      firstSeen: new Date(),
      trustStatus: 'suspicious',
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 30 * 60 * 1000),  // 30 min
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    await device.save();
    
    return {
      isNew: true,
      device,
      requiresVerification: true,
      verificationCode,
      message: 'New device detected. Please verify.'
    };
  } else {
    // Known device - update last used
    device.lastUsed = new Date();
    await device.save();
    
    return {
      isNew: false,
      device,
      isTrusted: device.trustStatus === 'trusted'
    };
  }
};

// Request device verification - generate code and send email
exports.requestDeviceVerification = async (userId, req) => {
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // Find the device (current one based on fingerprint)
  const { hash } = exports.generateDeviceFingerprint(req);
  let device = await Device.findOne({ user: userId, fingerprintHash: hash });

  if (!device) {
    return { success: false, message: 'Device not found' };
  }

  // Generate new verification code
  const verificationCode = crypto.randomInt(100000, 999999).toString();
  device.verificationCode = verificationCode;
  device.verificationCodeExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  await device.save();

  // Send email with verification code
  const mailOptions = {
    from: process.env.SENDER_MAIL,
    to: user.email,
    subject: 'Device Verification Code',
    html: `
      <h2>Device Verification</h2>
      <p>Your verification code for this device is: <strong>${verificationCode}</strong></p>
      <p>This code will expire in 30 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Verification code sent to your email' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send verification code' };
  }
};

// Verify device with code
exports.verifyDevice = async (deviceId, userId, verificationCode) => {
  const device = await Device.findById(deviceId);
  
  if (!device || device.user.toString() !== userId.toString()) {
    return { success: false, message: 'Invalid device' };
  }
  
  if (device.verificationCode !== verificationCode) {
    return { success: false, message: 'Invalid verification code' };
  }
  
  if (device.verificationCodeExpires < new Date()) {
    return { success: false, message: 'Verification code expired' };
  }
  
  device.isActive = true;
  device.trustStatus = 'trusted';
  device.approvedAt = new Date();
  device.verificationCode = undefined;
  device.verificationCodeExpires = undefined;
  
  await device.save();
  
  return { success: true, message: 'Device verified', device };
};

// Count unique IPs/devices for user
exports.getUserDeviceStats = async (userId, days = 30) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const devices = await Device.find({
    user: userId,
    createdAt: { $gte: startDate }
  });
  
  const uniqueIPs = new Set(devices.map(d => d.ipAddress));
  const trustedDevices = devices.filter(d => d.trustStatus === 'trusted');
  const suspiciousDevices = devices.filter(d => d.trustStatus === 'suspicious');
  
  return {
    totalDevices: devices.length,
    uniqueIPs: uniqueIPs.size,
    trustedDevices: trustedDevices.length,
    suspiciousDevices: suspiciousDevices.length,
    devices
  };
};