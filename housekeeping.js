/* Housekeeping department — synthetic, browser-local operational workflows. */
const HK_STAGES=["Unassigned","Assigned","In progress","Awaiting inspection","Ready","On hold"];
const HK_SERVICE_TYPES=["Extra towels","Extra linens","Turndown service","Pillows and bedding","Bathroom amenities","Room refresh","Deep cleaning","Spill cleanup","Laundry pickup","DND follow-up"];
let hkTab="Board",hkFilter="Needs attention",hkSearch="";
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
  job.stage="In progress";job.startedAt=new Date().toISOString();hkLog(job,"Cleaning started",hkOwner(job));
 }else if(action==="Submit"){
  if(job.stage!=="In progress"){flash("Start cleaning before submitting");return false}
  job.stage="Awaiting inspection";job.finishedAt=new Date().toISOString();hkLog(job,"Submitted for inspection","Cleaning completed; awaiting supervisor review");
 }else if(action==="Approve"){
  if(job.stage!=="Awaiting inspection"){flash("Room must be submitted for inspection");return false}
  job.stage="Ready";job.inspectedAt=new Date().toISOString();job.inspectionRequired=false;
  // Occupied stayover rooms remain occupied; departure turnovers become available.
  if(room.status==="dirty")room.status="ready";
  hkLog(job,"Inspection passed","Room cleared for Front Office");
 }else if(action==="Fail"){
  if(job.stage!=="Awaiting inspection"||!String(value).trim()){flash("Inspection failure requires a reason");return false}
  job.stage="Assigned";job.inspectionRequired=true;hkLog(job,"Inspection failed",String(value).trim());
 }else if(action==="Hold"){
  if(!["Unassigned","Assigned","In progress","Awaiting inspection"].includes(job.stage)||!String(value).trim()){flash("Hold reason required");return false}
  job.stage="On hold";job.holdReason=String(value).trim();hkLog(job,"On hold",job.holdReason);
 }else if(action==="Resume"){
  if(job.stage!=="On hold"||closed){flash("Resolve out-of-order status before resuming");return false}
  job.stage=job.assigneeId?"Assigned":"Unassigned";job.holdReason="";hkLog(job,"Resumed","Returned to cleaning queue");
 }else if(action==="Service"){
  if(room.status==="out"){flash("Room is out of order");return false}
  if(job.stage!=="Ready"){flash("Room already has a cleaning workflow");return false}
  job.kind=value==="Stayover"?"Stayover":"Departure";
  job.stage="Unassigned";job.assigneeId=null;job.inspectionRequired=true;job.startedAt=null;job.finishedAt=null;job.inspectedAt=null;
  if(job.kind==="Departure")room.status="dirty";
  hkLog(job,"Service requested",job.kind);
 }else return false;
 job.lastUpdate=new Date().toISOString();save();render();return true;
}
function hkPrompt(id,action){
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
  modal("Schedule room "+id+" cleaning",'<label>Cleaning type<select name="kind"><option>Departure</option><option>Stayover</option></select></label>',
  f=>{if(hkUpdate(id,"Service",String(f.get("kind")||"Departure")))closeModal()});
 }else hkUpdate(id,action);
}
function hkSyncFromRooms(){
 // Only add metadata for new rooms; do not overwrite an active cleaning job.
 const exists=new Set((state.hkJobs||[]).map(j=>j.room));
 for(const r of state.rooms){
  if(exists.has(r.id))continue;
  state.hkJobs.push({room:r.id,kind:"Departure",stage:r.status==="dirty"?"Unassigned":r.status==="out"?"On hold":"Ready",assigneeId:null,
   priority:"Normal",inspectionRequired:r.status==="dirty",history:[],lastUpdate:new Date().toISOString()});
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
function hkSetTab(v){if(["Board","Requests","Team","Passdown"].includes(v)){hkTab=v;render()}}
function hkSetFilter(v){hkFilter=v;render()}
function hkActions(j,r){
 const buttons=[];
 if(j.stage==="Unassigned")buttons.push(["Assign","Assign"]);
 if(j.stage==="Assigned")buttons.push(["Assign","Reassign"],["Start","Start"]);
 if(j.stage==="In progress")buttons.push(["Submit","Submit for inspection"]);
 if(j.stage==="Awaiting inspection")buttons.push(["Approve","Pass"],["Fail","Fail"]);
 if(j.stage==="On hold"&&r.status!=="out")buttons.push(["Resume","Resume"]);
 if(j.stage==="Ready")buttons.push(["Service","Schedule cleaning"]);
 if(!["Ready","On hold"].includes(j.stage))buttons.push(["Hold","Hold"]);
 return buttons.map(([action,label])=>'<button class="hk-btn'+(["Start","Approve","Submit"].includes(action)?" primary":"")+'" onclick="hkPrompt('+j.room+',\''+action+'\')">'+label+'</button>').join("");
}
function hkBoard(){
 hkSyncFromRooms();
 const items=state.hkJobs.filter(j=>{
  const r=hkRoom(j.room);
  if(!r)return false;
  if(hkFilter==="Needs attention"&&j.stage==="Ready")return false;
  if(hkFilter!=="All"&&hkFilter!=="Needs attention"&&j.stage!==hkFilter)return false;
  return (String(j.room)+" "+j.stage+" "+hkOwner(j)+" "+j.kind).toLowerCase().includes(hkSearch.toLowerCase());
 });
 items.sort((a,b)=>Number(a.stage==="Ready")-Number(b.stage==="Ready")||Number(b.priority==="High")-Number(a.priority==="High")||a.room-b.room);
 const controls='<div class="hk-filters"><input id="hkSearch" placeholder="Room or attendant" aria-label="Find Housekeeping room" value="'+safe(hkSearch)+'"><select id="hkFilter" aria-label="Filter room work">'+
 svcOpts(["Needs attention","All",...HK_STAGES],hkFilter)+'</select></div>';
 return '<div class="hk-card">'+controls+'<div class="hk-list">'+(items.length?items.map(j=>{
  const r=hkRoom(j.room),out=r.status==="out";
  return '<div class="hk-item"><div><strong>Room '+j.room+'</strong> <span class="hk-pill">'+safe(j.kind)+'</span><div class="hk-muted">'+safe(j.stage)+' · '+safe(hkOwner(j))+' · Inventory: '+safe(r.status)+(out?' · Engineering hold':"")+'</div>'+(j.holdReason?'<div class="hk-muted">Hold: '+safe(j.holdReason)+'</div>':"")+'</div><div class="hk-actions">'+hkActions(j,r)+'</div></div>';
 }).join(""):'<div class="hk-empty">No rooms match these filters.</div>')+'</div></div>';
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
 const j=state.hkJobs,attention=j.filter(x=>!["Ready"].includes(x.stage)),inspect=j.filter(x=>x.stage==="Awaiting inspection"),held=j.filter(x=>x.stage==="On hold"),req=state.tickets.filter(t=>t.team==="Housekeeping"&&!["Completed","Voided"].includes(t.status));
 return '<section class="hk-shell">'+
 '<div class="hk-hero"><div><div class="h4-eyebrow">DEPARTMENT OPERATIONS</div><h1>Housekeeping</h1><p>Cleaning assignments, inspections, guest services and shift coordination.</p></div><div class="hk-actions"><button class="hk-btn primary" onclick="hkServiceRequest()">+ Guest request</button><button class="hk-btn" onclick="hkHandover()">New passdown</button></div></div>'+
 '<div class="hk-metrics"><div><strong>'+attention.length+'</strong><span>Rooms needing attention</span></div><div><strong>'+inspect.length+'</strong><span>Awaiting inspection</span></div><div><strong>'+held.length+'</strong><span>On hold</span></div><div><strong>'+req.length+'</strong><span>Active guest requests</span></div></div>'+
 '<div class="hk-tabs">'+[["Board","Room board"],["Requests","Guest requests"],["Team","Attendants"],["Passdown","Shift handover"]].map(([value,label])=>'<button class="'+(hkTab===value?"active":"")+'" onclick="hkSetTab(\''+value+'\')">'+label+'</button>').join("")+'</div>'+
 (hkTab==="Board"?hkBoard():hkTab==="Requests"?hkRequests():hkTab==="Team"?hkTeam():hkPassdown())+
 '<p class="hk-foot">Shared room status: a completed departure-room inspection updates Front Office room readiness. Occupied stayover rooms remain occupied. Synthetic browser-local demonstration.</p></section>';
}
hkSeed();
