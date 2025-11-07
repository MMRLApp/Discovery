import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import store from '../store.json';

function ModuleDetail() {
  const { repoId, moduleId } = useParams();
  const [selectedVersion, setSelectedVersion] = useState('');
  const [readme, setReadme] = useState('');
  const [loading, setLoading] = useState(true);

  // Find the module from the store
  const module = useMemo(() => {
    if (!store.modules || !store.modules[repoId]) {
      return null;
    }

    const repoData = store.modules[repoId];
    
    // Handle new structure: { id, name, modules: [...] }
    if (repoData.modules && Array.isArray(repoData.modules)) {
      return repoData.modules.find(m => m.id === moduleId);
    }
    // Handle old array structure
    else if (Array.isArray(repoData)) {
      return repoData.find(m => (m.id || m.name) === moduleId);
    } 
    // Handle old object structure
    else if (typeof repoData === 'object') {
      return repoData[moduleId];
    }
    
    return null;
  }, [repoId, moduleId]);

  // Get available versions
  const versions = useMemo(() => {
    if (!module) return [];
    
    if (module.versions && Array.isArray(module.versions)) {
      return module.versions;
    } else if (module.version) {
      return [module.version];
    }
    
    return ['1.0.0']; // Default version
  }, [module]);

  // Set initial selected version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0]);
    }
  }, [versions, selectedVersion]);

  // Load README
  useEffect(() => {
    const loadReadme = async () => {
      setLoading(true);
      
      try {
        // Try to load README from module data
        if (module?.readme) {
          // Check if it's a URL
          if (module.readme.startsWith('http')) {
            const response = await fetch(module.readme);
            if (response.ok) {
              const text = await response.text();
              setReadme(text);
            } else {
              setReadme(`# ${module?.name || moduleId}\n\n${module?.description || 'No description available.'}`);
            }
          } else {
            // It's embedded markdown
            setReadme(module.readme);
          }
        } else if (module?.readmeUrl) {
          // Fetch README from URL
          const response = await fetch(module.readmeUrl);
          if (response.ok) {
            const text = await response.text();
            setReadme(text);
          } else {
            setReadme(`# ${module?.name || moduleId}\n\n${module?.description || 'No description available.'}`);
          }
        } else {
          // Generate basic README
          let readmeContent = `# ${module?.name || moduleId}\n\n${module?.description || 'No description available.'}\n\n## Version\n${selectedVersion}\n\n## Repository\n${repoId}`;
          
          if (module?.author) {
            readmeContent += `\n\n## Author\n${module.author}`;
          }
          
          if (module?.support) {
            readmeContent += `\n\n## Support\n[${module.support}](${module.support})`;
          }
          
          setReadme(readmeContent);
        }
      } catch (error) {
        console.error('Error loading README:', error);
        setReadme(`# ${module?.name || moduleId}\n\n${module?.description || 'No description available.'}\n\n_README could not be loaded._`);
      } finally {
        setLoading(false);
      }
    };

    if (module) {
      loadReadme();
    } else {
      setLoading(false);
    }
  }, [module, moduleId, repoId, selectedVersion]);

  if (!module) {
    return (
      <div className="module-detail">
        <Link to="/" className="back-button">← Back to Modules</Link>
        <div className="error">
          <h2>Module Not Found</h2>
          <p>The module "{moduleId}" from repository "{repoId}" could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-detail">
      <Link to="/" className="back-button">← Back to Modules</Link>
      
      <div className="module-detail-header">
        <h1 className="module-detail-title">{module.name || moduleId}</h1>
        {module.description && <p>{module.description}</p>}
        
        <div className="module-detail-meta">
          <div className="module-repo">
            <strong>Repository:</strong> {repoId}
          </div>
          
          {versions.length > 0 && (
            <div className="version-selector">
              <label htmlFor="version-select">Version:</label>
              <select
                id="version-select"
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
              >
                {versions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {module.author && (
            <div className="module-author">
              <strong>Author:</strong> {module.author}
            </div>
          )}
        </div>
      </div>

      <div className="module-readme">
        {loading ? (
          <div className="loading">Loading README...</div>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {readme}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default ModuleDetail;
