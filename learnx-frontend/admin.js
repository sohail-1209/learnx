// Function to handle the submission of the contact form
function handleContactFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission

    // Get form data
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    // Basic validation (you would want more robust validation in a real application)
    if (!name || !email || !message) {
        alert('Please fill out all fields.');
        return;
    }

    // Here you would typically send the form data to a server
    // For this example, we'll just log it to the console
    console.log('Contact form submitted:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Message:', message);

    // Clear the form
    document.getElementById('contact-form').reset();

    // Provide feedback to the user
    alert('Thank you for your message!');
}

// Add event listener to the contact form
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', handleContactFormSubmit);
}


// Function to toggle the visibility of FAQ answers
function toggleFaqAnswer(event) {
    const question = event.target.closest('.faq-question');
    if (question) {
        const answer = question.nextElementSibling;
        if (answer && answer.classList.contains('faq-answer')) {
            answer.classList.toggle('visible');
            // Optional: Change the icon on the question
            const icon = question.querySelector('.faq-icon');
            if (icon) {
                icon.textContent = answer.classList.contains('visible') ? '-' : '+';
            }
        }
    }
}

// Add event listeners to FAQ questions
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', toggleFaqAnswer);
});


// Function to handle support ticket submission
function handleSupportTicketSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    // Get form data
    const subject = document.getElementById('ticket-subject').value;
    const description = document.getElementById('ticket-description').value;

    // Basic validation
    if (!subject || !description) {
        alert('Please provide a subject and description for your ticket.');
        return;
    }

    // Here you would send the ticket data to your support system
    console.log('Support ticket submitted:');
    console.log('Subject:', subject);
    console.log('Description:', description);

    // Clear the form
    document.getElementById('support-ticket-form').reset();

    // Provide feedback
    alert('Your support ticket has been submitted.');
}

// Add event listener to the support ticket form
const supportTicketForm = document.getElementById('support-ticket-form');
if (supportTicketForm) {
    supportTicketForm.addEventListener('submit', handleSupportTicketSubmit);
}