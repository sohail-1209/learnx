// learnx-frontend/book-session.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('book-session.js loaded');

    // Get a reference to the booking form
    const bookingForm = document.querySelector('form'); // Assuming the booking form is the first form on the page

    // Add an event listener to the form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission

            // Get form data
            const formData = new FormData(bookingForm);
            const sessionDetails = {};
            formData.forEach((value, key) => {
                sessionDetails[key] = value;
            });

            console.log('Booking session with details:', sessionDetails);

            // Send data to the backend (using fetch API)
            fetch('/book-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionDetails),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Booking response:', data);
                // TODO: Add logic to handle the response and update the UI (e.g., show success message, redirect)
            })
            .catch((error) => {
                console.error('Booking failed:', error);
                // TODO: Add logic to show an error message
            });
        });
    } else {
        console.error('Booking form not found.');
    }

    // TODO: Add more JavaScript logic as needed for your booking page features
    // e.g., fetching available time slots based on skill/mentor selection, validating input, handling payment integration, etc.
});