import * as THREE from 'three';
import { roomObjectType, wallFrame } from './room';
import type { Room, RoomSelection } from './room';

export function populateRoomObjects(parent:THREE.Group,room:Room,selection:RoomSelection,textures:THREE.Texture[]){
  for(const o of room.objects??[]){
    const t=roomObjectType(o.kind),f=wallFrame(room,o.wall),group=new THREE.Group();group.userData.roomObjectId=o.id;group.position.set(f.x/1000-room.width/2000,0,f.z/1000-room.depth/2000);group.rotation.y=-f.angle*Math.PI/180;parent.add(group);
    const w=o.width/1000,h=o.height/1000,d=o.depth/1000,cx=(o.offset+o.width/2)/1000,cy=(o.bottom+o.height/2)/1000,cz=(o.backGap+(t.solid?o.depth/2:0))/1000;
    const material=new THREE.MeshStandardMaterial({color:t.solid?o.kind==='radiator'?'#e4e1d6':t.color:t.color,roughness:.82});
    const box=(width:number,height:number,depth:number,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
    if(o.kind==='radiator'){
      const count=Math.max(1,Math.floor(w/.07)),rail=Math.min(.035,h*.1);
      for(const y of [cy-h/2+rail/2,cy+h/2-rail/2])box(w,rail,d*.65,cx,y,cz);
      for(let i=0;i<count;i++)box(w/count*.68,h,d,cx-w/2+w/count*(i+.5),cy,cz);
    }else box(w,h,d,cx,cy,cz);
    if(!t.solid){
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fffdf2';ctx.beginPath();ctx.arc(64,64,54,0,Math.PI*2);ctx.fill();ctx.lineWidth=8;ctx.strokeStyle=t.color;ctx.stroke();ctx.fillStyle=t.color;ctx.font='bold 70px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.symbol,64,68);
      const texture=new THREE.CanvasTexture(canvas);textures.push(texture);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));sprite.position.set(cx,cy,cz+d/2+.018);sprite.scale.set(.18,.18,1);group.add(sprite);
    }
    if(selection?.kind==='object'&&selection.id===o.id){
      const geometry=new THREE.BoxGeometry(w+.008,h+.008,d+.008),edges=new THREE.EdgesGeometry(geometry);geometry.dispose();const outline=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:'#a5543b'}));outline.position.set(cx,cy,cz);group.add(outline);
    }
  }
}
