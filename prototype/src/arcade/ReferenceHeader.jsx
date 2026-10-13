import React,{useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {Bevel,EightPointStar,Rod,Screw,Tube} from './primitives.jsx';
import {feedCurves,feedX,launchGateForward,launchGateLift} from './paths.js';
import Overlay from './Overlay.jsx';
import titleArtwork from './assets/title-glyphs.png';

const PANEL_ROTATION=[-Math.PI/2+.32,0,0];
const EMPTY=[0,0,0];
const MARQUEE_WIDTH_SCALE=.915;
const CONTROL_FACE_ANGLE=.337;
const CONTROL_FACE_ROTATION=[-Math.PI/2+CONTROL_FACE_ANGLE,0,0];
function controlFacePoint(x,shapeY,normal=0) {
 return new THREE.Vector3(x,shapeY+1.5,normal)
  .applyAxisAngle(new THREE.Vector3(1,0,0),CONTROL_FACE_ROTATION[0])
  .add(new THREE.Vector3(0,1.3,feedCurves[0].getPointAt(0).z));
}

function BulbTrim({positions,materials,radius=.095,aspect=[1,1,1],socketDepth=.065}) {
 const lamps=useRef(),halos=useRef(),sockets=useRef();
 const assets=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const context=canvas.getContext('2d');
  const glow=context.createRadialGradient(64,64,3,64,64,64);
  glow.addColorStop(0,'rgba(255,250,196,.95)');glow.addColorStop(.17,'rgba(255,188,62,.65)');glow.addColorStop(.48,'rgba(255,141,19,.18)');glow.addColorStop(1,'rgba(255,125,0,0)');
  context.fillStyle=glow;context.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return {
   sphere:new THREE.SphereGeometry(radius,20,14).scale(...aspect),
   halo:new THREE.PlaneGeometry(.68,.68),
   socket:new THREE.TorusGeometry(radius+.025,.027,8,24).scale(...aspect),
   texture,
   haloMaterial:new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),
  };
 },[radius,...aspect]);
 useEffect(()=>()=>{assets.sphere.dispose();assets.halo.dispose();assets.socket.dispose();assets.texture.dispose();assets.haloMaterial.dispose();},[assets]);
 useEffect(()=>{
  const matrix=new THREE.Matrix4();
  positions.forEach(([x,y,z],index)=>{
   matrix.makeTranslation(x,y,z);lamps.current.setMatrixAt(index,matrix);
   matrix.makeTranslation(x,y,z+.035);halos.current.setMatrixAt(index,matrix);
   matrix.makeTranslation(x,y,z-socketDepth);sockets.current.setMatrixAt(index,matrix);
  });
  for(const mesh of [lamps.current,halos.current,sockets.current])mesh.instanceMatrix.needsUpdate=true;
 },[positions,socketDepth]);
 return <group name="warm-backglass-lamp-trim">
  <instancedMesh ref={sockets} args={[assets.socket,materials.bronze??materials.gold,positions.length]} frustumCulled={false}/>
  <instancedMesh ref={lamps} args={[assets.sphere,materials.bulb??materials.amber,positions.length]} frustumCulled={false}/>
  <instancedMesh ref={halos} args={[assets.halo,materials.bulbHalo??assets.haloMaterial,positions.length]} frustumCulled={false} renderOrder={2}/>
 </group>;
}

function marqueeShape(inset=0,lowerExtension=0) {
 const width=5.26-inset,crown=2.23-inset;
 const shape=new THREE.Shape();
 shape.moveTo(-width+.35,-.72+inset-lowerExtension);
 shape.quadraticCurveTo(-width+.35,-.94+inset-lowerExtension,-width+.70,-1.0+inset-lowerExtension);
 shape.quadraticCurveTo(0,-.91+inset,width-.70,-1.0+inset-lowerExtension);
 shape.quadraticCurveTo(width-.35,-.94+inset-lowerExtension,width-.35,-.72+inset-lowerExtension);
 shape.lineTo(width,.42);
 shape.quadraticCurveTo(width-.18,.53,width-.47,.98);
 shape.quadraticCurveTo(width-1.78,crown,0,crown);
 shape.quadraticCurveTo(-width+1.78,crown,-width+.47,.98);
 shape.quadraticCurveTo(-width+.18,.53,-width,.42);shape.closePath();
 return shape;
}

function outlineCurve(shape,z) {
 const points=shape.getSpacedPoints(180);
 points.pop();
 return new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(point.x,point.y,z)),true,'centripetal');
}

function ReferenceTitle({heading,text}) {
 const [artworkReady,setArtworkReady]=useState(false);
 const letters=Array.from(text,(letter,index)=>{
  const offset=index/(text.length-1)*2-1;
  return <span key={index} aria-hidden="true" style={{'--title-lift':`${(offset*offset*17).toFixed(2)}px`,'--title-tilt':`${(offset*5).toFixed(2)}deg`}}>{letter}</span>;
 });
 return React.cloneElement(heading,{'aria-label':text,className:`${heading.props.className??''} arcade-arched-title${artworkReady?' arcade-title-artwork-ready':''}`},
  letters,<img key="title-artwork" className="arcade-title-artwork" src={titleArtwork} alt="" aria-hidden="true" draggable={false} onLoad={()=>setArtworkReady(true)} onError={()=>setArtworkReady(false)}/>);
}

function archedMarquee(content) {
 if(!React.isValidElement(content))return content;
 const children=React.Children.map(content.props.children,child=>{
  if(!React.isValidElement(child)||child.type!=='h1')return child;
  const text=React.Children.toArray(child.props.children).filter(value=>typeof value==='string').join('');
  return text?<ReferenceTitle heading={child} text={text}/>:child;
 });
 return React.cloneElement(content,{className:`${content.props.className??''} reference-marquee-print`},children);
}

function BrandingPlaque({width,side,content,materials}) {
 const geometry=useMemo(()=>{
  const shape=new THREE.Shape(),w=width/2;
  shape.moveTo(-w+.18,-.64);shape.quadraticCurveTo(-w,-.64,-w,-.44);
  shape.lineTo(-w,.44);shape.quadraticCurveTo(-w,.66,-w+.20,.66);
  shape.lineTo(w-.20,.66);shape.quadraticCurveTo(w,.66,w,.45);
  if(side>0)shape.lineTo(w,.05);
  shape.lineTo(w-.58,-.46);shape.quadraticCurveTo(w-.70,-.64,w-.87,-.64);shape.closePath();
  // Grow the brand plaques upward while preserving the aligned lower edge.
  for(const curve of shape.curves)for(const key of ['v0','v1','v2','v3'])if(curve[key]){
   if(side<0)curve[key].x*=-1;
   curve[key].y=-.64+(curve[key].y+.64)*1.70;
  }
  return {
   back:new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelSize:.07,bevelThickness:.035,bevelSegments:3,curveSegments:20}),
   face:new THREE.ShapeGeometry(shape),
   border:new THREE.TubeGeometry(outlineCurve(shape,.235),110,.036,8,true),
  };
 },[width,side]);
 useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
 const outer=-side*(width/2-.18),inner=side*(width/2-.85);
 return <group>
  <mesh geometry={geometry.back} material={materials.bronze??materials.brushed} castShadow receiveShadow/>
  <mesh geometry={geometry.face} position={[0,0,.233]} material={materials.navy}/>
  <mesh geometry={geometry.border} material={materials.chrome}/>
  <Overlay position={side>0?[0.17690333585845064,0.5237656352885085,0.27]:[0.09089251049125391,0.39429851819612316,0.27]} rotation={EMPTY} children={<div className="reference-branding-print">{content}</div>}/>
  {[outer,inner].flatMap(x=>[-.45,1.19].map(y=><group key={`${x}:${y}`} position={[x===inner&&y>0?side*(width/2-.25):x,y,.27]} rotation={[Math.PI/2,0,0]}><Screw position={[0,0,0]} scale={1.2} materials={materials}/></group>))}
 </group>;
}

export function ReferenceMarquee({materials,overlays={}}) {
 const rimEnamel=useMemo(()=>{
  const m=materials.red.clone();m.color.set('#b10d20');m.roughness=.22;
  m.clearcoat=.85;m.clearcoatRoughness=.12;m.envMapIntensity=.60;return m;
 },[materials.red]);
 useEffect(()=>()=>rimEnamel.dispose(),[rimEnamel]);
 const geometry=useMemo(()=>{
  const outer=marqueeShape(),rimOuter=marqueeShape(0,.44),brass=marqueeShape(.12,.44),face=marqueeShape(.23,.44);
  const rimCurve=(shape,z)=>{
   const curve=outlineCurve(shape,z);
   curve.points.forEach(point=>{point.y-=.70*(z-.32)+.013;});return curve;
  };
  const raisedBand=(outside,inside,depth,z)=>{
   const shape=marqueeShape(outside,.44);
   shape.holes.push(new THREE.Path(marqueeShape(inside,.44).getPoints(100).reverse()));
   const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.022,
    bevelThickness:.025,bevelSegments:4,curveSegments:26});
   geometry.translate(0,0,z);
   // Lean the casting back so its raised front keeps the calibrated silhouette.
   geometry.applyMatrix4(new THREE.Matrix4().set(1,0,0,0,0,1,-.70,.211,0,0,1,0,0,0,0,1));
   return geometry;
  };
  return {
   back:new THREE.ExtrudeGeometry(outer,{depth:.32,bevelEnabled:true,bevelSize:.095,bevelThickness:.075,bevelSegments:4,curveSegments:26}),
   brass:new THREE.ExtrudeGeometry(brass,{depth:.13,bevelEnabled:true,bevelSize:.043,bevelThickness:.040,bevelSegments:3,curveSegments:26}),
   face:new THREE.ExtrudeGeometry(face,{depth:.065,bevelEnabled:true,bevelSize:.026,bevelThickness:.022,bevelSegments:3,curveSegments:26}),
   // Raised annular castings join the rolled trim to its original backplate.
   // Their open centers preserve the navy face and printed title planes.
   redCollar:raisedBand(0,.15,.23,.35),
   brassCollar:raisedBand(.10,.27,.115,.48),
   redBead:new THREE.TubeGeometry(rimCurve(rimOuter,.65),240,.095,16,true),
   brassBead:new THREE.TubeGeometry(rimCurve(brass,.65),240,.030,12,true),
  };
 },[]);
 useEffect(()=>()=>Object.values(geometry).forEach(value=>value.dispose()),[geometry]);
 const shoulderCurves=useMemo(()=>[-1,1].map(side=>({
  rear:new THREE.CatmullRomCurve3([[5.12*MARQUEE_WIDTH_SCALE,.59,-.10],[5.60,.13,-.10],[6.10,.10,-.10],[7.30,.10,-.10],[7.65,-.10,-.10]].map(([x,y,z])=>new THREE.Vector3(x*side+(x===5.12*MARQUEE_WIDTH_SCALE?.39:0),y,z))),
  front:new THREE.CatmullRomCurve3([[5.12*MARQUEE_WIDTH_SCALE,.59,-.01],[5.60,.13,-.01],[6.10,.10,-.01],[7.30,.10,-.01],[7.65,-.10,-.01]].map(([x,y,z])=>new THREE.Vector3(x*side+(x===5.12*MARQUEE_WIDTH_SCALE?.39:0),y,z))),
  bead:new THREE.CatmullRomCurve3([[5.12*MARQUEE_WIDTH_SCALE,.67,.115],[5.60,.21,.115],[6.10,.18,.115],[7.30,.18,.115],[7.65,-.02,.115]].map(([x,y,z])=>new THREE.Vector3(x*side+(x===5.12*MARQUEE_WIDTH_SCALE?.39:0),y,z))),
 })),[]);
 const printedMarquee=useMemo(()=>archedMarquee(overlays.marquee),[overlays.marquee]);
 const bulbs=useMemo(()=>[
  [-3.497839,1.255611,.62],[-2.254030,1.582097,.62],[-.872878,1.719838,.62],
  [.683146,1.720973,.62],[2.076417,1.582097,.62],[3.326629,1.250473,.62],
 ],[]);
 const lowerBulbs=useMemo(()=>[
  [-3.384515,-1.677865,.85],[-1.278331,-1.567422,.85],[.984391,-1.569631,.85],[3.115559,-1.679465,.85],
 ],[]);
 const shoulderBulbs=useMemo(()=>[
  [-6.681280,.200309,.23],[-4.777935,.323279,.23],[5.407430,.243789,.23],[7.238523,.163393,.23],
 ],[]);
 return <group name="reference-arched-backglass">
  {[-6.8,6.8].map(x=><Rod key={x} from={[x,.09,-10.30]} to={[x,2.25,-10.15]} radius={.13} material={materials.bronze??materials.brushed}/>)}
  {[[-4.125063,1.748183,2.776100],[4.770436,1.751326,2.773172]].map(([x,bottom,top])=><group key={`corner-post-${x}`} name="turned-marquee-corner-stanchion">
   <Rod from={[x,.14,-8.65]} to={[x,bottom-.04,-8.65]} radius={.09} material={materials.bronze??materials.brushed}/>
   <Rod from={[x,bottom,-8.65]} to={[x,top,-8.65]} radius={.135} material={materials.bronze??materials.brushed}/>
   {[bottom,top].map((y,index)=><group key={y}>
    <mesh position={[x,y,-8.65]} material={materials.brushed} castShadow><cylinderGeometry args={[.245,.265,.075,32]}/></mesh>
    <mesh position={[x,y+(index?-.07:.07),-8.65]} material={materials.gold} castShadow><cylinderGeometry args={[.18,.18,.075,32]}/></mesh>
    <mesh position={[x,y,-8.65]} rotation={[Math.PI/2,0,0]} material={materials.chrome}><torusGeometry args={[.245,.022,10,32]}/></mesh>
   </group>)}
  </group>)}
  <group position={[0,2.35,-10.15]} rotation={PANEL_ROTATION}>
   {shoulderCurves.map((curves,index)=><group key={index} name="stepped-backglass-shoulder">
    <Tube curve={curves.rear} radius={.16} material={materials.bronze??materials.brushed} segments={40}/>
    <Tube curve={curves.front} radius={.135} material={materials.red} segments={40}/>
    <Tube curve={curves.bead} radius={.029} material={materials.gold} segments={40}/>
   </group>)}
   <BulbTrim positions={shoulderBulbs} materials={materials} radius={.135}/>
   <group name="compact-central-arch" position={[.39,-.20,0]} scale={[MARQUEE_WIDTH_SCALE,1.25,1]}>
    <mesh geometry={geometry.back} material={materials.red} castShadow receiveShadow/>
    <mesh geometry={geometry.brass} position={[0,0,.365]} material={materials.bronze??materials.gold} castShadow receiveShadow/>
    <mesh geometry={geometry.face} position={[0,0,.48]} material={materials.navy} castShadow receiveShadow/>
    <mesh geometry={geometry.redCollar} material={rimEnamel} castShadow receiveShadow name="cast-red-marquee-rim-collar"/>
    <mesh geometry={geometry.brassCollar} material={materials.gold} castShadow receiveShadow name="raised-brass-marquee-rim-seat"/>
    <mesh geometry={geometry.redBead} material={rimEnamel} castShadow receiveShadow name="rounded-red-marquee-rim"/>
    <mesh geometry={geometry.brassBead} material={materials.gold} castShadow receiveShadow name="rolled-brass-marquee-rim"/>
    <BulbTrim positions={bulbs} materials={materials} radius={.135} aspect={[1/MARQUEE_WIDTH_SCALE,.8,1]}/>
    <BulbTrim positions={lowerBulbs} materials={materials} radius={.135} aspect={[1/MARQUEE_WIDTH_SCALE,.8,1]} socketDepth={.105}/>
    {[-2.6,-1.3,0,1.3,2.6].map((x,index)=><EightPointStar key={x} position={[x,1.72+(1-Math.abs(x)/2.6)*.19,.575]} radius={index===2?.072:.046} depth={.007} material={materials.gold}/>)}
    <group scale={[1,.8,1]}><Overlay position={[.12,.24,.64]} rotation={EMPTY} children={printedMarquee}/></group>
   </group>
   {[[-5.840208323720824,overlays.leftPlaque,4.734023928324093],[6.604696207571453,overlays.rightPlaque,4.616971965721235]].map(([x,content,width],index)=><group key={index} name={index?'science-branding-plate':'equilibrium-branding-plate'} position={[x,1.22,.02]}>
    <BrandingPlaque width={width} side={index?-1:1} content={content} materials={materials}/>
   </group>)}
  </group>
 </group>;
}

const controlFaceX=x=>x*.956055476216982+.2560126137602136;

function controlShape() {
 const frontLeft=controlFaceX(-6.25),frontRight=controlFaceX(6.25),rearLeft=controlFaceX(-5.85),rearRight=controlFaceX(5.85),rear=2.36,front=-2.80,slotRoot=-.82,halfSlot=.47;
 const shape=new THREE.Shape();
 shape.moveTo(frontLeft,front+.45);shape.lineTo(rearLeft,rear-.25);
 shape.quadraticCurveTo(rearLeft,rear,rearLeft+.25,rear);
 const seams=feedX.slice(0,-1).map((x,index)=>(x+feedX[index+1])/2);
 for(const x of seams){
  shape.lineTo(x-.35,rear);shape.quadraticCurveTo(x-.22,rear,x-.13,rear-.53);
  shape.lineTo(x-.085,rear-.79);shape.quadraticCurveTo(x,rear-.96,x+.085,rear-.79);
  shape.lineTo(x+.13,rear-.53);shape.quadraticCurveTo(x+.22,rear,x+.35,rear);
 }
 shape.lineTo(rearRight-.25,rear);shape.quadraticCurveTo(rearRight,rear,rearRight,rear-.25);
 shape.lineTo(frontRight,front+.45);shape.quadraticCurveTo(frontRight,front,frontRight-.42,front);
 for(const x of [...feedX].reverse()){
  // Long, rounded openings leave curved cream fingers between the six sockets.
  shape.quadraticCurveTo(x+.64,front,x+halfSlot,front+.45);
  shape.lineTo(x+halfSlot,slotRoot-halfSlot);
  shape.bezierCurveTo(x+halfSlot,slotRoot-.12,x+.28,slotRoot,x,slotRoot);
  shape.bezierCurveTo(x-.28,slotRoot,x-halfSlot,slotRoot-.12,x-halfSlot,slotRoot-halfSlot);
  shape.lineTo(x-halfSlot,front+.45);
  shape.quadraticCurveTo(x-.64,front,x-.90,front);
 }
 shape.lineTo(frontLeft+.42,front);shape.quadraticCurveTo(frontLeft,front,frontLeft,front+.45);shape.closePath();
 return shape;
}

function LaunchSocket({point,materials,index,launchGateRefs}) {
 const assets=useMemo(()=>{
  const outline=new THREE.Shape();
  outline.moveTo(-.44,.25);outline.lineTo(-.44,-.12);
  outline.absarc(0,-.12,.44,Math.PI,Math.PI*2,false);
  outline.lineTo(.44,.25);outline.lineTo(.35,.25);outline.lineTo(.35,-.12);
  outline.absarc(0,-.12,.35,Math.PI*2,Math.PI,true);outline.lineTo(-.35,.25);outline.closePath();
  const shell=new THREE.ExtrudeGeometry(outline,{depth:.28,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:3,curveSegments:24});
  const vertices=shell.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
   const u=THREE.MathUtils.clamp((vertices.getY(i)-.02)/.265,0,1);
   vertices.setZ(i,vertices.getZ(i)+.11*u*u*(3-2*u));
  }
  shell.computeVertexNormals();
  const saddleOutline=new THREE.Shape();
  saddleOutline.moveTo(-.55,.21);saddleOutline.lineTo(-.55,-.12);
  saddleOutline.absarc(0,-.12,.55,Math.PI,Math.PI*2,false);
  saddleOutline.lineTo(.55,.21);saddleOutline.lineTo(.36,.21);saddleOutline.lineTo(.36,-.12);
  saddleOutline.absarc(0,-.12,.36,Math.PI*2,Math.PI,true);saddleOutline.lineTo(-.36,.21);saddleOutline.closePath();
  const saddle=new THREE.ExtrudeGeometry(saddleOutline,{depth:.095,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:5,curveSegments:32});
  const lip=new THREE.CatmullRomCurve3([
   [-.395,.08,.25],[-.395,.18,-.12],[-.28,.18,-.40],[0,.18,-.515],[.28,.18,-.40],[.395,.18,-.12],[.395,.08,.25]
  ].map(p=>new THREE.Vector3(...p)));
  return {shell,lip,saddle};
 },[]);
 useEffect(()=>()=>{assets.shell.dispose();assets.saddle.dispose();},[assets]);
 return <group position={[point.x,point.y-.15,point.z]} name="deep-rounded-launch-socket">
  <mesh name="rounded-ivory-launch-saddle" geometry={assets.saddle} rotation={[Math.PI/2,0,0]} position={[0,-.16,0]} material={materials.ivory} castShadow receiveShadow/>
  <mesh geometry={assets.shell} rotation={[Math.PI/2,0,0]} position={[0,.17,0]} material={materials.bronze??materials.brushed} castShadow receiveShadow/>
  <Tube curve={assets.lip} radius={.045} material={materials.chrome} segments={70}/>
  {[-.40,.40].map(x=><Bevel key={x} size={[.075,.20,.45]} radius={.035} position={[x,.055,.02]} material={materials.red}/>)}
  <group position={[0,launchGateLift+.15,launchGateForward]}>
   <group ref={element=>{if(launchGateRefs)launchGateRefs.current[index]=element;}} userData={{movingPart:true}} name="hinged-open-center-launch-retainer">
    <Rod from={[-.36,0,0]} to={[-.36,-.55,0]} radius={.022} material={materials.chrome}/>
    <Rod from={[.36,0,0]} to={[.36,-.55,0]} radius={.022} material={materials.chrome}/>
    <Rod from={[-.36,-.55,0]} to={[.36,-.55,0]} radius={.027} material={materials.chrome}/>
   </group>
  </group>
  {[-.40,.40].map(side=><Rod key={side} from={[side,-.12,launchGateForward]} to={[side,launchGateLift+.15,launchGateForward]} radius={.03} material={materials.brushed}/>)}
 </group>;
}

function SocketSeparator({index,materials}) {
 const shape=useMemo(()=>{
  const lean=index<3?-1:1,face=new THREE.Shape();
  face.moveTo(-.43,-.51);face.quadraticCurveTo(0,-.61,.43,-.51);
  face.lineTo(lean*.29,.63);face.quadraticCurveTo(lean*.35,.71,lean*.37,.57);face.closePath();
  return new THREE.ExtrudeGeometry(face,{depth:.065,bevelEnabled:true,bevelSize:.035,bevelThickness:.026,bevelSegments:3,curveSegments:20});
 },[index]);
 useEffect(()=>()=>shape.dispose(),[shape]);
 const a=feedCurves[index].getPointAt(0),b=feedCurves[index+1].getPointAt(0);
 return <group name="ruby-enamel-socket-divider" position={controlFacePoint((a.x+b.x)/2,-1.90,.11)} rotation={CONTROL_FACE_ROTATION}>
  <mesh geometry={shape} material={materials.chrome} castShadow receiveShadow/>
  <mesh geometry={shape} scale={[.86,.88,.6]} position={[0,0,.092]} material={materials.red} castShadow receiveShadow/>
  <mesh position={[0,-.27,.18]} material={materials.bronze??materials.gold}><torusGeometry args={[.095,.026,8,24]}/></mesh>
  <mesh position={[0,-.27,.195]} material={materials.bulb??materials.amber}><sphereGeometry args={[.080,16,12]}/></mesh>
  <mesh position={[0,-.27,.23]} material={materials.bulbHalo} renderOrder={2}><planeGeometry args={[.54,.54]}/></mesh>
 </group>;
}

export function ReferenceControls({materials,overlays={},launchGateRefs}) {
 const geometry=useMemo(()=>{
  const shape=controlShape();
  // Retain the printed face at normal .10; the rounded body grows below it.
  const body=new THREE.ExtrudeGeometry(shape,{depth:.26,bevelEnabled:true,bevelSize:.060,bevelThickness:.055,bevelSegments:6,curveSegments:24});
  body.translate(0,0,-.215);
  const backing=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.060,bevelThickness:.012,bevelSegments:4,curveSegments:24});
  backing.translate(0,0,-.312);
  const points=shape.getSpacedPoints(900);points.pop();
  const edge=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p.x,p.y,.128)),true,'centripetal');
  return {body,backing,edge};
 },[]);
 useEffect(()=>()=>{geometry.body.dispose();geometry.backing.dispose();},[geometry]);
 return <group name="reference-scalloped-priority-panel">
  {[-5.91,5.91].map(controlFaceX).flatMap(x=>[2.08,-2.44].map(shapeY=>{
   const cap=controlFacePoint(x,shapeY,-.12);
   return <group key={`${x}:${shapeY}`}>
    <Rod from={[cap.x,.08,cap.z]} to={cap.toArray()} radius={.115} material={materials.bronze??materials.brushed}/>
    <mesh position={[cap.x,.12,cap.z]} material={materials.bronze??materials.brushed}><cylinderGeometry args={[.25,.29,.085,20]}/></mesh>
   </group>;
  }))}
  <group position={[0,1.3,feedCurves[0].getPointAt(0).z]} rotation={CONTROL_FACE_ROTATION} name="priority-panel-placement">
   <group position={[0,1.5,0]}>
    <mesh name="thin-bronze-control-panel-plinth" geometry={geometry.backing} material={materials.bronze??materials.gold} castShadow receiveShadow/>
    <mesh name="rounded-solid-ivory-control-body" geometry={geometry.body} material={materials.ivory} castShadow receiveShadow/>
    <Tube curve={geometry.edge} radius={.028} material={materials.gold} segments={900}/>
    <Overlay position={[.2560126137602136,.22,.11]} rotation={EMPTY} children={overlays.controls}/>
    {feedX.flatMap(x=>[-.68,.68].map(offset=><group key={`${x}:${offset}`} position={[x+offset,2.10,.115]} rotation={[Math.PI/2,0,0]}><Screw position={EMPTY} scale={.57} materials={materials}/></group>))}
    {[-5.96,5.96].map(x=><group key={x} position={[controlFaceX(x),-2.48,.115]} rotation={[Math.PI/2,0,0]}><Screw position={EMPTY} scale={.70} materials={materials}/></group>)}
   </group>
  </group>
  {feedX.slice(0,-1).map((_,index)=><SocketSeparator key={index} index={index} materials={materials}/>)}
  {feedCurves.map((curve,index)=><LaunchSocket key={index} point={curve.getPointAt(0)} materials={materials} index={index} launchGateRefs={launchGateRefs}/>)}
 </group>;
}
