import ReferenceAsteroidSurface from './ReferenceAsteroidSurface.jsx';
import rocketReferenceUrl from '../material-study/assets/rocket-silver-reference.png';
import {cabinetIncline} from './paths.js';
import {bakeSculptureArtworkUV,createSculptureArtworkMaterial,useSculptureArtworkTexture} from './sculpture-surface-artwork.js';
import saturnReferenceUrl from '../material-study/assets/saturn-reference-globe.png';
import {LowerWarningWedges,MeasuredSaturnPedestal} from './ReferenceDecorPlacement.jsx';
import ReferenceScreenprint from './ReferenceScreenprint.jsx';
import React,{useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {createMoonReferenceFitMatrix} from './moon-reference-fit.js';
import moonReferenceUrl from '../material-study/assets/foreground-moon-reference.png';
import {bakeMoonArtworkUV,createMoonArtworkMaterial,useMoonArtworkTexture} from './moon-reference-artwork.js';
import {Bevel,EightPointStar,Rod,Screw,Tube} from './primitives.jsx';
import saturnUrl from '../material-study/assets/saturn-surface.svg';
import asteroidUrl from '../material-study/assets/asteroid-surface.svg';

// The two celestial sculptures are bolted behind the controls. Low artwork
// stays below the elevated troughs; side shields leave a notch for rail feet.
export const referenceDecorPositions=Object.freeze({
 saturn:Object.freeze([-6.46747,1.47,-8.77212]),
 rocket:Object.freeze([7.35287,1.17,-9.56915]),
 leftPlaque:Object.freeze([-7.466134893444257, 1.3000000000000007, -1.65431299749228]),
 rightPlaque:Object.freeze([8.119670112994804, 1.3000000000000007, -1.5451880276161631]),
});

export const referenceForegroundPositions=Object.freeze({
 saturnBumper:Object.freeze([-7.48951,.082,1.57046]),
 asteroid:Object.freeze([-7.161355062313142,-0.18345705889970532,11.517869236018157]),
});

function shapeOf(points) {
 const shape=new THREE.Shape();
 points.forEach(([x,y],i)=>{if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);});
 shape.closePath();return shape;
}

function sculpt(points,depth=.08,bevel=.025) {
 return new THREE.ExtrudeGeometry(shapeOf(points),{depth,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel*.75,bevelSegments:3,curveSegments:24});
}

function lathe(points) {
 return new THREE.LatheGeometry(points.map(([radius,height])=>new THREE.Vector2(radius,height)),48);
}

function CelestialMount({position,materials,width=.96}) {
 const [x,height,z]=position,cap=height-.028;
 return <group name="bolted-celestial-display-mount">
  <Bevel position={[x,.14,z]} size={[width+.16,.105,.64]} radius={.035} material={materials.brushed}/>
  <Bevel position={[x,.207,z]} size={[width+.08,.037,.56]} radius={.025} material={materials.gold}/>
  {[-1,1].flatMap(a=>[-1,1].map(b=><Screw key={String(a)+':'+String(b)} position={[x+a*(width*.5),.235,z+b*.20]} materials={materials} scale={.43}/>))}
  {[-.27,.27].map(offset=><group key={offset}>
   <Rod from={[x+offset,.235,z]} to={[x+offset,cap-.033,z]} radius={.065} material={materials.chrome}/>
   <mesh position={[x+offset,.285,z]} material={materials.gold} castShadow><cylinderGeometry args={[.109,.131,.103,24]}/></mesh>
   <mesh position={[x+offset,cap-.045,z]} material={materials.gold} castShadow><cylinderGeometry args={[.094,.10,.055,24]}/></mesh>
  </group>)}
  <Bevel position={[x,cap,z]} size={[width,.066,.34]} radius={.021} material={materials.brushed}/>
  <Bevel position={[x,cap+.044,z]} size={[width-.08,.026,.29]} radius={.014} material={materials.red}/>
 </group>;
}

// Measured crater centers and ellipses on the visible reference hemisphere.
// The baked tangent axes keep these surface features independent of the camera.
const SATURN_CRATERS = [
 [0.4130907,-0.1689549,0.8948801,0.792688,-0.4170451,-0.4446561,-0.6715353,-0.7202514,0.1740065,0.0997059,0.083417,0.008], // polar-oval · 307,176px
 [0.4845268,-0.3498184,0.801786,0.5126931,-0.6290838,-0.5842939,-0.7789417,-0.5896484,0.2134587,0.0854903,0.1216994,0.01], // upper-east · 316,181px
 [0.1997437,-0.4667382,0.8615439,0.5227424,-0.6929247,-0.496584,-0.8469876,-0.5243312,-0.0876855,0.1459349,0.1123602,0.018], // upper-basin · 309,188px
 [-0.1544034,-0.4120317,0.8979919,0.8920957,-0.4487829,-0.0525285,-0.5012185,-0.7505879,-0.4305784,0.1442747,0.1554661,0.022], // central-basin · 294,194px
 [0.4340777,-0.650423,0.6233189,0.7350915,-0.1442546,-0.6624432,-0.7770006,-0.6204543,-0.1063326,0.1399343,0.1011567,0.014], // east-basin · 325,194px
 [0.0502768,-0.6980909,0.7142418,0.8930032,-0.2888203,-0.3451495,-0.5468876,-0.6176441,-0.5651812,0.15871,0.113936,0.016], // mid-east · 312,201px
 [-0.6555918,-0.2309857,0.7189193,0.3338967,-0.9426083,0.0016287,-0.67393,-0.2504722,-0.6950411,0.0799169,0.0884756,0.012], // western-pit · 271,208px
 [-0.4954682,-0.3736535,0.784152,0.7714906,-0.6041206,0.1996007,-0.4080695,-0.6968016,-0.5898702,0.0833368,0.0559294,0.01], // west-middle · 281,205px
 [-0.5471871,-0.5533374,0.628016,0.6051728,-0.779879,-0.1598581,-0.5766758,-0.2945879,-0.7620125,0.0919039,0.0779395,0.013], // central-low · 286,215px
 [-0.3286615,-0.7067187,0.6265224,0.9260936,-0.3713003,0.0669831,-0.2355276,-0.5810841,-0.7790174,0.0929862,0.0659052,0.012], // center-pair · 299,213px
 [-0.3295668,-0.122889,0.9361004,0.9298222,-0.2142182,0.2992344,-0.2507447,-0.944494,-0.212269,0.0735824,0.0640969,0.01], // upper-west · 278,191px
 [-0.5962362,0.0070481,0.8027782,0.5359046,-0.7410539,0.404531,-0.4775371,-0.8069322,-0.3475899,0.0601246,0.0868397,0.009], // west-edge · 265,199px
 [-0.821638,-0.2206725,0.5255612,0.3326109,-0.9343838,0.1276596,-0.5050748,-0.1455334,-0.850717,0.0722582,0.0812978,0.01], // west-low · 266,218px
 [-0.749995,-0.4432813,0.4909269,0.6468249,-0.6466967,0.4042289,-0.2138536,-0.5398372,-0.8141514,0.0679974,0.0553209,0.008], // equator-west · 276,222px
 [0.0881087,-0.8820698,0.4628063,0.9656465,-0.0383903,-0.2570077,-0.161353,-0.4711155,-0.8671882,0.1246544,0.0796228,0.01], // right-low · 321,212px
 [0.4000508,-0.8062961,0.4357132,0.8383103,0.1297886,-0.5295194,-0.4303701,-0.5850068,-0.6874218,0.1191993,0.0672388,0.009], // east-edge · 330,204px
 [-0.6964904,-0.6708089,0.2547873,0.6216635,-0.7414221,-0.2526417,-0.3561109,0.014868,-0.9343254,0.1224496,0.1039935,0.01], // southern-basin · 287,233px
 [-0.3947178,-0.9142135,0.0917144,0.9159249,-0.3994102,-0.0394092,-0.0193137,-0.0915417,-0.9956139,0.1148915,0.100208,0.009], // south-east · 307,236px
 [-0.6173194,-0.778445,-0.1137549,0.7212409,-0.5022464,-0.4770326,-0.1189351,0.2352788,-0.9646234,0.0865095,0.087749,0.008], // southern-low · 296,245px
 [-0.8484303,-0.4457971,0.2853611,0.5163281,-0.8157059,0.260824,-0.239857,-0.156781,-0.9580649,0.069614,0.0883391,0.01], // south-west · 274,231px
 [-0.0996991,-0.9891657,0.1077555,0.6355021,-0.1466315,-0.7580477,-0.5802666,-0.0301736,-0.8138675,0.1011881,0.0701778,0.01], // far-south-east · 320,230px
 [-0.3830253,-0.5198616,0.7635676,0.7253906,-0.6810621,-0.0998144,-0.5731001,-0.5145502,-0.6378044,0.0404952,0.0445151,0.006], // middle-small · 290,206px
];
function crateredSaturnGeometry() {
 const geometry=new THREE.SphereGeometry(.950,192,128),positions=geometry.getAttribute('position'),colors=[];
 const basins=SATURN_CRATERS.map(([x,y,z,ax,ay,az,bx,by,bz,ra,rb,depth],index)=>{
  const center=new THREE.Vector3(x,y,z).normalize(),a=new THREE.Vector3(ax,ay,az).multiplyScalar(ra),b=new THREE.Vector3(bx,by,bz).multiplyScalar(rb);
  const aa=a.dot(a),ab=a.dot(b),bb=b.dot(b);
  return {center,a,b,aa,ab,bb,inverse:1/(aa*bb-ab*ab),depth,phase:index*1.713};
 });
 const p=new THREE.Vector3(),base=new THREE.Color('#3d49be'),floor=new THREE.Color('#192a77'),rim=new THREE.Color('#5364cf');
 // Smooth blue enamel underpainting restores the broad globe value gradient.
 // This fixed object-space axis follows the measured upper-left highlight;
 // crater relief/pigment remain independent and the gloss still responds to light.
 const enamelAxis=new THREE.Vector3(-.134230694,.060159288,.989122329).normalize();
 const shadowEnamel=new THREE.Color('#13286d'),litEnamel=new THREE.Color('#829cf0'),enamel=new THREE.Color();
 for(let i=0;i<positions.count;i++){
  p.fromBufferAttribute(positions,i).normalize();
  const shade=base.clone();let depression=0;
  for(const pit of basins){
   if(p.dot(pit.center)<.88)continue;
   const da=p.dot(pit.a),db=p.dot(pit.b),u=(da*pit.bb-db*pit.ab)*pit.inverse,v=(db*pit.aa-da*pit.ab)*pit.inverse;
   const angle=Math.atan2(v,u),edge=1+.070*Math.sin(angle*3+pit.phase)+.035*Math.sin(angle*5-pit.phase);
   const radius=Math.hypot(u,v)/edge;
   if(radius<1){
    const bowl=1-THREE.MathUtils.smoothstep(radius,.16,1);
    depression=Math.max(depression,pit.depth*bowl);
    shade.lerp(floor,.70*(1-THREE.MathUtils.smoothstep(radius,.66,1)));
   }else if(radius<1.13){
    shade.lerp(rim,.16*Math.sin((radius-1)/.13*Math.PI));
   }
  }
  const facing=p.dot(enamelAxis);
  enamel.copy(shadowEnamel).lerp(base,THREE.MathUtils.smoothstep(facing,.06,.78));
  enamel.lerp(litEnamel,.48*Math.pow(THREE.MathUtils.smoothstep(facing,.76,1),2));
  // Modulate the existing crater pigments, preserving their relative contrast.
  shade.r*=enamel.r/base.r;shade.g*=enamel.g/base.g;shade.b*=enamel.b/base.b;
  // Relief is entirely below the original surface: no raised rings or change
  // to the planet outline. The ring, supporting disk and mount stay fixed.
  positions.setXYZ(i,p.x*(.950-depression),p.y*(.950-depression),p.z*(.950-depression));colors.push(shade.r,shade.g,shade.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

function Saturn({materials,surface}) {
 const artworkTexture=useSculptureArtworkTexture(saturnReferenceUrl);
 const artworkCrop=[246,164,100,92];
 const planetGeometry=useMemo(()=>{
  const parent=new THREE.Matrix4().compose(new THREE.Vector3(...referenceDecorPositions.saturn),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,.75932)),new THREE.Vector3(1,1,1));
  const local=new THREE.Matrix4().compose(new THREE.Vector3(0,0,.270),new THREE.Quaternion().setFromEuler(new THREE.Euler(.10,-.12,.08)),new THREE.Vector3(1,1,.82));
  const model=new THREE.Matrix4().makeRotationX(cabinetIncline).multiply(parent).multiply(local);
  return bakeSculptureArtworkUV(crateredSaturnGeometry(),model,artworkCrop);
 },[]);
 const planetMaterial=useMemo(()=>{
  const copy=surface.clone();copy.map=null;copy.color.set('#ffffff');copy.vertexColors=true;
  copy.roughness=.30;copy.clearcoat=.55;copy.clearcoatRoughness=.18;
  copy.envMap=materials.purple.envMap;copy.envMapIntensity=.65;copy.emissiveIntensity=0;
  return copy;
 },[surface,materials.purple.envMap]);
 const artworkMaterial=useMemo(()=>createSculptureArtworkMaterial(planetMaterial,artworkTexture,{key:'saturn-globe',crop:artworkCrop,blend:.90}),[planetMaterial,artworkTexture]);
 useEffect(()=>()=>{planetGeometry.dispose();planetMaterial.dispose();artworkMaterial.dispose();},[planetGeometry,planetMaterial,artworkMaterial]);
 const curves=useMemo(()=>{
  // This real ring plane puts the lower diagonal in front of the planet.
  // Its thick near edge matches the gold band while retaining the outer bounds.
  const center=new THREE.Vector3(-0.008340013629218213,0.04664033511869192,0.2980457347877723);
  const major=new THREE.Vector3(0.8935011793200591,-0.3652342945151744,0.26126529173173185);
  const minor=new THREE.Vector3(-0.4377239217504626,-0.8382698200764155,0.3251176357511979);
  const normal=new THREE.Vector3().crossVectors(major,minor).normalize();
  const ellipse=(radius,offset=0)=>new THREE.CatmullRomCurve3(Array.from({length:160},(_,i)=>{
   const angle=i*Math.PI/80;
   return center.clone().addScaledVector(major,Math.cos(angle)*radius)
    .addScaledVector(minor,Math.sin(angle)*radius).addScaledVector(normal,offset);
  }),true);
  const thickness=0.07426496150579175;
  const inside=ellipse(1.413023972260253),outside=ellipse(1.570026635844733);
  // A closed metal annulus joins the rolled rims; four surfaces give the
  // band real thickness and lighting on both its near and far edges.
  const positions=[],indices=[],segments=256;
  for(let i=0;i<=segments;i++){
   const a=inside.getPoint(i/segments),b=outside.getPoint(i/segments);
   for(const point of [a,b])for(const sign of [-1,1]){const p=point.clone().addScaledVector(normal,sign*thickness);positions.push(p.x,p.y,p.z);}
  }
  for(let i=0;i<segments;i++){
   const a=i*4,b=a+4;
   for(const [p,q,r,t] of [[a+1,a+3,b+3,b+1],[a,b,b+2,a+2],[a,a+1,b+1,b],[a+2,b+2,b+3,a+3]])indices.push(p,q,r,p,r,t);
  }
  const band=new THREE.BufferGeometry();band.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));band.setIndex(indices);band.computeVertexNormals();
  return {band,inside:ellipse(1.413023972260253,thickness),outside:ellipse(1.570026635844733,thickness)};
 },[]);
 useEffect(()=>()=>curves.band.dispose(),[curves]);
 return <group name="domed-cratered-violet-saturn" position={referenceDecorPositions.saturn} rotation={[-Math.PI/2,0,.75932]}>
  <mesh position={[0,0,.080]} scale={[1,1,.09]} material={materials.brushed} castShadow><sphereGeometry args={[.975,48,24]}/></mesh>
  <mesh name="measured-cratered-saturn-hemisphere" position={[0,0,.270]} scale={[1,1,.82]} rotation={[.10,-.12,.08]} geometry={planetGeometry} material={artworkMaterial} castShadow receiveShadow/>
  <mesh name="solid-annular-saturn-ring" geometry={curves.band} material={materials.gold} castShadow receiveShadow/>
  <Tube curve={curves.inside} radius={.025} material={materials.bronze??materials.gold} segments={120}/>
  <Tube curve={curves.outside} radius={.019} material={materials.gold} segments={120}/>

 </group>;
}

function RocketPlume({anchor}) {
 const artwork=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;
  const ctx=canvas.getContext('2d');ctx.scale(512/91,640/112);ctx.translate(-1006,-218);
  const envelope=()=>{ctx.beginPath();ctx.moveTo(1018,225);ctx.bezierCurveTo(1038,224,1055,258,1064,276);ctx.bezierCurveTo(1072,294,1079,307,1086,322);ctx.bezierCurveTo(1075,313,1059,305,1045,292);ctx.bezierCurveTo(1028,277,1017,255,1018,225);ctx.closePath();};
  const orange=ctx.createLinearGradient(1022,225,1086,322);orange.addColorStop(0,'rgba(255,192,54,.95)');orange.addColorStop(.28,'rgba(255,150,18,.94)');orange.addColorStop(.76,'rgba(255,106,9,.55)');orange.addColorStop(1,'rgba(255,116,12,0)');
  ctx.save();ctx.shadowColor='rgba(255,118,12,.80)';ctx.shadowBlur=25;ctx.fillStyle=orange;envelope();ctx.fill();ctx.restore();
  ctx.save();ctx.filter='blur(2px)';ctx.fillStyle=orange;envelope();ctx.fill();ctx.restore();
  const yellow=ctx.createLinearGradient(1022,228,1084,320);yellow.addColorStop(0,'rgba(255,249,187,1)');yellow.addColorStop(.22,'rgba(255,230,88,.99)');yellow.addColorStop(.70,'rgba(255,167,25,.73)');yellow.addColorStop(1,'rgba(255,142,19,0)');
  ctx.fillStyle=yellow;ctx.beginPath();ctx.moveTo(1020,230);ctx.bezierCurveTo(1036,234,1047,257,1056,277);ctx.bezierCurveTo(1065,295,1077,310,1085,320);ctx.bezierCurveTo(1072,305,1053,291,1041,274);ctx.bezierCurveTo(1028,257,1020,243,1020,230);ctx.closePath();ctx.fill();
  const core=ctx.createLinearGradient(1023,231,1077,312);core.addColorStop(0,'rgba(255,255,242,1)');core.addColorStop(.27,'rgba(255,253,206,1)');core.addColorStop(.68,'rgba(255,224,111,.76)');core.addColorStop(1,'rgba(255,195,73,0)');
  ctx.fillStyle=core;ctx.beginPath();ctx.moveTo(1023,231);ctx.bezierCurveTo(1033,231,1045,258,1051,273);ctx.bezierCurveTo(1058,287,1070,304,1077,312);ctx.bezierCurveTo(1062,296,1049,277,1036,260);ctx.bezierCurveTo(1026,248,1021,239,1023,231);ctx.closePath();ctx.fill();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,side:THREE.DoubleSide});
  // Calibrated artwork stays attached to the actual nozzle while its curved
  // sheet rises clear of the cabinet wall, instead of disappearing below it.
  const camera=new THREE.PerspectiveCamera(44.91222225679921,1212/1280,.1,200);
  camera.position.set(-.2,15.604580394897463,20.877141158459278);camera.lookAt(-.2,-3.398624385746219,-2.329927375785143);camera.updateMatrixWorld();
  const inverseTilt=new THREE.Matrix4().makeRotationX(-.1),origin=camera.position.clone().applyMatrix4(inverseTilt);
  const pointAt=(px,py,height)=>{
   const ray=new THREE.Vector3(px/606-1,1-py/640,.5).unproject(camera).applyMatrix4(inverseTilt).sub(origin).normalize();
   return origin.clone().addScaledVector(ray,(height-origin.y)/ray.y);
  };
  const attachment=pointAt(1022,225,anchor[1]),offset=new THREE.Vector3(...anchor).sub(attachment);
  const geometry=new THREE.PlaneGeometry(1,1,12,24),position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(let i=0;i<position.count;i++){
   const px=1006+uv.getX(i)*91,py=218+(1-uv.getY(i))*112;
   const t=THREE.MathUtils.clamp((py-225)/97,0,1),height=anchor[1]+.30*t*t*(3-2*t);
   const p=pointAt(px,py,height).add(offset);position.setXYZ(i,p.x,p.y,p.z);
  }
  geometry.computeVertexNormals();return {geometry,material,texture};
 },[anchor]);
 useEffect(()=>()=>{artwork.geometry.dispose();artwork.material.dispose();artwork.texture.dispose();},[artwork]);
 return <mesh name="continuous-luminous-rocket-plume" geometry={artwork.geometry} material={artwork.material} renderOrder={2}/>;
}

function Rocket({materials}) {
 const artworkTexture=useSculptureArtworkTexture(rocketReferenceUrl);
 const artworkCrop=[920,154,105,83];
 const pose=useMemo(()=>({position:[7.22835328,1.50,-9.76529322],rotation:[-.43288062,.25272908,1.09741141],scale:1.65725579}),[]);
 const nozzle=useMemo(()=>new THREE.Vector3(0,-.725,.267).multiplyScalar(pose.scale).applyEuler(new THREE.Euler(...pose.rotation)).add(new THREE.Vector3(...pose.position)).toArray(),[pose]);
 const parts=useMemo(()=>({
  body:lathe([[.19,-.69],[.25,-.60],[.305,-.35],[.318,-.03],[.303,.31],[.263,.60],[.205,.78],[.103,.985],[0,1.13]]),
  nose:lathe([[.240,.69],[.225,.727],[.19,.813],[.095,1.01],[0,1.145]]),
  collar:lathe([[.218,-.72],[.26,-.64],[.289,-.515],[.302,-.47]]),
  leftFin:sculpt([[-.19,-.05],[-.37,-.31],[-.48,-.59],[-.46,-.81],[-.32,-.72],[-.19,-.62]],.12,.045),
  rightFin:sculpt([[.19,-.05],[.37,-.31],[.48,-.59],[.46,-.81],[.32,-.72],[.19,-.62]],.12,.045),
 }),[]);
 const bodyGeometry=useMemo(()=>{
  const model=new THREE.Matrix4().makeRotationX(cabinetIncline).multiply(new THREE.Matrix4().compose(new THREE.Vector3(...pose.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose.rotation)),new THREE.Vector3(pose.scale,pose.scale,pose.scale))).multiply(new THREE.Matrix4().makeTranslation(0,0,.265));
  return bakeSculptureArtworkUV(parts.body,model,artworkCrop);
 },[parts,pose]);
 const bodyArtwork=useMemo(()=>createSculptureArtworkMaterial(materials.chrome,artworkTexture,{key:'rocket-silver-body',crop:artworkCrop,blend:.82}),[materials.chrome,artworkTexture]);
 useEffect(()=>()=>{Object.values(parts).forEach(geometry=>geometry.dispose());bodyArtwork.dispose();},[parts,bodyArtwork]);
 return <group name="rocket-and-nozzle-anchored-plume">
  <RocketPlume anchor={nozzle}/>
  <group name="sculpted-red-silver-rocket" position={pose.position} rotation={pose.rotation} scale={pose.scale}>
  <mesh geometry={parts.leftFin} position={[0,0,.080]} material={materials.red} castShadow/>
  <mesh geometry={parts.rightFin} position={[0,-.18,.140]} material={materials.red} castShadow/>
  <mesh geometry={bodyGeometry} position={[0,0,.265]} material={bodyArtwork} castShadow receiveShadow/>
  <mesh geometry={parts.nose} position={[0,0,.267]} material={materials.red} castShadow receiveShadow/>
  <mesh geometry={parts.collar} position={[0,0,.269]} material={materials.red} castShadow/>
  <mesh position={[0,.23,.603]} material={materials.bronze??materials.gold}><torusGeometry args={[.170,.035,12,40]}/></mesh>
  <mesh position={[0,.23,.610]} material={materials.red}><torusGeometry args={[.150,.019,10,40]}/></mesh>
  <mesh position={[0,.23,.607]} material={materials.navy}><circleGeometry args={[.144,40]}/></mesh>
  <mesh position={[0,.23,.625]} scale={[1,1,.26]}><sphereGeometry args={[.133,32,20]}/><meshPhysicalMaterial color="#113e77" metalness={.31} roughness={.10} clearcoat={1} clearcoatRoughness={.055}/></mesh>
  <mesh position={[-.042,.275,.660]} scale={[.073,.021,1]} rotation={[0,0,-.45]}><circleGeometry args={[1,24]}/><meshBasicMaterial color="#e3edff" transparent opacity={.72}/></mesh>
  <EightPointStar radius={.096} depth={.012} material={materials.gold} position={[0,-.25,.602]}/>
  <mesh position={[0,-.725,.267]} rotation={[Math.PI/2,0,0]} material={materials.chrome}><torusGeometry args={[.195,.023,10,32]}/></mesh>
  </group>
 </group>;
}

function glowTexture() {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,3,64,64,64);
 gradient.addColorStop(0,'rgba(255,237,170,.82)');gradient.addColorStop(.22,'rgba(255,186,57,.48)');gradient.addColorStop(.60,'rgba(255,127,18,.09)');gradient.addColorStop(1,'rgba(255,127,18,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

function plaqueTexture(side) {
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=1440;
 const ctx=canvas.getContext('2d'),center=320;
 const shade=ctx.createLinearGradient(0,0,640,0);shade.addColorStop(0,'#030c20');shade.addColorStop(.42,'#102a4d');shade.addColorStop(1,'#05152e');
 ctx.fillStyle=shade;ctx.fillRect(0,0,640,1440);
 ctx.fillStyle=side<0?'#f4d391':'#e9e5d7';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.save();ctx.translate(center,250);ctx.beginPath();
 for(let i=0;i<16;i++){const a=-Math.PI/2+i*Math.PI/8,r=i%2?17:56,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.restore();
 const lines=side<0?['GOOD','HABITS','HIGHER','ORBITS']:['HEALTHY','ADULT','REFERENCE'];
 ctx.font=side<0?'italic bold 108px "Trebuchet MS",Arial':'bold 103px "Trebuchet MS",Arial';
 lines.forEach((line,i)=>ctx.fillText(line,center,side<0?525+i*170:555+i*180,350));
 ctx.fillStyle='#bc9753';ctx.fillRect(center-70,1240,140,5);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}

const DECOR_FIT={"left":{"position":[-7.466134893444257,1.3000000000000007,-1.65431299749228],"rotation":[-0.9407963267948966,0,0],"points":[[-0.2921816282158751,2.020811801503054],[1.0988338298103164,1.0753910116420926],[0.9983255516547764,-1.2866285285007617],[-1.0427720131991878,-1.922694538204877]],"markers":[[-0.5365188717576865,-1.2521099334911163],[0.6492112679210873,-0.9754537923643063]]},"right":{"position":[8.009670112994804,1.3000000000000007,-1.5451880276161631],"rotation":[-0.9407963267948966,0,0],"points":[[0.24430392314207872,1.8711566210424588],[1.0531403823345595,-1.7796114327234187],[-1.1526772959571412,-0.8512792491088015],[-1.1523108150586143,0.7893633532954035]],"markers":[[0.09609040728122054,-1.1446341693640627],[0.4341912495540079,-1.4369741998974148]]},"sling":{"position":[-5.50169966891459,0.3000000000000007,0.24376360393556595],"rotation":[-1.5707963267948966,0,0],"points":[[1.3852183590680056,1.6693400946991375],[-0.5107353307873197,2.408761978073091],[-1.1062334081371779,1.1395753910531887],[-1.2465539489134336,-1.0491258971065882],[-1.209303402602547,-1.506218113901763],[-0.8675844697022432,-1.730348512738157],[-0.4423290334383312,-1.4384112899694088],[-0.48710795214618674,-0.2680914645977168],[-0.07017818819480581,0.8287521263306523],[0.8930417119029705,1.1395753910531887]],"markers":[[-0.05908908056268114,1.5889218520437962],[-0.925040201232016,-0.9562627929722076],[-0.8819573891197434,-0.1710629734779019],[-0.4318103079484503,1.0874106933006473]]},"support":{"position":[2.7355771185324054,0.3999999999999986,1.4882633086096106],"rotation":[-1.5707963267948966,0,0],"points":[[0.7043874426861372,2.1385126111583084],[-0.07429335414719063,1.2819734631276312],[-0.5330015228013933,0.1379454882956388],[-0.5713967574042851,-0.6517365901927121],[-0.20826722455172986,-1.3855604661815697],[0.2723217039862389,-1.8027410233088759],[0.19377609042385346,-0.6737771704654989],[0.22728811916851255,0.5820449606344305]],"markers":[[-0.13188010095865188,-0.25010417791873607]]}};

function SidePlaque({side,materials,halo}) {
 const fitted=DECOR_FIT[side<0?'left':'right'];
 const texture=useMemo(()=>plaqueTexture(side),[side]);
 const geometry=useMemo(()=>{
  const points=fitted.points;
  const back=sculpt(points,.075,.045),face=new THREE.ShapeGeometry(shapeOf(points));
  const p=face.getAttribute('position'),uv=face.getAttribute('uv');
  face.computeBoundingBox();const bounds=face.boundingBox;
  for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-bounds.min.x)/(bounds.max.x-bounds.min.x),(p.getY(i)-bounds.min.y)/(bounds.max.y-bounds.min.y));
  uv.needsUpdate=true;
  return {back,face};
 },[side]);
 const faceMaterial=useMemo(()=>new THREE.MeshStandardMaterial({map:texture,roughness:.70,metalness:.02,envMapIntensity:.15}),[texture]);
 useEffect(()=>()=>{texture.dispose();faceMaterial.dispose();Object.values(geometry).forEach(g=>g.dispose());},[texture,geometry,faceMaterial]);
 const position=side<0?referenceDecorPositions.leftPlaque:referenceDecorPositions.rightPlaque;
 return <group name={side<0?'good-habits-bolted-shield':'healthy-adult-bolted-shield'}>
  {[-.48,.48].map(offset=>{
   const cap=new THREE.Vector3(offset,-1.28,-.05).applyEuler(new THREE.Euler(...fitted.rotation)).add(new THREE.Vector3(...position));
   return <group key={offset}>
    <Bevel position={[cap.x,.114,cap.z]} size={[.28,.067,.28]} radius={.025} material={materials.brushed}/>
    <Rod from={[cap.x,.135,cap.z]} to={cap.toArray()} radius={.052} material={materials.brushed}/>
   </group>;
  })}
  <group position={position} rotation={fitted.rotation}>
   <mesh geometry={geometry.back} material={materials.brushed} castShadow receiveShadow/>
   <mesh geometry={geometry.back} position={[0,0,.095]} scale={[.967,.972,.61]} material={materials.gold} castShadow/>
   <mesh geometry={geometry.back} position={[0,0,.155]} scale={[.90,.926,.35]} material={materials.bronze??materials.gold} castShadow/>
   {/* Red bevel reaches .193063; this leaves .018937 above its front. */}
   <mesh geometry={geometry.face} position={[0,0,.212]} scale={[.872,.911,1]} material={faceMaterial} receiveShadow/>
   {fitted.points.map(([x,y],i)=><group key={i} position={[x*.88,y*.88,.222]} rotation={[Math.PI/2,0,0]}><Screw position={[0,0,0]} scale={.9} materials={materials}/></group>)}
   {fitted.markers.map(([x,y],i)=><group key={i} position={[x,y,.247]}>
    <mesh material={materials.bronze??materials.gold}><torusGeometry args={[.085,.022,8,24]}/></mesh>
    <mesh position={[0,0,.034]} material={materials.bulb??materials.amber}><sphereGeometry args={[.062,16,12]}/></mesh>
    <mesh position={[0,0,.042]} material={halo} renderOrder={1}><planeGeometry args={[.36,.36]}/></mesh>
   </group>)}
  </group>
 </group>;
}

function ReferenceRedBumper({kind,materials,halo}) {
 const fit=DECOR_FIT[kind],geometry=useMemo(()=>{
  const p=fit.points,shape=new THREE.Shape();shape.moveTo(...p[0]);
  if(kind==='sling'){
   shape.bezierCurveTo(...p[1],...p[2],...p[3]);
   shape.quadraticCurveTo(...p[4],...p[5]);shape.lineTo(...p[6]);
   shape.bezierCurveTo(...p[7],...p[8],...p[9]);
  }else{
   shape.bezierCurveTo(...p[1],...p[2],...p[3]);
   shape.quadraticCurveTo(...p[4],...p[5]);
   shape.quadraticCurveTo(...p[6],...p[7]);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelSize:.065,bevelThickness:.045,bevelSegments:4,curveSegments:40});
 },[kind]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const lamps=kind==='sling'?fit.markers.slice(0,2):fit.markers;
 return <group name={kind==='sling'?'curved-left-ruby-slingshot':'ruby-wheel-foundation'} position={fit.position} rotation={fit.rotation}>
  <mesh geometry={geometry} material={materials.brushed} castShadow receiveShadow/>
  <mesh geometry={geometry} position={[0,0,.12]} scale={[.947,.964,.65]} material={materials.gold} castShadow/>
  <mesh geometry={geometry} position={[0,0,.203]} scale={[.815,.873,.40]} material={materials.red} castShadow receiveShadow/>
  {lamps.map(([x,y],i)=><group key={i} position={[x,y,.28]}>
   <mesh material={materials.bronze??materials.gold}><torusGeometry args={[.105,.03,10,24]}/></mesh>
   <mesh position={[0,0,.022]} material={materials.bulb??materials.amber}><sphereGeometry args={[.083,18,12]}/></mesh>
   <mesh position={[0,0,.045]} material={halo} renderOrder={2}><planeGeometry args={[.8,.8]}/></mesh>
  </group>)}
  {kind==='sling'&&<EightPointStar position={[...fit.markers[2],.27]} radius={.21} depth={.012} material={materials.gold}/>}
  {(kind==='sling'?[fit.points[6],fit.markers[3]]:[fit.points[0],fit.points[5]]).map(([x,y],i)=><group key={i} position={[x*.94,y*.94,.263]} rotation={[Math.PI/2,0,0]}><Screw position={[0,0,0]} scale={.64} materials={materials}/></group>)}
 </group>;
}

// x, z, physical decorative radius, turn, supported center height, vertical ratio.
// Each rock retains its calibrated projected origin; these are not token sizes.
export const ASTEROIDS=Object.freeze([
 [-7.767295847090533,-10.587721930476883,0.4965000653454008,0.2,1.5,0.9432231884552387],
 [-5.540021195003011,-11.273528088895661,0.40778424787968076,-0.6,1.5,0.8079805941333306],
 [-7.0202686373275025,-7.402183555329426,0.47422223906605543,0.3,0.5505475932883649,0.9627298742362735],
 [8.487600283887424,-10.159334297376203,0.37001865340072654,-0.6,2.0,0.8100164286148213],
 [8.050283633562515,-5.670531468142388,0.49111324442832266,0.8,0.572277949301164,0.9731036038246993],
 [-6.98310406496117,0.3977628812053835,0.2900406004185792,-0.3,0.37372998650848444,0.9749503076475358],
 [8.394584408996696,1.3633681912128128,0.3186540349063912,0.4,0.47910805029798975,1.2124076455998787],
]);

function crateredGeometry() {
 const geometry=new THREE.SphereGeometry(1,40,28),position=geometry.getAttribute('position');
 const pits=[[[.34,.89,.30],.21], [[-.47,.75,.46],.18], [[.66,.35,.66],.17], [[-.15,.34,.93],.18], [[-.74,.48,-.20],.14], [[.05,.86,-.47],.16]]
  .map(([direction,width])=>({direction:new THREE.Vector3(...direction).normalize(),width}));
 const point=new THREE.Vector3();
 for(let i=0;i<position.count;i++){
  point.fromBufferAttribute(position,i).normalize();
  let radius=1+.028*Math.sin(point.x*11+point.y*4)*Math.cos(point.z*8-point.y*5);
  for(const pit of pits){
   const angle=Math.acos(THREE.MathUtils.clamp(point.dot(pit.direction),-1,1)),u=angle/pit.width;
   if(u<.84)radius-=.13*(1-(u/.84)**2);
   else if(u<1.23)radius+=.026*Math.sin((u-.84)/.39*Math.PI);
  }
  position.setXYZ(i,point.x*radius,point.y*radius,point.z*radius);
 }
 geometry.computeVertexNormals();return geometry;
}

function Asteroids({material,materials}) {
 const geometry=useMemo(()=>{const g=crateredGeometry();g.computeBoundingBox();return g;},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group name="rounded-cratered-asteroid-relief">{ASTEROIDS.map(([x,z,r,turn,y,vertical],i)=>{
  const bottom=y+geometry.boundingBox.min.y*r*vertical;
  return <group key={i}>
  {y>.8&&<group name="raised-asteroid-display-mount">
   <Bevel size={[.34,.07,.34]} position={[x,.12,z]} radius={.02} material={materials.bronze}/>
   <Rod from={[x,.145,z]} to={[x,bottom+.012,z]} radius={.036} material={materials.bronze}/>
   <mesh position={[x,bottom+.010,z]} material={materials.bronze}><cylinderGeometry args={[r*.38,r*.29,.045,24]}/></mesh>
  </group>}
  <ReferenceAsteroidSurface artworkId={`DECOR-${String(15+i).padStart(3,'0')}`} geometry={geometry} material={material} position={[x,y,z]} rotation={[0,turn,0]} scale={[r,r*vertical,r*.92]} castShadow receiveShadow/>
 </group>;})}</group>;
}


function foregroundCrateredGeometry(pitCount=224,pitScale=1,segments=[160,112]) {
 const geometry=new THREE.SphereGeometry(1,...segments),positions=geometry.getAttribute('position'),colors=[];
 const pits=Array.from({length:pitCount},(_,i)=>{
  const y=1-2*(i+.5)/pitCount,angle=i*2.399963229728653,ring=Math.sqrt(1-y*y);
  return {direction:new THREE.Vector3(Math.cos(angle)*ring,y,Math.sin(angle)*ring),width:pitScale*(.042+.060*((i*37%101)/100)),depth:Math.min(1.6,pitScale)*(.025+.035*((i*53%97)/96))};
 });
 // Only the large foreground sculpture uses the measured reference craters.
 // The companion retains its original geometry. Anchors are reference pixels:
 // [centerX, centerY, halfWidth, halfHeight, angleDegrees, pigmentStrength].
 const referencePits=pitCount===224&&pitScale===1?[
  [0,1167,11,4,15,0.8],
  [26.3,1174.5,6.5,3,25,0.85],
  [43,1171.3,4.8,1.6,29,0.45],
  [44,1188,6,4,32,0.88],
  [66,1193,8,3,48,0.86],
  [3,1197,18,11,5,0.75],
  [59.5,1216,16,13,42,1],
  [92,1222,7,2,68,0.85],
  [101,1237,5,1.9,72,0.75],
  [89,1251,10,5,77,0.9],
  [105,1278,12,7,80,0.9],
  [48.5,1277.5,19,14,-10,1],
  [21,1238.5,11,9.6,5,0.94],
  [8,1265,4,3.5,0,0.78],
  [13,1212,4,2.1,23,0.55],
  [32,1210,3,3,0,0.7],
  [48,1240,3.5,2.6,20,0.48],
  [65,1251,4.1,2.7,-20,0.48],
  [74,1262,2,2,0,0.28],
  [82,1275,2.5,2.4,0,0.38],
  [15,1224,2.3,1.8,30,0.2],
  [5,1249,2.3,2,0,0.22],
  [33,1258,2.6,1.9,0,0.18],
  [41,1251,2,1.5,40,0.18],
  [49,1229,1.7,1.7,0,0.2],
  [68,1236,2.4,1.8,20,0.24],
  [79,1241,2,1.8,0,0.18],
  [17,1186,3,1.3,25,0.22],
  [53,1200,2.4,1.7,30,0.2],
  [74,1208,2,1.7,40,0.18],
  [28,1268,2.4,1.8,0,0.22],
  [60,1265,2.3,2,0,0.19],
]:null;
 const fitCamera=new THREE.PerspectiveCamera(44.91222225679921,1212/1280,.1,200);
 fitCamera.position.set(-.2,15.604580394897463,20.877141158459278);
 fitCamera.lookAt(-.2,-3.398624385746219,-2.329927375785143);fitCamera.updateMatrixWorld();
 // Final moon-depth pose is a camera-centered homothety of the original pose.
 // Applying displacement along these local camera rays preserves every vertex's
 // projected position, including the exact existing silhouette and triangle edges.
 const fitMatrix=new THREE.Matrix4().makeRotationX(.1).multiply(new THREE.Matrix4().compose(
  new THREE.Vector3(-7.161355062313142,-.18345705889970532,11.517869236018157),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0,.20,0)),
  new THREE.Vector3(1.1948857413347422,1.1948857413347422*.95,1.1948857413347422*.97)));
 const referenceFit=referencePits?createMoonReferenceFitMatrix(fitMatrix,fitCamera):null;
 if(referenceFit)fitMatrix.multiply(referenceFit);
 const fitCameraLocal=fitCamera.position.clone().applyMatrix4(fitMatrix.clone().invert());
 const projected=new THREE.Vector3(),ray=new THREE.Vector3(),fitted=new THREE.Vector3(),normal=new THREE.Vector3();
 const softSurface=new THREE.Color('#bdb1c1'),softPit=new THREE.Color('#595568'),softRim=new THREE.Color('#d5c5ce');
 const baseRadius=p=>1+.028*Math.sin(p.x*11+p.y*4)*Math.cos(p.z*8-p.y*5);
 const point=new THREE.Vector3(),surface=new THREE.Color('#c4b6ca'),pitColor=new THREE.Color('#333747'),rimColor=new THREE.Color('#e4d4df');
 for(let i=0;i<positions.count;i++){
  point.fromBufferAttribute(positions,i).normalize();
  let radius=1+.028*Math.sin(point.x*11+point.y*4)*Math.cos(point.z*8-point.y*5),shade=surface.clone();
  for(const pit of pits){
   const angle=Math.acos(THREE.MathUtils.clamp(point.dot(pit.direction),-1,1)),u=angle/pit.width;
   if(u<.84){radius-=pit.depth*(1-(u/.84)**2);shade.lerp(pitColor,.95*(1-Math.min(1,u/.84)**4));}
   else if(u<1.20){shade.lerp(rimColor,.60*Math.sin((u-.84)/.36*Math.PI));}
  }
  fitted.copy(point).multiplyScalar(radius);
  if(referencePits){
   projected.copy(fitted).applyMatrix4(fitMatrix).project(fitCamera);
   const px=(projected.x+1)*606,py=(1-projected.y)*640;
   ray.copy(fitted).sub(fitCameraLocal).normalize();
   const facing=-point.dot(ray),blend=THREE.MathUtils.smoothstep(facing,.32,.58);
   // Remove old regular dents on the facing interior, solving the unchanged
   // low-frequency base surface along the same ray. Keep limb/back vertices exact.
   if(blend>0){
    for(let step=0;step<8;step++){
     normal.copy(fitted).normalize();
     const error=fitted.length()-baseRadius(normal),derivative=normal.dot(ray);
     fitted.addScaledVector(ray,-error/Math.min(-.20,derivative));
    }
    fitted.lerp(point.clone().multiplyScalar(radius),1-blend);
   }
   shade.copy(softSurface).multiplyScalar(1+.018*Math.sin(point.x*5+point.y*3)*Math.cos(point.z*4));
   let depression=0;
   for(let k=0;k<referencePits.length;k++){
    const [cx,cy,rx,ry,degrees,strength]=referencePits[k],a=degrees*Math.PI/180;
    const dx=px-cx,dy=py-cy,ex=(dx*Math.cos(a)+dy*Math.sin(a))/rx,ey=(-dx*Math.sin(a)+dy*Math.cos(a))/ry;
    const theta=Math.atan2(ey,ex),outline=1+.065*Math.sin(theta*5+k*.73)+.035*Math.sin(theta*7-k*.39);
    const u=Math.hypot(ex,ey)/outline;
    if(u<1.18){
     const bowl=1-THREE.MathUtils.smoothstep(u,.48,1.05);
     shade.lerp(softPit,.82*strength*bowl);
     if(u>.88)shade.lerp(softRim,.12*strength*Math.sin(Math.PI*(u-.88)/.30));
     depression=Math.max(depression,(.004+.006*Math.min(1,rx/16))*strength*bowl);
    }
   }
   fitted.addScaledVector(ray,depression*blend);
  }
  positions.setXYZ(i,fitted.x,fitted.y,fitted.z);colors.push(shade.r,shade.g,shade.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 if(referenceFit)geometry.applyMatrix4(referenceFit);
 geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}

function ForegroundAsteroid({material,materials}) {
 const geometry=useMemo(()=>bakeMoonArtworkUV(foregroundCrateredGeometry(),referenceForegroundPositions.asteroid),[]);
 const artworkTexture=useMoonArtworkTexture(moonReferenceUrl);
 const companionGeometry=useMemo(()=>foregroundCrateredGeometry(26,2.3,[64,40]),[]);
 const craterMaterial=useMemo(()=>{const copy=material.clone();copy.map=null;copy.vertexColors=true;copy.color.set('#eee5ef');return copy;},[material]);
 const companionMaterial=useMemo(()=>{const copy=craterMaterial.clone();copy.color.set('#b7a7bb');return copy;},[craterMaterial]);
 const artworkMaterial=useMemo(()=>createMoonArtworkMaterial(craterMaterial,artworkTexture),[craterMaterial,artworkTexture]);
 useEffect(()=>()=>artworkMaterial.dispose(),[artworkMaterial]);
 useEffect(()=>()=>{geometry.dispose();companionGeometry.dispose();craterMaterial.dispose();companionMaterial.dispose();},[geometry,companionGeometry,craterMaterial,companionMaterial]);
 const [x,centerY,z]=referenceForegroundPositions.asteroid,radius=1.1948857413347422,height=radius*.95;
 // Keep the sculpture’s projected silhouette while bringing it ahead of the
 // front bridge. The original mount stays bolted to the same cabinet point.
 const mountX=-7.527742170855939;
 const floor=centerY+geometry.boundingBox.min.y*height;
 const companion=[-5.6989167293388485,0.2,11.52616380969916];
 return <group name="foreground-cratered-asteroid-display">
  <group name="foreground-asteroid-cantilever-mount">
   <Bevel position={[mountX,-1.56,9.75]} size={[.72,.36,.10]} radius={.025} material={materials.brushed}/>
   {[-.22,.22].map(offset=><group key={offset}>
    <Rod from={[mountX+offset,-1.68,9.76]} to={[x+offset,floor-.035,z]} radius={.062} material={materials.bronze??materials.gold}/>
    <group position={[mountX+offset,-1.46,9.811]} rotation={[Math.PI/2,0,0]}><Screw position={[0,0,0]} scale={.48} materials={materials}/></group>
   </group>)}
   <Bevel position={[x,floor-.035,z]} size={[.80,.070,.72]} radius={.025} material={materials.brushed}/>
   <Rod from={[mountX+.22,-1.68,9.76]} to={[companion[0],companion[1]-.44,companion[2]]} radius={.045} material={materials.bronze??materials.gold}/>
   <Bevel position={[companion[0],companion[1]-.44,companion[2]]} size={[.42,.055,.38]} radius={.025} material={materials.brushed}/>
  </group>
  <mesh name="large-lower-left-cratered-asteroid" geometry={geometry} material={artworkMaterial} position={[x,centerY,z]} rotation={[0,.20,0]} scale={[radius,height,radius*.97]} castShadow receiveShadow/>
  <ReferenceAsteroidSurface artworkId="DECOR-014" name="small-foreground-companion-moon" geometry={companionGeometry} material={companionMaterial} position={companion} rotation={[.12,-.85,.1]} scale={[0.2676166784395729,0.4817100211912312,0.2676166784395729]} castShadow receiveShadow/>
 </group>;
}

function LitTriangle({position,angle=0,materials,geometry,jewel,halo}) {
 return <group position={position} name="sculpted-red-jewel-arcade-bumper" rotation={[-Math.PI/2,0,angle]}>
  <mesh geometry={geometry} material={materials.brushed} castShadow receiveShadow/>
  <mesh geometry={geometry} position={[0,0,.10]} scale={[.93,.93,.71]} material={materials.gold} castShadow/>
  <mesh geometry={geometry} position={[0,0,.176]} scale={[.78,.78,.50]} material={materials.red} castShadow/>
  <mesh geometry={geometry} position={[0,0,.229]} scale={[.24,.24,.75]} material={jewel}/>
  <mesh position={[0,0,.307]} material={materials.bulb??materials.amber}><sphereGeometry args={[.057,16,12]}/></mesh>
  <mesh position={[0,0,.375]} material={halo} renderOrder={1}><planeGeometry args={[.60,.60]}/></mesh>
  {[[-.30,-.26],[.30,-.26],[0,.37]].map(([x,y],i)=><group key={i} position={[x,y,.197]} rotation={[Math.PI/2,0,0]}><Screw position={[0,0,0]} scale={.37} materials={materials}/></group>)}
 </group>;
}

export default function ReferenceDecor({materials}) {
 const [saturnMap,asteroidMap]=useTexture([saturnUrl,asteroidUrl]);
 const own=useMemo(()=>{
  [saturnMap,asteroidMap].forEach(map=>{map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;});
  const glow=glowTexture();
  return {
   saturn:new THREE.MeshPhysicalMaterial({map:saturnMap,color:'#a18fff',roughness:.58,metalness:.015,clearcoat:.14,clearcoatRoughness:.42,emissive:'#25195c',emissiveIntensity:.06}),
   asteroid:new THREE.MeshStandardMaterial({map:asteroidMap,color:'#b2a5c0',roughness:.77,metalness:.015}),
   foregroundAsteroid:new THREE.MeshStandardMaterial({map:asteroidMap,color:'#d4cfdf',roughness:.79,metalness:.025}),
   redSaturn:new THREE.MeshPhysicalMaterial({color:'#f8321c',emissive:'#b7240a',emissiveIntensity:.43,metalness:.08,roughness:.17,clearcoat:.95,clearcoatRoughness:.13}),
   ink:new THREE.MeshStandardMaterial({color:'#e7b950',emissive:'#705015',emissiveIntensity:.22,roughness:.50,metalness:.12}),
   jewel:new THREE.MeshPhysicalMaterial({color:'#f43a23',emissive:'#e2260b',emissiveIntensity:.70,metalness:.10,roughness:.15,clearcoat:1}),
   halo:new THREE.MeshBasicMaterial({map:glow,transparent:true,opacity:.55,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),
  };
 },[saturnMap,asteroidMap]);
 const triangle=useMemo(()=>sculpt([[-.46,-.39],[.46,-.39],[0,.53]],.095,.035),[]);
 useEffect(()=>()=>{own.halo.map.dispose();Object.values(own).forEach(material=>material.dispose());},[own]);
 useEffect(()=>()=>triangle.dispose(),[triangle]);
 return <group name="reference-celestial-artwork">
  <CelestialMount position={referenceDecorPositions.saturn} materials={materials} width={1.07}/>
  <CelestialMount position={referenceDecorPositions.rocket} materials={materials} width={.88}/>
  <Saturn materials={materials} surface={own.saturn}/>
  <Rocket materials={materials}/>
  <SidePlaque side={-1} materials={materials} halo={own.halo}/><SidePlaque side={1} materials={materials} halo={own.halo}/>
  <ReferenceScreenprint/>
  <Asteroids material={own.asteroid} materials={materials}/>
  <MeasuredSaturnPedestal materials={materials} planet={own.redSaturn} halo={own.halo}/>
  <ReferenceRedBumper kind="sling" materials={materials} halo={own.halo}/>
  <ReferenceRedBumper kind="support" materials={materials} halo={own.halo}/>
  <ForegroundAsteroid material={own.foregroundAsteroid} materials={materials}/>
  <LitTriangle position={[-7.03,.09,-5.63]} angle={-Math.PI/2} materials={materials} geometry={triangle} jewel={own.jewel} halo={own.halo}/>
  <LitTriangle position={[7.03,.09,-5.63]} angle={Math.PI/2} materials={materials} geometry={triangle} jewel={own.jewel} halo={own.halo}/>
  <LowerWarningWedges materials={materials} jewel={own.jewel} halo={own.halo}/>
 </group>;
}

export {ReferenceDecor};
