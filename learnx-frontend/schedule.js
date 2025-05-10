function registerUser(username, password, email) {
  // In a real application, you would send this data to a backend server
  // for validation and storage. This is a placeholder function.

  console.log("Attempting to register user with the following details:");
  console.log("Username:", username);
  console.log("Password:", password); // Note: Never log sensitive info like passwords in a real app!
  console.log("Email:", email);

  // Simulate a successful registration
  alert("Registration successful!");

  // In a real application, you would redirect the user to a login page or dashboard
  // window.location.href = "/login"; 
}

// Example usage (you would call this function when a registration form is submitted)
// const registerButton = document.getElementById('register-button');
// registerButton.addEventListener('click', function() {
//   const usernameInput = document.getElementById('username');
//   const passwordInput = document.getElementById('password');
//   const emailInput = document.getElementById('email');

//   registerUser(usernameInput.value, passwordInput.value, emailInput.value);
// });