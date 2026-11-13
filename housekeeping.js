/* Housekeeping department — synthetic, browser-local operational workflows. */
const HK_STAGES=["Unassigned","Assigned","In progress","Awaiting inspection","Ready","On hold"];
const HK_SERVICE_TYPES=["Extra towels","Extra linens","Turndown service","Pillows and bedding","Bathroom amenities","Room refresh","Deep cleaning","Spill cleanup","Laundry pickup","DND follow-up"];
let hkTab="Board",hkFilter="Needs attention",hkSearch="",hkRole="Supervisor",hkSelectedStaff="";
const HK_INSPECTION=["Bathroom and fixtures","Linens and bedding","Amenities and supplies","Surfaces and floors","Maintenance / safety","Final presentation"];
const HK_CREDITS={Departure:3,Stayover:2,Turndown:1,"Deep clean":5};
function hkRoom(id){return state.rooms.find(r=>Number(r.id)===Number(id))}
function hkJob(id){return state.hkJobs?.find(j=>Number(j.room)===Number(id))}
function hkStaff(){return (state.dxEmployees||[]).filter(e=>e.team==="Housekeeping")}
function hkOwner(job){return hkStaff().find(e=>e.id===job.assigneeId)?.name||"Unassigned"}
function hkLog(job,event,note=""){
 if(!Array.isArray(job.history))job.history=[];
 job.history.push({event,note,at:new Date().toISOString(),by:"Demo Housekeeping"});
 activity("Housekeeping · Room "+job.room+" · "+event);save();
}
function hkSeed(){
 if(!Array.isArray(state.dxEmployees))state.dxEmployees=[];
 const people=[
 ["hk-201","Maria Lopez","AM"],["hk-202","Samantha Flores","AM"],
 ["hk-203","Daniel Ruiz","AM"],["hk-204","Aisha Williams","PM"],
 ["hk-205","Nina Patel","PM"],["hk-206","Luis Garcia","PM"]
 ];
 for(const [id,name,shift] of people){
  if(!state.dxEmployees.some(x=>x.id===id))state.dxEmployees.push({id,name,team:"Housekeeping",shift,available:true});
 }
 if(!Array.isArray(state.hkJobs))state.hkJobs=[];
 const existing=new Set(state.hkJobs.map(j=>Number(j.room)));
 const staff=hkStaff();
 state.rooms.forEach((r,i)=>{
  if(existing.has(r.id))return;
  const isDirty=r.status==="dirty",isOut=r.status==="out";
  const assigned=isDirty&&i%5!==0;
  const person=assigned?staff[i%staff.length]:null;
  const stage=isOut?"On hold":isDirty?(assigned?(i%4===0?"In progress":"Assigned"):"Unassigned"):"Ready";
  state.hkJobs.push({room:r.id,kind:i%3===0?"Stayover":"Departure",stage,
   assigneeId:person?.id||null,priority:isDirty&&i%6===0?"High":"Normal",
   inspectionRequired:isDirty,guestPreference:"",history:[{event:"Initialized",note:"Synthetic room workflow",at:new Date().toISOString(),by:"Demo system"}],
   startedAt:null,finishedAt:null,inspectedAt:null,lastUpdate:new Date().toISOString(),
   holdReason:isOut?"Room out of order":""});
 });
 state.hkJobs.forEach(j=>{
  if(!Array.isArray(j.history))j.history=[];
  if(!HK_STAGES.includes(j.stage))j.stage="Unassigned";
  if(!j.priority)j.priority="Normal";
 });
 state.hkJobs.forEach(j=>{
  if(!j.checklist||typeof j.checklist!=="object")j.checklist={};
  if(!j.cleanliness)j.cleanliness=j.stage==="Ready"?"Clean":j.stage==="Awaiting inspection"?"Inspection":"Dirty";
  if(!j.maintenanceBlocks)j.maintenanceBlocks=[];
  if(!j.serviceWindow)j.serviceWindow="";
 });
 if(!state.hkSupplies)state.hkSupplies=[
  {id:"linen-bath",name:"Bath towel sets",quantity:180,unit:"sets",reorderAt:45},
  {id:"linen-bed",name:"Bed linen sets",quantity:130,unit:"sets",reorderAt:35},
  {id:"amenities",name:"Guest amenity kits",quantity:220,unit:"kits",reorderAt:60},
  {id:"cleaning",name:"Cleaning consumables",quantity:75,unit:"units",reorderAt:20}
 ];
 if(!Array.isArray(state.hkSupplyLog))state.hkSupplyLog=[];
 if(!Array.isArray(state.hkPassdowns))state.hkPassdowns=[];
 if(!state.hkDemoSeeded){
  state.hkPassdowns.push({at:new Date().toISOString(),shift:"AM → PM",author:"Demo supervisor",text:"Sample handover: verify late checkout rooms, outstanding turndown requests, and pending inspections."});
  state.hkDemoSeeded=true;
 }
 save();
}
function hkUpdate(id,action,value=""){
 const room=hkRoom(id),job=hkJob(id);
 if(!room||!job)return false;
 const closed=room.status==="out";
 if(hkRole==="Attendant"){
  if(!["Start","Submit"].includes(action)||job.assigneeId!==hkSelectedStaff){flash("This task requires your own assignment or supervisor authority");return false}
 }else if(!hkIsLeader()){flash("Supervisor authority required");return false}
 if(action==="Assign"){
  const employee=hkStaff().find(e=>e.id===value&&e.available);
  if(!employee){flash("Select an available Housekeeping attendant");return false}
  if(closed){flash("Out-of-order rooms require Engineering clearance");return false}
  if(job.stage==="Ready"&&room.status!=="dirty"){flash("This room has no active cleaning assignment");return false}
  job.assigneeId=employee.id;
  if(["Unassigned","On hold"].includes(job.stage))job.stage="Assigned";
  job.holdReason="";
  hkLog(job,"Assigned",employee.name);
 }else if(action==="Start"){
  if(job.stage!=="Assigned"||!job.assigneeId||closed){flash("Assign an attendant before starting");return false}
  if(["Do Not Disturb","Refused service","Privacy requested"].includes(job.guestPreference)){flash("Guest preference blocks entry; supervisor must resolve the request first");return false}
  job.stage="In progress";job.startedAt=new Date().toISOString();hkLog(job,"Cleaning started",hkOwner(job));
 }else if(action==="Submit"){
  if(job.stage!=="In progress"){flash("Start cleaning before submitting");return false}
  job.stage="Awaiting inspection";job.cleanliness="Inspection";job.checklist={};job.finishedAt=new Date().toISOString();hkLog(job,"Submitted for inspection","Cleaning completed; awaiting supervisor review");
 }else if(action==="Approve"){
  if(job.stage!=="Awaiting inspection"){flash("Room must be submitted for inspection");return false}
  if(!hkCanInspect(job)){flash("Complete all inspection checks and resolve maintenance holds");return false}
  job.stage="Ready";job.cleanliness="Clean";job.inspectedAt=new Date().toISOString();job.inspectedBy=hkRole+" (demo)";job.inspectionRequired=false;
  // Occupied stayover rooms remain occupied; departure turnovers become available.
  if(room.status==="dirty")room.status="ready";
  hkLog(job,"Inspection passed","Room cleared for Front Office");
 }else if(action==="Fail"){
  if(job.stage!=="Awaiting inspection"||!String(value).trim()){flash("Inspection failure requires a reason");return false}
  job.stage="Assigned";job.cleanliness="Dirty";job.checklist={};job.inspectionRequired=true;hkLog(job,"Inspection failed",String(value).trim());
 }else if(action==="Hold"){
  if(!["Unassigned","Assigned","In progress","Awaiting inspection"].includes(job.stage)||!String(value).trim()){flash("Hold reason required");return false}
  job.stage="On hold";job.cleanliness="Dirty";job.holdReason=String(value).trim();hkLog(job,"On hold",job.holdReason);
 }else if(action==="Resume"){
  if(job.stage!=="On hold"||closed){flash("Resolve out-of-order status before resuming");return false}
  job.stage=job.assigneeId?"Assigned":"Unassigned";job.holdReason="";hkLog(job,"Resumed","Returned to cleaning queue");
 }else if(action==="Service"){
  if(room.status==="out"){flash("Room is out of order");return false}
  if(job.stage!=="Ready"){flash("Room already has a cleaning workflow");return false}
  job.kind=["Stayover","Turndown","Deep clean"].includes(value)?value:"Departure";
  job.stage="Unassigned";job.cleanliness="Dirty";job.checklist={};job.assigneeId=null;job.inspectionRequired=true;job.startedAt=null;job.finishedAt=null;job.inspectedAt=null;
  if(job.kind==="Departure"&&room.status!=="occupied")room.status="dirty";
  hkLog(job,"Service requested",job.kind);
 }else return false;
 job.lastUpdate=new Date().toISOString();save();render();return true;
}
function hkPrompt(id,action){
 if(!hkIsLeader()&&!["Start","Submit"].includes(action)){flash("Supervisor controls are unavailable in the attendant view");return}
 if(action==="Assign"){
  const j=hkJob(id);
  modal("Assign room "+id,'<label>Housekeeping attendant<select name="employee">'+
   '<option value="">Choose attendant</option>'+hkStaff().filter(x=>x.available).map(x=>'<option value="'+safe(x.id)+'"'+(j.assigneeId===x.id?" selected":"")+'>'+safe(x.name)+' · '+safe(x.shift)+'</option>').join("")+
   '</select></label>',f=>{if(hkUpdate(id,"Assign",String(f.get("employee")||"")))closeModal()});
 }else if(action==="Hold"||action==="Fail"){
  modal((action==="Hold"?"Hold":"Fail inspection")+" · Room "+id,
  '<label>Documented reason<input name="reason" required maxlength="400" placeholder="Describe the issue"></label>',
  f=>{if(hkUpdate(id,action,String(f.get("reason")||"")))closeModal()});
 }else if(action==="Service"){
  modal("Schedule room "+id+" cleaning",'<label>Cleaning type<select name="kind"><option>Departure</option><option>Stayover</option><option>Turndown</option><option>Deep clean</option></select></label>',
  f=>{if(hkUpdate(id,"Service",String(f.get("kind")||"Departure")))closeModal()});
 }else hkUpdate(id,action);
}
function hkMarkDeparture(id){
 const job=hkJob(id),room=hkRoom(id);
 if(!job||!room)return false;
 // Front Office checkout opens a new room-turnover workflow. No separate room database.
 room.status="dirty";
 job.kind="Departure";job.stage="Unassigned";job.cleanliness="Dirty";job.checklist={};job.assigneeId=null;
 job.startedAt=null;job.finishedAt=null;job.inspectedAt=null;
 job.inspectionRequired=true;job.holdReason="";
 job.lastUpdate=new Date().toISOString();
 hkLog(job,"Checkout turnover requested","Room requires cleaning and inspection before next arrival");
 return true;
}
function hkSyncFromRooms(){
 // Only add metadata for new rooms; do not overwrite an active cleaning job.
 const exists=new Set((state.hkJobs||[]).map(j=>j.room));
 for(const r of state.rooms){
  if(exists.has(r.id))continue;
  state.hkJobs.push({room:r.id,kind:"Departure",stage:r.status==="dirty"?"Unassigned":r.status==="out"?"On hold":"Ready",assigneeId:null,
   priority:"Normal",inspectionRequired:r.status==="dirty",cleanliness:r.status==="dirty"?"Dirty":"Clean",checklist:{},maintenanceBlocks:[],history:[],lastUpdate:new Date().toISOString()});
 }
}
function hkServiceRequest(){
 modal("New Housekeeping request",
 '<label>Service<select name="type">'+HK_SERVICE_TYPES.map(x=>'<option>'+safe(x)+'</option>').join("")+'</select></label>'+
 '<label>Room<input name="room" type="number" min="201" max="999" required></label>'+
 '<label>Priority<select name="priority">'+svcOpts(SVC_PRIORITIES,"Normal")+'</select></label>'+
 '<label>Instructions<input name="description" maxlength="500" placeholder="Service specifics; no sensitive guest data"></label>',
 f=>{
  const room=Number(f.get("room")),type=String(f.get("type")||"").trim(),description=String(f.get("description")||"").trim();
  if(!hkRoom(room)||!HK_SERVICE_TYPES.includes(type)){flash("Choose a valid room and request");return}
  const id=Math.max(87000,...state.tickets.map(t=>Number(t.id)||0))+1;
  const now=new Date().toISOString();
  const t={id,room,title:type,team:"Housekeeping",category:type,location:"Room "+room,
   description:description||type,status:"Open",priority:String(f.get("priority")||"Normal"),
   assignee:"Unassigned",employeeId:null,createdAt:now,dueAt:new Date(Date.now()+20*60000).toISOString(),
   history:[],notes:[],attachments:[],links:[]};
  state.tickets.unshift(t);dxEvent(t,"Created","Housekeeping service request");
  closeModal();render();flash("Housekeeping request #"+id+" created");
 });
}
function hkHandover(){
 modal("New Housekeeping passdown",
 '<label>Shift<select name="shift"><option>AM → PM</option><option>PM → Overnight</option><option>Overnight → AM</option></select></label>'+
 '<label>Entered by<input name="author" maxlength="100" required placeholder="Supervisor or dispatcher"></label>'+
 '<label>Outstanding work and instructions<textarea name="text" maxlength="1500" required placeholder="Rooms, pending inspections, service requests, handoff notes"></textarea></label>',
 f=>{
  const text=String(f.get("text")||"").trim(),author=String(f.get("author")||"").trim();
  if(!author||!text){flash("Name and passdown details are required");return}
  state.hkPassdowns.unshift({at:new Date().toISOString(),shift:String(f.get("shift")),author,text});
  save();closeModal();render();flash("Passdown saved");
 });
}
function hkOpenRoom(id){
 if(!hkJob(id))return flash("Housekeeping record not found");
 hkTab="Board";hkFilter="All";hkSearch=String(id);nav("Housekeeping");
}
function hkSetTab(v){if(["Board","Requests","Team","Passdown","Insights"].includes(v)){hkTab=v;render()}}
function hkSetFilter(v){hkFilter=v;render()}
function hkActions(j,r){return hkRoleActions(j,r)}

function hkBoard(){
 hkSyncFromRooms();
 const items=state.hkJobs.filter(j=>{
  const r=hkRoom(j.room);if(!r)return false;
  if(hkRole==="Attendant"&&j.assigneeId!==hkSelectedStaff)return false;
  if(hkFilter==="Needs attention"&&j.stage==="Ready")return false;
  if(hkFilter!=="All"&&hkFilter!=="Needs attention"&&j.stage!==hkFilter)return false;
  return (String(j.room)+" "+j.stage+" "+hkOwner(j)+" "+j.kind).toLowerCase().includes(hkSearch.toLowerCase());
 });
 items.sort((a,b)=>hkPriority(a).tier-hkPriority(b).tier||Number(a.stage==="Ready")-Number(b.stage==="Ready")||a.room-b.room);
 const controls='<div class="hk-filters"><input id="hkSearch" placeholder="Room or attendant" aria-label="Find Housekeeping room" value="'+safe(hkSearch)+'"><select id="hkFilter" aria-label="Filter room work">'+
 svcOpts(["Needs attention","All",...HK_STAGES],hkFilter)+'</select></div>';
 const body=items.map(j=>{
  const r=hkRoom(j.room),priority=hkPriority(j),restricted=hkRestrictions(j),occupancy=hkOccupancy(j.room);
  return '<div class="hk-item"><div class="hk-room-main"><div class="hk-room-title"><strong>Room '+j.room+'</strong><span class="hk-pill">'+safe(j.kind)+'</span>'+(priority.tier<=1?'<span class="hk-tag urgent">'+safe(priority.label)+'</span>':"")+'</div>'+
  '<div class="hk-muted">'+safe(j.stage)+' · '+safe(hkOwner(j))+' · '+safe(occupancy)+' · '+safe(hkCleanliness(j))+'</div>'+
  '<div class="hk-muted">'+hkCredits(j)+' workload credits · '+(priority.arrival?"Next arrival "+safe(priority.arrival):"No upcoming arrival")+
  (restricted.out||restricted.active.length?" · Room release restricted":"")+'</div>'+
  (j.guestPreference?'<div class="hk-muted">Guest preference: '+safe(j.guestPreference)+'</div>':"")+(j.holdReason?'<div class="hk-muted">Hold: '+safe(j.holdReason)+'</div>':"")+'</div><div class="hk-actions">'+hkActions(j,r)+'</div></div>';
 }).join("");
 return '<div class="hk-card">'+controls+'<div class="hk-list">'+(items.length?body:'<div class="hk-empty">No rooms match these filters.</div>')+'</div></div>';
}
function hkRequests(){
 const list=state.tickets.filter(t=>t.team==="Housekeeping").sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 const pending=list.filter(t=>!["Completed","Voided"].includes(t.status));
 return '<div class="hk-card"><div class="hk-subtitle"><strong>Housekeeping requests</strong><span>'+pending.length+' active</span></div>'+
 (list.length?list.slice(0,75).map(t=>'<div class="hk-item"><div><strong>'+safe(t.title)+'</strong><div class="hk-muted">'+safe(t.location||("Room "+t.room))+' · '+safe(t.status)+' · '+safe(t.priority)+'</div></div><div class="hk-actions"><button class="hk-btn" onclick="svcOpen('+t.id+')">Open ticket</button></div></div>').join(""):'<div class="hk-empty">No requests recorded.</div>')+'</div>';
}
function hkTeam(){
 const people=hkStaff();
 return '<div class="hk-card"><div class="hk-subtitle"><strong>Attendants and room allocations</strong><span>'+people.length+' staff</span></div>'+
 people.map(e=>{const jobs=state.hkJobs.filter(j=>j.assigneeId===e.id&&j.stage!=="Ready");
  return '<div class="hk-item"><div><strong>'+safe(e.name)+'</strong><div class="hk-muted">'+safe(e.shift)+' · '+jobs.length+' assigned rooms · '+(e.available?"Available":"Unavailable")+'</div><div class="hk-muted">'+safe(jobs.slice(0,12).map(j=>j.room).join(", ")||"No current rooms")+'</div></div><div class="hk-actions"><button class="hk-btn" onclick="dxToggleEmployee(\''+safe(e.id)+'\')">'+(e.available?"Mark unavailable":"Mark available")+'</button></div></div>';
 }).join("")+'</div>';
}
function hkPassdown(){
 const jobs=state.hkJobs.filter(j=>!["Ready"].includes(j.stage));
 const inspecting=jobs.filter(j=>j.stage==="Awaiting inspection");
 const held=jobs.filter(j=>j.stage==="On hold");
 return '<div class="hk-two"><div class="hk-card"><div class="hk-subtitle"><strong>Outstanding handoff</strong></div>'+
 '<div class="hk-notice">'+jobs.length+' unfinished rooms · '+inspecting.length+' pending inspections · '+held.length+' on hold</div>'+
 jobs.slice(0,20).map(j=>'<div class="hk-item"><div><strong>Room '+j.room+'</strong><div class="hk-muted">'+safe(j.stage)+' · '+safe(hkOwner(j))+'</div></div></div>').join("")+'</div>'+
 '<div class="hk-card"><div class="hk-subtitle"><strong>Shift notes</strong><button class="hk-btn primary" onclick="hkHandover()">+ Passdown</button></div>'+
 (state.hkPassdowns||[]).slice(0,15).map(n=>'<div class="hk-note"><strong>'+safe(n.shift)+'</strong><div class="hk-muted">'+safe(n.author)+' · '+svcTime(n.at)+'</div><p>'+safe(n.text)+'</p></div>').join("")+'</div></div>';
}
function hkPage(){
 hkSyncFromRooms();
 const jobs=state.hkJobs,active=jobs.filter(x=>x.stage!=="Ready"),inspect=jobs.filter(x=>x.stage==="Awaiting inspection"),
 held=jobs.filter(x=>x.stage==="On hold"),requests=state.tickets.filter(t=>t.team==="Housekeeping"&&!["Completed","Voided"].includes(t.status));
 const available=hkStaff();
 const roleSwitch='<div class="hk-mode"><label>Workspace <select id="hkRoleSelect" aria-label="Housekeeping workspace" onchange="hkSetRole(this.value)">'+
 svcOpts(["Supervisor","Attendant","Manager"],hkRole)+'</select></label>'+
 (hkRole==="Attendant"?'<label>Employee <select aria-label="Housekeeping employee" onchange="hkSetStaff(this.value)">'+
 available.map(e=>'<option value="'+safe(e.id)+'"'+(hkSelectedStaff===e.id?" selected":"")+'>'+safe(e.name)+'</option>').join("")+'</select></label>':"")+
 '<span class="hk-hint">Demo role preview; production access requires authenticated identities.</span></div>';
 const leadership=hkIsLeader();
 const headerActions=leadership?'<button class="hk-btn primary" onclick="hkAutoAllocate()">Auto-allocate rooms</button><button class="hk-btn" onclick="hkServiceRequest()">+ Guest request</button>':
 '<button class="hk-btn primary" onclick="hkSetTab(\'Board\')">My room queue</button>';
 const tabs=leadership?[["Board","Room board"],["Requests","Guest requests"],["Team","Attendants"],["Passdown","Shift handover"],...(hkRole==="Manager"?[["Insights","Insights & supplies"]]:[])]:
 [["Board","My rooms"],["Requests","Requests"]];
 if(!tabs.some(([v])=>v===hkTab))hkTab="Board";
 const visibleJobs=leadership?active:active.filter(j=>j.assigneeId===hkSelectedStaff);
 return '<section class="hk-shell"><div class="hk-hero"><div><div class="h4-eyebrow">DEPARTMENT OPERATIONS</div><h1>Housekeeping</h1><p>Cleaning, inspections and guest service—organized for each role.</p></div><div class="hk-actions">'+headerActions+'</div></div>'+
 roleSwitch+
 '<div class="hk-metrics"><div><strong>'+visibleJobs.length+'</strong><span>'+(leadership?"Rooms needing attention":"My remaining rooms")+'</span></div>'+
 '<div><strong>'+inspect.filter(j=>leadership||j.assigneeId===hkSelectedStaff).length+'</strong><span>Awaiting inspection</span></div>'+
 '<div><strong>'+held.filter(j=>leadership||j.assigneeId===hkSelectedStaff).length+'</strong><span>On hold</span></div>'+
 '<div><strong>'+requests.length+'</strong><span>Guest requests</span></div></div>'+
 '<div class="hk-tabs">'+tabs.map(([value,label])=>'<button class="'+(hkTab===value?"active":"")+'" onclick="hkSetTab(\''+value+'\')">'+label+'</button>').join("")+'</div>'+
(hkTab==="Board"?hkBoard():hkTab==="Requests"?hkRequests():hkTab==="Team"?hkTeam():hkTab==="Passdown"?hkPassdown():hkInsights())+
 '<p class="hk-foot">Shared inventory · occupancy, cleaning, inspection and maintenance restrictions are tracked independently. Synthetic browser-local demonstration.</p></section>';
}

/* Housekeeping V2 — role-aware tasks, room prioritization, and inspection safety. */
function hkIsLeader(){return hkRole==="Supervisor"||hkRole==="Manager"}
function hkSetRole(role){if(!["Supervisor","Manager","Attendant"].includes(role))return;hkRole=role;hkTab=role==="Attendant"?"Board":hkTab;if(role==="Attendant"&&!hkSelectedStaff)hkSelectedStaff=hkStaff()[0]?.id||"";render()}
function hkSetStaff(id){if(hkStaff().some(e=>e.id===id)){hkSelectedStaff=id;render()}}
function hkOccupancy(id){
 const room=hkRoom(id);
 if(!room)return "Unknown";
 if(state.reservations.some(x=>Number(x.room)===Number(id)&&x.status==="Checked in"))return "Occupied";
 if(room.status==="occupied")return "Occupied";
 return "Vacant";
}
function hkCleanliness(job){return job.cleanliness||((job.stage==="Ready")?"Clean":(job.stage==="Awaiting inspection")?"Inspection":"Dirty")}
function hkRestrictions(job){
 const room=hkRoom(job.room);
 const active=(job.maintenanceBlocks||[]).filter(id=>{
  const t=dxTicket(id);
  return t&&!["Completed","Voided"].includes(t.status);
 });
 return {out:room?.status==="out",active};
}
function hkCanInspect(job){
 if(!hkIsLeader()||job.stage!=="Awaiting inspection")return false;
 const restriction=hkRestrictions(job);
 return !restriction.out&&!restriction.active.length&&HK_INSPECTION.every(k=>job.checklist?.[k]===true);
}
function hkCheck(id,key,value){
 const job=hkJob(id);if(!job||!hkIsLeader()||job.stage!=="Awaiting inspection"||!HK_INSPECTION.includes(key))return false;
 if(!job.checklist)job.checklist={};
 job.checklist[key]=Boolean(value);save();render();return true;
}
function hkInspection(id){
 const j=hkJob(id);if(!j||j.stage!=="Awaiting inspection"||!hkIsLeader())return flash("Inspection requires a supervisor and submitted room");
 const checks=HK_INSPECTION.map((name,i)=>'<label class="hk-check"><input type="checkbox" name="inspection'+i+'" '+(j.checklist?.[name]?"checked":"")+'><span>'+safe(name)+'</span></label>').join("");
 const blocks=hkRestrictions(j);
 modal("Inspect room "+id,'<div class="hk-inspect-summary">Room '+id+' · '+safe(j.kind)+' · '+safe(hkOwner(j))+'</div>'+
 (blocks.out||blocks.active.length?'<div class="hk-notice">Room restriction: '+(blocks.out?"Out of order":blocks.active.length+" unresolved Engineering work order(s)")+'</div>':"")+
 '<div class="hk-checklist">'+checks+'</div><p class="hk-hint">All checks must pass before the room can be released. If any item fails, use “Fail inspection” on the board and document the deficiency.</p>',
 f=>{
  j.checklist={};
  HK_INSPECTION.forEach((name,i)=>{j.checklist[name]=f.get("inspection"+i)!==null});
  save();
  if(hkUpdate(id,"Approve"))closeModal();
 });
}
function hkArrivalTarget(job){
 const arrivals=state.reservations.filter(r=>Number(r.room)===Number(job.room)&&r.status==="Reserved"&&r.arrival>=DEMO_DATE);
 return arrivals.sort((a,b)=>String(a.arrival).localeCompare(String(b.arrival)))[0]||null;
}
function hkPriority(job){
 const arrival=hkArrivalTarget(job),restriction=hkRestrictions(job);
 const t=arrival?.arrival||null;
 const urgent=t===DEMO_DATE&&job.stage!=="Ready";
 const vip=Boolean(arrival?.vip||arrival?.profile?.vip);
 return {tier:restriction.out||restriction.active.length?3:urgent?0:vip?1:job.priority==="High"?1:2,
  label:restriction.out||restriction.active.length?"Restricted":urgent?"Arrival today":vip?"VIP arrival":job.priority==="High"?"High":"Routine",
  arrival:arrival?.arrival||null};
}
function hkCredits(j){return HK_CREDITS[j.kind]||3}
function hkCurrentLoad(employeeId){return state.hkJobs.filter(j=>j.assigneeId===employeeId&&!["Ready","On hold"].includes(j.stage)).reduce((sum,j)=>sum+hkCredits(j),0)}
function hkFloor(roomId){return Math.floor(Number(roomId)/100)}
function hkSuggestAssignee(job){
 const candidates=hkStaff().filter(e=>e.available);
 if(!candidates.length)return null;
 return candidates.sort((a,b)=>{
  const aFloor=state.hkJobs.filter(j=>j.assigneeId===a.id&&!["Ready","On hold"].includes(j.stage)&&hkFloor(j.room)===hkFloor(job.room)).length;
  const bFloor=state.hkJobs.filter(j=>j.assigneeId===b.id&&!["Ready","On hold"].includes(j.stage)&&hkFloor(j.room)===hkFloor(job.room)).length;
  return (hkCurrentLoad(a.id)-Math.min(2,aFloor))-(hkCurrentLoad(b.id)-Math.min(2,bFloor))||a.name.localeCompare(b.name);
 })[0];
}
function hkAutoAllocate(){
 if(!hkIsLeader())return false;
 let count=0;
 const list=state.hkJobs.filter(j=>j.stage==="Unassigned"&&!hkRestrictions(j).out&&!hkRestrictions(j).active.length)
  .sort((a,b)=>hkPriority(a).tier-hkPriority(b).tier||a.room-b.room);
 for(const job of list){
  const employee=hkSuggestAssignee(job);
  if(!employee)break;
  job.assigneeId=employee.id;job.stage="Assigned";job.lastUpdate=new Date().toISOString();
  hkLog(job,"Workload allocation",employee.name+" · "+hkCredits(job)+" credits · supervisor reviewable");
  count++;
 }
 save();render();flash(count+" rooms allocated using available workload");return count;
}
function hkReportDefect(id){
 const job=hkJob(id),r=hkRoom(id);
 if(!job||!r)return;
 modal("Report maintenance issue · Room "+id,
 '<label>Issue description<input name="issue" required maxlength="400" placeholder="What needs to be repaired?"></label>'+
 '<label>Safety or room-release restriction<select name="block"><option value="yes">Block room release</option><option value="no">Non-blocking repair</option></select></label>',
 f=>{
  const issue=String(f.get("issue")||"").trim(),block=f.get("block")==="yes";
  if(!issue)return flash("Describe the issue");
  const idNew=Math.max(88000,...state.tickets.map(x=>Number(x.id)||0))+1,now=new Date().toISOString();
  const ticket={id:idNew,title:"Room "+id+" · "+issue.slice(0,90),team:"Engineering",category:"Maintenance defect",
   room:id,location:"Room "+id,priority:block?"High":"Normal",description:issue,status:"Open",
   assignee:"Unassigned",employeeId:null,createdAt:now,dueAt:new Date(Date.now()+30*60000).toISOString(),
   history:[],notes:[],links:[],attachments:[],hkBlockRoom:block};
  state.tickets.unshift(ticket);
  if(block){job.maintenanceBlocks=job.maintenanceBlocks||[];job.maintenanceBlocks.push(ticket.id)}
  hkLog(job,"Engineering work requested",ticket.title+(block?" · room release blocked":""));
  dxEvent(ticket,"Created","Housekeeping reported maintenance defect");
  save();closeModal();render();flash("Engineering request #"+idNew+" created");
 });
}

function hkSetPreference(id){
 if(!hkIsLeader())return flash("Supervisor access required");
 const job=hkJob(id);if(!job)return;
 modal("Guest preference · Room "+id,
 '<label>Service preference<select name="preference">'+
 ["None","Do Not Disturb","Refused service","Privacy requested"].map(x=>'<option value="'+safe(x)+'"'+((job.guestPreference||"None")===x?" selected":"")+'>'+safe(x)+'</option>').join("")+
 '</select></label><label>Required note<input name="reason" required maxlength="400" placeholder="Guest instruction or follow-up details"></label>',
 f=>{
  const pref=String(f.get("preference")||"None"),note=String(f.get("reason")||"").trim();
  if(!note||!["None","Do Not Disturb","Refused service","Privacy requested"].includes(pref))return flash("Document the change");
  job.guestPreference=pref==="None"?"":pref;
  if(pref!=="None"&&["Assigned","Unassigned"].includes(job.stage)){job.stage="On hold";job.holdReason=pref}
  if(pref==="None"&&job.stage==="On hold"&&["Do Not Disturb","Refused service","Privacy requested"].includes(job.holdReason||"")){job.stage=job.assigneeId?"Assigned":"Unassigned";job.holdReason=""}
  hkLog(job,"Guest preference updated",pref+" · "+note);
  closeModal();render();
 });
}
function hkSupplyAdjust(){
 if(hkRole!=="Manager")return flash("Manager access required");
 modal("Record supply movement",
 '<label>Supply<select name="stock">'+state.hkSupplies.map(x=>'<option value="'+safe(x.id)+'">'+safe(x.name)+' · '+x.quantity+' '+safe(x.unit)+'</option>').join("")+'</select></label>'+
 '<label>Movement<select name="direction"><option value="consume">Consumed / issued</option><option value="receive">Received / replenished</option></select></label>'+
 '<label>Quantity<input type="number" name="quantity" min="1" max="10000" required></label>'+
 '<label>Reference / reason<input name="reason" required maxlength="250" placeholder="Delivery, floor supply, or issue"></label>',
 f=>{
  const stock=state.hkSupplies.find(x=>x.id===f.get("stock")),quantity=Number(f.get("quantity")),direction=String(f.get("direction")),reason=String(f.get("reason")||"").trim();
  if(!stock||!Number.isInteger(quantity)||quantity<=0||quantity>10000||!reason||!["consume","receive"].includes(direction))return flash("Enter a valid supply movement");
  if(direction==="consume"&&quantity>stock.quantity)return flash("Insufficient on-hand inventory");
  stock.quantity+=direction==="receive"?quantity:-quantity;
  state.hkSupplyLog.unshift({at:new Date().toISOString(),id:stock.id,quantity,direction,reason,actor:"Manager (demo)"});
  activity("Housekeeping supplies · "+stock.name+" · "+direction+" "+quantity);
  save();closeModal();render();
 });
}
function hkInsights(){
 const jobs=state.hkJobs,completed=jobs.filter(j=>j.stage==="Ready"&&j.inspectedAt),failed=jobs.flatMap(j=>j.history||[]).filter(h=>h.event==="Inspection failed").length;
 const m=jobs.reduce((x,j)=>x+((j.stage==="Ready"||j.stage==="On hold")?0:hkCredits(j)),0);
 const discrepancies=state.rooms.filter(r=>r.status==="occupied"&&!state.reservations.some(x=>Number(x.room)===Number(r.id)&&x.status==="Checked in"));
 const rows='<div class="hk-card"><div class="hk-subtitle"><strong>Quality and workload</strong><span>Demo records</span></div>'+
 '<div class="hk-item"><div><strong>Inspected rooms</strong><div class="hk-muted">'+completed.length+' recorded approvals</div></div></div>'+
 '<div class="hk-item"><div><strong>Inspection corrections</strong><div class="hk-muted">'+failed+' failed checks</div></div></div>'+
 '<div class="hk-item"><div><strong>Open workload</strong><div class="hk-muted">'+m+' cleaning credits across active rooms</div></div></div>'+
 '<div class="hk-item"><div><strong>Occupancy reconciliation</strong><div class="hk-muted">'+discrepancies.length+' inventory/PMS mismatches in demo data · verify before action</div></div></div>'+
 '<div class="hk-notice">Metrics reflect illustrative browser data. They do not measure staff performance or replace verified labor records.</div></div>';
 const supplies='<div class="hk-card"><div class="hk-subtitle"><strong>Housekeeping supplies</strong><button class="hk-btn primary" onclick="hkSupplyAdjust()">Record movement</button></div>'+
 state.hkSupplies.map(x=>'<div class="hk-item"><div><strong>'+safe(x.name)+'</strong><div class="hk-muted">'+x.quantity+' '+safe(x.unit)+' on hand · reorder at '+x.reorderAt+'</div></div>'+(x.quantity<=x.reorderAt?'<span class="hk-tag urgent">Low stock</span>':"")+'</div>').join("")+
 '<div class="hk-subtitle" style="margin-top:12px"><strong>Recent movements</strong></div>'+
 (state.hkSupplyLog||[]).slice(0,8).map(x=>'<div class="hk-note"><strong>'+safe(x.direction)+' · '+x.quantity+'</strong><div class="hk-muted">'+safe(x.reason)+' · '+svcTime(x.at)+'</div></div>').join("")+
 '</div>';
 return '<div class="hk-two">'+rows+supplies+'</div>';
}
function hkRoleActions(job,r){
 const buttons=[];
 if(hkRole==="Attendant"){
  if(job.assigneeId!==hkSelectedStaff)return "";
  if(job.stage==="Assigned")buttons.push(["Start","Start cleaning"]);
  if(job.stage==="In progress")buttons.push(["Submit","Submit to supervisor"]);
 }else{
  if(job.stage==="Unassigned")buttons.push(["Assign","Assign"]);
  if(job.stage==="Assigned")buttons.push(["Assign","Reassign"],["Start","Start"]);
  if(job.stage==="In progress")buttons.push(["Submit","Submit"]);
  if(job.stage==="Awaiting inspection")buttons.push(["Inspect","Inspect"],["Fail","Fail"]);
  if(job.stage==="On hold"&&r.status!=="out")buttons.push(["Resume","Resume"]);
  if(job.stage==="Ready")buttons.push(["Service","New clean"]);
  if(!["Ready","On hold"].includes(job.stage))buttons.push(["Hold","Hold"]);
 }
 const html=buttons.map(([action,label])=>'<button class="hk-btn'+(["Start","Submit","Inspect"].includes(action)?" primary":"")+'" onclick="'+(action==="Inspect"?"hkInspection("+job.room+")":"hkPrompt("+job.room+",'"+action+"')")+'">'+label+'</button>').join("");
 return html+(hkIsLeader()?'<button class="hk-btn" onclick="hkSetPreference('+job.room+')">Preference</button>':"")+'<button class="hk-btn" onclick="hkReportDefect('+job.room+')">Repair</button>';
}

hkSeed();
