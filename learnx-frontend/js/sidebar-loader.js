// Sidebar Loader Script
document.addEventListener('DOMContentLoaded', function() {
  // Only load sidebar on authenticated pages (not login or register)
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage === 'login.html' || currentPage === 'register.html' || currentPage === 'index.html') {
    return;
  }
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token && currentPage !== 'login.html' && currentPage !== 'register.html' && currentPage !== 'index.html') {
    window.location.href = 'login.html';
    return;
  }
  
  // Load the sidebar
  fetch('sidebar-template.html')
    .then(response => response.text())
    .then(html => {
      // Find the sidebar container - look for the specific sidebar div class
      const sidebarPlaceholder = document.querySelector('.sidebar-placeholder');
      if (sidebarPlaceholder) {
        sidebarPlaceholder.innerHTML = html;
        
        // Highlight current page in sidebar
        highlightCurrentPage();
      }
    })
    .catch(error => console.error('Error loading sidebar:', error));
});

// Function to highlight the current page in the sidebar
function highlightCurrentPage() {
  const currentPage = window.location.pathname.split('/').pop();
  const sidebarLinks = document.querySelectorAll('.w-64 ul a');
  
  sidebarLinks.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPage) {
      link.classList.add('text-[#00bfa6]', 'font-bold');
      link.classList.remove('hover:text-[#00bfa6]');
    }
  });
} 