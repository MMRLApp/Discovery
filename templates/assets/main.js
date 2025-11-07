// Theme toggle
(function() {
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  
  // Get saved theme or use system preference
  const savedTheme = localStorage.getItem('color-mode');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
  
  function setTheme(theme) {
    html.setAttribute('data-color-mode', theme);
    localStorage.setItem('color-mode', theme);
    
    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }
  
  setTheme(initialTheme);
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-color-mode');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });
})();

// Search functionality
(function() {
  const searchInput = document.getElementById('searchInput');
  const moduleList = document.getElementById('moduleList');
  
  if (!searchInput || !moduleList) return;
  
  const modules = Array.from(moduleList.querySelectorAll('.module-item'));
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    modules.forEach(module => {
      const title = module.querySelector('.module-item-title')?.textContent.toLowerCase() || '';
      const description = module.querySelector('.module-item-description')?.textContent.toLowerCase() || '';
      const labels = Array.from(module.querySelectorAll('.Label')).map(l => l.textContent.toLowerCase()).join(' ');
      
      const matches = !query || 
                     title.includes(query) || 
                     description.includes(query) || 
                     labels.includes(query);
      
      module.style.display = matches ? 'flex' : 'none';
    });
  });
})();

// (Removed version selector logic - now using dedicated releases page)

// README toggle
(function() {
  const readmeToggle = document.getElementById('readmeToggle');
  const readmeContent = document.querySelector('.readme-content');
  
  if (!readmeToggle || !readmeContent) return;
  
  // Start collapsed
  readmeContent.classList.add('collapsed');
  readmeToggle.setAttribute('aria-expanded', 'false');
  
  readmeToggle.addEventListener('click', () => {
    const isExpanded = readmeToggle.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
      readmeContent.classList.remove('expanded');
      readmeContent.classList.add('collapsed');
      readmeToggle.setAttribute('aria-expanded', 'false');
    } else {
      readmeContent.classList.remove('collapsed');
      readmeContent.classList.add('expanded');
      readmeToggle.setAttribute('aria-expanded', 'true');
    }
  });
})();

// Release changelog toggles
(function() {
  const toggles = Array.from(document.querySelectorAll('.release-toggle'));
  if (!toggles.length) return;

  toggles.forEach((btn) => {
    const targetId = btn.getAttribute('aria-controls');
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    // Start collapsed
    target.classList.add('collapsed');
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        target.classList.remove('expanded');
        target.classList.add('collapsed');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        target.classList.remove('collapsed');
        target.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();
