const fs = require('fs');
const files = [
  'config/Group.js',
  'config/User.js',
  'routes/api/api-routes.js',
  'routes/api/group/group-routes.js',
  'routes/api/others/admin-dashboard-routes.js',
  'routes/api/others/explore-routes.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // First, revert any `groups` without escape back to groups
  let newContent = content
    .replace(/FROM `groups`/g, "FROM groups")
    .replace(/INTO `groups`/g, "INTO groups")
    .replace(/UPDATE `groups`/g, "UPDATE groups");
    
  // Now, safely replace them with escaped backticks so JS parses them correctly
  newContent = newContent
    .replace(/FROM groups\b/g, "FROM \\`groups\\`")
    .replace(/INTO groups\b/g, "INTO \\`groups\\`")
    .replace(/UPDATE groups\b/g, "UPDATE \\`groups\\`");
    
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed:', file);
  }
});
