import {useEffect, useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import playfieldUrl from './assets/playfield.svg';
import referenceUrl from './assets/reference-playfield.svg';
import woodUrl from './assets/wood-grain.svg';

/** Local HDR studio: finite softboxes and small arcade lamps supply reflected
 * detail, while restrained room bounce preserves dark polished metal faces. */
export function createStudioEnvironment(polished=false,sphere=false) {
 const width=512,height=256,data=new Float32Array(width*height*4);
 const normalize=direction=>{const length=Math.hypot(...direction);return direction.map(value=>value/length);};
 const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const smooth=(start,end,value)=>{const t=THREE.MathUtils.clamp((value-start)/(end-start),0,1);return t*t*(3-2*t);};
 const lobes=sphere?[
  {direction:[-.30,1,.30],spread:.40,color:[.10,.14,.18]},
  {direction:[0,-.62,.78],spread:.70,color:[.035,.045,.060]},
  {direction:[-.80,.20,.35],spread:.08,color:[.07,.13,.19]},
 ]:[
  {direction:polished?[-.45,.75,.50]:[-.45,.9,-.25],spread:.035,color:[1.2,1.08,.94]},
  {direction:[0,-.62,.78],spread:.7,color:polished?[.285,.2679,.2394]:[.45,.423,.378]},
  {direction:[.9,.2,-.25],spread:.22,color:polished?[.176,.2105,.274]:[.22,.26,.34]},
  {direction:[-.85,.1,-.3],spread:.3,color:polished?[.2005,.1615,.1125]:[.25,.20,.14]},
  {direction:[-.72,.42,.55],spread:.0012,color:[5,3.8,2.2]},
  {direction:[.65,.3,.7],spread:.0012,color:[4.5,3.7,2.7]},
  {direction:[0,-.25,.96],spread:.0012,color:[3.5,3.5,3.5]},
 ];
 for(const lobe of lobes)lobe.direction=normalize(lobe.direction);
 const cards=sphere?[
  {direction:normalize([-.45,.90,-.25]),half:[.32,.22],edge:.10,color:[6.5,7.8,8.0]},
 ]:[
  {direction:normalize(polished?[-.45,.75,.5]:[-.45,.9,-.25]),half:[.20,.12],edge:.025,color:[3.3,3.15,2.8]},
  {direction:normalize([.9,.3,.3]),half:[.075,.30],edge:.02,color:[.8,.94,1.2]},
 ];
 for(const card of cards){card.right=normalize(cross([0,1,0],card.direction));card.up=cross(card.direction,card.right);}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const longitude=(x+.5)/width*Math.PI*2,latitude=(y+.5)/height*Math.PI;
  // DataTexture rows begin at texture v=0 (the bottom of the environment).
  const direction=[-Math.sin(latitude)*Math.cos(longitude),-Math.cos(latitude),-Math.sin(latitude)*Math.sin(longitude)];
  const color=sphere?[.012,.017,.025]:(polished?[.02235,.0277,.03795]:[.035,.042,.055]);
  for(const lobe of lobes){
   const weight=Math.exp((dot(direction,lobe.direction)-1)/lobe.spread);
   for(let channel=0;channel<3;channel++)color[channel]+=lobe.color[channel]*weight;
  }
  for(const card of cards){
   const forward=dot(direction,card.direction);if(forward<=0)continue;
   const u=Math.abs(dot(direction,card.right)/forward),v=Math.abs(dot(direction,card.up)/forward);
   const weight=(1-smooth(card.half[0]-card.edge,card.half[0]+card.edge,u))*(1-smooth(card.half[1]-card.edge,card.half[1]+card.edge,v));
   for(let channel=0;channel<3;channel++)color[channel]+=card.color[channel]*weight;
  }
  data.set([...color,1],(y*width+x)*4);
 }
 const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
 texture.mapping=THREE.EquirectangularReflectionMapping;
 texture.colorSpace=THREE.LinearSRGBColorSpace;
 texture.needsUpdate=true;return texture;
}

// One broad cool-white softbox for colored enamel; no pin-light lobes.
// Studio and polished-metal callers retain their original environment data.
export function createSphereEnvironment() {
 return createStudioEnvironment(false,true);
}

export function useArcadeMaterials(reference=false,environment=null) {
 const [playfield, wood] = useTexture([reference?referenceUrl:playfieldUrl, woodUrl]);
 // Preserve authored walnut grain while lifting its very dark printed base.
 const finishedWood=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=wood.image.width;canvas.height=wood.image.height;
  const context=canvas.getContext('2d');context.drawImage(wood.image,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4)for(let channel=0;channel<3;channel++)
   pixels.data[i+channel]=Math.round(255*Math.pow(pixels.data[i+channel]/255,.70));
  context.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.copy(wood.repeat);texture.anisotropy=8;return texture;
 },[wood]);
 useEffect(()=>()=>finishedWood.dispose(),[finishedWood]);
 const polishedRoom=useMemo(()=>createStudioEnvironment(true),[]);
 useEffect(()=>()=>polishedRoom.dispose(),[polishedRoom]);
 // Lift the printed lacquer's dark ink values locally; extra scene fill alone
 // cannot recover detail from the original near-black printed artwork.
 const printedPlayfield=useMemo(()=>{
  if(!reference)return playfield;
  const canvas=document.createElement('canvas');
  canvas.width=playfield.image.width;canvas.height=playfield.image.height;
  const context=canvas.getContext('2d');context.drawImage(playfield.image,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4)for(let channel=0;channel<3;channel++){
   const value=pixels.data[i+channel]/255;
   pixels.data[i+channel]=Math.round(255*Math.pow(value,.78)+(channel===0?12*(1-value):0));
  }
  context.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;return texture;
 },[playfield,reference]);
 useEffect(()=>()=>{if(printedPlayfield!==playfield)printedPlayfield.dispose();},[printedPlayfield,playfield]);
 const halo=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,2,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,219,1)');gradient.addColorStop(.17,'rgba(255,206,93,.88)');gradient.addColorStop(.46,'rgba(255,155,38,.32)');gradient.addColorStop(1,'rgba(255,112,10,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 },[]);
 // Fine directional variation keeps broad metal faces satin while leaving
 // the separately modelled rolled edges polished. It is deterministic and local.
 const metalGrain=useMemo(()=>{
  const side=128,data=new Uint8Array(side*side*4);
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
   const value=Math.round(221+9*Math.sin(y*1.73)+4*Math.sin(y*.37+x*.065));
   const i=(y*side+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,side,side,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(3,9);texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  texture.needsUpdate=true;return texture;
 },[]);
 const materials = useMemo(() => {
  for (const texture of [printedPlayfield, wood]) {
   texture.colorSpace = THREE.SRGBColorSpace;
   texture.anisotropy = 8;
  }
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  return {
   wood: new THREE.MeshPhysicalMaterial({map:finishedWood,color:'#bfa284',roughness:.44,clearcoat:.48,clearcoatRoughness:.22,specularIntensity:.45,envMapIntensity:.25}),
   navy: new THREE.MeshPhysicalMaterial({color:'#132b50',metalness:0,roughness:.55,specularIntensity:.12,envMapIntensity:.15}),
   playfield: new THREE.MeshPhysicalMaterial({map:printedPlayfield,roughness:.47,metalness:0,specularIntensity:.25,envMapIntensity:.18}),
   red: new THREE.MeshPhysicalMaterial({color:'#a81523',metalness:.04,roughness:.3,clearcoat:.3,clearcoatRoughness:.22,envMapIntensity:.38}),
   gold: new THREE.MeshPhysicalMaterial({color:'#b69862',metalness:.94,roughness:.31,roughnessMap:metalGrain,envMapIntensity:.85}),
   bronze: new THREE.MeshStandardMaterial({color:'#79634b',metalness:.9,roughness:.39,roughnessMap:metalGrain,envMapIntensity:.72}),
   chrome: new THREE.MeshPhysicalMaterial({envMap:polishedRoom,color:'#c6c2b9',metalness:.98,roughness:.08,envMapIntensity:1.3}),
   brushed: new THREE.MeshStandardMaterial({color:'#66635e',metalness:.88,roughness:.46,roughnessMap:metalGrain,envMapIntensity:.75}),
   channel: new THREE.MeshPhysicalMaterial({shadowSide:THREE.DoubleSide,color:'#a5a094',metalness:.97,roughness:.18,roughnessMap:metalGrain,envMapIntensity:1.15}),
   // Recessed steel bed has its own finish; doors and bright rolled lips retain theirs.
   railBed: new THREE.MeshPhysicalMaterial({envMap:environment,shadowSide:THREE.DoubleSide,color:'#788392',metalness:.98,roughness:.22,roughnessMap:metalGrain,envMapIntensity:1.05}),
   railWall: new THREE.MeshPhysicalMaterial({color:'#b4b0a7',metalness:.97,roughness:.19,roughnessMap:metalGrain,envMapIntensity:1.15}),
   ivory: new THREE.MeshPhysicalMaterial({color:'#e9c2aa',roughness:.42,clearcoat:.14,clearcoatRoughness:.3,envMapIntensity:.32}),
   // Explicit map is required: Three uses scene.environmentIntensity when envMap is null.
   purple: new THREE.MeshPhysicalMaterial({envMap:environment,color:'#7d2be5',metalness:0,roughness:.20,ior:1.46,specularIntensity:.95,clearcoat:.12,clearcoatRoughness:.16,envMapIntensity:.32}),
   amber: new THREE.MeshPhysicalMaterial({color:'#fff0a9',emissive:'#ffad28',emissiveIntensity:4.5,roughness:.16,clearcoat:1}),
   bulbHalo:new THREE.MeshBasicMaterial({map:halo,transparent:true,opacity:.82,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),
  };
 }, [printedPlayfield, finishedWood,wood,halo,metalGrain,polishedRoom,environment]);
 useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials]);
 useEffect(()=>()=>{halo.dispose();metalGrain.dispose();},[halo,metalGrain]);
 return materials;
}
