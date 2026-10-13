import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectionReadiness,readOverlayProjection} from '../src/arcade/projection-readiness.js';
const size={width:1212,height:1280};
function fixture({transformed=true,width=1212,height=1280,content=true}={}) {
 const objectLayer={style:{transform:transformed?'translate(-50%,-50%)matrix3d(object)':''},firstElementChild:{hasChildNodes:()=>content,getBoundingClientRect:()=>({x:330,y:219,width:600,height:250})}};
 const root={style:{width:`${width}px`,height:`${height}px`},firstElementChild:{style:{transform:transformed?'translateZ(900px)matrix3d(camera)':''},firstElementChild:objectLayer}};
 return {root,container:{querySelectorAll:()=>[root]}};
}
test('nonzero top-left HTML boxes are not ready before both projection layers are transformed',()=>{
 const {container,root}=fixture({transformed:false});
 assert.equal(readOverlayProjection(container,1,size),null);
 root.firstElementChild.style.transform='matrix3d(camera)';
 assert.equal(readOverlayProjection(container,1,size),null);
 root.firstElementChild.firstElementChild.style.transform='matrix3d(object)';
 assert.notEqual(readOverlayProjection(container,1,size),null);
});
test('all separate HTML roots must commit and use the current canvas viewport',()=>{
 assert.equal(readOverlayProjection(fixture().container,2,size),null);
 assert.equal(readOverlayProjection(fixture({content:false}).container,1,size),null);
 assert.equal(readOverlayProjection(fixture({width:1000}).container,1,size),null);
 assert.equal(readOverlayProjection(fixture({height:900}).container,1,size),null);
 assert.equal(readOverlayProjection(fixture().container,1,size,false),null);
});
test('readiness requires two consecutive valid completed-frame samples and resets on resize',()=>{
 const tracker=createProjectionReadiness(),{container}=fixture(),signature=readOverlayProjection(container,1,size);
 assert.equal(tracker.observe(null),false);
 assert.equal(tracker.observe(signature),false);
 assert.equal(tracker.observe(signature),true);
 tracker.reset();
 assert.equal(tracker.observe(signature),false);
 assert.equal(tracker.observe(null),false);
 assert.equal(tracker.observe(signature),false);
 assert.equal(tracker.observe(signature),true);
});
test('camera or content layout changes must settle again before readiness',()=>{
 const tracker=createProjectionReadiness(),{container,root}=fixture();
 assert.equal(tracker.observe(readOverlayProjection(container,1,size)),false);
 root.firstElementChild.style.transform='matrix3d(new-camera)';
 assert.equal(tracker.observe(readOverlayProjection(container,1,size)),false);
 assert.equal(tracker.observe(readOverlayProjection(container,1,size)),true);
});
