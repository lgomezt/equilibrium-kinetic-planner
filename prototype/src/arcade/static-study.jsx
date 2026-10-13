import React from 'react';
import {createRoot} from 'react-dom/client';
import ArcadeScene from './ArcadeScene.jsx';
import './arcade.css';
import './reference-layout.css';

// The study's labels are artwork placeholders, independent of the live catalog.
// Every sample keeps its exact total; four existing tokens demonstrate the
// source, wheel, winding rail and return rail without animating the study.
const specimens=[
 {name:'Creatine',label:'3 g',color:'#8d4fea'},
 {name:'Omega-3',label:'1 g',color:'#1789ff'},
 {name:'L-theanine',label:'200 mg',color:'#10af32'},
 {name:'Vitamin D',label:'1000 IU',color:'#ff802a'},
 {name:'Magnesium',label:'300 mg',color:'#e4bc3f'},
 {name:'B-Complex',label:'1 cap',color:'#e01379'},
];
const samples=specimens.map(({color},bin)=>({id:`sample-${bin}`,bin,origin:bin,balls:20-bin%3,color}));
const overlays={
 marquee:<div className="arcade-ui arcade-marquee"><h1>A little balance.</h1><p>Choose what matters to you. Let the evidence shape the blend.</p></div>,
 leftPlaque:<div className="arcade-ui arcade-brand"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5"/><path d="M3.5 16h25M16 3.5v25"/><circle cx="16" cy="16" r="5"/></svg><span>equilibrium</span></div>,
 rightPlaque:<div className="arcade-ui arcade-motto"><span>SCIENCE. BALANCE.</span><strong>A BRIGHTER YOU.</strong></div>,
 controls:<section className="arcade-ui arcade-controls">{['Sleep','Memory','Focus','Strength','Calm','Energy'].map((name,i)=><div className="goal" key={name}><span className="goal-name">{name}</span><div className="battery">{Array.from({length:5},(_,j)=><span key={j} className="segment"/>)}</div><div className="priority-controls"><button className="stepper" disabled>−</button><span className="level"><strong>0</strong>/5</span><button className="stepper" disabled>+</button></div></div>)}</section>,
 labels:specimens.map(({name,label,color},bin)=><div key={bin} className="arcade-ui arcade-bin-label" data-study-role="illustrative-supplement" style={{'--color':color}}><span className="dose-name"><span className="color-key" aria-hidden="true"/>{name}</span><span className="dose-amount">{label}</span><span className="ball-unit">Illustrative sample</span></div>),
 footer:<div className="arcade-ui arcade-footer"><div className="arcade-footer-caption" aria-hidden="true">FUEL A BRIGHTER YOU</div><div className="plan-note"><p>Cabinet, artwork & mechanical structure · Static composition study</p></div><div className="arcade-footer-meta"><span>Illustrative labels only · No recommendations</span><span>Equilibrium arcade collection</span></div></div>,
};
createRoot(document.getElementById('root')).render(<div className="arcade-app"><main className="arcade-viewport" aria-label="Illustrative Equilibrium pinball composition study"><ArcadeScene plan={samples} overlays={overlays} staticStudy/></main></div>);
