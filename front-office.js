/* Hestia Front Office 3.0 — synthetic guest-service workflows.
   Public preview only: no card handling, real guest contact or live dispatch. */
const FO3_SERVICES={
 "Bell pickup":{team:"Bell Service",sla:15,desc:"Collect luggage from guest room",detail:["Pieces","Destination"],group:"Arrivals & departures"},
 "Bell delivery":{team:"Bell Service",sla:15,desc:"Deliver luggage to guest room",detail:["Pieces","Pickup point"],group:"Arrivals & departures"},
 "Luggage storage":{team:"Bell Service",sla:15,desc:"Tag, store and release luggage",detail:["Pieces","Claim reference","Storage location"],group:"Arrivals & departures"},
 "Live checkout":{team:"Front Office",sla:10,desc:"Coordinate departure assistance",detail:["Departure preference","Transport needed"],group:"Arrivals & departures"},
 "Late checkout":{team:"Front Office",sla:20,desc:"Review late departure request",detail:["Requested checkout time","Approval needed"],group:"Arrivals & departures"},
 "Early arrival":{team:"Front Office",sla:20,desc:"Track early room readiness",detail:["Expected arrival time"],group:"Arrivals & departures"},
 "Vehicle retrieval":{team:"Valet",sla:12,desc:"Request a guest vehicle from valet",detail:["Vehicle claim reference","Pickup location"],group:"Arrivals & departures"},
 "House car":{team:"Transportation",sla:20,desc:"Coordinate driver and pickup",detail:["Pickup time","Destination","Passengers"],group:"Arrivals & departures"},
 "IRD delivery":{team:"Food & Beverage",sla:30,desc:"Dispatch in-room dining delivery",detail:["Order reference","Delivery location"],group:"Deliveries"},
 "Third-party food":{team:"Front Office",sla:15,desc:"Coordinate outside food delivery",detail:["Delivery provider","Handoff location"],group:"Deliveries"},
 "Guest amenity":{team:"Guest Services",sla:30,desc:"Arrange amenities or special arrival gifts",detail:["Amenity type","Delivery instructions"],group:"Deliveries"},
 "Package delivery":{team:"Bell Service",sla:30,desc:"Record receipt and handoff",detail:["Package reference","Handoff location"],group:"Deliveries"},
 "Room move":{team:"Front Office",sla:20,desc:"Coordinate move and departmental handoff",detail:["New room","Move time"],group:"Guest assistance"},
 "Wake-up call":{team:"Front Office",sla:10,desc:"Schedule and verify guest wake-up",detail:["Call time","Backup contact"],group:"Guest assistance"},
 "Key assistance":{team:"Front Office",sla:10,desc:"Route key or access assistance",detail:["Request reason"],group:"Guest assistance"},
 "Accessibility assistance":{team:"Front Office",sla:15,desc:"Coordinate requested guest assistance",detail:["Assistance requested"],group:"Guest assistance"},
 "Concierge booking":{team:"Guest Services",sla:30,desc:"Restaurant, activities or local arrangements",detail:["Booking request","Preferred time"],group:"Concierge & follow-up"},
 "Guest follow-up":{team:"Guest Services",sla:20,desc:"Confirm that the guest's request was resolved",detail:["Follow-up purpose","Contact preference"],group:"Concierge & follow-up"},
 "Service recovery":{team:"Management",sla:10,desc:"Escalate unresolved guest experience issue",detail:["Issue summary","Manager follow-up"],group:"Concierge & follow-up"}
};
const FO3_GROUPS=["Arrivals & departures","Deliveries","Guest assistance","Concierge & follow-up"];
let fo3Group="Arrivals & departures",fo3Status="Active",fo3Search="";
const fo3Active=t=>!["Completed","Voided"].includes(t.status);
const fo3ServiceOf=t=>t.foService||({"Bell Service":"Bell pickup","Live Checkout":"Live checkout","Food Delivery":"IRD delivery"}[t.requestType]||t.requestType||null);
const fo3IsTicket=t=>!!FO3_SERVICES[fo3ServiceOf(t)];
const fo3Due=t=>{
 if(!fo3Active(t))return t.status;
 const n=Date.parse(t.dueAt);
 if(!Number.isFinite(n))return "No target";
 const delta=Math.ceil((n-Date.now())/60000);
 return delta<0?"Overdue "+Math.abs(delta)+"m":delta===0?"Due now":"Due in "+delta+"m";
};
function fo3Seed(){
 if(state.fo3Version)return;
 const sample=Object.keys(FO3_SERVICES).filter(k=>!["Bell pickup","Live checkout","IRD delivery"].includes(k));
 const rooms=[206,208,214,219,306,311,322,405,411,425,507,513,522,605,613,627,703,717];
 sample.forEach((kind,i)=>{
  const spec=FO3_SERVICES[kind],room=rooms[i%rooms.length];
  const r=state.reservations.find(x=>Number(x.room)===room);
  const now=new Date(Date.now()-(i%8+1)*6*60000).toISOString();
  state.tickets.push({id:86000+i,title:kind,foService:kind,requestType:kind,team:spec.team,category:kind,
   location:"Room "+room,room,guest:r?.guest||"Demo Guest",reservationId:r?.id||null,
   status:i%7===0?"Completed":i%5===0?"Started":"Open",priority:i%6===0?"High":"Normal",
   assignee:"Unassigned",employeeId:null,description:spec.desc,
   dueAt:new Date(Date.now()+(spec.sla-i*5)*60000).toISOString(),createdAt:now,
   notes:[],attachments:[],links:[],history:[{event:"Created",at:now,by:"Demo system",note:"Front Office sample request"}],foFields:{"Instructions":"Demonstration request"}});
 });
 state.fo3Version=true;save();
}
function fo3Option(label,value,selected){return '<option value="'+safe(value)+'"'+(value===selected?" selected":"")+'>'+safe(label)+'</option>'}
function fo3Fields(kind){
 const spec=FO3_SERVICES[kind];
 return spec?spec.detail.map((field,i)=>'<label>'+safe(field)+'<input name="extra'+i+'" maxlength="160" placeholder="'+safe(field)+'"></label>').join(""):"";
}
function fo3ServiceChange(value){
 const out=document.getElementById("fo3Dynamic");
 if(out)out.innerHTML=fo3Fields(value);
 const hint=document.getElementById("fo3ServiceHint");
 if(hint&&FO3_SERVICES[value])hint.textContent=FO3_SERVICES[value].desc+" · Sent to "+FO3_SERVICES[value].team+" · "+FO3_SERVICES[value].sla+" min target";
}
function fo3GuestSelected(value){
 const r=state.reservations.find(x=>String(x.id)===String(value));
 const form=document.getElementById("newform");
 if(!r||!form)return;
 if(form.elements.guest)form.elements.guest.value=r.guest;
 if(form.elements.location)form.elements.location.value="Room "+r.room;
}
function fo3Request(kind="Bell pickup",prefillId=null){
 if(!dxRequire("create"))return;
 if(!FO3_SERVICES[kind])kind="Bell pickup";
 const related=state.reservations.filter(r=>["Reserved","Checked in"].includes(r.status)).slice(0,95);
 const reservationOptions='<option value="">No linked reservation / internal request</option>'+related.map(r=>fo3Option(r.guest+" · Room "+r.room+" · "+r.confirmation,String(r.id),"")).join("");
 const spec=FO3_SERVICES[kind];
 const fields='<label class="fo3-span">Service type<select name="kind" id="fo3Type" onchange="fo3ServiceChange(this.value)">'+
 Object.entries(FO3_SERVICES).map(([k])=>fo3Option(k,k,kind)).join("")+'</select></label>'+
 '<div class="fo3-service-hint fo3-span" id="fo3ServiceHint">'+safe(spec.desc)+' · Routed to '+safe(spec.team)+' · '+spec.sla+' min target</div>'+
 '<label class="fo3-span">Reservation (optional)<select name="reservation" onchange="fo3GuestSelected(this.value)">'+reservationOptions+'</select></label>'+
 '<label>Guest / requestor<input name="guest" maxlength="100" required placeholder="Guest or staff member"></label>'+
 '<label>Room / location<input name="location" maxlength="100" required placeholder="Room 318 or Lobby"></label>'+
 '<label>Priority<select name="priority">'+svcOpts(SVC_PRIORITIES,spec.sla<=10?"High":"Normal")+'</select></label>'+
 '<label>Requested service time<input type="datetime-local" name="requestedFor"></label>'+
 '<div class="fo3-span" id="fo3Dynamic">'+fo3Fields(kind)+'</div>'+
 '<label class="fo3-span">Dispatch instructions<textarea name="instructions" maxlength="1000" placeholder="Important operational details; avoid sensitive data"></textarea></label>'+
 '<p class="fo3-note fo3-span">Synthetic demonstration. Requests will appear in Service Dispatch. Financial checkout and actual guest communication are separate.</p>';
 modal("New guest service request",fields,f=>{
  const key=String(f.get("kind")||""),c=FO3_SERVICES[key];
  const guest=String(f.get("guest")||"").trim(),location=String(f.get("location")||"").trim();
  if(!c||!guest||!location)return flash("Service type, guest and location are required");
  const linked=state.reservations.find(r=>String(r.id)===String(f.get("reservation")))||null;
  const match=location.match(/\b\d{3,4}\b/);
  if(linked&&match&&Number(match[0])!==Number(linked.room))return flash("Room differs from linked reservation; correct it or unlink");
  const time=String(f.get("requestedFor")||"");
  const scheduled=time?new Date(time):null;
  if(time&&(!scheduled||!Number.isFinite(scheduled.getTime())))return flash("Invalid service time");
  const additional={};c.detail.forEach((name,i)=>{const v=String(f.get("extra"+i)||"").trim();if(v)additional[name]=v});
  const instructions=String(f.get("instructions")||"").trim();
  const id=Math.max(86000,...state.tickets.map(t=>Number(t.id)||0))+1;
  const now=new Date();
  const dueAnchor=scheduled&&scheduled.getTime()>now.getTime()?scheduled:now;
  const t={id,title:key+(linked?" · "+linked.guest:""),foService:key,requestType:key,category:key,
   team:c.team,room:match?Number(match[0]):linked?.room||null,location,guest,
   reservationId:linked?.id||null,priority:String(f.get("priority")),status:"Open",
   assignee:"Unassigned",employeeId:null,description:instructions||c.desc,
   foFields:additional,requestedFor:scheduled?.toISOString()||null,
   createdAt:now.toISOString(),dueAt:new Date(dueAnchor.getTime()+c.sla*60000).toISOString(),
   notes:[],history:[],links:[],attachments:[]};
  state.tickets.unshift(t);svcRecord(t,"Created","Front Office "+key+" · "+c.team);
  closeModal();fo3OpenTicket(id);flash("Guest service request created");
 });
 const root=document.getElementById("modalroot");
 const modalEl=root?.querySelector?.(".modal");if(modalEl)modalEl.classList.add("fo3-modal");
 if(prefillId){
  const linked=state.reservations.find(r=>r.id===Number(prefillId));
  const form=document.getElementById("newform");
  if(linked&&form){
   if(form.elements.reservation)form.elements.reservation.value=String(linked.id);
   fo3GuestSelected(linked.id);
  }
 }
}
function fo3OpenTicket(id){svcSelected=Number(id);page="Service Dispatch";render();if(typeof window!=="undefined")window.scrollTo?.(0,0)}
function fo3SetGroup(v){if(FO3_GROUPS.includes(v)){fo3Group=v;render()}}
function fo3SetStatus(v){fo3Status=v;render()}
function fo3RequestView(){
 const tickets=state.tickets.filter(fo3IsTicket);
 const open=tickets.filter(fo3Active);
 const overdue=open.filter(t=>Date.parse(t.dueAt)<Date.now());
 const attention=open.filter(t=>!t.employeeId||Date.parse(t.dueAt)<Date.now());
 const common=["Bell pickup","Live checkout","Vehicle retrieval","IRD delivery","Luggage storage","Guest amenity"];
 const groups='<div class="fo3-sectiontabs">'+FO3_GROUPS.map(g=>'<button class="'+(g===fo3Group?"active":"")+'" onclick="fo3SetGroup(\''+g+'\')">'+safe(g)+'</button>').join("")+'</div>';
 const categoryList=Object.entries(FO3_SERVICES).filter(([,x])=>x.group===fo3Group);
 const quick='<div class="fo3-sectiontitle"><strong>Start a request</strong><small>Frequently used services</small></div>'+
 '<div class="fo3-catalog">'+common.map(k=>'<button class="fo3-action" onclick="fo3Request(\''+k+'\')"><b>'+safe(k)+'</b><span>'+safe(FO3_SERVICES[k].desc)+'</span></button>').join("")+'</div>'+
 '<div class="fo3-sectiontitle"><strong>All guest services</strong><small>Browse by workflow</small></div>'+groups+
 '<div class="fo3-catalog" style="margin-top:9px">'+categoryList.map(([k,c])=>'<button class="fo3-action" onclick="fo3Request(\''+k+'\')"><b>'+safe(k)+'</b><span>'+safe(c.desc)+'</span></button>').join("")+'</div>';
 const subset=tickets.filter(t=>(fo3Status==="All"||fo3Status==="Active"&&fo3Active(t)||fo3Status==="Attention"&&fo3Active(t)&&(!t.employeeId||Date.parse(t.dueAt)<Date.now())||fo3Status===t.status)&&
 (String(t.id)+" "+t.title+" "+(t.guest||"")+" "+t.location+" "+(t.team||"")).toLowerCase().includes(fo3Search.toLowerCase()));
 subset.sort((a,b)=>Number(fo3Active(b))-Number(fo3Active(a))||Date.parse(b.createdAt)-Date.parse(a.createdAt));
 const queue='<div class="fo3-sectiontitle"><strong>Guest service queue</strong><small>'+tickets.length+' total requests</small></div>'+
 '<div class="fo3-queue"><div class="fo3-controls"><input id="fo3Search" aria-label="Search Front Office requests" placeholder="Guest, room, ticket..." value="'+safe(fo3Search)+'"><select id="fo3Status" aria-label="Request filter">'+svcOpts(["Active","Attention","All","Open","Started","Stopped","Completed","Voided"],fo3Status)+'</select></div>'+
 (subset.length?subset.map(t=>{
  const label=fo3ServiceOf(t);
  const late=fo3Active(t)&&Date.parse(t.dueAt)<Date.now();
  const owner=t.employeeId?dcOwner(t):"Department queue";
  return '<div class="fo3-ticket"><div><button class="fo3-ticket-title" onclick="fo3OpenTicket('+t.id+')">'+safe(label)+' · '+safe(t.location)+'</button><div class="fo3-ticket-meta">'+safe(t.guest||"Guest")+' · '+safe(t.team)+' · #'+t.id+'</div><div class="fo3-ticket-meta">'+safe(owner)+' · '+safe(fo3Due(t))+'</div></div><div class="fo3-ticket-state">'+svcTag(t)+(late?'<span class="fo3-pastdue">Past target</span>':"")+'<button class="fo3-button" onclick="fo3OpenTicket('+t.id+')">Open</button></div></div>';
 }).join(""):'<div class="fo3-empty">No requests match this view.</div>')+'</div>';
 return '<div class="fo3-shell"><div class="fo3-topline fo3-hero"><div><div class="fo3-eyebrow">Guest experience / operations</div><h1 class="fo3-heading">Front Office</h1><p class="fo3-description">One place for arrivals, departures, luggage, deliveries, concierge and guest follow-up.</p></div><button class="fo3-mainbtn" onclick="fo3Request()">+ Guest request</button></div>'+
 '<div class="fo3-overview"><div class="fo3-metric"><strong>'+open.length+'</strong><span>Active requests</span></div><div class="fo3-metric"><strong>'+attention.length+'</strong><span>Need attention</span></div><div class="fo3-metric"><strong>'+open.filter(x=>x.status==="Started").length+'</strong><span>In progress</span></div><div class="fo3-metric"><strong>'+overdue.length+'</strong><span>Past target</span></div></div>'+
 queue+quick+'<div class="fo3-sectiontitle"><strong>Guest reservations</strong><small>Reservation context</small></div>'+
 '<div class="fo3-queue">'+state.reservations.filter(r=>r.status==="Checked in").slice(0,6).map(r=>'<div class="fo3-ticket"><div><button class="fo3-ticket-title" onclick="openDetail('+r.id+')">'+safe(r.guest)+'</button><div class="fo3-ticket-meta">Room '+r.room+' · '+safe(r.confirmation)+'</div></div><button class="fo3-button" onclick="fo3Request(\'Live checkout\','+r.id+')">Departure request</button></div>').join("")+'</div>'+
 '<p class="fo3-note" style="margin-top:12px">Public synthetic-data demonstration. Completing a service ticket does not process guest payment, alter folios, or check a reservation out.</p></div>';
}
function fo3AddDetail(t){
 if(!fo3IsTicket(t))return "";
 const data=Object.entries(t.foFields||{});
 const lines='<div class="dc-line"><span>Guest / requestor</span><strong>'+safe(t.guest||"—")+'</strong></div>'+
 '<div class="dc-line"><span>Service</span><strong>'+safe(fo3ServiceOf(t))+'</strong></div>'+
 '<div class="dc-line"><span>Requested for</span><strong>'+safe(t.requestedFor?svcTime(t.requestedFor):"As soon as possible")+'</strong></div>'+
 (t.reservationId?'<div class="dc-line"><span>Reservation</span><button class="fo3-button" onclick="openDetail('+Number(t.reservationId)+')">Open guest stay</button></div>':"")+
 data.map(([k,v])=>'<div class="dc-line"><span>'+safe(k)+'</span><strong>'+safe(v)+'</strong></div>').join("");
 const isCheckout=fo3ServiceOf(t)==="Live checkout";
 const related=(isCheckout?'<div class="fo3-service-hint" style="margin-top:12px">Service completion is separate from PMS checkout and folio settlement. Verify payment and guest departure in the reservation workspace.</div>':"");
 const linkedControls=(isCheckout?'<button class="fo3-button" onclick="fo3DepartureTasks('+t.id+')">Create linked bell + valet tasks</button>':"");
 return '<div class="dxsection">'+panel("Guest service details",lines+related+'<div class="dxactions" style="margin-top:12px">'+linkedControls+'</div>')+'</div>';
}
function fo3DepartureTasks(id){
 if(!dxRequire("create"))return false;
 const parent=dxTicket(id);if(!parent||fo3ServiceOf(parent)!=="Live checkout")return false;
 const linked=state.tickets.filter(t=>(parent.links||[]).includes(t.id));
 let created=0;
 for(const [team,category] of [["Bell Service","Departure luggage"],["Valet","Vehicle retrieval"]]){
  if(linked.some(t=>t.team===team&&t.category===category))continue;
  dxCreateLinked(parent.id,team,category);created++;
 }
 svcSelected=id;page="Service Dispatch";render();
 flash(created?created+" linked departure tasks added":"Departure tasks already linked");
 return created>0;
}
const fo3OldDetail=dcDetail;
dcDetail=function(){
 const t=dxTicket(svcSelected);
 return fo3OldDetail()+(t?fo3AddDetail(t):"");
};
desk=function(){return fo3RequestView()};
foNew=function(kind){return fo3Request(({"Bell Service":"Bell pickup","Live Checkout":"Live checkout","Food Delivery":"IRD delivery"})[kind]||kind)};
foFromReservation=function(id){return fo3Request("Live checkout",Number(id))};
fo3Seed();
const fo3OldRender=render;
render=function(){
 fo3OldRender();
 if(page!=="Front Desk")return;
 const search=document.getElementById("fo3Search"),status=document.getElementById("fo3Status");
 if(search)search.oninput=e=>{
  fo3Search=e.target.value;const cursor=e.target.selectionStart;render();
  const next=document.getElementById("fo3Search");if(next){next.focus();next.setSelectionRange(cursor,cursor)}
 };
 if(status)status.onchange=e=>fo3SetStatus(e.target.value);
};
render();
