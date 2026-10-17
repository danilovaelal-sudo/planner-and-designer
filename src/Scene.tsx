import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FRONTS, WORKTOPS, typeOf } from './model';
import type { Cabinet, Material, Project } from './model';

function surface(m: Material, textures: THREE.Texture[]) {
  let map: THREE.CanvasTexture | undefined;
  if(m.wood || m.stone) {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=m.color;ctx.fillRect(0,0,128,512);
    let seed=17;const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
    for(let i=0;i<(m.wood?160:850);i++) {
      ctx.strokeStyle=`rgba(${m.wood?'71,45,21':'82,75,60'},${m.wood?random()*.14:random()*.075})`;ctx.lineWidth=m.wood?.3+random()*1.5:.3;
      ctx.beginPath();const x=random()*128,y=random()*512;ctx.moveTo(x,y);
      ctx.bezierCurveTo(x+random()*8,y+30,x-random()*10,y+70,x+random()*5,y+(m.wood?150:10));ctx.stroke();
    }
    map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;textures.push(map);
  }
  return new THREE.MeshStandardMaterial({color:map?'#ffffff':m.color,map,roughness:m.wood?.68:.77});
}

function populate(scene:THREE.Scene,project:Project,selected:string|null,textures:THREE.Texture[]) {
  const root=new THREE.Group();scene.add(root);
  const w=project.room.width/1000,d=project.room.depth/1000,h=project.room.height/1000;
  const offset=new THREE.Vector3(-w/2,0,-d/2);
  const wallColor={cream:'#e8e5dc',white:'#f4f2ec',sand:'#d3c7b3'}[project.finishes.wall];
  const wallMat=new THREE.MeshStandardMaterial({color:wallColor,roughness:.95});
  const white=new THREE.MeshStandardMaterial({color:'#e8e3d8',roughness:.75});
  const steel=new THREE.MeshStandardMaterial({color:'#a9aeaa',metalness:.7,roughness:.28});
  const dark=new THREE.MeshStandardMaterial({color:'#252d2b',roughness:.23,metalness:.2});
  const handle=new THREE.MeshStandardMaterial({color:project.finishes.handle==='brass'?'#b19764':'#333934',metalness:.65,roughness:.35});
  const materials=new Map<string,THREE.Material>();
  for(const m of [...FRONTS,...WORKTOPS]) materials.set(m.id,surface(m,textures));
  const mesh=(parent:THREE.Object3D,width:number,height:number,depth:number,x:number,y:number,z:number,mat:THREE.Material)=>{
    const obj=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),mat);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;
  };
  mesh(root,w+.12,.07,d+.12,0,-.05,0,new THREE.MeshStandardMaterial({color:project.finishes.floor==='oak'?'#b69b79':'#c9c6bd',roughness:.9}));
  if(project.finishes.floor==='oak') {
    for(let x=-w/2;x<w/2;x+=.18) {
      const board=mesh(root,.177,.004,d,x+.09,-.012,0,new THREE.MeshStandardMaterial({color:new THREE.Color('#bda282').multiplyScalar(.94+((Math.round((x+w/2)*100)%7)/65)),roughness:.88}));board.castShadow=false;
      for(let z=-d/2+.5+(Math.round(x*100)%3)*.25;z<d/2;z+=1.2) mesh(root,.175,.005,.002,x+.09,-.008,z,new THREE.MeshStandardMaterial({color:'#a58b6b'}));
    }
  } else {
    for(let x=-w/2;x<w/2;x+=.6) mesh(root,.004,.003,d,x,-.008,0,new THREE.MeshStandardMaterial({color:'#b3b0a8'}));
    for(let z=-d/2;z<d/2;z+=.6) mesh(root,w,.003,.004,0,-.008,z,new THREE.MeshStandardMaterial({color:'#b3b0a8'}));
  }
  mesh(root,w+.10,h,.08,0,h/2,-d/2-.05,wallMat);
  if(project.room.window) {
    const start=project.room.windowOffset/1000,end=start+project.room.windowWidth/1000;
    mesh(root,.08,1.15,d,w/2+.05,.575,0,wallMat);
    mesh(root,.08,Math.max(.1,h-2.35),d,w/2+.05,(h+2.35)/2,0,wallMat);
    if(start>0) mesh(root,.08,1.2,start,w/2+.05,1.75,-d/2+start/2,wallMat);
    if(end<d) mesh(root,.08,1.2,d-end,w/2+.05,1.75,-d/2+(end+d)/2,wallMat);
    const glass=new THREE.MeshBasicMaterial({color:'#d9e6e3'});
    mesh(root,.022,1.2,end-start,w/2+.05,1.75,-d/2+(start+end)/2,glass);
    for(const z of [start,(start+end)/2,end]) mesh(root,.10,1.26,.035,w/2+.025,1.75,-d/2+z,white);
    for(const y of [1.14,2.36]) mesh(root,.1,.04,end-start,w/2+.025,y,-d/2+(start+end)/2,white);
    mesh(root,.20,.04,end-start+.1,w/2-.03,1.13,-d/2+(start+end)/2,white);
  } else mesh(root,.08,h,d,w/2+.05,h/2,0,wallMat);
  // A tiled splashback gives the kitchen scale without relying on external images.
  mesh(root,w,.53,.012,0,1.18,-d/2+.005,new THREE.MeshStandardMaterial({color:'#ddd9cc',roughness:.85}));
  const grout=new THREE.MeshStandardMaterial({color:'#c9c5b9',roughness:1});
  for(let x=-w/2;x<w/2;x+=.3) mesh(root,.002,.53,.014,x,1.18,-d/2+.012,grout);
  for(const y of [1.05,1.2,1.35]) mesh(root,w,.002,.014,0,y,-d/2+.012,grout);
  for(const c of project.cabinets) {
    const t=typeOf(c.kind),cw=c.width/1000,cd=t.depth/1000,ch=t.height/1000;
    const group=new THREE.Group();group.position.copy(offset).add(new THREE.Vector3(c.x/1000,t.elevation/1000,c.z/1000));group.rotation.y=c.rotation*Math.PI/180;group.userData.cabinetId=c.id;root.add(group);
    const front=materials.get(c.front || (t.category==='wall'?project.finishes.upper:project.finishes.lower))!;
    const plinth=t.category==='wall'?0:.10;
    mesh(group,cw-.015,ch-plinth,cd-.02,0,(ch+plinth)/2,0,white);
    if(t.category!=='wall') mesh(group,cw-.018,.095,cd-.10,0,.05,-.04,new THREE.MeshStandardMaterial({color:'#686c5f',roughness:.8}));
    const addHandle=(x:number,y:number,horizontal=true)=>{
      if(project.finishes.handle==='none') return;
      mesh(group,horizontal?Math.min(.16,cw*.45):.012,horizontal?.012:.16,.021,x,y,cd/2+.027,handle);
    };
    const door=(x:number,y:number,width:number,height:number)=>{mesh(group,width,height,.022,x,y,cd/2,front);};
    if(c.kind==='open') {
      mesh(group,cw-.018,ch,.018,0,ch/2,-cd/2+.012,front);
      for(const y of [.014,ch/2,ch-.014]) mesh(group,cw,.024,cd,0,y,0,front);
      for(const x of [-cw/2+.012,cw/2-.012]) mesh(group,.024,ch,cd,x,ch/2,0,front);
    } else if(c.kind==='oven') {
      door(0,.19,cw-.008,.17);
      mesh(group,cw-.04,.59,.035,0,.58,cd/2+.008,dark);
      mesh(group,cw-.095,.40,.006,0,.55,cd/2+.03,new THREE.MeshStandardMaterial({color:'#182322',roughness:.08,metalness:.35}));
      mesh(group,cw-.075,.038,.025,0,.78,cd/2+.048,steel);
      mesh(group,cw-.06,.026,cd-.08,0,ch+.05,0,dark);
      for(const x of [-.15,.15]) for(const z of [-.12,.12]) {
        const ring=new THREE.Mesh(new THREE.RingGeometry(.067,.071,32),new THREE.MeshBasicMaterial({color:'#78847c',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,ch+.064,z);group.add(ring);
      }
    } else if(c.kind==='drawers') {
      for(let i=0;i<3;i++){const dh=(ch-plinth)/3;door(0,plinth+dh*(i+.5),cw-.008,dh-.007);addHandle(0,plinth+dh*(i+1)-.055);}
    } else if(c.kind==='fridge'||c.kind==='pantry') {
      const split=c.kind==='fridge'?.72:1.1;
      door(0,plinth+(split-plinth)/2,cw-.008,split-plinth-.008);door(0,split+(ch-split)/2,cw-.008,ch-split-.008);
      const hx=c.hinge==='left'?cw/2-.055:-cw/2+.055;addHandle(hx,split-.12,false);addHandle(hx,split+.14,false);
    } else if(c.kind==='glass') {
      const glass=new THREE.MeshStandardMaterial({color:'#758579',transparent:true,opacity:.65,roughness:.15,metalness:.1});
      mesh(group,cw-.045,ch-.04,.025,0,ch/2,cd/2,glass);
      for(const x of [-cw/2+.025,cw/2-.025]) mesh(group,.04,ch,.03,x,ch/2,cd/2+.012,front);
      for(const y of [.02,ch-.02]) mesh(group,cw,.04,.03,0,y,cd/2+.012,front);
      addHandle(cw/2-.07,.11,false);
    } else {
      const count=cw>.65?2:1;
      for(let i=0;i<count;i++) {
        const dw=cw/count;const x=-cw/2+dw*(i+.5);door(x,(ch+plinth)/2,dw-.006,ch-plinth-.006);
        addHandle(count===2?x+(i===0?1:-1)*(dw/2-.055):x+(c.hinge==='left'?1:-1)*(dw/2-.055),t.category==='wall'?.13:ch-.11,false);
      }
    }
    if(t.category==='base') {
      const thick=project.finishes.worktop==='darkstone'?.012:project.finishes.worktop==='marble'?.020:.038;
      mesh(group,cw,thick,cd+.035,0,ch+thick/2,.008,materials.get(project.finishes.worktop)!);
      if(c.kind==='sink') {
        mesh(group,Math.min(cw-.12,.52),.014,.38,0,ch+thick+.006,0,steel);
        mesh(group,Math.min(cw-.16,.46),.009,.32,0,ch+thick+.014,0,new THREE.MeshStandardMaterial({color:'#66746f',metalness:.8,roughness:.25}));
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,ch+thick,-.24),new THREE.Vector3(0,ch+.30,-.24),new THREE.Vector3(0,ch+.36,-.13),new THREE.Vector3(0,ch+.27,-.05)]);
        const tap=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.012,8,false),steel);group.add(tap);
      }
    }
    if(c.id===selected) {
      const geo=new THREE.BoxGeometry(cw+.018,ch+.018,cd+.018);
      const line=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:'#a5543b',transparent:true,opacity:.9}));line.position.y=ch/2;group.add(line);geo.dispose();
    }
  }
  return root;
}

export default function Scene({project,selected,onSelect,resetKey,onReady}:{project:Project;selected:string|null;onSelect:(id:string|null)=>void;resetKey:number;onReady:(canvas:HTMLCanvasElement|null)=>void}) {
  const host=useRef<HTMLDivElement>(null);
  const rendererRef=useRef<THREE.WebGLRenderer|null>(null);
  const cameraRef=useRef<THREE.PerspectiveCamera|null>(null);
  const sceneRef=useRef<THREE.Scene|null>(null);
  const controlsRef=useRef<OrbitControls|null>(null);
  const clickRef=useRef(onSelect);clickRef.current=onSelect;
  const readyRef=useRef(onReady);readyRef.current=onReady;
  const [failed,setFailed]=useState(false);
  const initRoom=useRef(project.room);
  useEffect(()=>{
    const el=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch{setFailed(true);return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    el.appendChild(renderer.domElement);rendererRef.current=renderer;readyRef.current(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#eeece6');sceneRef.current=scene;
    const camera=new THREE.PerspectiveCamera(37,1,.01,80);cameraRef.current=camera;
    const controls=new OrbitControls(camera,renderer.domElement);controlsRef.current=controls;controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI/2-.025;controls.minDistance=2;controls.maxDistance=18;
    const s=Math.max(initRoom.current.width,initRoom.current.depth)/1000;
    camera.position.set(-s*1.08,s*.87,s*1.25);controls.target.set(0,.95,0);controls.update();
    scene.add(new THREE.HemisphereLight('#fff9ec','#858a76',2.4));
    const sun=new THREE.DirectionalLight('#fff7e8',3.4);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
    const fill=new THREE.DirectionalLight('#edf5f5',1.4);fill.position.set(4,3,-1);scene.add(fill);
    const resize=new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.zoom=Math.min(1,camera.aspect/1.25);camera.updateProjectionMatrix();}});resize.observe(el);
    const raycaster=new THREE.Raycaster();let down={x:0,y:0};
    const pointerdown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pointerup=(e:PointerEvent)=>{
      if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5) return;
      const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const hits=raycaster.intersectObjects(scene.children,true);
      for(const hit of hits){let obj:THREE.Object3D|null=hit.object;while(obj){if(obj.userData.cabinetId){clickRef.current(obj.userData.cabinetId);return;}obj=obj.parent;}}
      clickRef.current(null);
    };
    renderer.domElement.addEventListener('pointerdown',pointerdown);renderer.domElement.addEventListener('pointerup',pointerup);
    renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
    return()=>{resize.disconnect();renderer.setAnimationLoop(null);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerdown);renderer.domElement.removeEventListener('pointerup',pointerup);renderer.dispose();renderer.domElement.remove();readyRef.current(null);rendererRef.current=null;sceneRef.current=null;};
  },[]);
  useEffect(()=>{
    if(!sceneRef.current) return;const textures:THREE.Texture[]=[];const scene=sceneRef.current;const root=populate(scene,project,selected,textures);
    return()=>{scene.remove(root);const materials=new Set<THREE.Material>();root.traverse(obj=>{if(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments){obj.geometry.dispose();if(Array.isArray(obj.material))obj.material.forEach(m=>materials.add(m));else materials.add(obj.material);}});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
  },[project,selected]);
  useEffect(()=>{const camera=cameraRef.current,controls=controlsRef.current;if(!camera||!controls)return;const s=Math.max(project.room.width,project.room.depth)/1000;camera.position.set(-s*1.08,s*.87,s*1.25);controls.target.set(0,.95,0);controls.update();},[resetKey,project.room.width,project.room.depth]);
  return <div ref={host} className="scene-host" aria-label="Интерактивная 3D-модель кухни">{failed&&<div className="scene-error"><strong>3D недоступен в этом браузере</strong><p>Используйте вид «План 2D» или включите аппаратное ускорение.</p></div>}</div>;
}
