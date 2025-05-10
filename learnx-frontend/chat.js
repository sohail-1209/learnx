// learnx-frontend/book-session.js

document.addEventListener('DOMContentLoaded', function() {
    // Example: Get a reference to the booking form
    const bookingForm = document.getElementById('bookingForm');

    // Example: Add an event listener to the form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission

            // Example: Get form data
            const formData = new FormData(bookingForm);
            const sessionDetails = {};
            formData.forEach((value, key) => {
                sessionDetails[key] = value;
            });

            console.log('Booking session with details:', sessionDetails);

            // Example: Send data to the server (using fetch API)
            // fetch('/api/book-session', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(sessionDetails),
            // })
            // .then(response => response.json())
            // .then(data => {
            //     console.log('Booking successful:', data);
            //     // Redirect or show a success message
            // })
            // .catch((error) => {
            //     console.error('Booking failed:', error);
            //     // Show an error message
            // });

            // For demonstration, log and clear the form
            alert('Booking attempt logged to console.');
            bookingForm.reset();
        });
    }

    // Example: Handle selection of a tutor or subject
    const tutorSelect = document.getElementById('tutor');
    const subjectSelect = document.getElementById('subject');

    if (tutorSelect) {
        tutorSelect.addEventListener('change', function() {
            console.log('Selected tutor:', this.value);
            // You might want to update available subjects or times based on the tutor
        });
    }

    if (subjectSelect) {
        subjectSelect.addEventListener('change', function() {
            console.log('Selected subject:', this.value);
            // You might want to update available tutors or times based on the subject
        });
    }

    // Example: Handle date and time selection
    const dateInput = document.getElementById('sessionDate');
    const timeInput = document.getElementById('sessionTime');

    if (dateInput) {
        dateInput.addEventListener('change', function() {
            console.log('Selected date:', this.value);
            // You might want to fetch available time slots for this date, tutor, and subject
        });
    }

    if (timeInput) {
        timeInput.addEventListener('change', function() {
            console.log('Selected time:', this.value);
        });
    }

    // Add more JavaScript logic as needed for your booking page features
    // e.g., validating input, displaying available slots, handling payment integration, etc.
});