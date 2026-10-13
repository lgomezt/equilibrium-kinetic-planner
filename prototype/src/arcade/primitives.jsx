import React,{useEffect,useMemo,useRef} from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {ballRadius} from './paths.js';
const NO_JUNCTIONS=Object.freeze([]);
const mergeSamples=new WeakMap();
function sampleMergeCurve(curve) {
 if(!mergeSamples.has(curve)) {
  const steps=Math.max(80,Math.ceil(curve.getLength()*50));
  mergeSamples.set(curve,Array.from({length:steps+1},(_,i)=>curve.getPointAt(i/steps)));
 }
 return mergeSamples.get(curve);
}

export function Bevel({size,radius=.04,material,...props}) {
 return <RoundedBox args={size} radius={Math.min(radius,...size.map(value=>value*.45))} smoothness={2} material={material} castShadow receiveShadow {...props}/>;
}

export function Screw({position,materials,scale=1}) {
 return <group position={position} scale={scale}>
  <mesh material={materials.brushed} castShadow><cylinderGeometry args={[.07,.08,.026,16]}/></mesh>
  <mesh position={[0,.02,0]} rotation={[-Math.PI/2,0,.5]} material={materials.chrome}><circleGeometry args={[.053,16]}/></mesh>
  <mesh position={[0,.023,0]} rotation={[-Math.PI/2,0,.5]} material={materials.navy}><planeGeometry args={[.066,.012]}/></mesh>
 </group>;
}

export function Rod({from,to,radius=.05,material}) {
 const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
 const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
 return <mesh position={a.add(b).multiplyScalar(.5)} quaternion={quaternion} material={material} castShadow receiveShadow><cylinderGeometry args={[radius,radius,delta.length(),16]}/></mesh>;
}

export function Tube({curve,radius=.045,material,segments,capEnds=false}) {
 const divisions=segments??Math.min(360,Math.max(16,Math.ceil(curve.getLength()*6)));
 const geometry=useMemo(()=>new THREE.TubeGeometry(curve,divisions,radius,8,false),[curve,radius,divisions]);
 const caps=useMemo(()=>capEnds?[0,1].map(u=>({position:curve.getPointAt(u),quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),curve.getTangentAt(u).multiplyScalar(u?1:-1))})):[],[curve,capEnds]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const tube=<mesh geometry={geometry} material={material} castShadow receiveShadow/>;
 return capEnds?<group>{tube}{caps.map(({position,quaternion},index)=><mesh key={index} position={position} quaternion={quaternion} material={material} castShadow receiveShadow><circleGeometry args={[radius,16]}/></mesh>)}</group>:tube;
}

function RailStanchion({floor,top,width,materials}) {
 const steel=useMemo(()=>new THREE.MeshStandardMaterial({color:'#414951',metalness:.82,roughness:.32,envMapIntensity:.9}),[]);
 useEffect(()=>()=>steel.dispose(),[steel]);
 const height=top-floor,base=Math.min(.18,height*.25),cap=Math.min(.13,height*.20);
 return <group name="turned-steel-rail-stanchion">
  <Bevel position={[0,top,0]} size={[.27,.06,width+.18]} radius={.023} material={materials.brushed}/>
  <Rod from={[0,floor+base*.72,0]} to={[0,top-cap*.55,0]} radius={.12} material={steel}/>
  <mesh position={[0,floor+base*.18,0]} material={materials.bronze??materials.gold} castShadow receiveShadow><cylinderGeometry args={[.225,.24,base*.36,32]}/></mesh>
  <mesh position={[0,floor+base*.48,0]} material={materials.brushed} castShadow receiveShadow><cylinderGeometry args={[.195,.215,base*.25,32]}/></mesh>
  <mesh position={[0,floor+base*.78,0]} material={materials.bronze??materials.gold} castShadow receiveShadow><cylinderGeometry args={[.155,.177,base*.35,32]}/></mesh>
  <mesh position={[0,floor+base*.94,0]} rotation={[Math.PI/2,0,0]} material={materials.chrome} receiveShadow><torusGeometry args={[.147,.014,8,32]}/></mesh>
  <mesh position={[0,top-cap*.55,0]} material={materials.bronze??materials.gold} castShadow receiveShadow><cylinderGeometry args={[.17,.145,cap*.85,32]}/></mesh>
  <mesh position={[0,top-cap*.92,0]} rotation={[Math.PI/2,0,0]} material={materials.chrome} receiveShadow><torusGeometry args={[.145,.012,8,32]}/></mesh>
  <mesh position={[0,top-cap*.15,0]} material={materials.brushed} castShadow receiveShadow><cylinderGeometry args={[.185,.178,cap*.22,32]}/></mesh>
  <Screw position={[0,top+.04,width/2]} scale={.65} materials={materials}/>
 </group>;
}

export function Rail({curve,materials,width=.72,endWidth=width,supports=6,supportProgress=null,supportSpecs=null,supportPosition=null,supportTop=null,floor=.08,glass=false,lit=supports>3,lampSide=0,lampSpecs=null,junctions=NO_JUNCTIONS,junctionZ=-3.35,junctionSide=0,junctionRadius=.38,junctionZRadius=width*.9,mergeCurves=null,mergeBedCurves=null,mergeRange=null,guideStart=0,guideEnd=0,bedEnd=0,bedRollEnd=guideEnd,bedOffset=ballRadius+.003,bedProfile=null,bedFinishMaterial=null,wallDepth=.23,wallNormalBend=1,layered=false}) {
 const depthAt=point=>typeof wallDepth==='function'?wallDepth(point):wallDepth;
 const {bed,edges,walls,lowerEdges,inlays}=useMemo(()=>{
  const positions=[],indices=[],uvs=[],bedGroups=[],edgePoints=[[],[]],length=curve.getLength();
  const crossSections=glass?2:11;
  const mergeBedPoints=mergeBedCurves?.flatMap(sampleMergeCurve);
  const divisions=Math.min(1400,Math.max(180,Math.ceil(length*24)));
  // A vertical drop inherits the side direction of its forward bend. Keeping
  // that direction continuous prevents the two guides from crossing the chute.
  const previousNormal=new THREE.Vector3(1,0,0);
  for(let i=0;i<=divisions;i++) {
   const tangent=curve.getTangentAt(i/divisions),candidate=new THREE.Vector3(-tangent.z,0,tangent.x);
   if(candidate.lengthSq()>1e-8){previousNormal.copy(candidate).normalize();break;}
  }
  for(let i=0;i<=divisions;i++) {
   const u=i/divisions,p=curve.getPointAt(u),t=curve.getTangentAt(u),normal=new THREE.Vector3(-t.z,0,t.x);
   const taper=Math.max(0,Math.min(1,(u-.25)/.75));
   const localWidth=width+(endWidth-width)*(taper*taper*(3-2*taper));
   if(normal.lengthSq()<1e-8)normal.copy(previousNormal);else {normal.normalize();previousNormal.copy(normal);}
   const bedDirection=new THREE.Vector3().crossVectors(t,normal).normalize();
   const smooth=(start,end,value)=>{const q=THREE.MathUtils.clamp((value-start)/(end-start),0,1);return q*q*(3-2*q);};
   let roll=1;
   // Joining rails need a flush floor: a raised shoulder across an incoming
   // centreline would obstruct the ball even though its guide is cut away.
   if(guideStart)roll=Math.min(roll,smooth(guideStart+.1,guideStart+.45,u*length));
   if(bedRollEnd)roll=Math.min(roll,smooth(bedRollEnd+.1,bedRollEnd+.45,(1-u)*length));
   for(const x of junctions) {
    const z=typeof junctionZ==='function'?junctionZ(x):junctionZ;
    if(Math.abs(p.z-z)<width*1.5)roll=Math.min(roll,smooth(junctionRadius+.17,junctionRadius+.47,Math.abs(p.x-x)));
   }
   const profile=bedProfile?.(u,length,{width:localWidth,roll});
   const floorWidth=profile?.width??localWidth;
   const floorRoll=profile?.roll??roll;
   for(const [index,side] of [-1,1].entries()) {
    const edge=p.clone().addScaledVector(normal,side*localWidth/2);
    edgePoints[index].push(edge.clone().addScaledVector(bedDirection,.055));
   }
   // A shallow rolled gutter gives the polished metal a changing surface
   // normal across its width. Its centre stays on the verified marble bed;
   // the rounded shoulders meet the retaining walls outside the ball radius.
   for(let column=0;column<crossSections;column++) {
    const side=column/(crossSections-1)*2-1;
    const rise=glass?0:floorRoll*(.085*side*side+.015*side**4);
    const offset=typeof bedOffset==='function'?bedOffset(u):bedOffset;
    const surface=p.clone().addScaledVector(normal,side*floorWidth/2).addScaledVector(bedDirection,offset-rise);
    // Form a continuous junction floor below both adjoining corridors.
    // This changes the solid mesh rather than hiding a colliding overlap.
    if(mergeBedPoints)for(const p of mergeBedPoints) {
     const d2=(surface.x-p.x)**2+(surface.z-p.z)**2;
     const radius=ballRadius+.005;
     if(d2<radius*radius)surface.y=Math.min(surface.y,p.y-Math.sqrt(radius*radius-d2));
    }
    positions.push(surface.x,surface.y,surface.z);uvs.push(column/(crossSections-1),u*length);
   }
   if(i<divisions&&(1-(i+1)/divisions)*length>=bedEnd){
    const start=indices.length;
    for(let column=0;column<crossSections-1;column++) {
     const a=i*crossSections+column,b=a+crossSections;indices.push(a,a+1,b,a+1,b+1,b);
    }
    if(bedFinishMaterial){
     const materialIndex=profile?.finish?1:0,last=bedGroups.at(-1),count=indices.length-start;
     if(last&&last.materialIndex===materialIndex)last.count+=count;
     else bedGroups.push({start,count,materialIndex});
    }
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  bedGroups.forEach(({start,count,materialIndex})=>geometry.addGroup(start,count,materialIndex));
  const guideCurves=[];
  const ownSamples=sampleMergeCurve(curve);
  // Logical routes can reuse this very collector. Do not mistake a shared
  // centerline for a crossing gutter and remove its entire outside boundary.
  const followsThisRail=p=>{
   for(let i=1;i<ownSamples.length;i++){
    const a=ownSamples[i-1],b=ownSamples[i];
    if(p.x<Math.min(a.x,b.x)-.005||p.x>Math.max(a.x,b.x)+.005||p.y<Math.min(a.y,b.y)-.005||p.y>Math.max(a.y,b.y)+.005||p.z<Math.min(a.z,b.z)-.005||p.z>Math.max(a.z,b.z)+.005)continue;
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,lengthSq=dx*dx+dy*dy+dz*dz;
    const q=THREE.MathUtils.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/Math.max(lengthSq,1e-12),0,1);
    if((p.x-a.x-q*dx)**2+(p.y-a.y-q*dy)**2+(p.z-a.z-q*dz)**2<.005**2)return true;
   }
   return false;
  };
  const mergePoints=mergeCurves?.flatMap(sampleMergeCurve).filter(p=>!followsThisRail(p));
  // Trim interior walls to the adjoining gutter footprint, not just the
  // narrower marble corridor. The following collector turn stays protected.
  const crossesMerge=(point,u)=>{
   if(!mergePoints||(mergeRange&&(u<mergeRange[0]||u>mergeRange[1])))return false;
   const bottom=point.y-depthAt(point),top=point.y+.08,clearance=Math.max(width,endWidth)/2;
   return mergePoints.some(p=>{
    const dx=p.x-point.x,dz=p.z-point.z;
    if(Math.abs(dx)>clearance||Math.abs(dz)>clearance)return false;
    const dy=p.y<bottom?bottom-p.y:p.y>top?p.y-top:0;
    return dx*dx+dz*dz+dy*dy<clearance*clearance;
   });
  };
  for(const [side,points] of edgePoints.entries()) {
   let run=[];
   for(const [index,point] of points.entries()) {
    // An incoming or outgoing branch needs an opening in its retaining guide.
    const open=index/divisions*length<guideStart||(1-index/divisions)*length<guideEnd||crossesMerge(point,index/divisions)||(!mergeCurves&&side===junctionSide&&junctions.some(x=>{
     const z=typeof junctionZ==='function'?junctionZ(x):junctionZ;
     return Math.abs(point.x-x)<junctionRadius&&Math.abs(point.z-z)<junctionZRadius;
    }));
    if(open){if(run.length>2)guideCurves.push(new THREE.CatmullRomCurve3(run));run=[];}
    else run.push(point);
   }
   if(run.length>2)guideCurves.push(new THREE.CatmullRomCurve3(run));
  }
  const wallGeometries=guideCurves.map(edge=>{
   // The four normal rows lie on the original planar side faces. Only the
   // reflected profile changes; all longitudinal samples and solid bounds stay.
   const rows=[[0,-.46],[.28,-.08],[.68,.22],[1,.58]],stride=rows.length*2+4;
   const vertices=[],faces=[],wallUVs=[],sideNormals=[],edgeLength=edge.getLength();
   for(let i=0;i<=120;i++){
    const p=edge.getPointAt(i/120),t=edge.getTangentAt(i/120),n=new THREE.Vector3(-t.z,0,t.x).normalize(),depth=depthAt(p);
    for(const [height,rowAngle]of rows)for(const side of [-1,1]){
     const angle=rowAngle*wallNormalBend;
     const q=p.clone().addScaledVector(n,side*.018);
     vertices.push(q.x,p.y-depth+height*(depth+.065),q.z);
     wallUVs.push(i/120*edgeLength,height);
     sideNormals.push([vertices.length/3-1,n.x*side*Math.cos(angle),Math.sin(angle),n.z*side*Math.cos(angle)]);
    }
    // Separate top/bottom vertices keep their true surface normals independent
    // of the shallow formed-face shading underneath the existing rolled rims.
    for(const [side,height]of[[-1,.065],[1,.065],[-1,-depth],[1,-depth]]){
     const q=p.clone().addScaledVector(n,side*.018);vertices.push(q.x,q.y+height,q.z);
     wallUVs.push(i/120*edgeLength,(height+depth)/(depth+.065));
    }
    if(i<120){
     const a=i*stride,b=a+stride,cap=rows.length*2;
     for(let j=0;j<rows.length-1;j++){
      const low=a+j*2,next=low+stride;
      faces.push(low+2,next+2,low,low,next+2,next,low+3,low+1,next+3,low+1,next+1,next+3);
     }
     faces.push(a+cap,a+cap+1,b+cap,a+cap+1,b+cap+1,b+cap,
      a+cap+2,b+cap+2,a+cap+3,a+cap+3,b+cap+2,b+cap+3);
    }
   }
   if(mergeCurves)for(const end of [0,120]){
    const base=vertices.length/3,source=end*stride+rows.length*2;
    for(let j=0;j<4;j++){vertices.push(...vertices.slice((source+j)*3,(source+j)*3+3));wallUVs.push(...wallUVs.slice((source+j)*2,(source+j)*2+2));}
    if(end===0)faces.push(base,base+2,base+1,base+1,base+2,base+3);
    else faces.push(base,base+1,base+2,base+1,base+3,base+2);
   }
   const shell=new THREE.BufferGeometry();shell.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));shell.setAttribute('uv',new THREE.Float32BufferAttribute(wallUVs,2));shell.setIndex(faces);shell.computeVertexNormals();
   const normals=shell.getAttribute('normal');
   sideNormals.forEach(([index,x,y,z])=>normals.setXYZ(index,x,y,z));
   return shell;
  });
  const shiftedEdges=(depth)=>guideCurves.map(edge=>new THREE.CatmullRomCurve3(
   Array.from({length:181},(_,i)=>{const p=edge.getPointAt(i/180);return p.add(new THREE.Vector3(0,-(typeof depth==='function'?depth(p):depth),0));})));
  return {bed:geometry,edges:guideCurves,walls:wallGeometries,
   lowerEdges:layered?shiftedEdges(p=>depthAt(p)-.025):[],inlays:layered?shiftedEdges(.125):[]};
 },[curve,width,endWidth,junctions,junctionZ,junctionSide,junctionRadius,junctionZRadius,mergeCurves,mergeBedCurves,mergeRange,guideStart,guideEnd,bedEnd,bedRollEnd,bedOffset,bedProfile,bedFinishMaterial,wallDepth,wallNormalBend,layered]);
 useEffect(()=>()=>{bed.dispose();walls.forEach(wall=>wall.dispose());},[bed,walls]);
 return <group name={glass?'transparent-return-channel':'supported-arcade-rail'}>
  <mesh geometry={bed} material={bedFinishMaterial?[materials.railBed??materials.channel,bedFinishMaterial]:(glass?materials.glass:(materials.railBed??materials.channel))} castShadow={!glass} receiveShadow/>
  {!glass&&walls.map((wall,i)=><mesh key={`wall-${i}`} geometry={wall} material={materials.railWall??materials.chrome} castShadow receiveShadow/>)}
  {edges.map((edge,i)=><Tube key={i} curve={edge} radius={glass?.025:.047} capEnds={!glass&&!!mergeCurves} material={glass?materials.chrome:materials.chrome}/>)}
  {lowerEdges.map((edge,i)=><Tube key={`lower-${i}`} curve={edge} radius={.034} capEnds={!!mergeCurves} material={materials.chrome}/>)}
  {inlays.map((edge,i)=><Tube key={`inlay-${i}`} curve={edge} radius={.018} capEnds={!!mergeCurves} material={materials.gold}/>)}
  {lit&&<RailLamps curve={curve} materials={materials} width={width} side={lampSide} specs={lampSpecs} junctions={junctions} junctionZ={junctionZ} junctionRadius={junctionRadius}/>}
  {Array.from({length:supportSpecs?.length??supportProgress?.length??supports},(_,i)=>{
   const spec=supportSpecs?.[i],u=spec?.u??supportProgress?.[i]??((i+.4)/supports),p=curve.getPointAt(u),t=curve.getTangentAt(u),top=spec?.top??supportTop?.(p)??p.y-Math.max(.32,depthAt(p)+.08);
   if(top<=floor+.05)return null;
   const mount=spec?.mount?new THREE.Vector3(...spec.mount):supportPosition?new THREE.Vector3(...supportPosition(p)):p;
   return <group key={i} name={spec?.id?`reference-rail-support-${spec.id}`:undefined}>
    <group position={[mount.x,0,mount.z]} rotation={[0,-Math.atan2(t.z,t.x),0]}>
     <RailStanchion floor={floor} top={top} width={width} materials={materials}/>
    </group>
    {mount.distanceToSquared(p)>1e-8&&<>
     <Rod from={[mount.x,top,mount.z]} to={[p.x,top,p.z]} radius={.04} material={materials.brushed}/>
     <Rod from={[p.x,top,p.z]} to={[p.x,p.y-.30,p.z]} radius={.04} material={materials.brushed}/>
    </>}
   </group>;
  })}
 </group>;
}

function RailLamps({curve,materials,width,side=0,specs=null,junctions=NO_JUNCTIONS,junctionZ=0,junctionRadius=.38}) {
 const cores=useRef(),halos=useRef(),sockets=useRef();
 const count=specs?.length??Math.max(3,Math.round(curve.getLength()/1.75));
 const sphere=useMemo(()=>new THREE.SphereGeometry(.066,12,8),[]);
 const plane=useMemo(()=>new THREE.PlaneGeometry(.57,.57),[]);
 const socket=useMemo(()=>new THREE.CylinderGeometry(.091,.11,.065,12),[]);
 useEffect(()=>()=>{sphere.dispose();plane.dispose();socket.dispose();},[sphere,plane,socket]);
 useEffect(()=>{
  const object=new THREE.Object3D();
  for(let i=0;i<count;i++){
   const spec=specs?.[i],u=spec?.u??(i+.5)/count,p=curve.getPointAt(u),t=curve.getTangentAt(u),n=new THREE.Vector3(-t.z,0,t.x);
   if(n.lengthSq()<1e-8)n.set(1,0,0);else n.normalize();
   let mountingSide=spec?.side??(side || (i%2?-1:1));
   // Keep light housings out of the actual incoming branch aperture.
   if(mountingSide<0&&junctions.some(x=>Math.abs(p.x-x)<junctionRadius+.30&&
    Math.abs(p.z-(typeof junctionZ==='function'?junctionZ(x):junctionZ))<width*1.5))mountingSide=1;
   p.addScaledVector(n,mountingSide*(width/2+.070));p.y+=spec?.yOffset??-.17;
   object.position.copy(p);object.rotation.set(0,0,0);object.updateMatrix();cores.current.setMatrixAt(i,object.matrix);
   object.position.y-=.06;object.updateMatrix();sockets.current.setMatrixAt(i,object.matrix);
   object.position.copy(p);object.position.y+=.012;object.rotation.set(-Math.PI/2,0,0);object.updateMatrix();halos.current.setMatrixAt(i,object.matrix);
  }
  [cores.current,halos.current,sockets.current].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;});
 },[curve,width,count,side,specs,junctions,junctionZ,junctionRadius]);
 return <group name="warm-chrome-channel-lamps">
  <instancedMesh ref={cores} args={[sphere,materials.amber,count]} frustumCulled={false}/>
  <instancedMesh ref={sockets} args={[socket,materials.gold,count]} frustumCulled={false}/>
  <instancedMesh ref={halos} args={[plane,materials.bulbHalo,count]} frustumCulled={false} renderOrder={3}/>
 </group>;
}

export function EightPointStar({radius=.65,depth=.05,material,...props}) {
 const geometry=useMemo(()=>{
  const shape=new THREE.Shape();
  for(let i=0;i<16;i++){
   const a=Math.PI/2+i*Math.PI/8,r=i%2?radius*.33:radius*(i%4===0?1:.73),x=Math.cos(a)*r,y=Math.sin(a)*r;
   if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2});
 },[radius,depth]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} material={material} castShadow {...props}/>;
}
