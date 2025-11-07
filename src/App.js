import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ModuleExplorer from './components/ModuleExplorer';
import ModuleDetail from './components/ModuleDetail';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h1>Module Explorer</h1>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ModuleExplorer />} />
            <Route path="/:repoId/:moduleId" element={<ModuleDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
