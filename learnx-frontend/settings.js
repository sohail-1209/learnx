// Function to update the date and time display
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const formattedDateTime = now.toLocaleDateString('en-US', options);
    document.getElementById('current-datetime').textContent = formattedDateTime;
}

// Update the date and time every second
setInterval(updateDateTime, 1000);

// Initial update on page load
document.addEventListener('DOMContentLoaded', updateDateTime);


// Function to handle adding a new event
function addNewEvent(event) {
    event.preventDefault(); // Prevent form submission

    const eventTitleInput = document.getElementById('event-title');
    const eventDateInput = document.getElementById('event-date');
    const eventTimeInput = document.getElementById('event-time');

    const eventTitle = eventTitleInput.value;
    const eventDate = eventDateInput.value;
    const eventTime = eventTimeInput.value;

    if (!eventTitle || !eventDate || !eventTime) {
        alert('Please fill in all event details.');
        return;
    }

    // Create a new list item for the event
    const eventList = document.getElementById('event-list');
    const newEventItem = document.createElement('li');
    newEventItem.classList.add('event-item');
    newEventItem.innerHTML = `
        <strong>${eventTitle}</strong> on ${eventDate} at ${eventTime}
        <button class="delete-event">Delete</button>
    `;

    // Add a delete button event listener
    newEventItem.querySelector('.delete-event').addEventListener('click', function() {
        newEventItem.remove(); // Remove the event item from the list
    });

    // Add the new event to the list
    eventList.appendChild(newEventItem);

    // Clear the form
    eventTitleInput.value = '';
    eventDateInput.value = '';
    eventTimeInput.value = '';
}

// Add event listener to the new event form
const newEventForm = document.getElementById('new-event-form');
if (newEventForm) {
    newEventForm.addEventListener('submit', addNewEvent);
}

// Function to handle filter button clicks
function handleFilterClick(event) {
    const filterType = event.target.dataset.filter;
    const eventItems = document.querySelectorAll('.event-item');

    eventItems.forEach(item => {
        // In a real application, you would check the event's properties
        // to determine if it matches the filter (e.g., a data attribute
        // on the event item indicating event type).
        // For this example, we'll just show/hide based on a dummy condition
        // or show all if 'all' is selected.
        if (filterType === 'all') {
            item.style.display = 'list-item';
        } else {
            // Dummy filter logic: Hide everything unless it's 'all'
            item.style.display = 'none';
        }
    });
}

// Add event listeners to filter buttons
const filterButtons = document.querySelectorAll('.filter-button');
filterButtons.forEach(button => {
    button.addEventListener('click', handleFilterClick);
});


// Function to handle opening the modal
function openModal() {
    const modal = document.getElementById('event-modal');
    modal.style.display = 'block';
}

// Function to handle closing the modal
function closeModal() {
    const modal = document.getElementById('event-modal');
    modal.style.display = 'none';
}

// Add event listener to the button that opens the modal (if it exists)
const openModalButton = document.getElementById('open-event-modal');
if (openModalButton) {
    openModalButton.addEventListener('click', openModal);
}

// Add event listener to the close button in the modal
const closeButton = document.querySelector('.close-button');
if (closeButton) {
    closeButton.addEventListener('click', closeModal);
}

// Close the modal if the user clicks outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('event-modal');
    if (event.target === modal) {
        closeModal();
    }
});