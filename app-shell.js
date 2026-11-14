/* Hestia v4 — consolidated app shell.
   One stable menu. Contextual tabs preserve every existing module and record. */
const H4_MENU=[
 ["Overview","◫"],["Reservations","▤"],["Front Desk","◈"],["Rooms","▦"],["Housekeeping","✦"],
 ["Service Dispatch","⚒"],["Security","◇"],["Financials","▥"],["Operations","▧"]
];
let h4RoomMode="Rooms",h4StayMode="Reservations",h4OpsMode="Summary",h4RoomFilter="All";
const h4Active=t=>!["Completed","Voided"].includes(t.status);
const h4Staff=()=>Array.isArray(state.dxEmployees)?state.dxEmployees:[];
function h4NavGroup(p){
 if(["Reservation Detail","Guests","Reservations"].includes(p))return "Reservations";
 if(p==="Rooms")return "Rooms";
 if(["Operations","Workforce","Intelligence"].includes(p))return "Operations";
 return p;
}
function h4MenuMarkup(){
 const selected=h4NavGroup(page);
 return H4_MENU.map(([name,glyph])=>
  '<button class="'+(name===selected?"active":"")+'" aria-current="'+(name===selected?"page":"false")+'" onclick="nav(\''+name+'\')" data-page="'+name+'"><span class="glyph">'+glyph+'</span>'+name.replace("Service Dispatch","Dispatch")+'</button>'
 ).join("");
}
function h4Tabs(items,selected,fn){
 return '<div class="h4-tabs" role="navigation" aria-label="Section navigation">'+items.map(([name,label])=>
  '<button aria-current="'+(selected===name?"page":"false")+'" onclick="'+fn+'(\''+name+'\')">'+label+'</button>').join("")+'</div>';
}
function h4Hero(name,description,actions=""){
 return '<div class="h4-hero"><div><div class="h4-eyebrow">HESTIA / HOTEL OPERATIONS</div><h1>'+safe(name)+'</h1><p>'+safe(description)+'</p></div><div class="h4-actions">'+actions+'</div></div>';
}
const h4Btn=(text,fn,main=false)=>'<button class="h4-btn'+(main?" main":"")+'" onclick="'+fn+'">'+safe(text)+'</button>';
const h4Num=n=>Number(n||0).toLocaleString("en-US");
function h4Metric(name,value){return '<div class="h4-metric"><strong>'+safe(value)+'</strong><span>'+safe(name)+'</span></div>'}
function h4Overview(){
 const inhouse=state.reservations.filter(r=>r.status==="Checked in"),arrivals=state.reservations.filter(r=>r.arrival===DEMO_DATE&&r.status==="Reserved");
 const active=state.tickets.filter(h4Active),needs=active.filter(t=>!t.employeeId||Date.parse(t.dueAt)<Date.now()),dirty=state.rooms.filter(r=>r.status==="dirty");
 const next=active.slice().sort((a,b)=>{
  const severity=t=>((t.priority==="Critical")?0:(t.priority==="High")?1:2);
  return severity(a)-severity(b)||Date.parse(a.dueAt||0)-Date.parse(b.dueAt||0);
 }).slice(0,7);
 const actions='<div class="h4-actions">'+h4Btn("New guest request","fo3Request()",true)+h4Btn("New reservation","openReservation()")+'</div>';
 const overview='<div class="h4-metrics">'+h4Metric("In-house guests",h4Num(inhouse.length))+h4Metric("Arrivals today",h4Num(arrivals.length))+h4Metric("Active requests",h4Num(active.length))+h4Metric("Rooms to service",h4Num(dirty.length))+'</div>';
 const requests='<div class="h4-card"><h2>Priority requests</h2>'+
 (next.length?next.map(t=>'<div class="h4-queue"><div><b>'+safe(t.title)+'</b><small>'+safe(t.team)+' · '+safe(t.location||"Property")+' · '+safe(t.status)+'</small></div><button onclick="svcOpen('+t.id+')">Open</button></div>').join(""):'<div class="h4-empty">No active requests</div>')+
 '<div style="margin-top:12px">'+h4Btn("All requests","nav('Service Dispatch')")+'</div></div>';
 const rooms='<div class="h4-card"><h2>Today’s operations</h2>'+
 '<div class="h4-queue"><div><b>Arrivals</b><small>'+arrivals.length+' reservations due today</small></div>'+h4Btn("View","nav('Reservations')")+'</div>'+
 '<div class="h4-queue"><div><b>Guest service</b><small>'+needs.length+' requests unassigned or past target</small></div>'+h4Btn("Open","nav('Front Desk')")+'</div>'+
 '<div class="h4-queue"><div><b>Housekeeping</b><small>'+dirty.length+' rooms need attention</small></div>'+h4Btn("Open Housekeeping","nav('Housekeeping')")+'</div>'+
 '<div class="h4-soft" style="margin-top:15px">Demo property · '+state.rooms.length+' sample rooms · no live guest or payment processing</div></div>';
 return h4Hero("Property overview","What needs attention across the hotel.",actions)+overview+'<div class="h4-grid">'+requests+rooms+'</div>';
}
function h4SwitchStay(mode){h4StayMode=mode;page=mode;render()}
function h4SwitchOps(mode){h4OpsMode=mode;page=mode==="Summary"?"Operations":mode;render()}
function h4RoomPage(){
 const ready=state.rooms.filter(r=>r.status==="ready"&&(typeof hkReadyForArrival!=="function"||hkReadyForArrival(r.id))),occupied=state.rooms.filter(r=>r.status==="occupied"),
 dirty=state.rooms.filter(r=>r.status==="dirty"),out=state.rooms.filter(r=>r.status==="out");
 const stats='<div class="h4-metrics">'+h4Metric("Ready",ready.length)+h4Metric("Occupied",occupied.length)+
 h4Metric("Needs service",dirty.length)+h4Metric("Out of order",out.length)+'</div>';
 const rooms=state.rooms.filter(r=>h4RoomFilter==="All"||r.status===h4RoomFilter);
 const list='<div class="h4-card"><div class="h4-filter"><select id="h4RoomFilter" aria-label="Room status filter">'+
 svcOpts(["All","ready","occupied","dirty","out"],h4RoomFilter)+'</select></div>'+
 '<div class="h4-roomset">'+rooms.map(r=>{const display=r.status==="ready"&&typeof hkReadyForArrival==="function"&&!hkReadyForArrival(r.id)?"restricted":r.status;return '<button class="'+safe(display)+'" onclick="hkOpenRoom('+r.id+')" aria-label="View Housekeeping record for room '+r.id+', '+safe(display)+'">'+r.id+'<small>'+safe(display)+'</small></button>'}).join("")+'</div>'+
 '<p class="h4-small" style="margin-top:12px">Open any room to review its Housekeeping record. Only a completed room inspection clears dirty-room readiness.</p></div>';
 return h4Hero("Rooms","Inventory and availability shared with Front Office and Housekeeping.",
 h4Btn("Open Housekeeping","nav('Housekeeping')"))+stats+list;
}
function h4StayPage(){
 const selected=page==="Guests"?"Guests":"Reservations";
 const tabs=h4Tabs([["Reservations","Reservations"],["Guests","Guest directory"]],selected,"h4SwitchStay");
 return tabs+(selected==="Guests"?guestListing():reservations());
}
function h4Operations(){
 const active=state.tickets.filter(h4Active),done=state.tickets.filter(t=>t.status==="Completed");
 const dept=[...new Set(state.tickets.map(t=>t.team))].filter(Boolean).sort();
 const metrics='<div class="h4-metrics">'+h4Metric("Recorded requests",state.tickets.length)+h4Metric("Completed",done.length)+h4Metric("Active",active.length)+h4Metric("On-duty profiles",h4Staff().filter(e=>e.available).length)+'</div>';
 const lines=dept.map(team=>{const list=state.tickets.filter(t=>t.team===team);return '<div class="h4-queue"><div><b>'+safe(team)+'</b><small>'+list.filter(h4Active).length+' active / '+list.length+' total</small></div></div>'}).join("");
 const exports='<div class="h4-card"><h2>Data and tools</h2><p class="muted" style="margin-bottom:13px">Reports describe synthetic demonstration records, not operational results.</p>'+h4Btn("Export demo data","exportDemo()")+'<div class="h4-soft" style="margin-top:17px">For shift rosters, availability, scheduled tasks and detailed dispatch analytics, open Dispatch → Team, Scheduled, or Reports.</div></div>';
 return metrics+'<div class="h4-grid"><div class="h4-card"><h2>Department workload</h2>'+lines+'</div>'+exports+'</div>';
}
function h4Workforce(){
 const people=h4Staff();
 return '<div class="h4-metrics">'+h4Metric("Team profiles",people.length)+h4Metric("Available",people.filter(x=>x.available).length)+h4Metric("Departments",new Set(people.map(x=>x.team)).size)+h4Metric("Active requests",state.tickets.filter(h4Active).length)+'</div>'+
 '<div class="h4-card"><h2>Team directory</h2>'+people.slice().sort((a,b)=>a.team.localeCompare(b.team)||a.name.localeCompare(b.name)).map(e=>'<div class="h4-queue"><div><b>'+safe(e.name)+'</b><small>'+safe(e.team)+' · '+safe(e.shift)+' shift</small></div><span class="badge">'+(e.available?"Available":"Unavailable")+'</span></div>').join("")+'</div>';
}
function h4Insight(){
 const total=state.tickets.length,done=state.tickets.filter(t=>t.status==="Completed").length;
 return '<div class="h4-metrics">'+h4Metric("Tickets",total)+h4Metric("Completion",total?Math.round(done/total*100)+"%":"—")+h4Metric("Dirty rooms",state.rooms.filter(r=>r.status==="dirty").length)+h4Metric("In-house",state.reservations.filter(r=>r.status==="Checked in").length)+'</div>'+
 '<div class="h4-grid"><div class="h4-card"><h2>Department performance</h2>'+[...new Set(state.tickets.map(t=>t.team))].filter(Boolean).map(team=>{const ts=state.tickets.filter(x=>x.team===team);return '<div class="h4-queue"><div><b>'+safe(team)+'</b><small>'+ts.filter(t=>t.status==="Completed").length+' completed · '+ts.filter(h4Active).length+' active</small></div></div>'}).join("")+'</div><div class="h4-card"><h2>Source and limitations</h2><div class="h4-soft">Calculated from this browser’s synthetic hotel records. Hestia does not yet provide verified revenue, guest satisfaction, cross-property reporting or real-time workforce synchronization.</div>'+h4Btn("Export records","exportDemo()")+'</div></div>';
}
function h4OpsPage(){
 const selected=page==="Intelligence"?"Intelligence":page==="Workforce"?"Workforce":"Summary";
 const tabs=h4Tabs([["Summary","Summary"],["Workforce","Team"],["Intelligence","Analytics"]],selected,"h4SwitchOps");
 const content=selected==="Workforce"?h4Workforce():selected==="Intelligence"?h4Insight():h4Operations();
 return h4Hero("Operations","Team, reporting and administration.")+tabs+content;
}
function h4Page(){
 if(page==="Overview")return h4Overview();
 if(page==="Rooms")return h4RoomPage();
 if(page==="Housekeeping")return hkPage();
 if(page==="Guests"||page==="Reservations")return h4StayPage();
 if(["Operations","Workforce","Intelligence"].includes(page))return h4OpsPage();
 return null;
}
// A single render path for the complete website; do not chain the legacy
// renderers (which previously populated and replaced the same DOM twice).
render=function(){
 const override=h4Page();
 let markup=override;
 if(markup===null){
  const views={"Front Desk":desk,"Service Dispatch":services,"Security":security,"Financials":finances};
  if(page==="Reservation Detail")markup=detailPage();
  else markup=(views[page]||h4Overview)();
 }
 document.getElementById("content").innerHTML=markup+
  '<div class="footer">HESTIA · Synthetic data · Public interactive preview</div>';
 document.getElementById("nav").innerHTML=h4MenuMarkup();
 const dt=document.querySelector?.(".topright .desktop");
 if(dt)dt.textContent="Business date · "+DEMO_DATE;
 // Bind only controls belonging to the currently displayed screen.
 function searchControl(inputId,update){
  const input=document.getElementById(inputId);
  if(!input)return;
  input.oninput=e=>{
   update(e.target.value);
   const caret=e.target.selectionStart;
   render();
   const next=document.getElementById(inputId);
   if(next){next.focus();if(typeof next.setSelectionRange==="function")next.setSelectionRange(caret,caret)}
  };
 }
 const roomFilter=document.getElementById("h4RoomFilter");
 if(roomFilter)roomFilter.onchange=e=>{h4RoomFilter=e.target.value;render()};
 const hkFilterInput=document.getElementById("hkFilter");
 if(hkFilterInput)hkFilterInput.onchange=e=>hkSetFilter(e.target.value);
 searchControl("hkSearch",value=>{hkSearch=value});
 searchControl("fo3Search",value=>{fo3Search=value});
 const foStatus=document.getElementById("fo3Status");
 if(foStatus)foStatus.onchange=e=>fo3SetStatus(e.target.value);
 const guestSearchId=document.getElementById("reservationSearch")?"reservationSearch":"guestSearch";
 searchControl(guestSearchId,value=>{reservationSearch=value});
 if(page==="Service Dispatch"&&svcSelected===null){
  const filter=document.getElementById("dxDept"),status=document.getElementById("dcStatus");
  if(filter)filter.onchange=e=>{dxDepartment=e.target.value;render()};
  if(status)status.onchange=e=>dcFilterSet(e.target.value);
  searchControl("dxSearch",value=>{dxSearch=value});
 }
};
const h4PreviousNav=nav;
nav=function(next){
 if(next==="Reservations")h4StayMode="Reservations";
 if(next==="Rooms")h4RoomMode="Rooms";
 if(next==="Operations")h4OpsMode="Summary";
 h4PreviousNav(next);
};
resetDemo=function(){
 if(!confirm("Reset all synthetic hotel records in this browser?"))return;
 state=seed();
 enrichDemo();svcSeed();foInit();dxBootstrap();dcStaffBootstrap();fo3Seed();migrateLegacyDemoDates();
 if(typeof hkSeed==="function")hkSeed();
 selectedReservation=null;svcSelected=null;
 h4RoomFilter="All";h4RoomMode="Rooms";h4StayMode="Reservations";h4OpsMode="Summary";
 page="Overview";save();render();flash("Demo reset to sample data");
};
// Final bootstrap renders the full application after Housekeeping initializes.
