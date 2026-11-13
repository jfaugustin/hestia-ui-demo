
"use strict";
const NAV=[["Overview","◫"],["Reservations","▤"],["Front Desk","◈"],["Rooms","▦"],["Housekeeping","✦"],["Service Dispatch","⚒"],["Security","◇"],["Financials","▥"],["Intelligence","▧"],["Workforce","♙"]];
const KEY="hestia-demo-v11";
const seed=()=>({rooms:Array.from({length:24},(_,i)=>({id:201+i,status:i%7===0?"dirty":i%5===0?"occupied":"ready"})),reservations:[{id:1001,guest:"Amelia Hart",room:205,arrival:"2026-11-12",departure:"2026-11-15",status:"Reserved"},{id:1002,guest:"Oliver Chen",room:207,arrival:"2026-11-11",departure:"2026-11-14",status:"Checked in"},{id:1003,guest:"Sofia Bennett",room:212,arrival:"2026-11-12",departure:"2026-11-13",status:"Reserved"}],tickets:[{id:1,room:209,title:"Air conditioning inspection",team:"Engineering",status:"Open"},{id:2,room:212,title:"Extra towels",team:"Housekeeping",status:"In progress"},{id:3,room:215,title:"Television remote replacement",team:"Engineering",status:"Complete"}],incidents:[{id:1,title:"Found property logged",location:"Lobby",status:"Open"}],activities:["Operations dashboard initialized","Housekeeping inspection completed · Room 204","Front Office prepared morning arrivals"]});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||seed()}catch(e){state=seed()}let page="Overview";
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pill=s=>'<span class="badge '+(s==="Ready"||s==="ready"||s==="Complete"||s==="Checked out"?"good":s==="Open"||s==="dirty"||s==="In progress"||s==="Reserved"?"warn":s==="Out of order"?"bad":"")+'">'+safe(s)+'</span>';
const btn=(label,fn)=>'<button class="secondary" onclick="'+fn+'">'+safe(label)+'</button>';
function toggleMenu(open){document.getElementById("sidebar").classList.toggle("open",open);document.getElementById("overlay").classList.toggle("on",open)}
function nav(p){if(p==="Service Dispatch"&&typeof svcSelected!=="undefined")svcSelected=null;page=p;toggleMenu(false);render()}
function flash(t){const n=document.createElement("div");n.className="toast";n.textContent=t;document.body.append(n);setTimeout(()=>n.remove(),2600)}
function activity(t){state.activities.unshift(t);state.activities=state.activities.slice(0,15);save()}
function header(title,desc,action=""){return '<div class="heading"><div><div class="eyebrow">HESTIA / '+safe(page)+'</div><h1>'+safe(title)+'</h1><p class="muted">'+safe(desc)+'</p></div>'+action+'</div>'}
function panel(title,body){return '<section class="panel"><div class="paneltitle">'+title+'</div>'+body+'</section>'}
function row(title,desc,status){return '<div class="line"><div><strong>'+safe(title)+'</strong><div class="tiny">'+safe(desc)+'</div></div>'+pill(status)+'</div>'}
function kp(name,val,note){return '<div class="kpi"><div class="label">'+name+'</div><div class="value">'+val+'</div><div class="note">'+note+'</div></div>'}



function security(){return header("Security","Record and track hotel safety incidents.",'<button class="primary" onclick="openIncident()">+ New incident</button>')+panel("Incident log",state.incidents.map(i=>'<div class="line"><div><strong>'+safe(i.title)+'</strong><div class="tiny">Incident #'+i.id+' · '+safe(i.location)+'</div></div><div class="actions">'+pill(i.status)+(i.status!=="Complete"?btn("Resolve","resolveIncident("+i.id+")"):"")+'</div></div>').join(""))}

function render(){
 const navigation=document.getElementById("nav");
 navigation.innerHTML=NAV.map(([n,g])=>'<button class="'+(page===n?"active":"")+'" data-page="'+n+'"><span class="glyph">'+g+'</span>'+n+'</button>').join("");
 document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>nav(b.dataset.page));
 const views={"Overview":overview,"Reservations":reservations,"Front Desk":desk,"Service Dispatch":services,"Security":security,"Financials":finances};
 let markup="";
 if(page==="Reservation Detail")markup=detailPage();
 else if(page==="Guests")markup=guestListing();
 else if(["Rooms","Housekeeping","Intelligence","Workforce","Operations"].includes(page))markup="";
 else markup=(views[page]||overview)();
 document.getElementById("content").innerHTML=markup+'<div class="footer">HESTIA · Synthetic demonstration · No live hotel services</div>';
 const search=document.getElementById("reservationSearch")||document.getElementById("guestSearch");
 if(search)search.oninput=e=>{
  reservationSearch=e.target.value;const cursor=e.target.selectionStart;render();
  const next=document.getElementById("reservationSearch")||document.getElementById("guestSearch");
  if(next){next.focus();next.setSelectionRange(cursor,cursor)}
 };
 if(page==="Service Dispatch"&&svcSelected===null){
  const filter=document.getElementById("dxDept"),status=document.getElementById("dcStatus"),query=document.getElementById("dxSearch");
  if(filter)filter.onchange=e=>{dxDepartment=e.target.value;render()};
  if(status)status.onchange=e=>dcFilterSet(e.target.value);
  if(query)query.oninput=e=>{
   dxSearch=e.target.value;const cursor=e.target.selectionStart;render();
   const next=document.getElementById("dxSearch");
   if(next){next.focus();next.setSelectionRange(cursor,cursor)}
  };
 }
}
function modal(title,fields,done){document.getElementById("modalroot").innerHTML='<div class="modalbg" onclick="if(event.target===this)closeModal()"><div class="modal"><h2>'+title+'</h2><p class="muted">Demonstration data only</p><form id="newform"><div class="fields">'+fields+'</div><div class="modalactions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button type="submit" class="primary">Save</button></div></form></div></div>';document.getElementById("newform").onsubmit=e=>{e.preventDefault();done(new FormData(e.target))}}
function field(label,name,type="text",extra=""){return '<label>'+label+'<input name="'+name+'" type="'+type+'" required '+extra+'></label>'}
function closeModal(){document.getElementById("modalroot").innerHTML=""}
function openReservation(){modal("New reservation",field("Guest name","guest")+field("Room number","room","number",'min="201" max="530"')+field("Arrival","arrival","date")+field("Departure","departure","date"),f=>{const room=Number(f.get("room")),arrival=String(f.get("arrival")),departure=String(f.get("departure"));if(departure<=arrival)return flash("Departure must follow arrival");if(!state.rooms.some(r=>r.id===room))return flash("Room not found");if(state.reservations.some(r=>r.room===room&&!["Cancelled","Checked out"].includes(r.status)&&r.arrival<departure&&arrival<r.departure))return flash("Reservation overlap for this room");state.reservations.unshift({id:Date.now(),guest:String(f.get("guest")).trim(),room,arrival,departure,status:"Reserved"});activity("Reservation created · Room "+room);closeModal();render();flash("Reservation created")})}
function changeReservation(id,status){let r=state.reservations.find(x=>x.id===id);if(!r)return;if(status==="Checked in"){let room=state.rooms.find(x=>x.id===r.room);if(room.status==="dirty"||room.status==="out")return flash("Room not ready for check-in");room.status="occupied"}if(status==="Checked out"){let room=state.rooms.find(x=>x.id===r.room);room.status="dirty"}r.status=status;activity("Reservation #"+id+" · "+status);render();flash("Reservation updated")}
function cycleRoom(id){let r=state.rooms.find(x=>x.id===id);r.status=({ready:"occupied",occupied:"dirty",dirty:"out",out:"ready"})[r.status];activity("Room "+id+" status updated");render()}
function markReady(id){state.rooms.find(x=>x.id===id).status="ready";activity("Housekeeping completed · Room "+id);render();flash("Room ready")}

function advanceTicket(id){let t=state.tickets.find(x=>x.id===id);t.status=t.status==="Open"?"In progress":"Complete";activity("Service request #"+id+" · "+t.status);render()}
function openIncident(){modal("New security incident",field("Incident summary","title")+field("Location","location"),f=>{state.incidents.unshift({id:Date.now(),title:String(f.get("title")).trim(),location:String(f.get("location")).trim(),status:"Open"});activity("Security incident recorded");closeModal();render();flash("Incident recorded")})}
function resolveIncident(id){state.incidents.find(x=>x.id===id).status="Complete";activity("Incident resolved · #"+id);render()}

function exportDemo(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="hestia-demo-data.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

/* v1.2 viability preview: entirely synthetic and non-payment-processing */
const DEMO_DATE=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
let selectedReservation=null,detailTab="Stay",reservationSearch="";
const sampleFirst=["Amelia","Oliver","Sofia","Daniel","Maya","Ethan","Naomi","Lucas","Harper","Isabel","Jordan","Avery","Elena","Miles","Zoe","Caleb","Iris","Gabriel","Priya","Theo"];
const sampleLast=["Hart","Chen","Bennett","Reyes","Patel","Walker","Kim","Foster","Martin","Diaz","Nakamura","Rivera","Cole","Brooks","Morgan","Singh","Lewis","Price","Hughes","Young"];
const datePlus=(d,n)=>{let x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const fmtMoney=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Math.round((Number(n)||0)*100)/100);
const nights=r=>Math.max(0,Math.round((Date.parse(r.departure+"T12:00:00Z")-Date.parse(r.arrival+"T12:00:00Z"))/86400000));
function enrichDemo(){
 if(!state||typeof state!=="object")state=seed();
 if(!Array.isArray(state.rooms))state.rooms=[];
 const fullRooms=Array.from({length:120},(_,i)=>{let id=200+Math.floor(i/30)*100+1+i%30;return {id,status:i%13===0?"dirty":i%9===0?"out":i%4===0?"occupied":"ready"}});
 const prior=new Map(state.rooms.map(x=>[x.id,x]));
 state.rooms=fullRooms.map(x=>prior.get(x.id)||x);
 if(!Array.isArray(state.reservations))state.reservations=[];
 if(!state.demoV12){
   const used=new Set(state.reservations.map(x=>Number(x.room)));
   const available=fullRooms.map(x=>x.id).filter(id=>!used.has(id));
   for(let i=0;i<96&&i<available.length;i++){
     const room=available[i],arrival=datePlus(DEMO_DATE,(i%13)-6),departure=datePlus(arrival,1+(i%4));
     const status=i%23===0?"Checked out":i%17===0?"Cancelled":i%8===0?"Reserved":"Checked in";
     state.reservations.push({id:12000+i,guest:sampleFirst[i%sampleFirst.length]+" "+sampleLast[(i*7)%sampleLast.length],room,arrival,departure,status});
   }
   const requestTitles=["Extra pillows","Bathroom plumbing inspection","Room temperature adjustment","Minibar restock","Late checkout request","Wi-Fi assistance","Replacement key request"];
   for(let i=0;i<36;i++)state.tickets.push({id:22000+i,room:available[i%available.length],title:requestTitles[i%requestTitles.length],team:i%3===0?"Engineering":i%3===1?"Housekeeping":"Guest Services",status:i%5===0?"Complete":i%3===0?"In progress":"Open"});
   for(let i=0;i<9;i++)state.incidents.push({id:33000+i,title:["Guest assistance","Access door alarm","Found property","Noise complaint"][i%4],location:["Lobby","B1 garage","Guest floors","Rooftop"][i%4],status:i%3===0?"Complete":"Open"});
   state.demoV12=true;
 }
 state.reservations.forEach((r,i)=>{
   if(!r.confirmation)r.confirmation="HST-"+String(r.id).slice(-6).padStart(6,"0");
   if(!r.profile)r.profile={email:"guest"+(i+1)+"@example.test",phone:"+1 (555) 010-"+String(i%10000).padStart(4,"0"),nationality:["United States","Canada","United Kingdom","Australia"][i%4],vip:i%13===0?"VIP":i%7===0?"Returning guest":"Standard",notes:i%7===0?"Prefers a quiet room.":"No special requests recorded.",source:["Direct","Travel agency","OTA","Corporate"][i%4],adults:1+i%3,children:i%5===0?1:0};
   if(!r.rate)r.rate=Number((260+(i%11)*34).toFixed(2));
   if(!r.card)r.card={brand:["Visa","Mastercard","Amex"][i%3],last4:String(4300+i%5000).padStart(4,"0"),expiry:"Not stored"};
   if(!Array.isArray(r.folio))r.folio=[{id:"room-"+r.id,type:"Charge",description:"Room charges · "+nights(r)+" night(s)",amount:Math.round(r.rate*nights(r)*100)/100,at:r.arrival},{id:"tax-"+r.id,type:"Charge",description:"Illustrative lodging tax (12%)",amount:Math.round(r.rate*nights(r)*12)/100,at:r.arrival}];
   if(!Array.isArray(r.paymentEvents))r.paymentEvents=[];
   if(!Array.isArray(r.audit))r.audit=[{at:r.arrival,action:"Reservation created",by:"Demo system"}];
   if(r.id>=12000 && r.id<12096 && !state.demoV13){
     const index=r.id-12000;
     r.status=index%23===0?"Checked out":index%17===0?"Cancelled":index%8===0?"Reserved":"Checked in";
     const room=state.rooms.find(x=>x.id===r.room);
     if(room)room.status=r.status==="Checked in"?"occupied":r.status==="Checked out"?"dirty":"ready";
   }
 });
 state.demoV13=true;
 save();
}
function folioBalance(r){return Math.round((r.folio||[]).reduce((s,x)=>s+(x.type==="Charge"||x.type==="Refund"?x.amount:-x.amount),0)*100)/100}
function chargesTotal(r){return (r.folio||[]).filter(x=>x.type==="Charge").reduce((s,x)=>s+x.amount,0)}
function settledTotal(r){return (r.folio||[]).filter(x=>x.type==="Payment").reduce((s,x)=>s+x.amount,0)-(r.folio||[]).filter(x=>x.type==="Refund").reduce((s,x)=>s+x.amount,0)}
function info(k,v){return '<div class="detailfield"><span>'+safe(k)+'</span><strong>'+safe(v)+'</strong></div>'}
function openDetail(id,tab="Stay"){selectedReservation=id;detailTab=tab;page="Reservation Detail";render();window.scrollTo?.(0,0)}
function selectDetailTab(tab){detailTab=tab;render()}
function guestListing(){
 const rows=state.reservations.filter(r=>r.guest.toLowerCase().includes(reservationSearch.toLowerCase()));
 return header("Guest Directory","Browse synthetic profiles and reservation history.")+panel("Guest profiles",'<div class="resultbar"><input aria-label="Search guests" placeholder="Search guests" id="guestSearch" value="'+safe(reservationSearch)+'"><span class="muted">'+rows.length+' profiles</span></div><div class="tablewrap"><table><thead><tr><th>Guest</th><th>Classification</th><th>Reservation</th><th>Status</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><button class="clickable" onclick="openDetail('+r.id+',\'Guest\')">'+safe(r.guest)+'</button></td><td>'+safe(r.profile.vip)+'</td><td>'+safe(r.confirmation)+'</td><td>'+pill(r.status)+'</td></tr>').join("")+'</tbody></table></div>');
}
function reservations(){
 const rows=state.reservations.filter(r=>(r.guest+" "+r.confirmation+" "+r.room).toLowerCase().includes(reservationSearch.toLowerCase()));
 const active=state.reservations.filter(r=>["Reserved","Checked in"].includes(r.status)).length;
 return header("Reservations","Browse the full booking register, guest details, and folios.",'<button class="primary" onclick="openReservation()">+ New reservation</button>')+
 '<div class="statstrip"><div><strong>'+state.reservations.length+'</strong><span>Total bookings</span></div><div><strong>'+active+'</strong><span>Active / upcoming</span></div><div><strong>'+state.reservations.filter(r=>r.status==="Checked in").length+'</strong><span>In house</span></div></div>'+
 panel("Reservations",'<div class="resultbar"><input id="reservationSearch" aria-label="Search reservations" placeholder="Search guest, confirmation, room" value="'+safe(reservationSearch)+'"><span class="muted">'+rows.length+' matches</span></div><div class="tablewrap"><table><thead><tr><th>Confirmation</th><th>Guest</th><th>Room</th><th>Arrival</th><th>Departure</th><th>Status</th><th>Folio</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><button class="clickable" onclick="openDetail('+r.id+')">'+safe(r.confirmation)+'</button></td><td>'+safe(r.guest)+'</td><td>'+r.room+'</td><td>'+r.arrival+'</td><td>'+r.departure+'</td><td>'+pill(r.status)+'</td><td class="money">'+fmtMoney(folioBalance(r))+'</td></tr>').join("")+'</tbody></table></div>');
}
function desk(){
 const rows=state.reservations.filter(r=>["Reserved","Checked in"].includes(r.status));
 return header("Front Desk","Reservations and departures with folio settlement checks.")+panel("Front desk queue",'<div class="tablewrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Status</th><th>Balance</th><th>Action</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><button class="clickable" onclick="openDetail('+r.id+')">'+safe(r.guest)+'</button></td><td>'+r.room+'</td><td>'+pill(r.status)+'</td><td>'+fmtMoney(folioBalance(r))+'</td><td>'+btn("Open stay","openDetail("+r.id+")")+'</td></tr>').join("")+'</tbody></table></div>');
}
function detailPage(){
 const r=state.reservations.find(x=>x.id===selectedReservation);
 if(!r)return header("Reservation not found","Return to the reservation register.")+'<button class="secondary" onclick="nav(\'Reservations\')">Back to reservations</button>';
 const tabs=["Stay","Guest","Folio","Payment controls","Activity"];
 const title='<div class="heading"><div><div class="eyebrow"><button class="tablebtn" onclick="nav(\'Reservations\')">← Reservations</button> / '+safe(r.confirmation)+'</div><h1>'+safe(r.guest)+'</h1><p class="muted">Room '+r.room+' · '+r.arrival+' to '+r.departure+' · '+safe(r.profile.vip)+'</p></div>'+pill(r.status)+'</div>';
 const tabbar='<div class="tabs">'+tabs.map(t=>'<button class="'+(detailTab===t?"active":"")+'" onclick="selectDetailTab(\''+t+'\')">'+t+'</button>').join("")+'</div>';
 let body="";
 if(detailTab==="Stay")body='<div class="detailgrid">'+panel("Stay details",info("Confirmation",r.confirmation)+info("Room",r.room)+info("Arrival",r.arrival)+info("Departure",r.departure)+info("Nights",nights(r))+info("Daily room rate",fmtMoney(r.rate))+info("Booking source",r.profile.source)+info("Guests",r.profile.adults+" adult(s), "+r.profile.children+" child(ren)"))+panel("Stay status",'<div class="alertbox">This is synthetic reservation data. Actions here do not update a real hotel system.</div>'+info("Reservation status",r.status)+info("Outstanding balance",fmtMoney(folioBalance(r)))+'<div class="actions" style="margin-top:15px">'+(r.status==="Reserved"?btn("Check in","demoCheckIn("+r.id+")"):"")+(r.status==="Checked in"?btn("Check out","demoCheckOut("+r.id+")"):"")+btn("Open folio","selectDetailTab(\'Folio\')")+'</div>')+'</div>';
 if(detailTab==="Guest")body='<div class="detailgrid">'+panel("Guest profile",info("Full name",r.guest)+info("Classification",r.profile.vip)+info("Email (fictional)",r.profile.email)+info("Phone (fictional)",r.profile.phone)+info("Country",r.profile.nationality)+info("Adults / children",r.profile.adults+" / "+r.profile.children))+panel("Preferences and notes",'<p class="muted" style="line-height:1.7">'+safe(r.profile.notes)+'</p><div class="alertbox" style="margin-top:15px">Guest information is generated for demonstration. Do not enter real personal information into this public site.</div>')+'</div>';
 if(detailTab==="Folio")body=panel("Reservation folio",'<div class="statstrip"><div><strong>'+fmtMoney(chargesTotal(r))+'</strong><span>Charges</span></div><div><strong>'+fmtMoney(settledTotal(r))+'</strong><span>Net simulated payments</span></div><div><strong>'+fmtMoney(folioBalance(r))+'</strong><span>Balance due</span></div></div><div class="tablewrap"><table><thead><tr><th>Date</th><th>Activity</th><th>Type</th><th>Amount</th></tr></thead><tbody>'+r.folio.map(x=>'<tr><td>'+safe(x.at||DEMO_DATE)+'</td><td>'+safe(x.description)+'</td><td>'+safe(x.type)+'</td><td class="money">'+(x.type==="Payment"?"−":"")+fmtMoney(x.amount)+'</td></tr>').join("")+'</tbody></table></div><div class="actions" style="margin-top:16px"><button class="primary" onclick="selectDetailTab(\'Payment controls\')">Payment controls</button></div>');
 if(detailTab==="Payment controls"){
  const auth=r.paymentEvents.find(x=>x.type==="Authorization"&&x.status==="Simulated approved");
  body='<div class="detailgrid">'+panel("Payment method",info("Card on file (mock)",r.card.brand+" ·•••• "+r.card.last4)+info("Card data stored","Brand and fictional last four only")+info("Authorization",auth?fmtMoney(auth.amount)+" · Mock approved":"None")+info("Unpaid folio",fmtMoney(Math.max(0,folioBalance(r))))+info("Refundable simulated amount",fmtMoney(Math.max(0,settledTotal(r))))+'<div class="actions" style="margin-top:16px"><button class="secondary" onclick="simulateAuthorization('+r.id+')">Simulate authorization</button><button class="secondary" onclick="simulateCapture('+r.id+')">Simulate payment</button><button class="secondary" onclick="simulateRefund('+r.id+')">Simulate refund</button></div>')+panel("Financial safeguards",'<div class="alertbox">NO REAL CARD CHARGES. These actions update synthetic, browser-local demonstration records only. Never enter card numbers or real guest data.</div>'+info("Payment collection","Not supported")+info("Processor integration","Not connected")+info("Authorization identifiers","Mock only")+info("Card numbers / CVV","Never collected"))+'</div>'+
 panel("Payment event log",r.paymentEvents.length?r.paymentEvents.slice().reverse().map(x=>row(x.type+" · "+fmtMoney(x.amount),x.id+" · "+x.at,x.status)).join(""):'<p class="muted">No simulated payment events recorded.</p>');
 }
 if(detailTab==="Activity")body=panel("Reservation audit trail",r.audit.slice().reverse().map(x=>row(x.action,x.at+" · "+x.by,"Recorded")).join(""));
 return title+tabbar+body;
}
function recordEvent(r,action){r.audit.push({at:new Date().toISOString(),action,by:"Demo operator"});activity(r.confirmation+" · "+action);save()}
function demoCheckIn(id){const r=state.reservations.find(x=>x.id===id);if(r.status!=="Reserved")return flash("Reservation is not awaiting arrival");let room=state.rooms.find(x=>x.id===r.room);if(!room||["dirty","out"].includes(room.status))return flash("Room is not ready");r.status="Checked in";room.status="occupied";recordEvent(r,"Checked in");render();flash("Guest checked in (demo)")}
function demoCheckOut(id){const r=state.reservations.find(x=>x.id===id);if(r.status!=="Checked in")return flash("Guest is not checked in");if(Math.abs(folioBalance(r))>0.001)return flash("Folio must be settled first");r.status="Checked out";let room=state.rooms.find(x=>x.id===r.room);if(room)room.status="dirty";recordEvent(r,"Checked out");render();flash("Checked out (demo)")}
function paymentEvent(r,type,amount,status){const id="DEMO-"+Date.now()+"-"+r.paymentEvents.length;r.paymentEvents.push({id,type,amount,at:new Date().toISOString(),status});recordEvent(r,type+" · "+fmtMoney(amount));return id}
function simulateAuthorization(id){const r=state.reservations.find(x=>x.id===id);if(r.paymentEvents.some(x=>x.type==="Authorization"&&x.status==="Simulated approved"))return flash("Authorization already simulated");const amount=Math.max(0,folioBalance(r));if(!amount)return flash("No amount to authorize");paymentEvent(r,"Authorization",amount,"Simulated approved");render();flash("Mock authorization only · no card charged")}
function simulateCapture(id){const r=state.reservations.find(x=>x.id===id),due=Math.max(0,folioBalance(r));if(!due)return flash("Folio has no outstanding amount");const auth=r.paymentEvents.find(x=>x.type==="Authorization"&&x.status==="Simulated approved");if(!auth)return flash("Simulate authorization first");if(due>auth.amount+0.001)return flash("Balance exceeds authorized amount");let key="capture-"+auth.id;if(r.paymentEvents.some(x=>x.key===key))return flash("This authorization was already captured");r.folio.push({id:"demo-payment-"+Date.now(),type:"Payment",description:"Simulated card payment · no real charge",amount:due,at:DEMO_DATE});paymentEvent(r,"Capture",due,"Simulation only");r.paymentEvents[r.paymentEvents.length-1].key=key;save();render();flash("Simulated payment posted · no money moved")}
function simulateRefund(id){const r=state.reservations.find(x=>x.id===id),paid=settledTotal(r);if(paid<=0)return flash("No simulated payments to refund");if(!confirm("Simulate refund of "+fmtMoney(paid)+"? No actual funds will move."))return;r.folio.push({id:"demo-refund-"+Date.now(),type:"Refund",description:"Simulated refund · no funds moved",amount:paid,at:DEMO_DATE});paymentEvent(r,"Refund",paid,"Simulation only");save();render();flash("Mock refund recorded")}

/* Calculated portfolio dashboard and simulated folio financial summaries */
function overview(){
 const active=state.reservations.filter(r=>r.status==="Checked in");
 const occupancy=Math.round((active.length/state.rooms.length)*1000)/10;
 const arrivals=state.reservations.filter(r=>r.arrival===DEMO_DATE&&r.status!=="Cancelled").length;
 const open=state.tickets.filter(t=>!["Completed","Voided"].includes(t.status)).length;
 const roomRevenue=state.reservations.filter(r=>r.status!=="Cancelled").reduce((sum,r)=>sum+(r.folio||[]).filter(x=>x.type==="Charge"&&String(x.description||"").startsWith("Room charges")).reduce((n,x)=>n+x.amount,0),0);
 const levels=Array.from({length:7},(_,i)=>{
   const day=datePlus(DEMO_DATE,i-6);
   return Math.round(100*state.reservations.filter(r=>r.arrival<=day&&r.departure>day&&!["Cancelled"].includes(r.status)).length/state.rooms.length)
 });
 return header("Property Overview","Demonstration property · 120-room inventory · synthetic operating data.",'<button class="primary" onclick="openReservation()">+ New reservation</button>')+
 '<div class="grid">'+kp("In-house occupancy",occupancy+"%","Based on demo check-in records")+kp("Arrivals (demo date)",arrivals,"Business date · "+DEMO_DATE)+kp("Open service tickets",open,"Across all departments")+kp("Booked room charges",fmtMoney(roomRevenue),"Illustrative reservations")+'</div>'+
 '<div class="columns">'+panel("Seven-day booked occupancy",'<div class="chart">'+levels.map(v=>'<div class="bar" style="height:'+Math.max(8,v)+'%"><span>'+v+'%</span></div>').join("")+'</div><div class="chartlabels">'+["Fri","Sat","Sun","Mon","Tue","Wed","Thu"].map(x=>'<span>'+x+'</span>').join("")+'</div>')+
 panel("Operational priorities",row("Housekeeping",state.rooms.filter(r=>r.status==="dirty").length+" rooms marked dirty","Open")+row("Maintenance and service",open+" unresolved tickets","In progress")+row("Financial exceptions",state.reservations.filter(r=>r.status==="Checked in"&&folioBalance(r)>0).length+" in-house folios with balances","Open"))+'</div>'+
 '<div class="columns">'+panel("Recent reservations",state.reservations.slice(0,6).map(r=>'<div class="line"><div><button class="clickable" onclick="openDetail('+r.id+')">'+safe(r.guest)+'</button><div class="tiny">'+safe(r.confirmation)+' · Room '+r.room+'</div></div>'+pill(r.status)+'</div>').join(""))+
 panel("Activity feed",state.activities.slice(0,8).map(x=>'<div class="line"><span>'+safe(x)+'</span></div>').join(""))+'</div>';
};
function finances(){
 const charges=state.reservations.reduce((sum,r)=>sum+chargesTotal(r),0);
 const captured=state.reservations.reduce((sum,r)=>sum+settledTotal(r),0);
 const balance=state.reservations.reduce((sum,r)=>sum+folioBalance(r),0);
 const events=state.reservations.flatMap(r=>r.paymentEvents.map(e=>({guest:r.guest,...e}))).slice(-20).reverse();
 return header("Financials","Synthetic folios and mock transactions. Not a payment processor.")+
 '<div class="grid">'+kp("Posted demo charges",fmtMoney(charges),"Room and illustrative tax")+kp("Net demo payments",fmtMoney(captured),"No actual funds collected")+kp("Portfolio folio balance",fmtMoney(balance),"Outstanding synthetic entries")+kp("Mock payment events",events.length,"Recent event sample")+'</div>'+
 '<div class="section">'+panel("Payment controls and boundaries",'<div class="alertbox">Card numbers, CVV and payment credentials must never be entered into this public demo. Mock authorization and capture actions do not contact banks. Real systems require tokenization, restricted permissions, reconciled settlement, PCI DSS controls and processor webhooks.</div>')+'</div>'+
 '<div class="section">'+panel("Recent mock transactions",events.length?events.map(x=>row(x.type+" · "+fmtMoney(x.amount),x.guest+" · "+x.id,x.status)).join(""):'<p class="muted">No mock card activity recorded. Open a reservation to test an authorization and a simulated payment.</p>')+'</div>';
};
function resetDemo(){if(!confirm("Reset all synthetic demo data?"))return;state=seed();enrichDemo();render();flash("Demo reset")};

NAV.splice(2,0,["Guests","♧"]);
enrichDemo();

/* Hestia service ticket lifecycle: prototype-only; persistent in browser localStorage */
const SVC_STATUS=["Open","Started","Stopped","Completed","Voided"];
const SVC_PRIORITIES=["Critical","High","Normal","Low"];
let svcSelected=null;
const svcTime=v=>v?new Date(v).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"—";
function svcSeed(){
 if(!Array.isArray(state.tickets))state.tickets=[];
 state.tickets.forEach((t,i)=>{
  if(t.status==="In progress")t.status="Started";
  if(t.status==="Complete")t.status="Completed";
  if(t.status==="Cancelled")t.status="Voided";
  if(t.status==="On hold")t.status="Stopped";
  if(t.status==="Assigned")t.status="Open";
  if(!SVC_STATUS.includes(t.status))t.status="Open";
  if(!t.priority)t.priority=["Normal","High","Low","Critical"][i%4];
  if(!t.assignee)t.assignee=i%3===0?"Unassigned":t.team+" team";
  if(!t.location)t.location=t.room?"Room "+t.room:"Public area";
  if(!t.createdAt)t.createdAt=new Date(Date.now()-(i+1)*3600000).toISOString();
  if(!Array.isArray(t.notes))t.notes=[];
  if(!Array.isArray(t.history))t.history=[{event:"Created",note:"Ticket entered in queue",at:t.createdAt,by:"Demo system"}];
  if(!t.description)t.description="Synthetic service request: "+t.title;
  if(!t.category)t.category=t.team==="Housekeeping"?"Housekeeping":t.team==="Security"?"Safety & Security":"Maintenance";
 });
 save();
}
function svcRecord(t,event,note){
 const at=new Date().toISOString();
 t.history.push({at,event,note:note||"",by:"Demo operator"});
 activity("Service #"+t.id+" · "+event);
 save();
}
function svcChange(id,action,note){
 const t=state.tickets.find(x=>x.id===Number(id));
 if(!t)return false;
 if(typeof dxRole!=="undefined"&&typeof DX_ROLES!=="undefined"){
  const permission=action==="Void"?"void":"transition";
  if(!DX_ROLES[dxRole]?.includes(permission)){flash("This role cannot change ticket status");return false;}
  if(dxRole==="staff"&&t.employeeId&&t.employeeId!==dxActingEmployeeId){flash("Ticket assigned to another employee");return false;}
  if(action==="Start"&&t.employeeId&&!t.acknowledgedAt){flash("Assignment must be acknowledged before starting");return false;}
 }
 const allowed={Start:["Open","Stopped"],Stop:["Started"],Complete:["Started"],Void:["Open","Stopped","Started"]};
 if(!(allowed[action]||[]).includes(t.status)){flash("Action unavailable for a "+t.status.toLowerCase()+" ticket");return false;}
 if(["Stop","Complete","Void"].includes(action)&&!String(note||"").trim()){flash("A reason or resolution is required");return false;}
 if(action==="Start"){t.status="Started";t.startedAt=new Date().toISOString();}
 if(action==="Stop"){t.status="Stopped";t.stoppedAt=new Date().toISOString();}
 if(action==="Complete"){t.status="Completed";t.completedAt=new Date().toISOString();t.resolution=String(note).trim();}
 if(action==="Void"){t.status="Voided";t.voidedAt=new Date().toISOString();t.voidReason=String(note).trim();}
 svcRecord(t,action==="Start"?"Started":action==="Stop"?"Stopped":action==="Complete"?"Completed":"Voided",String(note||""));
 render();flash("Ticket #"+id+" "+t.status.toLowerCase());
 return true;
}

function svcAddNote(id){
 const t=state.tickets.find(x=>x.id===Number(id));
 const el=document.getElementById("svcNote");
 const value=String(el?.value||"").trim();
 if(!t||!value)return flash("Enter a note");
 t.notes.push({at:new Date().toISOString(),by:"Demo operator",text:value});
 svcRecord(t,"Note added","Internal note recorded");
 render();flash("Note added");
}

function svcPriority(id,value){
 const t=state.tickets.find(x=>x.id===Number(id));
 if(!t||!SVC_PRIORITIES.includes(value)||["Completed","Voided"].includes(t.status))return;
 const before=t.priority;t.priority=value;
 svcRecord(t,"Priority changed",before+" → "+value);render();
}
function svcOpts(items,selected){return items.map(x=>'<option value="'+safe(x)+'"'+(x===selected?" selected":"")+'>'+safe(x)+'</option>').join("")}
function svcTag(t){return '<span class="badge '+(t.status==="Completed"?"good":t.status==="Voided"?"bad":t.status==="Stopped"?"warn":"")+'">'+safe(t.status)+'</span>'}

function svcOpen(id){svcSelected=Number(id);page="Service Dispatch";render();window.scrollTo?.(0,0)}
function svcBack(){svcSelected=null;render()}

/* Front Office guest-services workflow: native synthetic service tickets */
const FO_TYPES={
 "Bell Service":{team:"Front Office",priority:"Normal",sla:15,summary:"Bell and luggage assistance"},
 "Live Checkout":{team:"Front Office",priority:"High",sla:10,summary:"In-person guest checkout assistance"},
 "Food Delivery":{team:"Food & Beverage",priority:"Normal",sla:30,summary:"In-room dining delivery / escort"}
};

function foInit(){
 if(!state.foSeeded){
  const rooms=[205,207,212,223,307,318,409,421,504,519,529,601];
  const kinds=["Bell Service","Live Checkout","Food Delivery"];
  for(let i=0;i<12;i++){
   const kind=kinds[i%3],config=FO_TYPES[kind];
   const id=65000+i,room=rooms[i],r=state.reservations.find(x=>Number(x.room)===room);
   const t={id,title:config.summary,location:"Room "+room,room,team:config.team,category:kind,requestType:kind,priority:i%5===0?"High":config.priority,assignee:"Unassigned",status:i%5===0?"Started":i%7===0?"Stopped":"Open",createdAt:new Date(Date.now()-(i*5+2)*60000).toISOString(),dueAt:new Date(Date.now()+(config.sla-i*4)*60000).toISOString(),guest:r?.guest||"Demo Guest",reservationId:r?.id||null,description:kind==="Bell Service"?"Assist guest with luggage; confirm bell cart and destination.":kind==="Live Checkout"?"Guest requests assistance with live checkout at Front Desk. Verify folio separately.":"Coordinate in-room dining order delivery and notify guest; no payment data.",notes:[],history:[{event:"Created",note:"Front Office guest service request",at:new Date(Date.now()-(i*5+2)*60000).toISOString(),by:"Demo system"}]};
   state.tickets.push(t);
  }
  state.foSeeded=true;save();
 }
 state.tickets.filter(t=>FO_TYPES[t.requestType]).forEach(t=>{
  if(!t.dueAt)t.dueAt=new Date(Date.parse(t.createdAt||new Date().toISOString())+FO_TYPES[t.requestType].sla*60000).toISOString();
  if(!t.category)t.category=t.requestType;
 });
 save();
}

function foDue(t){
 if(["Completed","Voided"].includes(t.status))return "Closed";
 const m=Math.round((Date.parse(t.dueAt)-Date.now())/60000);
 return m<0?"Overdue "+Math.abs(m)+"m":m===0?"Due now":"Due in "+m+"m";
}
function foOpen(id){svcSelected=Number(id);page="Service Dispatch";render()}
desk=function(){return header("Front Office","Bell Service · Live Checkout · Food Delivery")};
foInit();
svcSeed();

/* Dispatch 2.0 public preview — fake identities, local records, no cross-device synchronization */
const DX_DEPTS=["Front Office","Bell Service","Valet","Housekeeping","Engineering","Security","Food & Beverage","IT","Spa & Recreation","Management","Transportation"];
const DX_CATEGORIES={
 "Bell Service":["Arrival luggage","Departure luggage","Luggage storage","Vehicle loading"],
 "Valet":["Vehicle retrieval","Vehicle staging","Parking inquiry","Vehicle damage follow-up"],
 "Front Office":["Live checkout","Guest request","Room move","Key assistance","Wake-up call","Guest transportation"],
 "Housekeeping":["Room cleaning","Turndown","Linen request","Amenity delivery","Room inspection"],
 "Engineering":["Plumbing","HVAC","Electrical","Preventive maintenance","Equipment inspection"],
 "Security":["Escort","Access assistance","Lost property","Security concern","Safety inspection"],
 "Food & Beverage":["Food delivery","IRD pickup","Amenity delivery","Restaurant assistance"],
 "IT":["Wi-Fi","Telephone","Room technology","Network equipment"],
 "Spa & Recreation":["Spa guest support","Pool maintenance","Guest amenities"],
 "Management":["Service recovery","Escalated complaint","Approval required"],
 "Transportation":["House car","Driver assignment","Airport transfer"]
};
const DX_ROLES={dispatcher:["create","assign","ack","transition","void","escalate","notes","schedule"],supervisor:["create","assign","ack","transition","void","escalate","notes","schedule"],staff:["create","ack","transition","notes"],viewer:[]};
let dxRole="dispatcher",dxDepartment="All",dxTab="Queue",dxSearch="",dxStaff="All",dxActingEmployeeId=null;
function dxEmployees(){
 return [{id:"em-100",name:"Alex Rivera",team:"Bell Service",shift:"AM",available:true},
 {id:"em-101",name:"Morgan Lee",team:"Front Office",shift:"PM",available:true},
 {id:"em-102",name:"Taylor Singh",team:"Housekeeping",shift:"AM",available:true},
 {id:"em-103",name:"Jordan Kim",team:"Engineering",shift:"PM",available:true},
 {id:"em-104",name:"Casey Patel",team:"Security",shift:"PM",available:false},
 {id:"em-105",name:"Avery Brooks",team:"Valet",shift:"PM",available:true},
 {id:"em-106",name:"Emery Chen",team:"Food & Beverage",shift:"PM",available:true},
 {id:"em-107",name:"Sam Morgan",team:"IT",shift:"AM",available:true},
 {id:"em-108",name:"Riley Price",team:"Transportation",shift:"AM",available:true},
 {id:"em-109",name:"Jamie Stone",team:"Spa & Recreation",shift:"AM",available:true}];
}
function dxBootstrap(){
 if(!state.dxEmployees)state.dxEmployees=dxEmployees();
 if(!Array.isArray(state.dxRecurring))state.dxRecurring=[
 {id:71001,title:"AED weekly inspection",team:"Security",category:"Safety inspection",priority:"High",interval:7,last:"2026-11-06",enabled:true},
 {id:71002,title:"Preventive HVAC inspection",team:"Engineering",category:"Preventive maintenance",priority:"Normal",interval:7,last:"2026-11-06",enabled:true},
 {id:71003,title:"Morning room readiness review",team:"Housekeeping",category:"Room inspection",priority:"Normal",interval:1,last:"2026-11-11",enabled:true},
 {id:71004,title:"Valet radio inventory",team:"Valet",category:"Parking inquiry",priority:"Low",interval:7,last:"2026-11-06",enabled:true}
 ];
 if(!state.dxVersion){
   const additions=[
    ["Valet","Vehicle retrieval","Vehicle staging request",318],
    ["Transportation","House car","Guest house car pickup",421],
    ["Housekeeping","Turndown","Evening turndown service",504],
    ["IT","Wi-Fi","Guest Wi-Fi assistance",307],
    ["Spa & Recreation","Pool maintenance","Rooftop pool equipment check",0],
    ["Management","Service recovery","Guest service recovery follow-up",205],
    ["Front Office","Room move","Coordinate luggage and room move",409]
   ];
   additions.forEach((x,i)=>{let [team,category,title,room]=x;let now=new Date(Date.now()-(i+2)*480000).toISOString();
     state.tickets.push({id:72000+i,team,category,title,room:room||null,location:room?"Room "+room:"Rooftop",priority:i===5?"High":"Normal",status:"Open",assignee:"Unassigned",description:"Synthetic cross-department service request.",createdAt:now,dueAt:new Date(Date.now()+(i+1)*240000).toISOString(),history:[{event:"Created",at:now,by:"Demo system",note:"Dispatch 2.0 sample"}],notes:[],attachments:[],links:[]});
   });state.dxVersion=true;
 }
 state.tickets.forEach(t=>{if(!t.attachments)t.attachments=[];if(!t.links)t.links=[];if(!t.category)t.category=t.requestType||t.team||"General";if(!t.acknowledgedAt)t.acknowledgedAt=null;if(!t.dueAt)t.dueAt=new Date(Date.parse(t.createdAt||new Date().toISOString())+30*60000).toISOString()});
 save();
}
function dxPermission(a){return !!DX_ROLES[dxRole]?.includes(a)}
function dxRequire(a){if(dxPermission(a))return true;flash("This demo role cannot perform that action");return false}
function dxTicket(id){return state.tickets.find(t=>Number(t.id)===Number(id))}
function dxEvent(t,label,note=""){t.history.push({event:label,note,by:"Demo "+dxRole,at:new Date().toISOString()});activity("#"+t.id+" "+label);save()}
function dxAssign(id,employeeId){
 if(!dxRequire("assign"))return false;
 const t=dxTicket(id);
 if(!t||["Completed","Voided"].includes(t.status))return false;
 const selected=employeeId==="Unassigned"?"":String(employeeId||"");
 const worker=state.dxEmployees.find(e=>e.id===selected);
 if(selected&&!worker){flash("Employee not found");return false}
 if(worker&&worker.team!==t.team){flash("Employee must belong to "+t.team);return false}
 if(worker&&!worker.available){flash("Selected employee is unavailable");return false}
 if((t.employeeId||"")===selected)return true;
 t.employeeId=worker?.id||null;t.assignee=worker?.name||"Unassigned";t.acknowledgedAt=null;
 dxEvent(t,"Assigned",worker?worker.name+" · awaiting acknowledgment":"Returned to department queue");
 render();return true;
}
function dxAck(id){
 if(!dxRequire("ack"))return false;
 const t=dxTicket(id);if(!t||!t.employeeId||t.acknowledgedAt||["Voided","Completed"].includes(t.status))return false;
 if(dxRole==="staff"&&dxActingEmployeeId!==t.employeeId){flash("Only the assigned employee can acknowledge this ticket");return false;}
 if(dxRole==="viewer")return false;
 t.acknowledgedAt=new Date().toISOString();
 t.acknowledgedBy=dxRole==="staff"?t.employeeId:"Demo dispatcher";
 dxEvent(t,dxRole==="staff"?"Acknowledged by assigned employee":"Acknowledgment confirmed by dispatcher",dxRole==="staff"?t.assignee+" accepted work":"Dispatcher recorded acknowledgment on behalf of "+t.assignee);
 render();return true;
}
function dxTransition(id,action,note){
 if(!dxRequire(action==="Void"?"void":"transition"))return false;
 const t=dxTicket(id);if(!t)return false;
 if(dxRole==="staff"&&t.employeeId&&t.employeeId!==dxActingEmployeeId){flash("Assigned to another employee");return false}
 if(action==="Start"&&t.employeeId&&!t.acknowledgedAt){flash("Assigned employee must acknowledge before starting");return false}
 return svcChange(id,action,note);
}
function dxLink(parent,child){
 if(!dxRequire("create"))return false;
 const a=dxTicket(parent),b=dxTicket(child);
 if(!a||!b||a.id===b.id)return false;
 if(!a.links.includes(b.id))a.links.push(b.id);
 if(!b.links.includes(a.id))b.links.push(a.id);
 dxEvent(a,"Linked request","#"+b.id);dxEvent(b,"Linked request","#"+a.id);render();return true;
}
function dxEscalations(){
 return state.tickets.filter(t=>!["Voided","Completed"].includes(t.status)&&Number.isFinite(Date.parse(t.dueAt))&&Date.parse(t.dueAt)<Date.now());
}
function dxProcessEscalations(){
 if(!dxRequire("escalate"))return 0;
 const newAlerts=dxEscalations().filter(t=>!t.escalated);
 for(const t of newAlerts){t.escalated=true;t.escalatedAt=new Date().toISOString();dxEvent(t,"SLA escalated","Supervisor review required");}
 render();flash(newAlerts.length+" overdue ticket(s) escalated");return newAlerts.length;
}
function dxTeamTag(t){return t.team==="Front Office"&&t.requestType? t.requestType:t.team}
function dxRecurringRun(id,nowDate){
 if(!dxRequire("schedule"))return false;
 const rule=state.dxRecurring.find(x=>x.id===Number(id));if(!rule||!rule.enabled)return false;
 const today=nowDate||DEMO_DATE;
 if((Date.parse(today)-Date.parse(rule.last))/86400000<rule.interval)return false;
 const unique=rule.id+"-"+today;
 if(state.tickets.some(t=>t.scheduleKey===unique))return false;
 const idNew=Math.max(75000,...state.tickets.map(x=>Number(x.id)||0))+1;
 const t={id:idNew,title:rule.title,team:rule.team,category:rule.category,priority:rule.priority,location:"Property-wide",room:null,status:"Open",assignee:"Unassigned",createdAt:new Date().toISOString(),dueAt:new Date(Date.now()+2*3600000).toISOString(),description:"Automatically generated from recurring rule #"+rule.id,history:[],notes:[],links:[],attachments:[],scheduleKey:unique};
 state.tickets.unshift(t);rule.last=today;dxEvent(t,"Scheduled task generated","Rule "+rule.id);render();return true;
}
function dxCreateLinked(sourceId,team,category){
 if(!dxRequire("create"))return;
 const parent=dxTicket(sourceId),title=category+" · "+(parent?.location||"Property");
 if(!parent||!DX_CATEGORIES[team]?.includes(category))return;
 const id=Math.max(75000,...state.tickets.map(x=>Number(x.id)||0))+1;
 const now=new Date().toISOString();
 const t={id,title,team,category,room:parent.room,location:parent.location,guest:parent.guest||"",priority:parent.priority,status:"Open",assignee:"Unassigned",createdAt:now,dueAt:new Date(Date.now()+15*60000).toISOString(),description:"Linked request generated from #"+sourceId,notes:[],history:[],links:[],attachments:[]};
 state.tickets.unshift(t);dxEvent(t,"Created","Linked departmental workflow");dxLink(sourceId,id);svcSelected=id;page="Service Dispatch";render();
}
function dxCreateLinkedPrompt(id){
 if(!dxRequire("create"))return;
 modal("Create linked departmental request",'<label>Department<select name="team" id="dxTeamSelect" onchange="dxFillCats(this.value)">'+DX_DEPTS.map(d=>'<option>'+safe(d)+'</option>').join("")+'</select></label><label>Request type<select name="category" id="dxCategorySelect">'+DX_CATEGORIES[DX_DEPTS[0]].map(c=>'<option>'+safe(c)+'</option>').join("")+'</select></label>',f=>{const team=String(f.get("team")),cat=String(f.get("category"));closeModal();dxCreateLinked(id,team,cat)});
}
function dxFillCats(team){const box=document.getElementById("dxCategorySelect");if(box)box.innerHTML=(DX_CATEGORIES[team]||[]).map(c=>'<option>'+safe(c)+'</option>').join("")}
function dxSetRole(value){if(!DX_ROLES[value])return;dxRole=value;render()}
function dxSetTab(value){dxTab=value;render()}
function dxSetDept(value){dxDepartment=value;render()}
function dxToggleEmployee(id){if(!dxRequire("assign"))return;const e=state.dxEmployees.find(x=>x.id===id);if(!e)return;e.available=!e.available;save();render()}

function dxSchedule(){
 const rules=state.dxRecurring;
 return panel("Recurring operational tasks",'<p class="muted" style="margin-bottom:12px">Sample schedules generate tickets on demand in this public preview. A production scheduler would generate them automatically on the server.</p>'+rules.map(x=>'<div class="dxoption"><div><strong>'+safe(x.title)+'</strong><div class="dxsmall">'+safe(x.team)+' · every '+x.interval+' day(s) · last '+safe(x.last)+'</div></div><div class="dxactions"><button onclick="dxRecurringRun('+x.id+',\''+new Date().toISOString().slice(0,10)+'\')">Generate if due</button></div></div>').join("")+'<div class="dxsection"><button class="primary" onclick="dxScheduleNew()">+ New recurring task</button></div>');
}
function dxScheduleNew(){
 if(!dxRequire("schedule"))return;
 modal("New recurring task",field("Task name","title")+'<label>Department<select name="team">'+DX_DEPTS.map(x=>'<option>'+safe(x)+'</option>').join("")+'</select></label><label>Repeat interval (days)<input name="interval" type="number" min="1" max="365" value="7"></label>',f=>{
 const name=String(f.get("title")||"").trim(),days=Number(f.get("interval"));
 if(!name||!Number.isInteger(days)||days<1||days>365)return flash("Enter a valid task and interval");
 state.dxRecurring.push({id:Date.now(),title:name,team:String(f.get("team")),category:"Recurring inspection",priority:"Normal",interval:days,last:"2026-11-01",enabled:true});save();closeModal();render();
 });
}
function dxAnalytics(){
 const t=state.tickets.filter(x=>x.createdAt),closed=t.filter(x=>x.status==="Completed"),open=t.filter(x=>!["Completed","Voided"].includes(x.status)),overdue=dxEscalations();
 const diff=x=>Math.max(0,(Date.parse(x.completedAt||x.startedAt)-Date.parse(x.createdAt))/60000);
 const avg=closed.length?Math.round(closed.reduce((n,x)=>n+diff(x),0)/closed.length):0;
 const total=t.length,score=total?Math.round(closed.length/total*100):0;
 const teamStats=DX_DEPTS.map(name=>({name,tickets:t.filter(x=>x.team===name)})).filter(x=>x.tickets.length);
 return '<div class="dxstats"><div class="dxstat"><strong>'+total+'</strong><span>Total tickets</span></div><div class="dxstat"><strong>'+score+'%</strong><span>Completed share</span></div><div class="dxstat"><strong>'+overdue.length+'</strong><span>Overdue active</span></div><div class="dxstat"><strong>'+avg+'m</strong><span>Avg completed elapsed time*</span></div></div>'+
 panel("Departmental throughput",teamStats.map(x=>'<div class="dxoption"><strong>'+safe(x.name)+'</strong><span class="dxsmall">'+x.tickets.length+' requests · '+x.tickets.filter(x=>x.status==="Completed").length+' completed · '+x.tickets.filter(x=>x.status==="Stopped").length+' stopped</span></div>').join("")+'<p class="hint" style="margin-top:12px">*Elapsed time is not labor time. Demonstration timing and synthetic records are illustrative only.</p>');
}
function dxNewRequest(team){
 if(!dxRequire("create"))return;
 team=DX_CATEGORIES[team]?team:"Front Office";
 const category=DX_CATEGORIES[team][0];
 modal("New "+team+" ticket",field("Request summary","title")+
 '<label>Department<select id="dxNewTeam" name="team" onchange="dxFillNewCats(this.value)">'+svcOpts(DX_DEPTS,team)+'</select></label>'+
 '<label>Service type<select id="dxNewCategory" name="category">'+svcOpts(DX_CATEGORIES[team],category)+'</select></label>'+
 '<label>Location<input name="location" required placeholder="Room 415 / Lobby"></label>'+
 '<label>Guest / requestor (optional)<input name="guest" placeholder="Synthetic demo only"></label>'+
 '<label>Priority<select name="priority">'+svcOpts(SVC_PRIORITIES,"Normal")+'</select></label>'+
 '<label>Instructions<input name="description" required placeholder="Describe requested work"></label>',f=>{
 const title=String(f.get("title")||"").trim(),location=String(f.get("location")||"").trim(),description=String(f.get("description")||"").trim();
 if(!title||!location||!description)return flash("Complete the required fields");
 const team=String(f.get("team")),cat=String(f.get("category"));if(!DX_CATEGORIES[team]?.includes(cat))return flash("Invalid department/category");
 const id=Math.max(75000,...state.tickets.map(x=>Number(x.id)||0))+1;
 const mt=location.match(/\b\d{3,4}\b/),room=mt?Number(mt[0]):null;
 const t={id,title,team,category:cat,location,room,guest:String(f.get("guest")||""),priority:String(f.get("priority")),description,status:"Open",assignee:"Unassigned",createdAt:new Date().toISOString(),dueAt:new Date(Date.now()+30*60000).toISOString(),history:[],notes:[],links:[],attachments:[]};
 state.tickets.unshift(t);dxEvent(t,"Created","Dispatch request entered");closeModal();svcSelected=id;page="Service Dispatch";render();
 });
}
function dxFillNewCats(team){const e=document.getElementById("dxNewCategory");if(e)e.innerHTML=svcOpts(DX_CATEGORIES[team]||[],"")}
function dxAttach(id,input){
 if(!dxRequire("notes"))return;
 const t=dxTicket(id),file=input?.files?.[0];if(!t||!file)return;
 if(file.size>2*1024*1024){flash("Max attachment metadata size 2 MB");return}
 const types=["image/png","image/jpeg","image/webp","application/pdf"];
 if(!types.includes(file.type)){flash("Unsupported attachment type");return}
 t.attachments.push({name:file.name.slice(0,80),bytes:file.size,type:file.type,at:new Date().toISOString()});
 dxEvent(t,"Attachment metadata added","No file contents stored in public demo");render();
}
function svcAction(id,action){if(!dxRequire(action==="Void"?"void":"transition"))return;
 if(action==="Start"){dxTransition(id,action,"Work started");return}
 modal(action+" ticket #"+id,'<label>'+(action==="Complete"?"Resolution":action==="Stop"?"Reason for stopping":"Reason for void")+'<input name="note" required></label>',f=>{if(dxTransition(id,action,String(f.get("note")||"")))closeModal()});
};
function openTicket(){dxNewRequest("Engineering")}
dxBootstrap();


/* Offline static shell and same-browser cross-tab state refresh; not multi-user sync */
if(typeof navigator!=="undefined" && navigator.serviceWorker){
 navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
if(typeof window!=="undefined" && typeof window.addEventListener==="function"){
 window.addEventListener("storage",event=>{
  if(event.key!==KEY||!event.newValue)return;
  try{
   const snapshot=JSON.parse(event.newValue);
   if(!snapshot||!Array.isArray(snapshot.tickets)||!Array.isArray(snapshot.rooms))return;
   state=snapshot;render();
  }catch(_){}
 });
}


/* Dispatch 2.1: queue-aware auto-dispatch, ticket reopening and notification preview */
function dxAutoAssign(id){
 if(!dxRequire("assign"))return false;
 const t=dxTicket(id);
 if(!t||["Voided","Completed"].includes(t.status))return false;
 const candidates=state.dxEmployees.filter(e=>e.team===t.team&&e.available);
 if(!candidates.length){flash("No available employees in "+t.team);return false}
 const load=e=>state.tickets.filter(x=>x.employeeId===e.id&&!["Voided","Completed"].includes(x.status)).length;
 candidates.sort((a,b)=>load(a)-load(b)||a.id.localeCompare(b.id));
 return dxAssign(t.id,candidates[0].id);
}
function dxAutoDispatchQueue(){
 if(!dxRequire("assign"))return;
 let count=0;
 for(const t of state.tickets.filter(x=>["Open","Stopped"].includes(x.status)&&!x.employeeId)){
  if(state.dxEmployees.some(e=>e.team===t.team&&e.available)&&dxAutoAssign(t.id))count++;
 }
 render();flash(count+" tickets assigned by department workload");
}
function dxReopen(id,note){
 if(!dxRequire("escalate"))return false;
 const t=dxTicket(id);
 if(!t||t.status!=="Completed"){flash("Only completed tickets may be reopened");return false}
 if(!String(note||"").trim()){flash("Reopen reason required");return false}
 t.status="Open";t.reopenedAt=new Date().toISOString();t.resolution=null;
 t.employeeId=null;t.acknowledgedAt=null;t.assignee="Unassigned";
 dxEvent(t,"Reopened",String(note).trim());render();flash("Ticket reopened");return true;
}
function dxReopenPrompt(id){
 modal("Reopen completed ticket",'<label>Reason for reopening<input name="reason" required placeholder="Issue not fully resolved"></label>',
 f=>{if(dxReopen(id,String(f.get("reason")||"")))closeModal()});
}
/* Dispatch 2.2 — one employee assignment model, one detail view, simpler navigation. */
let dcStatus="Active";
function dcStaffBootstrap(){
 if(!DX_DEPTS.includes("Guest Services"))DX_DEPTS.push("Guest Services");
 if(!DX_CATEGORIES["Guest Services"])DX_CATEGORIES["Guest Services"]=["Guest request","Amenity delivery","Guest concern"];
 if(!Array.isArray(state.dxEmployees))state.dxEmployees=dxEmployees();
 const additions=[
  ["em-110","Robin Alvarez","Bell Service","PM"],["em-111","Devon Ellis","Front Office","AM"],
  ["em-112","Chris Moreno","Housekeeping","PM"],["em-113","Parker Wells","Engineering","AM"],
  ["em-114","Mia Stone","Security","AM"],["em-115","Drew Parker","Valet","AM"],
  ["em-116","Skylar Green","Food & Beverage","AM"],["em-117","Alex Jordan","IT","PM"],
  ["em-118","Cameron Brooks","Transportation","PM"],["em-119","Rowan White","Spa & Recreation","PM"],
  ["em-120","Jordan Scott","Guest Services","AM"],["em-121","Sasha Tran","Guest Services","PM"],
  ["em-122","Nico Blake","Management","AM"],["em-123","Taylor Rose","Management","PM"]
 ];
 for(const [id,name,team,shift] of additions)if(!state.dxEmployees.some(x=>x.id===id))state.dxEmployees.push({id,name,team,shift,available:true});
 // Older versions stored generic names, not employee assignments. Don't display these as actual owners.
 for(const t of state.tickets){
  const employee=state.dxEmployees.find(e=>e.id===t.employeeId);
  if(employee){t.assignee=employee.name}
  else {t.employeeId=null;t.assignee="Unassigned";t.acknowledgedAt=null}
 }
 save();
}
function dcOwner(t){
 const worker=state.dxEmployees.find(e=>e.id===t.employeeId);
 return worker?worker.name:"Unassigned";
}
function dcAssignmentState(t){
 if(!t.employeeId)return "Unassigned";
 return t.acknowledgedAt?"Acknowledged":"Awaiting acknowledgment";
}
function dcAssignOptions(t){
 return state.dxEmployees.filter(e=>e.team===t.team).sort((a,b)=>a.name.localeCompare(b.name));
}
function dcAssignModal(id){
 if(!dxRequire("assign"))return;
 const t=dxTicket(id);if(!t||["Completed","Voided"].includes(t.status))return flash("Closed ticket cannot be reassigned");
 const employees=dcAssignOptions(t);
 const current=t.employeeId||"";
 const menu='<option value="">Unassigned — department queue</option>'+employees.map(e=>'<option value="'+safe(e.id)+'"'+(current===e.id?" selected":"")+(e.available?"":" disabled")+'>'+safe(e.name)+' · '+safe(e.shift)+' shift'+(e.available?"":" · unavailable")+'</option>').join("");
 const info=employees.length?'<p class="dc-hint">'+employees.filter(e=>e.available).length+' available team member(s) · Only available '+safe(t.team)+' employees can be selected.</p>':'<div class="alertbox">No employees configured for '+safe(t.team)+'. Leave this ticket in its department queue.</div>';
 modal("Assign ticket #"+id,'<label>Assigned employee<select name="employee" aria-label="Assigned employee">'+menu+'</select></label>'+info,
 f=>{
  const value=String(f.get("employee")||"");
  if(value===current){closeModal();return}
  const ok=dxAssign(id,value);
  if(ok){closeModal();flash(value?"Ticket assigned — acknowledgment pending":"Ticket returned to department queue")}
 });
}
function dcAssignQuick(id){dcAssignModal(id)}
// Replace the historical "team" assignment callback with the single employee model.
function svcAssign(id,value){
 const employee=state.dxEmployees.find(x=>x.id===value);
 if(value==="Unassigned"||value===""){dxAssign(id,"");return}
 if(employee){dxAssign(id,employee.id);return}
 flash("Choose an employee through the assignment control");
};
function dcFilterSet(value){dcStatus=value;render()}
function dcMainTab(value){dxTab=value;svcSelected=null;render()}
function dcQueue(){
 const tickets=state.tickets.filter(t=>dcStatus==="All"||(dcStatus==="Active"?!["Completed","Voided"].includes(t.status):t.status===dcStatus));
 const q=dxSearch.trim().toLowerCase();
 const rows=tickets.filter(t=>(dxDepartment==="All"||dxDepartment===t.team)&&
  (String(t.id)+" "+t.title+" "+t.team+" "+t.location+" "+(t.category||"")+" "+dcOwner(t)).toLowerCase().includes(q));
 rows.sort((a,b)=>{
  const pa=(!["Completed","Voided"].includes(a.status)&&Date.parse(a.dueAt)<Date.now())?1:0;
  const pb=(!["Completed","Voided"].includes(b.status)&&Date.parse(b.dueAt)<Date.now())?1:0;
  return pb-pa||({"Critical":0,"High":1,"Normal":2,"Low":3}[a.priority]??2)-({"Critical":0,"High":1,"Normal":2,"Low":3}[b.priority]??2)||Date.parse(b.createdAt)-Date.parse(a.createdAt)
 });
 const active=state.tickets.filter(x=>!["Completed","Voided"].includes(x.status));
 const overdue=active.filter(x=>Date.parse(x.dueAt)<Date.now());
 const counts='<div class="dc-stats"><div class="dc-stat"><strong>'+active.length+'</strong><span>Active</span></div><div class="dc-stat"><strong>'+active.filter(x=>!x.employeeId).length+'</strong><span>Unassigned</span></div><div class="dc-stat"><strong>'+active.filter(x=>x.employeeId&&!x.acknowledgedAt).length+'</strong><span>Awaiting acceptance</span></div><div class="dc-stat"><strong>'+overdue.length+'</strong><span>Past target</span></div></div>';
 const filters='<div class="dc-filters"><input id="dxSearch" aria-label="Search dispatch" placeholder="Search tickets, guests, rooms..." value="'+safe(dxSearch)+'"><select id="dxDept" aria-label="Department">'+svcOpts(["All",...DX_DEPTS],dxDepartment)+'</select><select id="dcStatus" aria-label="Ticket status">'+svcOpts(["Active","All","Open","Started","Stopped","Completed","Voided"],dcStatus)+'</select></div>';
 const body=rows.map(t=>{
  const due=Date.parse(t.dueAt)<Date.now()&&!["Completed","Voided"].includes(t.status);
  const owner=dcOwner(t),ack=dcAssignmentState(t);
  return '<div class="dc-ticket"><div><button class="dc-ticket-title" onclick="svcOpen('+t.id+')">#'+t.id+' · '+safe(t.title)+'</button><div class="dc-ticket-sub">'+safe(t.team)+' · '+safe(t.location)+' · '+safe(t.priority)+' priority</div><div class="dc-ticket-sub"><strong class="dc-assignee">'+safe(owner)+'</strong> · '+safe(ack)+(due?' · <span class="dc-overdue">Overdue</span>':"")+'</div></div><div class="dc-ticket-actions">'+svcTag(t)+(dxPermission("assign")&&!["Completed","Voided"].includes(t.status)?'<button class="dc-btn" onclick="dcAssignQuick('+t.id+')">'+(t.employeeId?"Reassign":"Assign")+'</button>':"")+'<button class="dc-btn" onclick="svcOpen('+t.id+')">Details</button></div></div>';
 }).join("");
 return counts+panel("Tickets",filters+'<div class="dc-hint" style="margin-bottom:8px">'+rows.length+' tickets shown · New and urgent requests appear first</div>'+(body||'<p class="muted">No matching tickets.</p>'));
}
function dcTeam(){
 const employees=state.dxEmployees.slice().sort((a,b)=>a.team.localeCompare(b.team)||a.name.localeCompare(b.name));
 return panel("On-duty team",'<div class="dc-hint" style="margin-bottom:11px">Availability and shifts are illustrative. Changes affect this browser only.</div>'+employees.map(e=>{
 const assigned=state.tickets.filter(t=>t.employeeId===e.id&&!["Completed","Voided"].includes(t.status));
 return '<div class="dc-employee"><div><strong>'+safe(e.name)+' · '+safe(e.team)+'</strong><small>'+safe(e.shift)+' shift · '+assigned.length+' active assignment(s)'+(assigned.filter(t=>!t.acknowledgedAt).length?" · "+assigned.filter(t=>!t.acknowledgedAt).length+" awaiting acceptance":"")+'</small></div><button class="dc-btn" onclick="dxToggleEmployee(\''+e.id+'\')">'+(e.available?"Available":"Unavailable")+'</button></div>';
 }).join(""));
}
function dcHome(){
 const tabs=[["Queue","Tickets"],["Employees","Team"],["Schedules","Scheduled"],["Analytics","Reports"]];
 const current=tabs.some(x=>x[0]===dxTab)?dxTab:"Queue";
 const tabbar='<div class="dc-toolbar"><div class="dc-tabs">'+tabs.map(([key,label])=>'<button class="'+(current===key?"active":"")+'" onclick="dcMainTab(\''+key+'\')">'+label+'</button>').join("")+'</div><button class="dc-btn primary" onclick="dxNewRequest(\'Front Office\')">+ New ticket</button></div>';
 const content=current==="Queue"?dcQueue():current==="Employees"?dcTeam():current==="Schedules"?dxSchedule():dxAnalytics();
 return header("Service Dispatch","Hotel-wide requests, assignments and work history.")+tabbar+content+
 '<div style="margin-top:15px" class="dc-hint">Synthetic preview · employee permissions, notifications and cross-device updates require the private backend.</div>';
}
function dcRow(k,v){return '<div class="dc-line"><span>'+safe(k)+'</span><strong>'+safe(v??"—")+'</strong></div>'}
function dcDetail(){
 const t=dxTicket(svcSelected);if(!t)return '<button class="dc-btn" onclick="svcBack()">← Tickets</button><p>Ticket not found.</p>';
 const closed=["Completed","Voided"].includes(t.status);
 const assignee=dcOwner(t),pending=t.employeeId&&!t.acknowledgedAt;
 const controls='<div class="dc-assign-card"><strong>'+safe(assignee)+'</strong><p>'+safe(dcAssignmentState(t))+' · '+safe(t.team)+'</p></div>'+
 '<div class="dxactions">'+(!closed&&dxPermission("assign")?'<button class="dc-btn" onclick="dcAssignModal('+t.id+')">'+(t.employeeId?"Reassign":"Assign employee")+'</button><button class="dc-btn" onclick="dxAutoAssign('+t.id+')">Auto-assign</button>':"")+
 (pending?'<button class="dc-btn primary" onclick="dxAck('+t.id+')">Acknowledge</button>':"")+'</div>'+
 '<div class="dxactions" style="margin-top:14px">'+
 (["Open","Stopped"].includes(t.status)?'<button class="dc-btn primary" onclick="svcAction('+t.id+',\'Start\')">Start work</button>':"")+
 (t.status==="Started"?'<button class="dc-btn" onclick="svcAction('+t.id+',\'Stop\')">Stop</button><button class="dc-btn primary" onclick="svcAction('+t.id+',\'Complete\')">Complete</button>':"")+
 (!closed?'<button class="dc-btn" onclick="svcAction('+t.id+',\'Void\')">Void</button>':"")+
 (t.status==="Completed"?'<button class="dc-btn" onclick="dxReopenPrompt('+t.id+')">Reopen</button>':"")+'</div>'+
 '<div class="dc-fields"><label>Priority<select onchange="svcPriority('+t.id+',this.value)"'+(closed?" disabled":"")+'>'+svcOpts(SVC_PRIORITIES,t.priority)+'</select></label></div>'+
 '<div class="dc-hint" style="margin-top:12px">Start, Stop, Complete and Void are recorded in the ticket history. Completion, Stop and Void require documentation.</div>';
 const work=panel("Request",dcRow("Department",t.team)+dcRow("Category",t.category)+dcRow("Location",t.location)+dcRow("Priority",t.priority)+dcRow("Created",svcTime(t.createdAt))+dcRow("Target",svcTime(t.dueAt))+dcRow("Status",t.status)+
 '<p class="muted" style="padding:14px 0 4px;line-height:1.6">'+safe(t.description||"")+'</p>'+
 (t.resolution?'<div class="alertbox" style="margin-top:10px">Resolution: '+safe(t.resolution)+'</div>':"")+
 (t.voidReason?'<div class="alertbox" style="margin-top:10px">Void reason: '+safe(t.voidReason)+'</div>':""));
 const record=panel("History and notes",
 '<textarea id="svcNote" class="svcnote" placeholder="Add a shift handoff or progress note"></textarea><div style="margin:10px 0 16px"><button class="dc-btn" onclick="svcAddNote('+t.id+')">Add note</button></div>'+
 [...(t.notes||[]).map(n=>({event:"Note",note:n.text,at:n.at,by:n.by})),...(t.history||[])].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).map(e=>'<div class="dxlog"><strong>'+safe(e.event)+'</strong><small>'+svcTime(e.at)+' · '+safe(e.by||"Demo operator")+'</small><div>'+safe(e.note||"")+'</div></div>').join(""));
 const linked=(t.links||[]).map(id=>'<button class="dc-btn" onclick="svcOpen('+id+')">#'+id+'</button>').join("");
 const extras=panel("Related work and attachments",'<div class="dxactions"><button class="dc-btn" onclick="dxCreateLinkedPrompt('+t.id+')">+ Linked ticket</button>'+linked+'</div>'+
 '<div class="dc-hint" style="margin-top:12px">Attachments store file metadata only in this public demo. Do not upload sensitive information.</div>'+
 '<input type="file" id="dxFile" accept="image/*,.pdf" onchange="dxAttach('+t.id+',this)" style="margin-top:12px;max-width:100%">'+
 (t.attachments||[]).map(x=>'<div class="dc-line"><span>'+safe(x.name)+'</span><strong>'+Math.round(x.bytes/1024)+' KB</strong></div>').join(""));
 return '<div class="dc-detail-head"><button class="dc-btn" onclick="svcBack()">← All tickets</button></div>'+
 header("Ticket #"+t.id,t.title+" · "+t.location)+
 '<div class="dc-details">'+work+panel("Assignment and actions",controls)+'</div>'+
 '<div class="dc-details dc-detail-footer">'+record+extras+'</div>';
}
// Replace the nested legacy detail view and duplicate assignment panels.
function services(){return svcSelected!==null?dcDetail():dcHome()}

dcStaffBootstrap();


/* Operational fixes — explicit mode, accurate SLA processing, editable request details. */
function dxActAs(id){const e=state.dxEmployees.find(x=>x.id===id);if(!e)return;dxActingEmployeeId=e.id;dxRole="staff";render()}
function dcCorrect(id){
 if(!dxRequire("assign"))return;
 const t=dxTicket(id);if(!t||["Completed","Voided"].includes(t.status))return flash("Closed requests cannot be corrected");
 modal("Correct ticket #"+id,
 '<label>Request summary<input name="title" required value="'+safe(t.title)+'"></label>'+
 '<label>Location<input name="location" required value="'+safe(t.location)+'"></label>'+
 '<label>Department<select name="team">'+svcOpts(DX_DEPTS,t.team)+'</select></label>'+
 '<label>Reason for correction<input name="reason" required placeholder="Explain the correction"></label>',f=>{
 const title=String(f.get("title")||"").trim(),location=String(f.get("location")||"").trim(),team=String(f.get("team")||""),reason=String(f.get("reason")||"").trim();
 if(!title||!location||!reason||!DX_DEPTS.includes(team))return flash("Complete all correction fields");
 const before=t.title+" / "+t.location+" / "+t.team;
 t.title=title;t.location=location;
 if(t.team!==team){t.team=team;t.employeeId=null;t.assignee="Unassigned";t.acknowledgedAt=null;}
 const mt=location.match(/\b\d{3,4}\b/);t.room=mt?Number(mt[0]):null;
 dxEvent(t,"Ticket corrected",before+" → "+title+" / "+location+" / "+team+" · "+reason);
 closeModal();render();flash("Correction recorded");
 });
}
const dcDetailBeforeFix=dcDetail;
dcDetail=function(){
 const original=dcDetailBeforeFix();
 const t=dxTicket(svcSelected);
 if(!t||["Completed","Voided"].includes(t.status)||!dxPermission("assign"))return original;
 return original.replace('<div class="dc-details">','<div class="dxactions" style="margin-bottom:12px"><button class="dc-btn" onclick="dcCorrect('+t.id+')">Correct request details</button></div><div class="dc-details">');
};
const dcHomeBeforeFix=dcHome;
dcHome=function(){
 const s=dcHomeBeforeFix();
 const role='<div class="dc-filters" style="margin:0 0 12px"><label class="dc-hint">Preview role <select aria-label="Preview user role" onchange="dxSetRole(this.value)">'+svcOpts(Object.keys(DX_ROLES),dxRole)+'</select></label>'+
 (dxRole==="staff"?'<label class="dc-hint">Acting employee <select aria-label="Acting employee" onchange="dxActAs(this.value)">'+svcOpts(["",...state.dxEmployees.map(e=>e.id)],dxActingEmployeeId||"")+'</select></label>':'')+'</div>';
 const controls='<div class="dxactions" style="margin-bottom:12px"><button class="dc-btn" onclick="dxProcessEscalations()">Process overdue alerts</button><button class="dc-btn" onclick="dxAutoDispatchQueue()">Auto-assign unassigned</button></div>';
 return s.replace('<div class="dc-toolbar">',role+'<div class="dc-toolbar">').replace('<div class="dc-stats">',controls+'<div class="dc-stats">');
};


/* Correct legacy synthetic booking dates once without rewriting custom bookings. */
function migrateLegacyDemoDates(){
 if(state.demoCalendarAligned)return;
 const sample=state.reservations.find(r=>r.id===12000);
 const legacy=sample&&sample.arrival==="2026-11-06";
 const delta=legacy?Math.round((Date.parse(DEMO_DATE+"T12:00:00Z")-Date.parse("2026-11-12T12:00:00Z"))/86400000):0;
 if(legacy&&delta){
  for(const r of state.reservations.filter(r=>r.id>=12000&&r.id<12096)){
   if(r.arrival)r.arrival=datePlus(r.arrival,delta);
   if(r.departure)r.departure=datePlus(r.departure,delta);
   for(const entry of r.folio||[])if(entry.at&&/^\d{4}-\d{2}-\d{2}$/.test(entry.at))entry.at=datePlus(entry.at,delta);
   for(const event of r.audit||[])if(event.at&&/^\d{4}-\d{2}-\d{2}$/.test(event.at))event.at=datePlus(event.at,delta);
  }
 }
 const originalShift=Math.round((Date.parse(DEMO_DATE+"T12:00:00Z")-Date.parse("2026-11-12T12:00:00Z"))/86400000);
 for(const r of state.reservations.filter(r=>[1001,1002,1003].includes(r.id))){
  if(originalShift&&r.arrival?.startsWith("2026-11")&&r.departure?.startsWith("2026-11")){
   r.arrival=datePlus(r.arrival,originalShift);r.departure=datePlus(r.departure,originalShift);
   for(const entry of r.folio||[])if(entry.at&&/^\d{4}-\d{2}-\d{2}$/.test(entry.at))entry.at=datePlus(entry.at,originalShift);
  }
 }
 state.demoCalendarAligned=true;
 save();
}
migrateLegacyDemoDates();

