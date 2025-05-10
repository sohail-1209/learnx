// Function to handle login form submission
function handleLogin(event) {
  event.preventDefault(); // Prevent default form submission

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const email = emailInput.value;
  const password = passwordInput.value;

  // Basic validation (you would want more robust validation)
  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  // Here you would typically send the email and password to your backend
  // for authentication. This is a placeholder.
  console.log('Attempting to log in with:');
  console.log('Email:', email);
  console.log('Password:', password);

  // Example of a simple success/failure simulation
  if (email === 'test@example.com' && password === 'password123') {
    alert('Login successful!');
    // Redirect to another page or update UI
    // window.location.href = 'dashboard.html';
  } else {
    alert('Invalid email or password.');
  }

  // Clear the form after submission (optional)
  // emailInput.value = '';
  // passwordInput.value = '';
}

// Add event listener to the login form
const loginForm = document.getElementById('login-form'); // Make sure your form has this ID
if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
} else {
  console.error('Login form not found. Please ensure the form has the ID "login-form".');
}

// You might have other JavaScript related to the login page here,
// such as toggling password visibility, handling "forgot password", etc.