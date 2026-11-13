const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
for(const asset of ["front-office.js?v=5","app-shell.js?v=5","app-shell.css?v=2","housekeeping.js?v=2","housekeeping.css?v=1"])
 assert.ok(html.includes(asset),"Required versioned asset "+asset);
const sources=[fs.readFileSync("core.js","utf8"),fs.readFileSync("front-office.js","utf8"),fs.readFileSync("app-shell.js","utf8"),fs.readFileSync("housekeeping.js","utf8")];
for(const source of sources){assert.ok(source);new vm.Script(source)}
const nodes={};
const document={
 getElementById(id){return nodes[id]||(nodes[id]={innerHTML:"",classList:{toggle(){}},querySelector(){return null}})},
 querySelectorAll(){return []},
 querySelector(){return null},
 createElement(){return {remove(){},click(){}}},
 body:{append(){}}
};
const localStorage={memory:{},getItem(k){return this.memory[k]??null},setItem(k,v){this.memory[k]=String(v)}};
const ctx={document,localStorage,window:{scrollTo(){}},confirm:()=>true,setTimeout:()=>{},console,Blob,
 URL:{createObjectURL:()=>"",revokeObjectURL(){}},Intl,Date};
vm.createContext(ctx);
for(const source of sources)vm.runInContext(source,ctx);
const evaluate=source=>vm.runInContext(source,ctx);
const menu=nodes.nav.innerHTML;
assert.equal((menu.match(/data-page=/g)||[]).length,9,"Nine stable navigation destinations");
for(const section of ["Overview","Reservations","Front Desk","Rooms","Housekeeping","Service Dispatch","Security","Financials","Operations"]){
 evaluate("nav("+JSON.stringify(section)+")");
 assert.ok(nodes.content.innerHTML.length>350,section+" renders");
 assert.equal((nodes.nav.innerHTML.match(/data-page=/g)||[]).length,9,section+" retains stable navigation");
 assert.equal((nodes.nav.innerHTML.match(/aria-current=\"page\"/g)||[]).length,1,section+" has one selected menu item");
}
evaluate("nav('Overview')");
assert.ok(nodes.content.innerHTML.includes("Priority requests"),"Dashboard focuses on action queue");
assert.ok(nodes.content.innerHTML.includes("Today’s operations"),"Dashboard shows daily summary");
assert.ok(!nodes.content.innerHTML.includes("Seven-day booked occupancy"),"Avoid duplicate chart dashboard");
evaluate("nav('Rooms')");
assert.ok(nodes.content.innerHTML.includes("Inventory"));
assert.ok(nodes.content.innerHTML.includes("h4RoomFilter"));
assert.ok(!nodes.content.innerHTML.includes("Rooms needing service"),"Room inventory is separate from cleaning assignments");
evaluate("nav('Housekeeping')");
assert.ok(nodes.content.innerHTML.includes("Housekeeping"),"Dedicated Housekeeping page");
assert.ok(nodes.content.innerHTML.includes("Room board"),"Dedicated cleaning board available");
assert.ok(nodes.nav.innerHTML.includes('data-page="Housekeeping"'),"Housekeeping is its own top-level destination");
evaluate("nav('Reservations')");
assert.ok(nodes.content.innerHTML.includes("Guest directory"),"Guest directory available as reservation tab");
evaluate("h4SwitchStay('Guests')");
assert.ok(nodes.content.innerHTML.includes("Guest profiles"),"Guests list retained");
assert.ok(nodes.nav.innerHTML.includes('data-page="Reservations"'),"Guest page grouped under Reservations");
const id=evaluate("state.reservations.find(r=>r.status==='Checked in').id");
evaluate("openDetail("+id+")");
assert.ok(nodes.content.innerHTML.includes("Stay details"),"Reservation detail remains accessible");
assert.ok((nodes.nav.innerHTML.match(/data-page=/g)||[]).length===9,"No nav shift in reservation detail");
evaluate("nav('Operations')");
assert.ok(nodes.content.innerHTML.includes("Department workload"),"Unified operations summary rendered");
evaluate("h4SwitchOps('Workforce')");
assert.ok(nodes.content.innerHTML.includes("Team directory"),"Staff directory under Operations");
evaluate("h4SwitchOps('Intelligence')");
assert.ok(nodes.content.innerHTML.includes("Department performance"),"Reports use actual demo ticket counts");
evaluate("nav('Front Desk')");
assert.ok(nodes.content.innerHTML.includes("Guest service queue"),"Front Office guest workflow preserved");
evaluate("nav('Service Dispatch')");
const service=evaluate("state.tickets.find(t=>t.status==='Open').id");
evaluate("svcOpen("+service+")");
assert.ok(nodes.content.innerHTML.includes("Assignment and actions"),"Dispatch individual ticket accessible");
evaluate("nav('Financials')");
assert.ok(nodes.content.innerHTML.includes("Financials"),"Folio / finance page retained");
evaluate("resetDemo()");
assert.equal(evaluate("state.rooms.length"),120,"Demo reset restores full room inventory");
assert.ok(evaluate("state.tickets.length")>=60,"Demo reset restores expanded workflows");
assert.ok(evaluate("state.dxEmployees.length")>=20,"Demo reset restores employee directory");
assert.equal(evaluate("state.hkJobs.length"),120,"Demo reset restores full housekeeping queue");
evaluate("nav('Front Desk')");
assert.ok(nodes.content.innerHTML.includes("Guest service queue"),"Front Office survives reset");
console.log("PASS: Hestia v4 consolidated shell, 9 stable sections, contextual tabs, detail workflows and reset");
