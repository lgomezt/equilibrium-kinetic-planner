import React, {Component, Suspense, useCallback, useState} from 'react';
import {createRoot} from 'react-dom/client';
import MaterialStudy from './MaterialStudy.jsx';
import './material-study.css';

class StudyBoundary extends Component {
 state = {failed: false};
 static getDerivedStateFromError() {return {failed: true};}
 componentDidCatch() {this.props.onFailure();}
 render() {
  return this.state.failed
   ? <p className="study-unavailable" role="alert">The material study could not load. Please reload in a browser with WebGL support.</p>
   : this.props.children;
 }
}

function App() {
 const [ready, setReady] = useState(false);
 const [failed, setFailed] = useState(false);
 const markReady=useCallback(() => setReady(true),[]);
 const markFailed=useCallback(() => setFailed(true),[]);
 return <div className="material-study-page" data-study-ready={ready}>
  <header className="study-masthead">
   <a className="study-brand" href="./" aria-label="Return to the existing Equilibrium planner">
    <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="5"/><path d="M3 16h26M16 3v26"/></svg>
    <span>equilibrium</span>
   </a>
   <span className="study-edition">THE ARCADE COLLECTION <span aria-hidden="true">/</span> STUDY 01</span>
  </header>
  <main className="study-content">
   <div className="study-heading">
    <p className="study-eyebrow"><span aria-hidden="true">✦</span> A SPACE-AGE MATERIAL STUDY <span aria-hidden="true">✦</span></p>
    <h1>A little balance.</h1>
    <p className="study-subtitle">Choose what matters to you. Let the evidence shape the blend.</p>
   </div>
   <div className="study-viewport" aria-describedby="study-description">
    <StudyBoundary onFailure={markFailed}><Suspense fallback={null}><MaterialStudy onReady={markReady} onFailure={markFailed}/></Suspense></StudyBoundary>
    {!ready && !failed && <p className="study-loading" role="status">Preparing the material study…</p>}
   </div>
   <p className="study-description" id="study-description">Midnight enamel. Polished chrome. A little arcade magic.</p>
  </main>
  <footer className="study-footer">
   <p><span className="study-status-dot" aria-hidden="true"/> MATERIALS & ARTWORK <span className="study-footer-divider" aria-hidden="true">/</span> PHASE 02</p>
   <p>Dark walnut <span aria-hidden="true">·</span> Cherry lacquer <span aria-hidden="true">·</span> Warm brass</p>
   <span className="study-footer-note">Art direction preview</span>
  </footer>
 </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
