import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
 const names=window.mode==='wrong' ? ['friend.fake'] : window.mode==='ambiguous' ? ['friend','friend'] : ['friend.fake','friend'];
 results.innerHTML='';
 for (const name of names) {
  const option=document.createElement('div');option.setAttribute('role','option');option.textContent=name;
  results.append(option);
  option.onclick=()=>{
   option.setAttribute('aria-selected','true');
   const send=document.createElement('button');send.textContent='Send';
   send.onclick=()=>{window.sent.push({post:b.id,username:name});dialog.remove();};
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
  const send = () => worker.evaluate(async () => {
    return chrome.tabs.sendMessage(globalThis.testTabId,{type:'inst-share'});
  });
  const reset = async (mode='success') => {
    await page.goto('https://www.instagram.com/reels/test/');
    await page.waitForTimeout(150);
    await page.evaluate(mode=>{window.mode=mode;},mode);
  };
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('#favourite').fill('https://www.instagram.com/Friend/');
  await popup.locator('#save').click();
  await popup.locator('#status').filter({hasText:'Saved @friend'}).waitFor({timeout:2000});
  await popup.reload();
  await popup.waitForFunction(()=>document.querySelector('#favourite').value==='friend');
  assert.equal(await popup.locator('#share').textContent(),'Send to @friend');
  console.log('PASS popup saves and persists a normalized favourite');
  await reset();
  const result=await send();assert.equal(result.ok,true,JSON.stringify(result));
  assert.deepEqual(await page.evaluate(()=>window.sent),[{post:'correct-post',username:'friend'}]);
  console.log('PASS real extension message → visible reel → exact contact → Send');
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
  await worker.evaluate(()=>chrome.storage.local.set({favourite:''}));
  await reset();assert.match((await send()).error,/Set your favourite/);
  assert.equal(await page.evaluate(()=>window.opened.length),0);
  console.log('PASS missing favourite never opens Share');
  await worker.evaluate(()=>chrome.storage.local.set({favourite:'friend'}));
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
