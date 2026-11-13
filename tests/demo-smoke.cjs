const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("core.js","utf8");
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
vm.runInContext(fs.readFileSync("front-office.js","utf8"),ctx,{filename:"front-office.js"});
vm.runInContext(fs.readFileSync("app-shell.js","utf8"),ctx,{filename:"app-shell.js"});
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

const activeTicket=evaluate("state.tickets.find(t=>t.status==='Open').id");
assert.equal(evaluate("svcChange("+activeTicket+",'Complete','Premature completion')"),false,"Cannot complete a ticket that has not been started");
assert.equal(evaluate("svcChange("+activeTicket+",'Start','')"),true,"Open → Started");
assert.equal(evaluate("svcChange("+activeTicket+",'Stop','')"),false,"Stop requires reason");
assert.equal(evaluate("svcChange("+activeTicket+",'Stop','Awaiting replacement part')"),true,"Started → Stopped");
assert.equal(evaluate("svcChange("+activeTicket+",'Start','')"),true,"Stopped → Started");
assert.equal(evaluate("svcChange("+activeTicket+",'Complete','Work finished; room verified')"),true,"Started → Completed");
assert.equal(evaluate("svcChange("+activeTicket+",'Void','Mistake')"),false,"Completed ticket cannot be voided");
assert.ok(evaluate("state.tickets.find(t=>t.id==="+activeTicket+").history.length")>=5,"Ticket audit retains required transitions and independent SLA events");
evaluate("svcOpen("+activeTicket+")");
assert.ok(elements.content.innerHTML.includes("Ticket #"),"Individual ticket detail renders");
const voidTicket=evaluate("state.tickets.find(t=>t.status==='Open'&&t.id!=="+activeTicket+").id");
assert.equal(evaluate("svcChange("+voidTicket+",'Void','Duplicate service request')"),true,"Open → Voided with reason");
assert.equal(evaluate("state.tickets.find(t=>t.id==="+voidTicket+").voidReason"),"Duplicate service request");
assert.ok(evaluate("state.tickets.find(t=>t.id==="+activeTicket+").completedAt"),"Completion timestamp saved");


evaluate("nav('Front Desk')");
assert.ok(elements.content.innerHTML.includes("Bell Service"),"Bell Service queue visible");
assert.ok(elements.content.innerHTML.includes("Live Checkout"),"Live Checkout queue visible");
assert.ok(elements.content.innerHTML.includes("Food Delivery"),"Food Delivery queue visible");
assert.ok(evaluate("state.tickets.filter(t=>t.requestType==='Bell Service').length")>=4);
assert.ok(evaluate("state.tickets.filter(t=>t.requestType==='Live Checkout').length")>=4);
assert.ok(evaluate("state.tickets.filter(t=>t.requestType==='Food Delivery').length")>=4);
const bellId=evaluate("state.tickets.find(t=>t.requestType==='Bell Service'&&t.status==='Open').id");
evaluate("foOpen("+bellId+")");
assert.ok(elements.content.innerHTML.includes("Ticket #"+bellId),"Front Office request opens shared detail view");
assert.equal(evaluate("svcChange("+bellId+",'Start','')"),true);
assert.equal(evaluate("svcChange("+bellId+",'Stop','Awaiting bell cart')"),true);
assert.equal(evaluate("svcChange("+bellId+",'Start','')"),true);
assert.equal(evaluate("svcChange("+bellId+",'Complete','Guest luggage delivered')"),true);
const foodId=evaluate("state.tickets.find(t=>t.requestType==='Food Delivery'&&t.status==='Open').id");
assert.equal(evaluate("svcChange("+foodId+",'Void','Duplicate food request')"),true);
assert.equal(evaluate("state.tickets.find(t=>t.id==="+foodId+").voidReason"),"Duplicate food request");
evaluate("nav('Service Dispatch')");
assert.ok(elements.content.innerHTML.includes("Service Dispatch"),"Unified dispatch view still works");


evaluate("nav('Service Dispatch')");
for(const tab of ["Queue","Employees","Schedules","Analytics","Departments"]){
 evaluate("dxSetTab("+JSON.stringify(tab)+")");
 assert.ok(elements.content.innerHTML.length>500,"Dispatch 2.0 "+tab+" must render");
}
assert.ok(evaluate("state.dxEmployees.length")>=8,"On-duty employee roster seeded");
assert.ok(evaluate("state.dxRecurring.length")>=3,"Preventive tasks seeded");
evaluate("dxSetTab('Queue')");
const dispatchId=evaluate("state.tickets.find(t=>t.team==='Valet'&&t.status==='Open'&&!t.employeeId).id");
assert.equal(evaluate("dxAssign("+dispatchId+",'em-105')"),true,"Match employee and department");
assert.equal(evaluate("dxTransition("+dispatchId+",'Start','')"),false,"Cannot start unacknowledged assigned ticket");
assert.equal(evaluate("dxAck("+dispatchId+")"),true,"Assignee acknowledges assignment");
assert.equal(evaluate("dxTransition("+dispatchId+",'Start','')"),true,"Acknowledged ticket can start");
const beforeLink=evaluate("state.tickets.length");
evaluate("dxCreateLinked("+dispatchId+",'Valet','Vehicle retrieval')");
assert.equal(evaluate("state.tickets.length"),beforeLink+1,"Linked request created in separate department");
assert.equal(evaluate("state.tickets.find(t=>t.id==="+dispatchId+").links.length"),1,"Parent retains linked child");
const newChild=evaluate("state.tickets.find(t=>t.id==="+dispatchId+").links[0]");
assert.ok(evaluate("state.tickets.find(t=>t.id==="+newChild+").links.includes("+dispatchId+")"),"Bidirectional linkage retained");
const scheduleId=evaluate("state.dxRecurring.find(r=>r.interval===7).id");
assert.equal(evaluate("dxRecurringRun("+scheduleId+",'2026-11-13')"),true,"Due scheduled work generated");
assert.equal(evaluate("dxRecurringRun("+scheduleId+",'2026-11-13')"),false,"Recurring task is not generated twice");
evaluate("dxSetRole('viewer')");
assert.equal(evaluate("dxAssign("+dispatchId+",'em-105')"),false,"Preview viewer blocked from assignment");
evaluate("dxSetRole('dispatcher')");
evaluate("nav('Service Dispatch')");
assert.ok(elements.content.innerHTML.includes("Service Dispatch"),"Unified dispatch view renders");


evaluate("dxSetRole('dispatcher')");
const reopenId=evaluate("state.tickets.find(t=>t.status==='Completed').id");
assert.equal(evaluate("dxReopen("+reopenId+",'Guest reported unresolved service')"),true,"Supervisor can reopen completed ticket");
assert.equal(evaluate("state.tickets.find(t=>t.id==="+reopenId+").status"),"Open");
assert.equal(evaluate("dxReopen("+reopenId+",'Repeated')"),false,"Cannot reopen already open ticket");
const availableValet=evaluate("state.tickets.find(t=>t.team==='Valet'&&t.status==='Open'&&!t.employeeId).id");
assert.equal(evaluate("dxAutoAssign("+availableValet+")"),true,"Auto-assign routes to available department staff");
assert.ok(evaluate("state.dxEmployees.some(e=>e.id===state.tickets.find(t=>t.id==="+availableValet+").employeeId&&e.team==='Valet'&&e.available)"),"Auto-assignment selects an available Valet employee");


evaluate("dxSetRole('dispatcher')");
evaluate("nav('Service Dispatch')");
evaluate("dcMainTab('Queue')");
assert.ok(elements.content.innerHTML.includes("Service Dispatch"),"Simplified dispatch heading rendered");
assert.ok(elements.content.innerHTML.includes("Awaiting acceptance"),"Queue displays actionable assignment count");
assert.equal(evaluate("state.dxEmployees.filter(e=>e.team==='Guest Services').length"),2,"Guest Services has actual named employees");
const cleanAssignTicket=evaluate("state.tickets.find(t=>t.team==='Guest Services'&&t.status==='Open').id");
assert.equal(evaluate("dcOwner(state.tickets.find(t=>t.id==="+cleanAssignTicket+"))"),"Unassigned","Legacy generic team owner is not a person");
evaluate("dcAssignModal("+cleanAssignTicket+")");
assert.ok(elements.modal?.innerHTML?.includes("Assign ticket")||JSON.stringify(elements).includes("Assign ticket"),"Assignment dialog is accessible");
const noStaffId=evaluate("state.tickets.find(t=>t.team==='Guest Services'&&t.id==="+cleanAssignTicket+").employeeId");
assert.equal(noStaffId,null);
assert.equal(evaluate("dxAssign("+cleanAssignTicket+",'em-120')"),true,"Named employee assignment works");
assert.equal(evaluate("dcOwner(state.tickets.find(t=>t.id==="+cleanAssignTicket+"))"),"Jordan Scott","Queue shows employee name rather than internal ID");
assert.equal(evaluate("dxAssign("+cleanAssignTicket+",'em-115')"),false,"Cross-department reassignment denied");
evaluate("svcOpen("+cleanAssignTicket+")");
assert.ok(elements.content.innerHTML.includes("Assignment and actions"),"Single assignment panel rendered");
assert.ok(!elements.content.innerHTML.includes("Employee dispatch"),"Old duplicate assignment panel removed");
assert.ok(elements.content.innerHTML.includes("Jordan Scott"),"Named assignee displayed in ticket");
evaluate("nav('Service Dispatch')");
evaluate("dcFilterSet('Completed')");
assert.ok(elements.content.innerHTML.includes("Completed"),"Completed filter renders");
evaluate("dcFilterSet('All')");
assert.ok(elements.content.innerHTML.includes("Tickets"),"All status filter renders");
evaluate("dcFilterSet('Active')");
evaluate("dxSetRole('viewer')");
assert.equal(evaluate("dxAssign("+cleanAssignTicket+",'em-120')"),false,"Even unchanged assignments require permission");
evaluate("dxSetRole('dispatcher')");


/* Stability checks for corrected dashboard, SLA reads and assignment identity. */
evaluate("dxSetRole('dispatcher')");
const knownOpen=evaluate("state.tickets.filter(t=>!['Completed','Voided'].includes(t.status)).length");
const overviewMarkup=evaluate("overview()");
assert.ok(overviewMarkup.includes("Open service tickets"),"Overview renders correct ticket summary");
assert.ok(overviewMarkup.includes('>'+knownOpen+'</'),"Overview count excludes completed and voided tickets");
assert.match(evaluate("DEMO_DATE"),/^\d{4}-\d{2}-\d{2}$/);
const auditBefore=evaluate("state.tickets.reduce((n,t)=>n+t.history.length,0)");
evaluate("dxEscalations()");
evaluate("dxEscalations()");
assert.equal(evaluate("state.tickets.reduce((n,t)=>n+t.history.length,0)"),auditBefore,"Reading overdue tickets does not change audit records");
const unconfirmed=evaluate("state.tickets.find(t=>t.employeeId&&!t.acknowledgedAt&&['Open','Stopped'].includes(t.status))?.id");
if(unconfirmed){
 assert.equal(evaluate("svcChange("+unconfirmed+",'Start','')"),false,"Direct transition cannot bypass acknowledgment");
 const assigned=evaluate("state.tickets.find(t=>t.id==="+unconfirmed+").employeeId");
 evaluate("dxSetRole('staff')");
 assert.equal(evaluate("dxAck("+unconfirmed+")"),false,"Unidentified staff cannot acknowledge");
 evaluate("dxActAs("+JSON.stringify(assigned)+")");
 assert.equal(evaluate("dxAck("+unconfirmed+")"),true,"Only acting assigned employee can acknowledge");
}
evaluate("dxSetRole('viewer')");
const viewerTicket=evaluate("state.tickets.find(t=>t.status==='Open')?.id");
assert.equal(evaluate("svcChange("+viewerTicket+",'Start','')"),false,"Viewer cannot bypass transition permissions");
evaluate("dxSetRole('dispatcher')");

console.log("PASS: Hestia demo syntax, 11 views, 5 stay tabs, checkout gate, mock authorizations/captures/refunds.");
