import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../extension/background.js', import.meta.url), 'utf8');
const setup = () => {
  let handler; const sent=[]; const badges=[];
  const chrome={
    commands:{onCommand:{addListener(fn){handler=fn;}}},
    tabs:{query:async()=>[{id:7,url:'https://www.instagram.com/reels/'}],sendMessage:async(id,body)=>{sent.push({id,body});}},
    action:{setBadgeText:async value=>{badges.push(value.text);},setTitle:async()=>{}},
    runtime:{onMessage:{addListener(){}}}
  };
  vm.runInNewContext(source,{chrome});
  return { run:(...args)=>handler(...args),sent,badges,chrome };
};
test('keyboard command dispatches to the active Instagram tab',async()=>{
  const env=setup();await env.run('share-to-favourite',{id:42,url:'https://www.instagram.com/reels/abc/'});
  assert.equal(env.sent.length,1);assert.equal(env.sent[0].id,42);assert.equal(env.sent[0].body.type,'inst-share');
});
test('command ignores unrelated websites and command names',async()=>{
  const env=setup();await env.run('share-to-favourite',{id:42,url:'https://evilinstagram.com/'});await env.run('other');assert.equal(env.sent.length,0);
});
test('unloaded content script provides a reload badge',async()=>{
  const env=setup();env.chrome.tabs.sendMessage=async()=>{throw Error('No receiver');};await env.run('share-to-favourite');assert.deepEqual(env.badges,['↻']);
});
