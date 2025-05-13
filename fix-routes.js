const fs = require('fs');
const path = require('path');

console.log('Fixing route order in sessions.js...');

// Read the current file
const filePath = path.join(__dirname, 'routes', 'sessions.js');
const outputPath = path.join(__dirname, 'routes', 'sessions-fixed-output.js');

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  
  // 1. First extract all the routes
  const availableRoute = extractRoute(data, "router.get('/available'", true);
  const bookedRoute = extractRoute(data, "router.get('/booked'", true);
  const userBookingsRoute = extractRoute(data, "router.get('/user-bookings'", true);
  const idRoute = extractRoute(data, "router.get('/:id'", true);
  
  // 2. Find the position to insert the fixed routes (before the /:id route)
  const idRouteStart = data.indexOf("router.get('/:id'");
  if (idRouteStart === -1) {
    console.error('Could not find /:id route');
    return;
  }
  
  // Find the position to remove duplicates (the end where the duplicates might be)
  const bookedRouteDup = data.lastIndexOf("router.get('/booked'");
  const userBookingsRouteDup = data.lastIndexOf("router.get('/user-bookings'");
  
  let newContent = data;
  
  // 3. Remove duplicates if they exist at the end
  if (bookedRouteDup > idRouteStart && bookedRouteDup !== -1) {
    const bookedEndDup = findRouteEnd(data, bookedRouteDup);
    newContent = newContent.substring(0, bookedRouteDup) + newContent.substring(bookedEndDup);
  }
  
  if (userBookingsRouteDup > idRouteStart && userBookingsRouteDup !== -1) {
    const userBookingsEndDup = findRouteEnd(newContent, userBookingsRouteDup);
    newContent = newContent.substring(0, userBookingsRouteDup) + newContent.substring(userBookingsEndDup);
  }
  
  // 4. Insert the routes in the correct position
  let contentBeforeId = newContent.substring(0, idRouteStart);
  const contentFromId = newContent.substring(idRouteStart);
  
  // Make sure we don't already have bookedRoute and userBookingsRoute
  if (contentBeforeId.indexOf("router.get('/booked'") === -1) {
    contentBeforeId += '\n' + bookedRoute + '\n';
  }
  
  if (contentBeforeId.indexOf("router.get('/user-bookings'") === -1) {
    contentBeforeId += '\n' + userBookingsRoute + '\n';
  }
  
  // 5. Combine everything
  newContent = contentBeforeId + contentFromId;
  
  // 6. Write the result
  fs.writeFile(outputPath, newContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log(`Fixed file written to ${outputPath}`);
  });
});

function extractRoute(content, routeStart, includeDeclaration = false) {
  const startIndex = content.indexOf(routeStart);
  if (startIndex === -1) return '';
  
  const endIndex = findRouteEnd(content, startIndex);
  return content.substring(includeDeclaration ? startIndex : content.indexOf('=>', startIndex) + 2, endIndex);
}

function findRouteEnd(content, startIndex) {
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let pos = startIndex;
  
  // Find the opening brace of the route handler
  while (pos < content.length && content[pos] !== '{') {
    pos++;
  }
  
  braceCount = 1;
  pos++;
  
  // Find the matching closing brace
  while (pos < content.length && braceCount > 0) {
    const char = content[pos];
    
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringChar = char;
      }
    } else {
      if (char === stringChar && content[pos - 1] !== '\\') {
        inString = false;
      }
    }
    
    pos++;
  }
  
  // Include the semicolon if it exists
  if (pos < content.length && content[pos] === ';') {
    pos++;
  }
  
  return pos;
} 