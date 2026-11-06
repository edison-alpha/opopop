const fs = require('fs');

// Read the JPEG buffer of media_1793938937796_f61ea6a5.jpg
const path = 'C:/Users/dekan/.gemini/antigravity/brain/f6cb6848-90e9-4f69-be7d-c6bf0215385a/.user_uploaded/media_1793938937796_f61ea6a5.jpg';
const stats = fs.statSync(path);
console.log('File size:', stats.size);
