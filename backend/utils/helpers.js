const jwt = require('jsonwebtoken');

/**
 * Generate a JSON Web Token
 * @param {String} id - User ObjectId 
 * @returns {String} Signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_chatcode', {
    expiresIn: '30d',
  });
};

/**
 * Generate a unique Chat Code (e.g., CP84562)
 * @param {mongoose.Model} UserModel - User Mongoose Model
 * @returns {Promise<String>} Unique generated code
 */
const generateChatCode = async (UserModel) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  let code = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 100) {
    attempts++;
    code = '';
    // Generate 2 random letters
    for (let i = 0; i < 2; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    // Generate 5 random digits
    for (let i = 0; i < 5; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    // Check database to ensure code is unique
    const user = await UserModel.findOne({ chatCode: code });
    if (!user) {
      exists = false;
    }
  }

  return code;
};

module.exports = {
  generateToken,
  generateChatCode,
};
