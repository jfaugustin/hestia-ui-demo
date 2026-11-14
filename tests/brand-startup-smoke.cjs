const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
const symbol=fs.readFileSync("logo.svg","utf8");
const css=fs.readFileSync("app-shell.css","utf8");
assert.match(html, /class="brand-lockup"/);
assert.match(html, /class="brand-symbol"/);
assert.match(html, /rel="icon" type="image\/svg\+xml" href="\.\/logo\.svg\?v=1"/);
assert.match(symbol, /<svg[^>]*viewBox="0 0 64 64"/);
assert.match(symbol, /Hestia architectural H monogram/);
assert.match(css, /\.shell \.brand-lockup\{/);
assert.match(css, /@media\(max-width:560px\)/);
const files=["core.js","front-office.js","app-shell.js","housekeeping.js"];
let writes=0;
const elements={};
const document={
 getElementById(id){
  if(elements[id])return elements[id];
  const element={classList:{toggle(){}},querySelector(){return null}};
  let value="";
  Object.defineProperty(element,"innerHTML",{
   get(){return value},
   set(next){value=next;if(id==="content")writes++}
  });
  elements[id]=element;return element;
 },
 querySelectorAll(){return []},querySelector(){return null},
 createElement(){return {remove(){},click(){}}},body:{append(){}}
};
const localStorage={data:{},getItem(k){return this.data[k]??null},setItem(k,v){this.data[k]=String(v)}};
const context={document,localStorage,window:{scrollTo(){}},confirm:()=>true,setTimeout:()=>{},console,Blob,URL:{createObjectURL:()=>"",revokeObjectURL(){}},Intl,Date};
vm.createContext(context);
for(const file of files){const src=fs.readFileSync(file,"utf8");new vm.Script(src,{filename:file});vm.runInContext(src,context,{filename:file})}
assert.equal(writes,1,"Initial application should render the content only once after every department initializes");
assert.ok(elements.content.innerHTML.includes("Priority requests"));
assert.equal((elements.nav.innerHTML.match(/data-page=/g)||[]).length,9);
vm.runInContext("nav('Housekeeping')",context);
assert.equal(writes,2,"Navigating to a department should render exactly once");
vm.runInContext("nav('Reservations')",context);
assert.equal(writes,3,"Reservations should not trigger a second hidden DOM render");
console.log("PASS: brand assets and single-render startup/navigation across Hestia departments");
