import React,{useMemo,useRef,useEffect} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer,RoundedBox,SoftShadows} from '@react-three/drei';
import * as THREE from 'three';
import {feedCurves,mainCurve,exitCurves,wheelCenter,wheelRadius} from './motion.js';
import InventoryMarbles from './InventoryMarbles.jsx';

export const COLORS=['#8d4fea','#ffb51b','#19b997','#f16a86'];
const CHROME={color:'#e5e9ee',metalness:1,roughness:.14,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:1.1};
const STEEL={color:'#5f6b7d',metalness:.9,roughness:.29,envMapIntensity:1};
const GLASS={color:'#f1faff',metalness:0,roughness:.035,transmission:.9,transparent:true,opacity:.26,thickness:.045,ior:1.22,envMapIntensity:.4,clearcoat:1,depthWrite:false};
const v=(p)=>new THREE.Vector3(...p);
const chrome=new THREE.MeshPhysicalMaterial(CHROME);
const steel=new THREE.MeshPhysicalMaterial(STEEL);
const channel=new THREE.MeshPhysicalMaterial({...CHROME,color:'#bbc6d2',metalness:.65,roughness:.3,envMapIntensity:.8});

function Tube({curve,radius=.053,material=chrome,segments=300}){
 const geometry=useMemo(()=>new THREE.TubeGeometry(curve,segments,radius,10,false),[curve,radius,segments]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} material={material} castShadow receiveShadow/>;
}
function offsetCurve(curve,offset,z){
 const points=Array.from({length:221},(_,i)=>{
  const u=i/220,p=curve.getPointAt(u),t=curve.getTangentAt(u);
  return p.add(new THREE.Vector3(-t.y,t.x,0).multiplyScalar(offset)).add(new THREE.Vector3(0,0,z));
 });
 return new THREE.CatmullRomCurve3(points,false,'centripetal');
}
function ribbon(curve){
 const vertices=[],indices=[],normal=new THREE.Vector3();
 for(let i=0;i<=220;i++){
  const p=curve.getPointAt(i/220),t=curve.getTangentAt(i/220);normal.set(-t.y,t.x,0).normalize();
  for(const side of [-1,1])vertices.push(p.x+normal.x*.145*side,p.y+normal.y*.145*side,p.z-.185);
  if(i<220){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function Rail({curve}){
 const edges=useMemo(()=>[-.145,.145].map(s=>offsetCurve(curve,s,-.105)),[curve]);
 const lower=useMemo(()=>[-.17,.17].map(s=>offsetCurve(curve,s,-.2)),[curve]);
 const bed=useMemo(()=>ribbon(curve),[curve]);
 useEffect(()=>()=>bed.dispose(),[bed]);
 return <group>
  <mesh geometry={bed} material={channel} receiveShadow/>
  {lower.map((c,i)=><Tube key={'l'+i} curve={c} radius={.035} material={steel}/>)}
  {edges.map((c,i)=><Tube key={i} curve={c}/>)}
 </group>;
}
function Bar({from,to,radius=.045,material=chrome}){
 const a=v(from),b=v(to),d=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
 return <mesh position={mid} quaternion={q} material={material} castShadow><cylinderGeometry args={[radius,radius,d.length(),12]}/></mesh>;
}
function Disc({radius,depth=.08,position=[0,0,0],material=chrome}){
 return <mesh position={position} rotation={[Math.PI/2,0,0]} material={material} castShadow><cylinderGeometry args={[radius,radius,depth,48]}/></mesh>;
}
function Ring({radius,tube=.045,position=[0,0,0],material=chrome}){
 return <mesh position={position} material={material} castShadow><torusGeometry args={[radius,tube,12,100]}/></mesh>;
}
function Wheel({timeline}){
 const rotor=useRef();
 useFrame(()=>{if(rotor.current)rotor.current.rotation.z=timeline.current.wheelAngle;});
 return <group position={wheelCenter}>
  <Bar from={[0,-2.85-wheelCenter.y,-.34]} to={[0,0,-.34]} radius={.09}/>
  <RoundedBox args={[.62,.15,.55]} radius={.06} position={[0,-2.8-wheelCenter.y,-.28]}><meshPhysicalMaterial {...CHROME}/></RoundedBox>
  <Ring radius={wheelRadius+.22} tube={.077} position={[0,0,-.34]}/>
  <Ring radius={wheelRadius+.27} tube={.018} position={[0,0,-.29]} material={steel}/>
  <Ring radius={wheelRadius+.22} tube={.052} position={[0,0,.15]}/>
  <Ring radius={wheelRadius+.22} tube={.018} position={[0,0,.208]} material={channel}/>
  <group ref={rotor}>
   {Array.from({length:6},(_,i)=>{
    const angle=-Math.PI/2+i*Math.PI/3,x=Math.cos(angle)*wheelRadius,y=Math.sin(angle)*wheelRadius;
    return <group key={i}>
     <Bar from={[Math.cos(angle)*.26,Math.sin(angle)*.26,-.17]} to={[x,y,-.17]} radius={.06}/>
     <Bar from={[x,y,-.28]} to={[x,y,.12]} radius={.026}/>
     <Disc radius={.046} depth={.045} position={[x*.845,y*.845,.12]} material={steel}/>
     <group position={[x,y,0]}>
      <mesh rotation={[Math.PI/2,0,0]} castShadow><sphereGeometry args={[.245,24,16,0,Math.PI*2,Math.PI/2,Math.PI/2]}/><meshPhysicalMaterial {...GLASS} transmission={.65} thickness={.07} side={THREE.DoubleSide}/></mesh>
      <Ring radius={.242} tube={.035} position={[0,0,.065]}/>
      <Ring radius={.242} tube={.016} position={[0,0,.1]} material={channel}/>
     </group>
    </group>;
   })}
  </group>
  <Disc radius={.34} depth={.28} position={[0,0,-.04]} material={steel}/>
  <Ring radius={.31} tube={.044} position={[0,0,.16]}/>
  <Disc radius={.245} depth={.13} position={[0,0,.18]}/>
  <Ring radius={.145} tube={.022} position={[0,0,.26]} material={steel}/>
  <Disc radius={.125} depth={.05} position={[0,0,.28]}/>
  <Bar from={[-.055,-.02,.31]} to={[.055,.02,.31]} radius={.008} material={steel}/>
  {[0,Math.PI/2,Math.PI,3*Math.PI/2].map((a,i)=><mesh key={i} position={[Math.cos(a)*(wheelRadius+.22),Math.sin(a)*(wheelRadius+.22),.22]}><sphereGeometry args={[.028,12,8]}/><meshPhysicalMaterial color={i%2?'#c9e8ff':'#ecdcff'} emissive={i%2?'#abd9ff':'#ceb7ff'} emissiveIntensity={.3} roughness={.2}/></mesh>)}
 </group>;
}
function Tray(){
 const bins=[-4.8,-1.6,1.6,4.8];
 return <group>
  <RoundedBox args={[13.05,.24,1.15]} radius={.11} smoothness={4} position={[0,-2.98,-.02]} castShadow receiveShadow><meshPhysicalMaterial {...CHROME} roughness={.24}/></RoundedBox>
  <RoundedBox args={[12.86,.075,.94]} radius={.035} position={[0,-2.84,0]} receiveShadow><meshPhysicalMaterial color="#d8e1ea" metalness={.6} roughness={.3}/></RoundedBox>
  <RoundedBox args={[12.92,1,.08]} radius={.04} position={[0,-2.4,-.52]}><meshPhysicalMaterial {...GLASS}/></RoundedBox>
  {[-6.43,-3.2,0,3.2,6.43].map((x,i)=><group key={x}>
   <RoundedBox args={[.075,.98,1.1]} radius={.025} position={[x,-2.4,0]}><meshPhysicalMaterial {...GLASS} transmission={.8}/></RoundedBox>
   <Bar from={[x,-2.85,.56]} to={[x,-1.96,.56]} radius={.027}/>
   <Bar from={[x,-1.96,-.51]} to={[x,-1.96,.56]} radius={.024}/>
   <Disc radius={.055} depth={.028} position={[x,-2.82,.61]} material={steel}/>
  </group>)}
  {bins.map((x,i)=><group key={i}>
   <RoundedBox args={[2.7,.026,.1]} radius={.012} position={[x,-2.8,.44]}><meshPhysicalMaterial color={COLORS[i]} emissive={COLORS[i]} emissiveIntensity={.24} roughness={.3}/></RoundedBox>
   <RoundedBox args={[2.9,.025,.65]} radius={.012} position={[x,-2.79,-.02]}><meshPhysicalMaterial color={COLORS[i]} transparent opacity={.055} roughness={.5}/></RoundedBox>
  </group>)}
  <RoundedBox args={[12.92,.96,.065]} radius={.03} position={[0,-2.4,.58]}><meshPhysicalMaterial {...GLASS} transmission={.97} thickness={.065}/></RoundedBox>
  <Bar from={[-6.4,-1.93,.61]} to={[6.4,-1.93,.61]} radius={.032}/>
  <Bar from={[-6.4,-2.83,.62]} to={[6.4,-2.83,.62]} radius={.036}/>
 </group>;
}
function CameraRig(){
 const {camera,size}=useThree();
 useEffect(()=>{camera.zoom=Math.min(size.width/14.1,size.height/7.6);camera.position.set(2.2,6.6,25);camera.lookAt(0,.5,0);camera.updateProjectionMatrix();},[camera,size]);
 return null;
}
function Machine({plan,reducedMotion}){
 const timeline=useRef({wheelAngle:0});
 const inventoryPlan=useMemo(()=>({entries:plan}),[plan]);
 return <>
  <color attach="background" args={['#ffffff']}/>
  <CameraRig/>
  <SoftShadows size={18} samples={12} focus={.5}/>
  <ambientLight intensity={.5}/>
  <directionalLight position={[-4,8,12]} intensity={2.5} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-6} shadow-normalBias={.025} shadow-bias={-.0001} shadow-radius={3}/>
  <directionalLight position={[8,0,7]} color="#dbe7ff" intensity={1.2}/>
  <Environment resolution={256} frames={1}>
   <color attach="background" args={['#687384']}/>
   <Lightformer form="rect" intensity={4} color="#ffffff" scale={[14,4,1]} position={[-3,6,5]} rotation={[Math.PI/4,0,0]}/>
   <Lightformer form="rect" intensity={2.5} color="#e4efff" scale={[4,13,1]} position={[-7,1,4]} rotation={[0,Math.PI/3,0]}/>
   <Lightformer form="rect" intensity={3.4} color="#ffffff" scale={[3,10,1]} position={[8,2,3]} rotation={[0,-Math.PI/3,0]}/>
   <Lightformer form="rect" intensity={1.7} color="#ffffff" scale={[14,2,1]} position={[0,-5,6]} rotation={[-Math.PI/4,0,0]}/>
  </Environment>
  <mesh position={[0,0,-.88]} receiveShadow><planeGeometry args={[100,100]}/><shadowMaterial transparent opacity={.12}/></mesh>
  {feedCurves.map((c,i)=><Rail key={i} curve={c}/>)}
  <Rail curve={mainCurve}/>
  {exitCurves.map((c,i)=><Rail key={'exit'+i} curve={c}/>)}
  {[[-5.1,1.6],[-.1,.5],[-5.1,-.45],[2.4,-.9]].map(([x,y],i)=><group key={i}>
   <Bar from={[x,y,-.21]} to={[x,y-.62,-.53]} radius={.046}/>
   <Disc radius={.085} depth={.045} position={[x,y-.62,-.55]} material={steel}/>
  </group>)}
  {feedCurves.map((c,i)=>{const p=c.getPoint(0);return <group key={'input'+i} position={p}>
   <RoundedBox args={[.47,.24,.33]} radius={.045} position={[0,.06,-.13]} castShadow><meshPhysicalMaterial {...CHROME}/></RoundedBox>
   <RoundedBox args={[.3,.25,.12]} radius={.02} position={[0,.08,.065]}><meshPhysicalMaterial {...STEEL}/></RoundedBox>
  </group>;})}
  <InventoryMarbles plan={inventoryPlan} timeline={timeline} reducedMotion={reducedMotion}/>
  <Wheel timeline={timeline}/>
  <Tray/>
 </>;
}
export default function Scene({plan,reducedMotion=false}){
 return <Canvas orthographic shadows dpr={[1,2]} gl={{antialias:true,alpha:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping}} camera={{position:[0,3,25],near:.1,far:100,zoom:70}} aria-label="Three-dimensional chrome machine delivering the selected supplement portions"><Machine plan={plan} reducedMotion={reducedMotion}/></Canvas>;
}
