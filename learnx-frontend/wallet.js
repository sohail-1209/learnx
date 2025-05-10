// Function to fetch and display TODO items
function fetchAndDisplayTodos() {
  // Placeholder for fetching TODOs from an API or local storage
  const todos = [
    { id: 1, task: 'Implement task filtering', completed: false },
    { id: 2, task: 'Add drag and drop sorting', completed: true },
    { id: 3, task: 'Style the todo list', completed: false },
  ];

  const todoList = document.getElementById('todo-list');
  todoList.innerHTML = ''; // Clear existing list

  todos.forEach(todo => {
    const listItem = document.createElement('li');
    listItem.textContent = todo.task;
    listItem.classList.add('todo-item');

    if (todo.completed) {
      listItem.classList.add('completed');
    }

    // Add event listener for marking as complete (example)
    listItem.addEventListener('click', () => {
      listItem.classList.toggle('completed');
      // Placeholder for updating the task status in data source
      console.log(`Toggled completion for task ID: ${todo.id}`);
    });

    todoList.appendChild(listItem);
  });
}

// Function to add a new TODO item
function addTodoItem() {
  const newTodoInput = document.getElementById('new-todo-input');
  const newTask = newTodoInput.value.trim();

  if (newTask) {
    // Placeholder for adding the new task to an API or local storage
    const newTodo = {
      id: Date.now(), // Simple unique ID
      task: newTask,
      completed: false,
    };

    // Update the displayed list
    const todoList = document.getElementById('todo-list');
    const listItem = document.createElement('li');
    listItem.textContent = newTodo.task;
    listItem.classList.add('todo-item');

    listItem.addEventListener('click', () => {
        listItem.classList.toggle('completed');
        // Placeholder for updating the task status in data source
        console.log(`Toggled completion for task ID: ${newTodo.id}`);
    });

    todoList.appendChild(listItem);

    newTodoInput.value = ''; // Clear the input field
    console.log(`Added new task: ${newTask}`);
  }
}

// Event listener for adding a new TODO item on button click
const addTodoButton = document.getElementById('add-todo-button');
if (addTodoButton) {
  addTodoButton.addEventListener('click', addTodoItem);
}

// Event listener for adding a new TODO item on pressing Enter in the input field
const newTodoInput = document.getElementById('new-todo-input');
if (newTodoInput) {
  newTodoInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default form submission if it's in a form
      addTodoItem();
    }
  });
}

// Initial fetch and display of TODO items when the page loads
document.addEventListener('DOMContentLoaded', fetchAndDisplayTodos);