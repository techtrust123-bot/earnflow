const crypto = require('crypto');
const Device = require('../models/device');

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

// Verify device with code
exports.verifyDevice = async (deviceId, verificationCode, userId) => {
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
