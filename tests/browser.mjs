import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile = await mkdtemp(path.join(tmpdir(), 'inst-share-test-'));
const extension = path.resolve('extension');
const executablePath = process.env.BRAVE_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
let context;
const fixture = `<!doctype html><html><head><title>Instagram test fixture</title></head><body style="margin:0">
<article id="offscreen" style="position:absolute;top:1800px;width:500px;height:500px"><video style="width:300px;height:400px"></video><button id="wrong-post"><svg aria-label="Share" width="20" height="20"></svg></button></article>
<article style="width:500px;height:500px"><video style="width:300px;height:400px"></video><button id="correct-post"><svg aria-label="Share" width="20" height="20"></svg></button></article>
<script>
window.sent=[];window.opened=[];window.mode='success';
for(const b of document.querySelectorAll('article button')) b.onclick=()=>{
 window.opened.push(b.id);
 const dialog=document.createElement('div');dialog.setAttribute('role','dialog');
 dialog.style='position:fixed;top:30px;left:30px;background:white;width:400px;height:300px';
 dialog.innerHTML='<input name="queryBox"><div id="results"></div>';
 document.body.append(dialog);
 dialog.querySelector('input').oninput=e=>setTimeout(()=>{
 const results=dialog.querySelector('#results');
 const target=e.target.value;
 const names=window.mode==='wrong' ? [target+'.fake'] : window.mode==='ambiguous' ? [target,target] : [target+'.fake',target];
 results.innerHTML='';
 for (const name of names) {
  const option=document.createElement('div');option.setAttribute('role','option');option.textContent=name;
  if(window.mode==='name-first'){
   option.textContent='';
   const display=document.createElement('div');display.textContent='Display Name';
   const username=document.createElement('div');username.textContent=name;
   option.append(display,username);
  }
  results.append(option);
  option.onclick=()=>{
   option.setAttribute('aria-selected','true');
   if(window.mode!=='no-message'){
    const note=document.createElement(window.mode==='editable'?'div':window.mode==='input-message'?'input':'textarea');
    note.setAttribute('data-message','');
    if(window.mode==='editable'){note.contentEditable='true';note.setAttribute('data-placeholder','Write a message…');note.style='min-height:30px';}
    else note.placeholder='Write a message…';
    dialog.append(note);
   }
   const send=document.createElement('button');send.textContent='Send';
   send.onclick=()=>{const entry={post:b.id,username:name};const field=dialog.querySelector('[data-message]');const message=field?.value??field?.innerText;if(message)entry.message=message;window.sent.push(entry);dialog.remove();};
   if(window.mode==='disabled')send.disabled=true;
   dialog.append(send);
  };
 }
 },200);
};
</script></body></html>`;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath, headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 1000, height: 800 }
  });
  await context.route('**/*', route => route.request().url().startsWith('https://www.instagram.com/') ? route.fulfill({ contentType: 'text/html', body: fixture }) : route.request().url().startsWith('chrome-extension://') ? route.continue() : route.abort());
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  await worker.evaluate(() => chrome.runtime.onMessage.addListener((message, sender) => { if (message.type === 'inst-ready') globalThis.testTabId = sender.tab.id; }));
  const page = await context.newPage();
  const popup = await context.newPage();
  const errors=[];
  for(const p of [page,popup])p.on('pageerror', e=>errors.push(e.message));
  const send = (request={type:'inst-share'}) => worker.evaluate(async request => {
    return chrome.tabs.sendMessage(globalThis.testTabId,request);
  },request);
  const reset = async (mode='success') => {
    await page.goto('https://www.instagram.com/reels/test/');
    await page.waitForTimeout(150);
    await page.evaluate(mode=>{window.mode=mode;},mode);
  };
  await worker.evaluate(()=>chrome.storage.local.set({favourite:'friend'}));
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(()=>document.querySelector('#favourite')?.value==='friend');
  console.log('PASS existing favourite appears in slot one');
  await mkdir('test-results',{recursive:true});
  await popup.screenshot({path:'test-results/popup.png',fullPage:true});
  await popup.locator('#favourite').fill('https://www.instagram.com/Friend/');
  await popup.locator('#save').click();
  await popup.locator('#status').filter({hasText:'Contacts saved'}).waitFor({timeout:2000});
  await popup.reload();
  await popup.waitForFunction(()=>document.querySelector('#favourite').value==='friend');
  assert.equal(await popup.locator('#share').textContent(),'Send to @friend');
  console.log('PASS popup saves and persists a normalized favourite');
  await reset();
  const result=await send();assert.equal(result.ok,true,JSON.stringify(result));
  assert.deepEqual(await page.evaluate(()=>window.sent),[{post:'correct-post',username:'friend'}]);
  console.log('PASS real extension message → visible reel → exact contact → Send');
  await reset('name-first');
  const nameFirstResult=await send();
  assert.equal(nameFirstResult.ok,true,JSON.stringify(nameFirstResult));
  assert.deepEqual(await page.evaluate(()=>window.sent),[{post:'correct-post',username:'friend'}]);
  console.log('PASS username below display name is found and shared');
  await reset();
  await page.evaluate(()=>{document.querySelector('#offscreen').style.top='520px';document.querySelector('#offscreen video').style.height='100px';});
  assert.equal((await send()).ok,true);
  assert.deepEqual(await page.evaluate(()=>window.sent),[{post:'correct-post',username:'friend'}]);
  console.log('PASS selects the most visible reel with two visible Share buttons');
  await reset();
  const first=send();await page.waitForTimeout(100);const second=await send();
  assert.match(second.error,/already in progress/);assert.equal((await first).ok,true);
  assert.equal(await page.evaluate(()=>window.sent.length),1);
  console.log('PASS repeated hotkey messages cannot duplicate an in-progress share');
  for(const mode of ['wrong','ambiguous','disabled']){
    await reset(mode);const result=await send();assert.equal(result.ok,false);
    assert.equal(await page.evaluate(()=>window.sent.length),0);
    console.log('PASS refuses '+mode+' recipient/send state');
  }
  await reset();await page.locator('#correct-post').click();
  assert.match((await send()).error,/Close the current Share dialog/);
  assert.equal(await page.evaluate(()=>window.sent.length),0);
  console.log('PASS refuses existing Share dialogs');
  await popup.locator('#contact-2').fill('@Buddy');
  await popup.locator('[name="default"][value="1"]').check();
  await popup.locator('#save').click();
  await popup.locator('#status').filter({hasText:'Contacts saved'}).waitFor();
  await popup.reload();
  await popup.waitForFunction(()=>document.querySelector('#contact-2')?.value==='buddy');
  assert.equal(await popup.locator('[name="default"][value="1"]').isChecked(),true);
  await reset();assert.equal((await send()).ok,true);
  assert.equal(await page.evaluate(()=>window.sent[0].username),'buddy');
  await reset();assert.equal((await send({type:'inst-share',slot:0})).ok,true);
  assert.equal(await page.evaluate(()=>window.sent[0].username),'friend');
  await reset();assert.match((await send({type:'inst-share',slot:4})).error,/slot is empty/);
  assert.equal(await page.evaluate(()=>window.opened.length),0);
  console.log('PASS multiple contacts persist, default and slot commands select correctly');

  await reset();const picking=send({type:'inst-picker'});
  await page.locator('#inst-contact-picker').waitFor();
  assert.equal((await send()).ok,false);
  await page.keyboard.press('2');assert.equal((await picking).ok,true);
  assert.equal(await page.evaluate(()=>window.sent[0].username),'buddy');
  await reset();const cancelling=send({type:'inst-picker'});
  await page.locator('#inst-contact-picker').waitFor();await page.keyboard.press('Escape');
  assert.equal((await cancelling).cancelled,true);
  assert.equal(await page.evaluate(()=>window.opened.length),0);
  assert.equal(await page.locator('#inst-contact-picker').count(),0);
  console.log('PASS picker number keys, concurrent protection and Escape cancellation');
  await reset();assert.equal((await send({type:'inst-picker',detached:true})).opened,true);
  await page.locator('#inst-contact-picker').waitFor();await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>window.opened.length),0);
  console.log('PASS popup-launched picker acknowledges immediately and stays interactive');


  await reset();const composing=send({type:'inst-compose'});
  await page.locator('#inst-contact-picker').waitFor();
  await page.locator('#inst-contact-picker select').selectOption('0');
  await page.locator('#inst-contact-picker textarea').fill('Watch this! <3');
  await page.keyboard.press('Control+Enter');assert.equal((await composing).ok,true);
  assert.deepEqual(await page.evaluate(()=>window.sent),[{post:'correct-post',username:'friend',message:'Watch this! <3'}]);
  console.log('PASS composer chooses recipient and attaches the exact message');
  await reset();const emptyCaption=send({type:'inst-compose'});
  await page.locator('#inst-contact-picker #send').click();assert.equal((await emptyCaption).ok,true);
  assert.deepEqual(await page.evaluate(()=>window.sent),[{post:'correct-post',username:'buddy'}]);
  await reset();const cancelCaption=send({type:'inst-compose'});
  await page.locator('#inst-contact-picker textarea').fill('Discard me');
  await page.keyboard.press('Escape');assert.equal((await cancelCaption).cancelled,true);
  assert.equal(await page.evaluate(()=>window.opened.length),0);
  console.log('PASS empty captions share normally and cancelled drafts never send');
  for(const mode of ['editable','input-message']){
    await reset(mode);const alternate=send({type:'inst-compose'});
    await page.locator('#inst-contact-picker textarea').fill('A note for you');
    await page.locator('#inst-contact-picker #send').click();
    const result=await alternate;assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(await page.evaluate(()=>window.sent[0].message),'A note for you');
  }
  console.log('PASS caption entry supports input and contenteditable fields');



  await reset('no-message');const unsupported=send({type:'inst-compose'});
  await page.locator('#inst-contact-picker textarea').fill('Do not silently drop this');
  await page.locator('#inst-contact-picker #send').click();
  assert.match((await unsupported).error,/message field/);
  assert.equal(await page.evaluate(()=>window.sent.length),0);
  assert.equal(await page.locator('[role="dialog"]').evaluate(el=>getComputedStyle(el).opacity),'1');
  console.log('PASS missing message field stops sending and reveals Instagram dialog');

  await reset();const quietShare=send();
  await page.locator('input[name="queryBox"]').waitFor();
  assert.equal(await page.locator('[role="dialog"]').evaluate(el=>getComputedStyle(el).opacity),'0');
  assert.equal((await quietShare).ok,true);
  assert.equal(await page.locator('[data-inst-share-dialog]').count(),0);
  await worker.evaluate(()=>chrome.storage.local.set({quiet:false}));
  await reset();const visibleShare=send();
  await page.locator('input[name="queryBox"]').waitFor();
  assert.equal(await page.locator('[role="dialog"]').evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.equal((await visibleShare).ok,true);
  console.log('PASS quiet mode hides sharing, cleans up, and can be disabled');

  await worker.evaluate(()=>chrome.storage.local.set({favourite:'',contacts:[]}));
  await reset();assert.match((await send()).error,/Set your favourite/);
  assert.equal(await page.evaluate(()=>window.opened.length),0);
  console.log('PASS missing favourite never opens Share');
  await worker.evaluate(()=>chrome.storage.local.set({favourite:'friend',contacts:['friend'],defaultIndex:0}));
  await reset();await page.evaluate(()=>document.querySelectorAll('article').forEach(el=>el.remove()));
  assert.match((await send()).error,/No visible reel/);
  console.log('PASS missing reel fails with actionable feedback');
  const commands=await worker.evaluate(()=>chrome.commands.getAll());
  assert.ok(commands.some(c=>c.name==='share-to-favourite'&&c.shortcut));
  console.log('PASS Brave registers the default keyboard shortcut');
  assert.deepEqual(errors,[]);
  console.log('PASS no uncaught page/extension popup errors');
} finally {
  await context?.close();
  await rm(profile,{recursive:true,force:true});
}
