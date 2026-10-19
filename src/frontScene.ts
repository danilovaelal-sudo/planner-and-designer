import * as THREE from 'three';
import type { Cabinet } from './model';
import { frontAssemblies, previewProgress } from './openings';
import type { MotionIssue, OpeningPreview } from './openings';

interface Materials {front:THREE.Material;white:THREE.Material;dark:THREE.Material;steel:THREE.Material;handle:THREE.Material;handles:boolean;}
export function populateFronts(parent:THREE.Group,c:Cabinet,preview:OpeningPreview|undefined,conflicts:MotionIssue[],m:Materials){
  const box=(root:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
  for(const part of frontAssemblies(c)){
    const progress=previewProgress(preview,part),amount=part.travel*progress/100,group=new THREE.Group();group.position.set(part.pivot.x/1000,part.pivot.y/1000,part.pivot.z/1000);group.userData.frontPartId=part.id;parent.add(group);
    if(part.mode==='drawer')group.position.z+=amount/1000;
    else if(part.mode==='swing')group.rotation.y=part.sign*amount*Math.PI/180;
    else group.rotation.x=amount*Math.PI/180;
    const blocked=conflicts.some(issue=>issue.id===c.id&&issue.partId===part.id||issue.kind==='front'&&issue.otherId===c.id);
    for(const piece of part.pieces){
      const root=new THREE.Group();root.position.set(piece.center.x/1000,piece.center.y/1000,piece.center.z/1000);root.rotation.y=piece.yaw*Math.PI/180;group.add(root);
      const w=piece.size.x/1000,h=piece.size.y/1000,d=piece.size.z/1000;
      if(piece.style==='tray'){
        box(root,w,.012,d,0,-h/2+.006,0,m.white);
        for(const x of [-w/2+.009,w/2-.009])box(root,.018,h,d,x,0,0,m.white);
        for(const z of [-d/2+.009,d/2-.009])box(root,w-.036,h,.018,0,0,z,m.white);
      }else if(piece.style==='glass'){
        const glass=new THREE.MeshStandardMaterial({color:'#9baa9c',transparent:true,opacity:.42,roughness:.12,metalness:.1});
        box(root,w-.07,h-.07,.012,0,0,0,glass);
        for(const x of [-w/2+.02,w/2-.02])box(root,.04,h,d,x,0,0,m.front);
        for(const y of [-h/2+.02,h/2-.02])box(root,w,.04,d,0,y,0,m.front);
      }else if(piece.style==='oven'){
        box(root,w,h,d,0,0,0,m.dark);box(root,w-.055,h-.10,.004,0,-.01,d/2+.003,new THREE.MeshStandardMaterial({color:'#172321',roughness:.12,metalness:.2}));
      }else box(root,w,h,d,0,0,0,m.front);
      if(m.handles&&piece.style!=='tray'){
        const horizontal=part.mode!=='swing'||piece.style==='oven';
        const direction=-part.sign;
        const hx=horizontal?0:piece.yaw===270?-w/2+.055:direction*(w/2-.055);
        const hy=horizontal?h/2-.055:c.kind==='glass'?-h/2+.13:h/2-.11;
        box(root,horizontal?Math.min(.16,w*.45):.012,horizontal?.012:.16,.021,hx,hy,d/2+.019,piece.style==='oven'?m.steel:m.handle);
      }
      if(progress>0&&piece.style!=='tray'){
        const source=new THREE.BoxGeometry(w+.002,h+.002,d+.002),edges=new THREE.EdgesGeometry(source);source.dispose();
        root.add(new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:blocked?'#bc5b40':'#7e9a76',transparent:true,opacity:.9})));
      }
    }
  }
}
