// Function to handle profile-related actions
function handleProfileActions() {
  // Add event listeners or logic for profile page elements
  console.log("Profile page scripts loaded.");

  // Example: Update profile information
  const updateProfileButton = document.getElementById('update-profile');
  if (updateProfileButton) {
    updateProfileButton.addEventListener('click', function() {
      // Get profile data from form or inputs
      const name = document.getElementById('name').value;
      const bio = document.getElementById('bio').value;

      // TODO: Replace 'user_id' with the actual user ID
      // Send data to backend (example using fetch)
      fetch('/profile/user_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name, bio: bio }),
      })
      .then(response => response.json())
      .then(data => {
        console.log('Profile updated:', data);
        // Update UI with confirmation or new data
      })
      .catch((error) => {
        console.error('Error updating profile:', error);
        // Display error message
      });
    });
  }

  // Example: Display user's courses or achievements
  function displayUserCourses() {
    // TODO: Replace 'user_id' with the actual user ID
    fetch('/profile/user_id/courses')
      .then(response => response.json())
      .then(courses => {
        const coursesList = document.getElementById('user-courses-list');
        if (coursesList) {
          coursesList.innerHTML = ''; // Clear existing list
          courses.forEach(course => {
            const listItem = document.createElement('li');
            listItem.textContent = course.title;
            coursesList.appendChild(listItem);
          });
        }
      })
      .catch(error => {
        console.error('Error fetching user courses:', error);
      });
  }

  // Call functions when the page loads
  document.addEventListener('DOMContentLoaded', function() {
    displayUserCourses();
  });
}

// Call the main function to initialize profile page scripts
handleProfileActions();