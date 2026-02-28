/**
 * Custom NoSQL injection sanitizer
 * Replaces dangerous $ and . characters in object keys
 * Avoids write issues with read-only req.query in newer Node.js versions
 */

const sanitize = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Replace $ and . with safe characters to prevent NoSQL injection
      const safeKey = key.replace(/[$.]/g, '_');
      sanitized[safeKey] = sanitize(obj[key]);
    }
  }
  return sanitized;
};

module.exports = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body);
    }
    
    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitize(req.params);
    }
    
    // Note: req.query is read-only in newer Node.js, so we avoid rewriting it
    // Instead, create a sanitized version separately if needed in routes
    if (req.query && typeof req.query === 'object') {
      req._sanitizedQuery = sanitize(req.query);
    }
    
    next();
  } catch (error) {
    console.error('Sanitizer error:', error);
    next();
  }
};
