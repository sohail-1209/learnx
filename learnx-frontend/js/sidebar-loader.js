/**
 * LearnX - Sidebar Loader
 * Consistently loads the sidebar across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
  loadSidebar();
  setupMobileMenu();
  highlightActiveLink();
});

/**
 * Loads the sidebar content
 */
function loadSidebar() {
  // Find sidebar placeholder
  const sidebarPlaceholder = document.querySelector('.sidebar-placeholder');
  if (!sidebarPlaceholder) return;
  
  // Create sidebar element
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar w-64 bg-surface-1 p-6 h-screen fixed top-0 left-0 shadow-xl z-10';
  sidebar.innerHTML = `
    <div class="flex flex-col space-y-8">
      <a href="dashboard.html" class="text-2xl font-bold text-white flex items-center">
        <span class="text-primary mr-2">Learn</span><span class="bg-primary text-white px-2 py-1 rounded">X</span>
      </a>
      
      <div class="flex items-center space-x-3 mb-6">
        <div id="sidebar-avatar" class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
          U
        </div>
        <div>
          <p id="sidebar-name" class="font-medium">User</p>
          <p class="text-xs text-secondary" id="sidebar-role">Student</p>
        </div>
      </div>
      
      <nav>
        <ul class="flex flex-col space-y-2">
          <li><a href="dashboard.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-chart-line w-6"></i> Dashboard</a></li>
          <li><a href="learn.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-graduation-cap w-6"></i> Learn</a></li>
          <li><a href="teach.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-chalkboard-teacher w-6"></i> Teach</a></li>
          <li><a href="schedule.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-calendar-alt w-6"></i> Schedule</a></li>
          <li><a href="profile.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-user w-6"></i> Profile</a></li>
          <li><a href="chat.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-comments w-6"></i> Messages</a></li>
          <li><a href="wallet.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-wallet w-6"></i> Wallet</a></li>
          <li><a href="todo.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-tasks w-6"></i> Tasks</a></li>
          <li><a href="settings.html" class="sidebar-link py-2 px-2 rounded flex items-center"><i class="fas fa-cog w-6"></i> Settings</a></li>
        </ul>
      </nav>
      
      <div class="mt-auto pt-6 border-t border-gray-800">
        <button id="logout-btn" class="flex items-center text-gray-400 hover:text-white transition-colors">
          <i class="fas fa-sign-out-alt mr-2"></i> Logout
        </button>
      </div>
    </div>
    
    <!-- Mobile menu toggle button (only visible on small screens) -->
    <button id="mobile-menu-toggle" class="fixed bottom-6 right-6 bg-primary text-white p-3 rounded-full shadow-lg md:hidden flex items-center justify-center">
      <i class="fas fa-bars"></i>
    </button>
  `;
  
  // Replace the placeholder with the sidebar
  sidebarPlaceholder.replaceWith(sidebar);
  
  // Add main content margin
  const mainContent = document.querySelector('.flex-1');
  if (mainContent && !mainContent.classList.contains('ml-0')) {
    mainContent.classList.add('ml-64');
  }
  
  // Handle logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      // Clear token
      localStorage.removeItem('token');
      
      // Show toast notification if it exists
      const toast = document.getElementById('toast');
      if (toast) {
        const toastMessage = document.getElementById('toast-message');
        if (toastMessage) {
          toastMessage.textContent = 'Logging out...';
        }
        toast.classList.add('show');
        
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1000);
      } else {
        window.location.href = 'login.html';
      }
    });
  }
  
  // Load user info into sidebar
  loadUserInfo();
}

/**
 * Loads user information into the sidebar
 */
function loadUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  // Parse the token to get userId
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.userId;
    
    // Update avatar with first letter of name or email
    const avatarElement = document.getElementById('sidebar-avatar');
    const nameElement = document.getElementById('sidebar-name');
    const roleElement = document.getElementById('sidebar-role');
    
    if (avatarElement && nameElement && roleElement) {
      const userName = payload.name || payload.email || 'User';
      const firstLetter = userName.charAt(0).toUpperCase();
      
      nameElement.textContent = userName;
      avatarElement.textContent = firstLetter;
      
      // Set role
      if (payload.role) {
        roleElement.textContent = payload.role.charAt(0).toUpperCase() + payload.role.slice(1);
      }
    }
  } catch (error) {
    console.error('Error parsing token:', error);
  }
}

/**
 * Sets up the mobile menu toggle functionality
 */
function setupMobileMenu() {
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
    });
  }
}

/**
 * Highlights the active link in the sidebar based on current page
 */
function highlightActiveLink() {
  const currentPage = window.location.pathname.split('/').pop();
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  
  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });
} 