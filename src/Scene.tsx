import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FRONTS, WORKTOPS, bounds, isFiller, typeOf, worktopThickness } from './model';
import type { Material, Project } from './model';
import { WALLS, wallFrame, wallPanels } from './room';
import type { RoomSelection } from './room';
import { worktopLayout } from './construction';

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

function populate(scene:THREE.Scene,project:Project,selected:string|null,textures:THREE.Texture[],roomSelection:RoomSelection) {
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
  // Every wall is built from the same opening rectangles used by plan and elevations.
  for(const wall of WALLS){
    const f=wallFrame(project.room,wall),group=new THREE.Group();
    group.position.set(f.x/1000-w/2,0,f.z/1000-d/2);group.rotation.y=-f.angle*Math.PI/180;
    group.userData.cutawayWall=wall;group.userData.normal={x:f.nx,z:f.nz};group.userData.wall=wall;root.add(group);
    const mat=roomSelection?.kind==='wall'&&roomSelection.wall===wall?new THREE.MeshStandardMaterial({color:'#d9e0cd',roughness:.95}):wallMat;
    for(const panel of wallPanels(project.room,wall))mesh(group,panel.width/1000,panel.height/1000,f.thickness/1000,(panel.start+panel.width/2)/1000,(panel.bottom+panel.height/2)/1000,-f.thickness/2000,mat);
    if(wall==='A'||wall==='C'){
      const before=project.room.walls[wall==='A'?'D':'B'].thickness/1000,after=project.room.walls[wall==='A'?'B':'D'].thickness/1000;
      mesh(group,before,h,f.thickness/1000,-before/2,h/2,-f.thickness/2000,mat);
      mesh(group,after,h,f.thickness/1000,f.length/1000+after/2,h/2,-f.thickness/2000,mat);
    }
    // Low outlines keep the full room footprint visible in the cutaway view.
    const point=new THREE.Group();point.position.copy(group.position);point.rotation.copy(group.rotation);root.add(point);
    mesh(point,f.length/1000,.025,f.thickness/1000,f.length/2000,.0125,-f.thickness/2000,wallMat);
    for(const o of project.room.openings.filter(o=>o.wall===wall)){
      const opening=new THREE.Group();opening.userData.openingId=o.id;group.add(opening);
      const x=o.offset/1000,ow=o.width/1000,oh=o.height/1000,sy=o.sill/1000,th=f.thickness/1000;
      if(o.kind==='window'){
        const glass=new THREE.MeshStandardMaterial({color:'#c4dedc',transparent:true,opacity:.45,roughness:.12,metalness:.1});
        mesh(opening,ow,oh,.012,x+ow/2,sy+oh/2,-th/2,glass);
        for(const px of [x+.018,x+ow/2,x+ow-.018])mesh(opening,.035,oh,.06,px,sy+oh/2,-th/2,white);
        for(const y of [sy+.018,sy+oh-.018])mesh(opening,ow,.035,.06,x+ow/2,y,-th/2,white);
        mesh(opening,ow+.06,.035,th+.08,x+ow/2,sy-.018,-th/2+.025,white);
      }else{
        for(const px of [x+.02,x+ow-.02])mesh(opening,.04,oh,.065,px,oh/2,-th/2,white);
        mesh(opening,ow,.04,.065,x+ow/2,oh-.02,-th/2,white);
        const leaf=new THREE.Group();leaf.position.set(o.hinge==='left'?x:x+ow,0,o.swing==='in'?0:-th);
        const direction=o.hinge==='left'?1:-1,inside=o.swing==='in'?1:-1;
        leaf.rotation.y=-direction*inside*Math.PI/2;opening.add(leaf);
        mesh(leaf,ow-.06,oh-.04,.035,direction*(ow-.06)/2,(oh-.04)/2,0,new THREE.MeshStandardMaterial({color:'#c5b294',roughness:.8}));
        mesh(leaf,.08,.018,.04,direction*(ow-.12),1,0,handle);
      }
      if(roomSelection?.kind==='opening'&&roomSelection.id===o.id){
        const g=new THREE.BoxGeometry(ow,oh,.04),outline=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:'#a5543b'}));g.dispose();outline.position.set(x+ow/2,sy+oh/2,.01);opening.add(outline);
      }
    }
  }
  for(const c of project.cabinets) {
    const t=typeOf(c.kind),cw=c.width/1000,cd=t.depth/1000,ch=t.height/1000;
    const group=new THREE.Group();group.position.copy(offset).add(new THREE.Vector3(c.x/1000,t.elevation/1000,c.z/1000));group.rotation.y=c.rotation*Math.PI/180;group.userData.cabinetId=c.id;root.add(group);
    const front=materials.get(c.front || (t.category==='wall'?project.finishes.upper:project.finishes.lower))!;
    const plinth=t.category==='wall'?0:.10;
    if(isFiller(c.kind)){
      mesh(group,cw,ch-plinth,.018,0,(ch+plinth)/2,cd/2-.009,front);
      if(plinth)mesh(group,cw,plinth,.018,0,plinth/2,cd/2-.065,new THREE.MeshStandardMaterial({color:'#686c5f',roughness:.8}));
    }else if(c.kind==='corner'){
      mesh(group,.9,ch-plinth,.6,0,(ch+plinth)/2,-.15,white);
      mesh(group,.6,ch-plinth,.3,.15,(ch+plinth)/2,.30,white);
    }else if(c.kind!=='open'){
      // An actual open carcass instead of a solid block behind glass and fronts.
      for(const x of [-cw/2+.009,cw/2-.009])mesh(group,.018,ch-plinth,cd-.022,x,(ch+plinth)/2,-.005,white);
      mesh(group,cw-.036,ch-plinth,.012,0,(ch+plinth)/2,-cd/2+.006,white);
      mesh(group,cw-.036,.018,cd-.022,0,plinth+.009,-.005,white);
      if(t.category==='base')for(const z of [-cd/2+.045,cd/2-.045])mesh(group,cw-.036,.018,.07,0,ch-.009,z,white);
      else mesh(group,cw-.036,.018,cd-.022,0,ch-.009,-.005,white);
      if(c.kind==='glass')for(const y of [.24,.47])mesh(group,cw-.04,.015,cd-.04,0,y,0,white);
    }
    if(t.category!=='wall'&&!isFiller(c.kind)){
      const plinthMat=new THREE.MeshStandardMaterial({color:'#686c5f',roughness:.8});
      if(c.kind==='corner'){mesh(group,.9,.095,.50,0,.05,-.20,plinthMat);mesh(group,.54,.095,.30,.18,.05,.30,plinthMat);}
      else mesh(group,cw-.018,.095,cd-.10,0,.05,-.04,plinthMat);
    }
    const addHandle=(x:number,y:number,horizontal=true)=>{
      if(project.finishes.handle==='none') return;
      mesh(group,horizontal?Math.min(.16,cw*.45):.012,horizontal?.012:.16,.021,x,y,cd/2+.027,handle);
    };
    const door=(x:number,y:number,width:number,height:number)=>{mesh(group,width,height,.022,x,y,cd/2,front);};
    if(isFiller(c.kind)){
      // A filler is a plain front panel; its reserved footprint remains the tier depth.
    }else if(c.kind==='corner'){
      mesh(group,.294,ch-plinth-.006,.022,-.30,(ch+plinth)/2,.15,front);
      mesh(group,.022,ch-plinth-.006,.294,-.15,(ch+plinth)/2,.30,front);
      if(project.finishes.handle!=='none')mesh(group,.012,.16,.021,-.20,ch-.11,.178,handle);
      if(project.finishes.handle!=='none')mesh(group,.021,.16,.012,-.178,ch-.11,.21,handle);
    }else if(c.kind==='open') {
      mesh(group,cw-.018,ch,.018,0,ch/2,-cd/2+.012,front);
      for(const y of [.014,ch/2,ch-.014]) mesh(group,cw,.024,cd,0,y,0,front);
      for(const x of [-cw/2+.012,cw/2-.012]) mesh(group,.024,ch,cd,x,ch/2,0,front);
    } else if(c.kind==='oven') {
      door(0,.19,cw-.008,.17);
      mesh(group,cw-.04,.59,.035,0,.58,cd/2+.008,dark);
      mesh(group,cw-.095,.40,.006,0,.55,cd/2+.03,new THREE.MeshStandardMaterial({color:'#182322',roughness:.08,metalness:.35}));
      mesh(group,cw-.075,.038,.025,0,.78,cd/2+.048,steel);
      const top=ch+worktopThickness(project)/1000;
      mesh(group,cw-.06,.014,cd-.08,0,top+.007,0,dark);
      for(const x of [-.15,.15]) for(const z of [-.12,.12]) {
        const ring=new THREE.Mesh(new THREE.RingGeometry(.067,.071,32),new THREE.MeshBasicMaterial({color:'#78847c',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,top+.015,z);group.add(ring);
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
      const thick=worktopThickness(project)/1000;
      if(c.kind==='sink') {
        const bw=Math.min(cw-.16,.46),bd=.32,top=ch+thick;
        for(const x of [-bw/2-.015,bw/2+.015])mesh(group,.03,.012,bd+.06,x,top+.006,0,steel);
        for(const z of [-bd/2-.015,bd/2+.015])mesh(group,bw,.012,.03,0,top+.006,z,steel);
        const basin=new THREE.MeshStandardMaterial({color:'#889690',metalness:.8,roughness:.28});
        mesh(group,bw,.008,bd,0,top-.18,0,basin);
        for(const x of [-bw/2,bw/2])mesh(group,.006,.18,bd,x,top-.09,0,steel);
        for(const z of [-bd/2,bd/2])mesh(group,bw,.18,.006,0,top-.09,z,steel);
        const drain=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.004,24),dark);drain.position.set(0,top-.173,0);group.add(drain);
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,ch+thick,-.24),new THREE.Vector3(0,ch+.30,-.24),new THREE.Vector3(0,ch+.36,-.13),new THREE.Vector3(0,ch+.27,-.05)]);
        const tap=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.012,8,false),steel);group.add(tap);
      }
    }
    if(c.id===selected) {
      const geo=new THREE.BoxGeometry(cw+.018,ch+.018,cd+.018);
      const line=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:'#a5543b',transparent:true,opacity:.9}));line.position.y=ch/2;group.add(line);geo.dispose();
    }
  }
  const topLayout=worktopLayout(project);
  for(const surface of topLayout.surfaces){
    const shape=new THREE.Shape(surface.outline.map(p=>new THREE.Vector2(p.x/1000,-p.z/1000)));
    for(const hole of surface.holes)shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(p.x/1000,-p.z/1000))));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:worktopThickness(project)/1000,bevelEnabled:false,curveSegments:1});geometry.rotateX(-Math.PI/2);
    const top=new THREE.Mesh(geometry,materials.get(project.finishes.worktop)!);top.position.set(-w/2,.870,-d/2);top.castShadow=true;top.receiveShadow=true;root.add(top);
  }
  return root;
}

export default function Scene({project,selected,onSelect,resetKey,onReady,cameraMode='kitchen',zoom=1,roomSelection=null,onSelectRoom}:{project:Project;selected:string|null;onSelect:(id:string|null)=>void;resetKey:number;onReady:(canvas:HTMLCanvasElement|null)=>void;cameraMode?:'kitchen'|'room'|'selected';zoom?:number;roomSelection?:RoomSelection;onSelectRoom?:(s:RoomSelection)=>void}) {
  const host=useRef<HTMLDivElement>(null);
  const rendererRef=useRef<THREE.WebGLRenderer|null>(null);
  const cameraRef=useRef<THREE.PerspectiveCamera|null>(null);
  const sceneRef=useRef<THREE.Scene|null>(null);
  const controlsRef=useRef<OrbitControls|null>(null);
  const dirtyRef=useRef(true);
  const clickRef=useRef(onSelect);clickRef.current=onSelect;
  const roomClickRef=useRef(onSelectRoom);roomClickRef.current=onSelectRoom;
  const readyRef=useRef(onReady);readyRef.current=onReady;
  const stateRef=useRef({project,selected,cameraMode,zoom});stateRef.current={project,selected,cameraMode,zoom};
  const fitRef=useRef<()=>void>(()=>{});
  const [failed,setFailed]=useState(false);
  const initRoom=useRef(project.room);
  useEffect(()=>{
    const el=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch{setFailed(true);return;}
    const mobile=window.matchMedia('(max-width:800px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    el.appendChild(renderer.domElement);rendererRef.current=renderer;readyRef.current(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#eeece6');sceneRef.current=scene;
    const camera=new THREE.PerspectiveCamera(37,1,.01,80);cameraRef.current=camera;
    const controls=new OrbitControls(camera,renderer.domElement);controlsRef.current=controls;controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI/2-.025;controls.minDistance=2;controls.maxDistance=18;
    fitRef.current=()=>{
      const {project:p,selected:id,cameraMode:mode,zoom:magnification}=stateRef.current;
      const w=p.room.width/1000,d=p.room.depth/1000;
      const box=new THREE.Box3();
      const items=mode==='selected'&&id?p.cabinets.filter(c=>c.id===id):p.cabinets;
      if(mode==='room'||!items.length){box.set(new THREE.Vector3(-w/2,0,-d/2),new THREE.Vector3(w/2,p.room.height/1000,d/2));}
      else for(const c of items){const b=bounds(c),t=typeOf(c.kind);box.expandByPoint(new THREE.Vector3(b.minX/1000-w/2,t.elevation/1000,b.minZ/1000-d/2));box.expandByPoint(new THREE.Vector3(b.maxX/1000-w/2,(t.elevation+t.height)/1000,b.maxZ/1000-d/2));}
      const center=box.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(-1,.72,1.35).normalize();
      const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
      const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=1.5;
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const delta=new THREE.Vector3(x,y,z).sub(center);
        distance=Math.max(distance,delta.dot(direction)+Math.max(Math.abs(delta.dot(up))/tan,Math.abs(delta.dot(right))/(tan*camera.aspect)));
      }
      distance=distance*1.18/magnification;
      controls.maxDistance=Math.max(18,distance*2);camera.zoom=1;camera.position.copy(center).addScaledVector(direction,distance);controls.target.copy(center);camera.updateProjectionMatrix();controls.update();dirtyRef.current=true;
    };
    fitRef.current();
    scene.add(new THREE.HemisphereLight('#fff9ec','#858a76',2.4));
    const sun=new THREE.DirectionalLight('#fff7e8',3.4);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
    const fill=new THREE.DirectionalLight('#edf5f5',1.4);fill.position.set(4,3,-1);scene.add(fill);
    const resize=new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;fitRef.current();}});resize.observe(el);
    const raycaster=new THREE.Raycaster();let down={x:0,y:0};
    const pointerdown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pointerup=(e:PointerEvent)=>{
      if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5) return;
      const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const hits=raycaster.intersectObjects(scene.children,true);
      for(const hit of hits){
        let ancestor:THREE.Object3D|null=hit.object,visible=true;while(ancestor){if(!ancestor.visible)visible=false;ancestor=ancestor.parent;}if(!visible)continue;
        let obj:THREE.Object3D|null=hit.object;while(obj){if(obj.userData.cabinetId){clickRef.current(obj.userData.cabinetId);return;}if(obj.userData.openingId){roomClickRef.current?.({kind:'opening',id:obj.userData.openingId});return;}if(obj.userData.wall){roomClickRef.current?.({kind:'wall',wall:obj.userData.wall});return;}obj=obj.parent;}
      }
      clickRef.current(null);
    };
    renderer.domElement.addEventListener('pointerdown',pointerdown);renderer.domElement.addEventListener('pointerup',pointerup);
    renderer.setAnimationLoop(()=>{if(controls.update()||dirtyRef.current){
      for(const root of scene.children)for(const group of root.children){if(group.userData.cutawayWall){const n=group.userData.normal;group.visible=(camera.position.x-group.position.x)*n.x+(camera.position.z-group.position.z)*n.z>=0;}}
      renderer.render(scene,camera);dirtyRef.current=false;
    }});
    return()=>{resize.disconnect();renderer.setAnimationLoop(null);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerdown);renderer.domElement.removeEventListener('pointerup',pointerup);renderer.dispose();renderer.domElement.remove();readyRef.current(null);rendererRef.current=null;sceneRef.current=null;};
  },[]);
  useEffect(()=>{
    if(!sceneRef.current) return;const textures:THREE.Texture[]=[];const scene=sceneRef.current;const root=populate(scene,project,selected,textures,roomSelection);dirtyRef.current=true;
    return()=>{scene.remove(root);const materials=new Set<THREE.Material>();root.traverse(obj=>{if(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments){obj.geometry.dispose();if(Array.isArray(obj.material))obj.material.forEach(m=>materials.add(m));else materials.add(obj.material);}});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
  },[project,selected,roomSelection]);
  useEffect(()=>{fitRef.current();},[resetKey,project.room.width,project.room.depth,project.cabinets.length,cameraMode,zoom,cameraMode==='selected'?selected:null]);
  return <div ref={host} className="scene-host" aria-label="Интерактивная 3D-модель кухни">{failed&&<div className="scene-error"><strong>3D недоступен в этом браузере</strong><p>Используйте вид «План 2D» или включите аппаратное ускорение.</p></div>}</div>;
}
