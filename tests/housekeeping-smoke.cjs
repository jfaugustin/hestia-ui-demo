const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
for(const asset of ["housekeeping.js?v=1","housekeeping.css?v=1","app-shell.js?v=4"])
 assert.ok(html.includes(asset),"Housekeeping release asset "+asset);
const sources=["core.js","front-office.js","app-shell.js","housekeeping.js"].map(p=>fs.readFileSync(p,"utf8"));
const el={};
const document={
 getElementById(id){return el[id]||(el[id]={innerHTML:"",classList:{toggle(){}},querySelector(){return null}})},
 querySelectorAll(){return []},querySelector(){return null},
 createElement(){return {remove(){},click(){}}},body:{append(){}}
};
const localStorage={data:{},getItem(k){return this.data[k]??null},setItem(k,v){this.data[k]=String(v)}};
const ctx={document,localStorage,window:{scrollTo(){}},confirm:()=>true,setTimeout:()=>{},console,Blob,
 URL:{createObjectURL:()=>"",revokeObjectURL(){}},Intl,Date};
vm.createContext(ctx);
for(const s of sources){new vm.Script(s);vm.runInContext(s,ctx)}
const e=s=>vm.runInContext(s,ctx);
assert.equal(e("state.rooms.length"),120);
assert.equal(e("state.hkJobs.length"),120,"Every room has a Housekeeping workflow");
e("nav('Housekeeping')");
for(const label of ["Room board","Guest requests","Attendants","Shift handover"])
 assert.ok(el.content.innerHTML.includes(label),"Department workspace includes "+label);
assert.equal((el.nav.innerHTML.match(/data-page=/g)||[]).length,9);
assert.ok(el.nav.innerHTML.includes('data-page="Housekeeping"'));
const dirty=e("state.hkJobs.find(j=>j.stage==='Assigned'&&state.rooms.find(r=>r.id===j.room).status==='dirty').room");
assert.equal(e("hkUpdate("+dirty+",'Approve')"),false,"Cannot skip cleaning and inspection");
assert.equal(e("hkUpdate("+dirty+",'Start')"),true);
assert.equal(e("hkUpdate("+dirty+",'Submit')"),true);
assert.equal(e("hkUpdate("+dirty+",'Approve')"),true);
assert.equal(e("hkRoom("+dirty+").status"),"ready","Supervisor inspection updates Front Office shared room inventory");
assert.equal(e("hkJob("+dirty+").stage"),"Ready");
assert.ok(e("hkJob("+dirty+").history.length")>=4);
const failRoom=e("state.hkJobs.find(j=>j.stage==='Assigned'&&state.rooms.find(r=>r.id===j.room).status==='dirty').room");
assert.equal(e("hkUpdate("+failRoom+",'Start')"),true);
assert.equal(e("hkUpdate("+failRoom+",'Submit')"),true);
assert.equal(e("hkUpdate("+failRoom+",'Fail','')"),false,"Failure needs a documented reason");
assert.equal(e("hkUpdate("+failRoom+",'Fail','Missing amenities')"),true);
assert.equal(e("hkJob("+failRoom+").stage"),"Assigned","Failed inspection returns for correction");
const hold=e("state.hkJobs.find(j=>j.stage==='Assigned'&&state.rooms.find(r=>r.id===j.room).status==='dirty').room");
assert.equal(e("hkUpdate("+hold+",'Hold','Waiting for room access')"),true);
assert.equal(e("hkUpdate("+hold+",'Resume')"),true);
const occupied=e("state.hkJobs.find(j=>j.stage==='Ready'&&state.rooms.find(r=>r.id===j.room).status==='occupied').room");
assert.equal(e("hkUpdate("+occupied+",'Service','Stayover')"),true,"Stayover cleaning may be requested");
const housekeeper=e("hkStaff().find(x=>x.available).id");
assert.equal(e("hkUpdate("+occupied+",'Assign',"+JSON.stringify(housekeeper)+")"),true);
assert.equal(e("hkUpdate("+occupied+",'Start')"),true);
assert.equal(e("hkUpdate("+occupied+",'Submit')"),true);
assert.equal(e("hkUpdate("+occupied+",'Approve')"),true);
assert.equal(e("hkRoom("+occupied+").status"),"occupied","Cleaning an occupied stayover room preserves occupancy");
const out=e("state.hkJobs.find(j=>state.rooms.find(r=>r.id===j.room).status==='out').room");
assert.equal(e("hkUpdate("+out+",'Resume')"),false,"Out-of-order rooms cannot be marked ready by Housekeeping");
e("hkSetTab('Team')");
assert.ok(el.content.innerHTML.includes("Attendants and room allocations"));
e("hkSetTab('Requests')");
assert.ok(el.content.innerHTML.includes("Housekeeping requests"));
e("hkSetTab('Passdown')");
assert.ok(el.content.innerHTML.includes("Outstanding handoff"));
e("modal=function(title,fields,done){captured={title,fields,done}}");
e("hkServiceRequest()");
assert.ok(ctx.captured.fields.includes("Turndown service"),"Housekeeping request categories available");
const count=e("state.tickets.length");
ctx.captured.done({get:k=>({type:"Extra towels",room:String(occupied),priority:"High",description:"Four bath towels"})[k]||""});
assert.equal(e("state.tickets.length"),count+1,"Guest request is a unified dispatch ticket");
assert.equal(e("state.tickets[0].team"),"Housekeeping");
assert.equal(e("state.tickets[0].location"),"Room "+occupied);
e("hkHandover()");
assert.ok(ctx.captured.fields.includes("Outstanding work"));
const notes=e("state.hkPassdowns.length");
ctx.captured.done({get:k=>({shift:"AM → PM",author:"Shift supervisor",text:"Follow up on outstanding turndown requests"})[k]||""});
assert.equal(e("state.hkPassdowns.length"),notes+1,"Passdown persists");
// Checkout queues an actual departure turnover for Housekeeping.
const departing=e("state.reservations.find(r=>r.status==='Checked in').id");
const departureRoom=e("state.reservations.find(r=>r.id==="+departing+").room");
e("changeReservation("+departing+",'Checked out')");
assert.equal(e("hkRoom("+departureRoom+").status"),"dirty","Checkout leaves room dirty");
assert.equal(e("hkJob("+departureRoom+").stage"),"Unassigned","Checkout opens cleaning task");
assert.equal(e("hkJob("+departureRoom+").kind"),"Departure","Checkout is a departure turnover");
assert.equal(e("markReady("+departureRoom+")"),false,"Legacy ready shortcut cannot bypass inspection");
assert.equal(e("hkRoom("+departureRoom+").status"),"dirty","Room remains unavailable until inspected");
e("resetDemo()");
assert.equal(e("state.hkJobs.length"),120,"Reset restores Housekeeping metadata without duplication");
assert.equal(e("state.hkPassdowns.length"),1,"Reset restores demonstration passdown");
e("nav('Rooms')");
assert.ok(el.content.innerHTML.includes("Inventory and availability"),"Rooms retains shared inventory");
assert.ok(el.content.innerHTML.includes("hkOpenRoom("),"Room inventory opens corresponding Housekeeping work record");
assert.ok(!el.content.innerHTML.includes("cycleRoom("),"Inventory cannot bypass supervisor inspections");
const linkedRoom=e("state.hkJobs.find(j=>j.stage!=='Ready').room");
e("hkOpenRoom("+linkedRoom+")");
assert.equal(e("page"),"Housekeeping","Room link navigates to standalone department");
assert.ok(el.content.innerHTML.includes("Room "+linkedRoom),"Room search highlights linked Housekeeping work record");
e("nav('Housekeeping')");
assert.ok(el.content.innerHTML.includes("Room board"),"Housekeeping remains independent after reset");
console.log("PASS: Housekeeping assignments, cleaning, inspection pass/fail, stayover occupancy, service requests, passdowns, and reset");
