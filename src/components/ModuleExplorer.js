import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import store from '../store.json';

function ModuleExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Extract all modules from the store
  const allModules = useMemo(() => {
    const modules = [];
    
    // Parse modules from store
    if (store.modules && typeof store.modules === 'object') {
      Object.entries(store.modules).forEach(([repoId, repoData]) => {
        // Handle new structure: { id, name, modules: [...] }
        if (repoData.modules && Array.isArray(repoData.modules)) {
          repoData.modules.forEach(module => {
            modules.push({
              ...module,
              repoId,
              repoName: repoData.name || repoId,
            });
          });
        }
        // Handle old array structure
        else if (Array.isArray(repoData)) {
          repoData.forEach(module => {
            modules.push({
              ...module,
              repoId,
            });
          });
        } 
        // Handle old object structure
        else if (typeof repoData === 'object' && !repoData.modules) {
          Object.entries(repoData).forEach(([moduleId, module]) => {
            modules.push({
              ...module,
              repoId,
              id: moduleId,
            });
          });
        }
      });
    }
    
    return modules;
  }, []);

  // Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) {
      return allModules;
    }
    
    const query = searchQuery.toLowerCase();
    return allModules.filter(module => {
      const name = (module.name || '').toLowerCase();
      const description = (module.description || '').toLowerCase();
      const author = (module.author || '').toLowerCase();
      const repoId = (module.repoId || '').toLowerCase();
      
      return name.includes(query) || 
             description.includes(query) || 
             author.includes(query) ||
             repoId.includes(query);
    });
  }, [allModules, searchQuery]);

  return (
    <div className="module-explorer">
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search modules by name, description, author, or repository..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredModules.length === 0 ? (
        <div className="no-results">
          {searchQuery ? `No modules found for "${searchQuery}"` : 'No modules available'}
        </div>
      ) : (
        <div className="modules-grid">
          {filteredModules.map((module) => (
            <Link
              key={`${module.repoId}-${module.id}`}
              to={`/${module.repoId}/${module.id}`}
              className="module-card"
            >
              <h3>{module.name || module.id}</h3>
              {module.description && <p>{module.description}</p>}
              <div className="module-meta">
                <span className="module-repo">Repo: {module.repoId}</span>
                {module.version && (
                  <span className="module-version">v{module.version}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModuleExplorer;
