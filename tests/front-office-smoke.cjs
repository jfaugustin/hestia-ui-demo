const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
const extension=fs.readFileSync("front-office.js","utf8");
assert.ok(html.includes('src="./front-office.js?v=4"'),"Front Office module must be loaded");
assert.ok(html.includes('href="./front-office.css?v=4"'),"Front Office stylesheet must be loaded");
new vm.Script(extension,{filename:"front-office.js"});
const elements={};
const document={
 getElementById(id){return elements[id]||(elements[id]={innerHTML:"",classList:{toggle(){}},querySelector(){return null}})},
 querySelectorAll(){return []},createElement(){return {remove(){},click(){}}},body:{append(){}}
};
const localStorage={memory:{},getItem(k){return this.memory[k]??null},setItem(k,v){this.memory[k]=String(v)}};
const sandbox={document,localStorage,window:{scrollTo(){}},confirm:()=>true,setTimeout:()=>{},console,Blob,URL:{createObjectURL:()=>"",revokeObjectURL(){}}};
vm.createContext(sandbox);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
vm.runInContext(extension,sandbox);
const evalCode=code=>vm.runInContext(code,sandbox);
evalCode("nav('Front Desk')");
assert.ok(elements.content.innerHTML.includes("Front Office"),"Front Office command center rendered");
assert.ok(elements.content.innerHTML.includes("Guest service queue"),"Guest service queue visible");
assert.ok(elements.content.innerHTML.includes("Guest reservations"),"Reservation context visible");
assert.equal(evalCode("Object.keys(FO3_SERVICES).length"),19,"Nineteen service templates");
assert.ok(evalCode("Object.values(FO3_SERVICES).every(x=>x.sla>0&&x.team&&x.group)"),"All service templates route correctly");
for(const group of ["Arrivals & departures","Deliveries","Guest assistance","Concierge & follow-up"]){
 evalCode("fo3SetGroup("+JSON.stringify(group)+")");
 assert.ok(elements.content.innerHTML.includes(group),"Service category view "+group);
}
for(const status of ["Active","Attention","All","Started","Completed","Voided"]){
 evalCode("fo3SetStatus("+JSON.stringify(status)+")");
 assert.ok(elements.content.innerHTML.includes("Guest service queue"),"Queue status filter "+status);
}
evalCode("fo3SetStatus('Active')");
evalCode("modal=function(title,fields,done){captured={title,fields,done}}");
sandbox.captured={};
evalCode("fo3Request('Luggage storage')");
assert.ok(sandbox.captured.title.includes("New guest service request"),"New service modal launched");
assert.ok(sandbox.captured.fields.includes("Claim reference"),"Luggage storage has claim field");
assert.ok(sandbox.captured.fields.includes("Storage location"),"Luggage storage has storage field");
const starting=evalCode("state.tickets.length");
const get=key=>({
 kind:"Luggage storage",guest:"Test Guest",location:"Room 205",reservation:"",
 priority:"Normal",requestedFor:"",extra0:"3",extra1:"CLAIM-1234",extra2:"Secured bell closet",
 instructions:"Pickup required before departure"
})[key]||"";
sandbox.captured.done({get});
assert.equal(evalCode("state.tickets.length"),starting+1,"Service request is created");
const ticketId=evalCode("state.tickets[0].id");
assert.equal(evalCode("state.tickets[0].team"),"Bell Service","Correct department");
assert.equal(evalCode("state.tickets[0].foFields['Claim reference']"),"CLAIM-1234","Service-specific fields persisted");
assert.equal(evalCode("state.tickets[0].foFields['Pieces']"),"3");
assert.ok(elements.content.innerHTML.includes("Guest service details"),"Front Office metadata on ticket");
assert.ok(elements.content.innerHTML.includes("CLAIM-1234"),"Claim reference visible on ticket");
assert.equal(evalCode("svcChange("+ticketId+",'Start','')"),true,"Bell request starts");
assert.equal(evalCode("svcChange("+ticketId+",'Complete','Luggage released to verified claimant')"),true,"Bell request can complete");
assert.equal(evalCode("state.tickets[0].status"),"Completed");
evalCode("fo3Request('Live checkout')");
assert.ok(sandbox.captured.fields.includes("Departure preference"),"Checkout-specific fields visible");
sandbox.captured.done({get:key=>({
 kind:"Live checkout",guest:"Departure Guest",location:"Room 206",reservation:"",
 priority:"High",requestedFor:"",extra0:"Front desk",extra1:"Vehicle pickup",
 instructions:"Coordinate departure"
})[key]||""});
const checkoutId=evalCode("state.tickets[0].id");
assert.equal(evalCode("state.tickets[0].team"),"Front Office");
assert.ok(elements.content.innerHTML.includes("separate from PMS checkout"),"Checkout separation explained");
assert.equal(evalCode("fo3DepartureTasks("+checkoutId+")"),true,"Linked bell/valet departure requests created");
assert.equal(evalCode("state.tickets.find(x=>x.id==="+checkoutId+").links.length"),2);
assert.equal(evalCode("fo3DepartureTasks("+checkoutId+")"),false,"Linked departure tasks are idempotent");
const linkedTypes=evalCode("state.tickets.filter(x=>state.tickets.find(t=>t.id==="+checkoutId+").links.includes(x.id)).map(x=>x.team)");
assert.ok(linkedTypes.includes("Bell Service")&&linkedTypes.includes("Valet"),"Bell and valet linked without duplicate");
evalCode("nav('Front Desk')");
assert.ok(elements.content.innerHTML.includes("Front Office"),"Navigation returns to Front Office");
console.log("PASS: Front Office v3 catalog, filters, specialized fields, service lifecycle, reservation page and linked departure workflow");
