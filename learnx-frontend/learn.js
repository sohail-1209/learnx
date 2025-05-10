// Function to display a simple message
function displayMessage() {
  console.log("Hello from index.js!");
  alert("Welcome to our website!");
}

// Add an event listener to a button (assuming you have a button with id="myButton" in your index.html)
document.addEventListener('DOMContentLoaded', function() {
  const myButton = document.getElementById('myButton');
  if (myButton) {
    myButton.addEventListener('click', displayMessage);
  } else {
    console.warn("Button with id 'myButton' not found.");
  }
});

// You can add more JavaScript code here for your index page.
// For example, you might handle form submissions, fetch data,
// or manipulate the DOM based on user interactions.