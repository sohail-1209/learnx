// Function to handle sending a message
function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const chatMessages = document.getElementById('chatMessages');
  const messageText = messageInput.value.trim();

  if (messageText !== '') {
    // Create a new message element
    const newMessage = document.createElement('div');
    newMessage.classList.add('message', 'sent'); // Add 'sent' class for styling

    // Add the message text
    const messageContent = document.createElement('p');
    messageContent.textContent = messageText;
    newMessage.appendChild(messageContent);

    // Add timestamp (optional)
    const timestamp = document.createElement('span');
    timestamp.classList.add('timestamp');
    const now = new Date();
    timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format time
    newMessage.appendChild(timestamp);


    // Append the new message to the chat window
    chatMessages.appendChild(newMessage);

    // Clear the input field
    messageInput.value = '';

    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // In a real application, you would send the message to a server here
    console.log('Message sent:', messageText);
  }
}

// Add event listener to the send button
const sendButton = document.getElementById('sendButton');
if (sendButton) {
  sendButton.addEventListener('click', sendMessage);
}

// Add event listener to the input field for pressing Enter
const messageInput = document.getElementById('messageInput');
if (messageInput) {
  messageInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default form submission if inside a form
      sendMessage();
    }
  });
}

// Example of receiving a message (for demonstration)
function receiveMessage(text) {
  const chatMessages = document.getElementById('chatMessages');
  const newMessage = document.createElement('div');
  newMessage.classList.add('message', 'received'); // Add 'received' class for styling

  const messageContent = document.createElement('p');
  messageContent.textContent = text;
  newMessage.appendChild(messageContent);

  const timestamp = document.createElement('span');
  timestamp.classList.add('timestamp');
    const now = new Date();
    timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format time
    newMessage.appendChild(timestamp);

  chatMessages.appendChild(newMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// You might call receiveMessage when a message is received from the server
// Example: setTimeout(() => receiveMessage('This is a received message.'), 2000);