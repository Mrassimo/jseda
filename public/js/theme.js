/**
 * Theme management functionality for the EDA App
 */
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const toggleIcon = themeToggle.querySelector('i');
  const toggleText = themeToggle.querySelector('span');
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    toggleIcon.classList.replace('bi-moon-fill', 'bi-sun-fill');
    toggleText.textContent = 'Light Mode';
  }
  
  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    if (isDarkMode) {
      toggleIcon.classList.replace('bi-moon-fill', 'bi-sun-fill');
      toggleText.textContent = 'Light Mode';
    } else {
      toggleIcon.classList.replace('bi-sun-fill', 'bi-moon-fill');
      toggleText.textContent = 'Dark Mode';
    }
  });
});