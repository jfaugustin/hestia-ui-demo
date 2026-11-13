const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,"Inline demo JavaScript must exist");
new vm.Script(js,{filename:"hestia-demo.js"});
const elements={};
const doc={
 getElementById(id){return elements[id]||(elements[id]={innerHTML:"",classList:{toggle(){}}})},
 querySelectorAll(){return []},
 createElement(){return {remove(){}}},
 body:{append(){}}
};
const storage={memory:{},getItem(k){return this.memory[k]??null},setItem(k,v){this.memory[k]=String(v)}};
const ctx={document:doc,localStorage:storage,window:{scrollTo(){}},confirm:()=>true,setTimeout:()=>{},console,Blob,URL:{createObjectURL:()=>"",revokeObjectURL(){}}};
vm.createContext(ctx);
vm.runInContext(js,ctx,{filename:"hestia-demo.js"});
const evaluate=s=>vm.runInContext(s,ctx);
assert.equal(evaluate("state.rooms.length"),120,"120-room demonstration");
assert.ok(evaluate("state.reservations.length")>=95,"Reservation register is populated");
assert.ok(evaluate("state.tickets.length")>=30,"Service desk populated");
for(const section of ["Overview","Reservations","Guests","Front Desk","Rooms","Housekeeping","Service Dispatch","Security","Financials","Intelligence","Workforce"]){
 evaluate("nav("+JSON.stringify(section)+")");
 assert.ok(elements.content.innerHTML.length>500,section+" must render");
}
const id=evaluate("state.reservations.find(r=>r.status==='Checked in').id");
evaluate("openDetail("+id+")");
for(const tab of ["Stay","Guest","Folio","Payment controls","Activity"]){
 evaluate("selectDetailTab("+JSON.stringify(tab)+")");
 assert.ok(elements.content.innerHTML.length>500,tab+" must render");
}
assert.ok(evaluate("folioBalance(state.reservations.find(r=>r.id==="+id+"))")>0);
evaluate("demoCheckOut("+id+")");
assert.equal(evaluate("state.reservations.find(r=>r.id==="+id+").status"),"Checked in","Checkout blocked without settlement");
evaluate("simulateAuthorization("+id+")");
evaluate("simulateAuthorization("+id+")");
assert.equal(evaluate("state.reservations.find(r=>r.id==="+id+").paymentEvents.filter(x=>x.type==='Authorization').length"),1,"Duplicate authorization blocked");
evaluate("simulateCapture("+id+")");
evaluate("simulateCapture("+id+")");
assert.equal(evaluate("state.reservations.find(r=>r.id==="+id+").paymentEvents.filter(x=>x.type==='Capture').length"),1,"Duplicate capture blocked");
assert.equal(evaluate("folioBalance(state.reservations.find(r=>r.id==="+id+"))"),0,"Mock folio settled");
evaluate("demoCheckOut("+id+")");
assert.equal(evaluate("state.reservations.find(r=>r.id==="+id+").status"),"Checked out");
evaluate("simulateRefund("+id+")");
assert.ok(evaluate("folioBalance(state.reservations.find(r=>r.id==="+id+"))")>0,"Mock refund restores balance");
assert.ok(!html.includes('name="cvv"')&&!html.includes('name="cardnumber"'),"No payment card input fields");
console.log("PASS: Hestia demo syntax, 11 views, 5 stay tabs, checkout gate, mock authorizations/captures/refunds.");
