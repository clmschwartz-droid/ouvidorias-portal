'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, 'Diretorio.gs'), 'utf8');
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '../../conteudo/ouvidorias-cadastradas.json'))).items;
const clone = (x) => JSON.parse(JSON.stringify(x));
let checks = 0;
function ok(value) { checks++; assert.ok(value); }
function equal(a,b) { checks++; assert.deepEqual(clone(a),clone(b)); }
function throws(fn,regex) { checks++; assert.throws(fn,regex); }
function environment() {
  const state = { rows:[], raw:[], notes:[], remote:[], writes:[], calls:[], commits:0, locked:false, fail:false, afterPublish:null, triggers:[], user:'ouvidoriaspublicasbrasileiras@gmail.com' };
  const range = (r,c,n=1,m=1) => ({
    getValues: () => clone(state.rows.slice(r-1,r-1+n).map(row => Array.from({length:m},(_,i) => row[c-1+i] ?? ''))),
    getDisplayValues: () => clone(state.rows.slice(r-1,r-1+n).map(row => Array.from({length:m},(_,i) => String(row[c-1+i] ?? '')))),
    setValues: (values) => { state.writes.push({r,c,values:clone(values)}); values.forEach((row,i) => { state.rows[r-1+i] ||= Array(18).fill(''); row.forEach((v,j)=>state.rows[r-1+i][c-1+j]=v); }); },
    setValue: (v) => range(r,c).setValues([[v]]),
    getNotes: () => Array.from({length:n},(_,i) => Array.from({length:m},(_,j) => state.notes[r-1+i]?.[c-1+j] || '')),
    setNotes: (values) => { state.writes.push({r,c,notes:clone(values)}); values.forEach((row,i) => {state.notes[r-1+i] ||= [];row.forEach((v,j)=>state.notes[r-1+i][c-1+j]=v);}); },
    setDataValidation: () => {},
  });
  const sheet = { getLastRow: () => state.rows.length, getRange:range, getMaxRows:()=>1000 };
  const validation = { requireCheckbox:()=>validation,requireValueInList:()=>validation,setAllowInvalid:()=>validation,build:()=>({}) };
  const context = { console:{log:()=>{},error:()=>{}}, Session:{getEffectiveUser:()=>({getEmail:()=>state.user})}, PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'github_pat_FICTICIO'})}, SpreadsheetApp:{openById:()=>({getSheetByName:(name)=>name==='Form Responses 1'?{getLastRow:()=>state.raw.length,getRange:()=>({getDisplayValues:()=>clone(state.raw)})}:sheet}),newDataValidation:()=>validation}, LockService:{getScriptLock:()=>({tryLock:()=>!state.locked,releaseLock:()=>{state.released=true;}})}, Utilities:{formatDate:()=> '2026-10-08', DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1}, computeDigest:(_type,value)=>[...crypto.createHash('sha256').update(value).digest()].map(x=>x>127?x-256:x),getUuid:()=> 'id-ficticio',base64Encode:(s)=>Buffer.from(s).toString('base64'),base64Decode:(s)=>Buffer.from(s,'base64'),newBlob:(bytes)=>({getDataAsString:()=>Buffer.from(bytes).toString()})}, ScriptApp:{getProjectTriggers:()=>state.triggers.map(x=>({getHandlerFunction:()=>x})),newTrigger:(handler)=>({timeBased:()=>({everyMinutes:(minutes)=>({create:()=>state.triggers.push(handler)})})})} };
  vm.createContext(context); vm.runInContext(source,context);
  state.rows=[vm.runInContext('Array.from(DIRETORIO_PORTAL.cabecalhos)',context)];
  state.raw=[['Timestamp','Nome da Ouvidoria','Localização Institucional','Endereço completo da Ouvidoria','E-mail da Ouvidoria','Telefone da Ouvidoria','Ato de Criação — natureza do ato','Ato de Criação — número/identificação']];
  const liveRead=context.diretorioLerSite_,livePublish=context.diretorioPublicar_;
  context.diretorioLerSite_=()=>({sha:'sha-'+state.commits,items:clone(state.remote)});
  context.diretorioPublicar_=(items)=>{state.calls.push(clone(items)); if(state.fail)throw new Error('Falha de rede');state.remote=clone(items);state.commits++;if(state.afterPublish)state.afterPublish();return items;};
  return {state,context,range,liveRead,livePublish};
}
function row(item, approved=true, contacts=true) { return [item.id,approved,item.nome,item.orgao,item.municipio,item.uf,item.esfera,item.poder,item.site,item.email,item.telefone,contacts,item.site,'Em análise','Observação PRIVADA',2,'','']; }
{
  const {state,context}=environment();
  state.rows.push(...seed.map(x=>row(x)));context.sincronizarDiretorioCadastradas();
  equal(state.remote.length,7);ok(state.rows.slice(1).every(x=>x[13]==='Publicado'));ok(state.remote.every(x=>Object.keys(x).length===11));ok(!JSON.stringify(state.remote).includes('PRIVADA'));
  const published=clone(state.remote);context.sincronizarDiretorioCadastradas();equal(state.commits,1);equal(state.remote,published);
  const writesBefore=state.writes.length;context.sincronizarDiretorioCadastradas();equal(state.writes.length,writesBefore);
  state.rows[1][9]='pessoa@gmail.com';context.sincronizarDiretorioCadastradas();equal(state.commits,1);ok(state.rows[1][13].startsWith('Erro:'));equal(state.remote,published);
  state.rows[1][11]=false;context.sincronizarDiretorioCadastradas();equal(state.remote.find(x=>x.id===state.rows[1][0]).email,'');equal(state.remote.find(x=>x.id===state.rows[1][0]).telefone,'');
  state.rows[1][1]=false;context.sincronizarDiretorioCadastradas();equal(state.remote.length,6);equal(state.rows[1][13],'Retirado do diretório');
}
{
  const {state,context,liveRead,livePublish}=environment();const calls=[];let attempts=0,live=0;
  context.Utilities.sleep=()=>{};
  context.UrlFetchApp={fetch:(url,args)=>{
    const request={path:url.split('/ouvidorias-portal')[1],method:args.method,body:args.payload?JSON.parse(args.payload):null};calls.push(request);let data={};let code=200;
    if(request.path==='/git/ref/heads/main')data={object:{sha:'main-sha'}};
    else if(request.path==='/contents/conteudo/ouvidorias-cadastradas.json?ref=main')data={sha:live?'new-file':'old-file',content:Buffer.from(JSON.stringify({items:live?seed:[]})).toString('base64')};
    else if(request.method==='put'&&request.path==='/contents/conteudo/ouvidorias-cadastradas.json')data={commit:{sha:'approved-head'}};
    else if(request.path==='/pulls')data={number:98};
    else if(request.path==='/pulls/98/merge'){attempts++;if(attempts===1){code=405;data={message:'Preparing merge'};}else{live=1;data={merged:true};}}
    else if(request.method==='delete')code=204;
    return{getResponseCode:()=>code,getContentText:()=>code===204?'':JSON.stringify(data)};
  }};
  context.diretorioLerSite_=liveRead;context.diretorioPublicar_=livePublish;
  const initial=context.diretorioLerSite_();const result=context.diretorioPublicar_(seed,initial);
  equal(result,seed);equal(attempts,2);ok(calls.filter(x=>x.path.endsWith('/merge')).every(x=>x.body.sha==='approved-head'));ok(calls.some(x=>x.path==='/git/refs'&&x.body.sha==='main-sha'));ok(calls.some(x=>x.method==='delete'));
  const contentWrite=calls.find(x=>x.method==='put'&&x.path==='/contents/conteudo/ouvidorias-cadastradas.json');equal(contentWrite.body.sha,'old-file');equal(JSON.parse(Buffer.from(contentWrite.body.content,'base64').toString()).items,seed);ok(!calls.some(x=>x.path.includes('manifestacoes')));
}
{
  const {state,context}=environment();state.rows.push(row(seed[0],false));state.raw.push(['data','TESTE final','Executivo','Endereço','pessoa@gmail.com',''],['data','Nova ouvidoria','Executivo','Endereço','ouvidoria@instituicao.gov.br','(11) 99999-9999'],['data','=IMPORTXML("exfil")','Executivo','Endereço','pessoa@gmail.com','']);
  context.sincronizarDiretorioCadastradas();equal(state.remote,[]);equal(state.rows.length,4);equal(state.rows[2][0],'OUV-000003');equal(state.rows[2][1],false);equal(state.rows[2][11],false);ok(state.rows[3][2].startsWith("'="));equal(state.rows[3][9],'');
  state.rows[2][2]='Nome conferido';context.sincronizarDiretorioCadastradas();equal(state.rows.length,4);equal(state.rows[2][2],'Nome conferido');
}
{
  const {state,context}=environment();const first=row(seed[0]);const duplicate=row({...seed[0],id:'OUV-000999'});state.rows.push(first,duplicate);context.sincronizarDiretorioCadastradas();equal(state.remote,[]);ok(state.rows.slice(1).every(x=>x[13].includes('duplicidade')));
}
{
  const {state,context}=environment();state.rows.push(row(seed[0]));state.fail=true;throws(()=>context.sincronizarDiretorioCadastradas(),/Falha de rede/);equal(state.rows[1][13],'Em análise');equal(state.remote,[]);ok(state.released);
  state.fail=false;state.afterPublish=()=>{state.rows[1][2]='Editado enquanto publicava';};context.sincronizarDiretorioCadastradas();equal(state.rows[1][13],'Em análise');
  state.afterPublish=null;context.sincronizarDiretorioCadastradas();equal(state.remote[0].nome,'Editado enquanto publicava');equal(state.rows[1][13],'Publicado');
}
{
  const {state,context}=environment();state.rows.push(row(seed[0]),row(seed[1]));state.afterPublish=()=>{[state.rows[1],state.rows[2]]=[state.rows[2],state.rows[1]];};context.sincronizarDiretorioCadastradas();ok(state.rows.slice(1).every(r=>r[13]==='Publicado'));ok(state.rows.slice(1).every(r=>r[16]===context.diretorioAssinatura_(context.diretorioPublico_(r))));
  context.ativarDiretorioCadastradas();context.ativarDiretorioCadastradas();equal(state.triggers,['sincronizarDiretorioCadastradas']);state.user='estagiario@example.com';throws(()=>context.ativarDiretorioCadastradas(),/titular/);
}
{
  const {state,context}=environment();state.locked=true;context.sincronizarDiretorioCadastradas();equal(state.writes,[]);equal(state.calls,[]);
  for (const bad of ['javascript:alert(1)','https://user:secret@example.com','https://example.com/<script>','http://example.com']) equal(context.diretorioHttps_(bad),'');
  const valid=row(seed[0]);valid[12]='';throws(()=>context.diretorioPublico_(valid),/fonte oficial/);valid[11]=false;equal(context.diretorioPublico_(valid).email,'');
}
{
  // Sheets counts FALSE checkbox values as occupied cells through row 1000.
  const {state,context}=environment();state.rows.push(...seed.map(x=>row(x)));
  state.remote=clone(seed).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')||a.id.localeCompare(b.id));const published=clone(state.remote);
  while(state.rows.length<1000){const blank=Array(18).fill('');blank[1]=false;blank[11]=false;blank[13]='Erro: ID repetido; restaure o identificador original.';state.rows.push(blank);}
  const untouched=clone(state.rows[999]);
  state.raw.push(['data','Nova ouvidoria','Executivo','Endereço','ouvidoria@instituicao.gov.br','(11) 99999-9999']);
  context.sincronizarDiretorioCadastradas();
  equal(state.rows[8][0],'OUV-000002');equal(state.rows[8][1],false);equal(state.rows[8][13],'Em análise');
  equal(state.rows[999],untouched);equal(state.rows.length,1000);equal(state.remote,published);equal(state.commits,0);
  const append=state.writes.find(x=>x.c===1&&x.values[0][0]==='OUV-000002');equal(append.r,9);
  const count=state.writes.length;context.sincronizarDiretorioCadastradas();equal(state.writes.length,count);
  state.raw.push(['data','Outra ouvidoria','Executivo','Endereço','','']);context.sincronizarDiretorioCadastradas();equal(state.rows[9][0],'OUV-000003');
}
{
  // Blank internal rows must not receive duplicate-ID errors, even on publication.
  const {state,context}=environment();const empty=()=>{const r=Array(18).fill('');r[1]=false;r[11]=false;return r;};
  state.rows.push(row(seed[0]),empty(),empty(),row(seed[1]));
  context.sincronizarDiretorioCadastradas();equal(state.rows[2][13],'');equal(state.rows[3][13],'');
  ok(state.rows[1][13]==='Publicado'&&state.rows[4][13]==='Publicado');
  state.rows[5]=empty();state.rows[5][14]='Rascunho em revisão';state.rows[6]=empty();
  state.raw.push(['data','Nova ouvidoria','Executivo','Endereço','','']);context.sincronizarDiretorioCadastradas();
  equal(state.rows[5][14],'Rascunho em revisão');equal(state.rows[6][0],'OUV-000002');
}
{
  const {state,context}=environment();
  const original=['data','Ouvidoria Geral do Município de Terra Boa','Poder Executivo','Rua Presidente Tancredo Almeida Neves, nº 240','ouvidoria@terraboa.pr.gov.br','(44) 3641-8037','Lei','Lei 1.721/2022 Terra Boa / PR'];
  equal(context.diretorioDadosOrigem_(original),['Prefeitura Municipal de Terra Boa','Terra Boa','PR','Municipal','Executivo']);
  const mallet=['data','Ouvidoria-geral do Município de Mallet','Poder Executivo','Rua XV de Novembro - Sul, nº 28 - SE, Centro, Mallet-PR.','ouvidoriamunicipal@mallet.pr.gov.br','0800 542 1204','Lei','Lei nº 1445/2021'];
  equal(context.diretorioDadosOrigem_(mallet),['Prefeitura Municipal de Mallet','Mallet','PR','Municipal','Executivo']);
  const dipso=['data','DIPSO - Divisão de Participação Social e Ouvidoria','Poder Executivo','Rua Guilherme Weiss, 320 - cep: 83323-200 - Estância Pinhais - Pinhais-PR','ouvidoria.saude@pinhais.pr.gov.br','41 99216-2095','Decreto','Decreto Municipal 409/2017'];
  equal(context.diretorioDadosOrigem_(dipso),['','Pinhais','PR','Municipal','Executivo']);
  const conflict=clone(mallet);conflict[4]='ouvidoria@instituicao.rs.gov.br';equal(context.diretorioDadosOrigem_(conflict)[2],'');
  const unclear=['data','Ouvidoria desconhecida','Poder Executivo','Rua Paraná, 100, Centro','ouvidoria@instituicao.gov.br','(41) 1111-1111'];
  equal(context.diretorioDadosOrigem_(unclear).slice(1,4),['','','']);
  state.raw.push(original);context.sincronizarDiretorioCadastradas();
  equal(state.rows[1].slice(3,8),['Prefeitura Municipal de Terra Boa','Terra Boa','PR','Municipal','Executivo']);
  equal(state.rows[1][1],false);equal(state.rows[1][11],false);equal(state.remote,[]);
  ok(state.notes[1][2].includes('gid=1817621009&range=A2:U2'));
  state.rows[1][3]='Instituição revisada';state.rows[1][4]='';context.sincronizarDiretorioCadastradas();
  equal(state.rows[1][3],'Instituição revisada');equal(state.rows[1][4],'Terra Boa');
  const before=state.writes.length;context.sincronizarDiretorioCadastradas();equal(state.writes.length,before);
  state.rows[1][16]='assinatura-publicada';state.rows[1][4]='';state.notes[1][2]='Nota do operador';context.sincronizarDiretorioCadastradas();
  equal(state.rows[1][4],'');equal(state.notes[1][2],'Nota do operador');
  const invalid=row(seed[0],true,false);invalid[3]='';invalid[5]='';throws(()=>context.diretorioPublico_(invalid),/instituição, UF/);
}
console.log(`${checks} verificações do diretório passaram.`);
