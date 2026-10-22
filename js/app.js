(function(){
'use strict';

/* ================= configuração e dados ================= */
const CFG = Object.assign({supabaseUrl:'', supabaseAnonKey:'', whatsapp:'', pix:{}}, window.SC_CONFIG || {});
const PIX = Object.assign({key:'', name:'Arthur Cavalcante', city:'BRASIL', amount:'10.00'}, CFG.pix || {});
const FREE_ACCESSES = 3;
const KEY = 'studycoffee.v2';
const SESSION_KEY = 'studycoffee.session';
const PHASES = ['focus','short','long'];
const PHASE_NAME = {focus:'Foco', short:'Pausa curta', long:'Pausa longa'};
const PRESETS = {classic:{focus:1500, short:300, long:900}, extended:{focus:3000, short:600, long:1200}, marathon:{focus:5400, short:900, long:1800}};
const DEMO_PRESET = {focus:10, short:5, long:8};
const GOALS = {fuvest:'Fuvest', unicamp:'Unicamp', unesp:'Unesp', vunesp:'Banca Vunesp', goias:'Particulares de Goiás', fgv:'FGV / Insper', enem:'ENEM', todas:'Todos'};
const GOAL_OPTIONS = [['fuvest','Fuvest (USP)'], ['unicamp','Unicamp'], ['unesp','Unesp'], ['vunesp','Banca Vunesp (Famema, Famerp, Santa Casa…)'], ['goias','Particulares de Goiás (PUC Goiás, UniEvangélica…)'], ['fgv','FGV / Insper'], ['enem','ENEM'], ['todas','Vários']];
const GUEST_KEY = 'studycoffee.guest';
const GUEST_SESSION_KEY = 'studycoffee.guest.session';
const SUBJECTS = ['Revisão geral','Matemática','Física','Química','Biologia','História','Geografia','Português e Literatura','Redação','Inglês','Filosofia e Sociologia','Provas anteriores'];
const DEMO_SEATS = [{name:'Marina', subject:'Biologia', off:200}, {name:'Caio', subject:'Matemática', off:900}, {name:'Bia', subject:'Redação', off:1580}];
const QUOTES = [
  {u:'geral', t:'Constância vence intensidade. Quatro pomodoros bem feitos hoje valem mais que uma maratona na véspera.'},
  {u:'geral', t:'Errar no simulado é barato. Errar na prova custa caro. Erre agora, entenda o porquê e siga.'},
  {u:'geral', t:'Você não precisa de motivação para começar. Dê o play no timer e ela aparece no segundo pomodoro.'},
  {u:'geral', t:'Um conteúdo a menos para revisar amanhã é uma vitória de hoje.'},
  {u:'geral', t:'A pausa também faz parte do plano. Levante, beba água e volte inteiro.'},
  {u:'geral', t:'Estudar acompanhado ajuda a manter o ritmo. Olhe a mesa: todo mundo aqui está atrás do mesmo objetivo.'},
  {u:'fuvest', t:'A Fuvest cobra amplitude. Passar por todos os conteúdos, mesmo rápido, vale mais que dominar um só.'},
  {u:'fuvest', t:'Na Fuvest, ler o enunciado até o último ponto final já resolve metade da questão. Treine a atenção.'},
  {u:'fuvest', t:'Do Largo de São Francisco ao Butantã, todo mundo que passou começou com uma tarde parecida com a sua.'},
  {u:'fuvest', t:'Na segunda fase, quem escreve claro ganha pontos. Explique cada resposta como se fosse para um colega.'},
  {u:'fuvest', t:'Faça uma prova antiga inteira, com tempo cronometrado. O cansaço do final também se treina.'},
  {u:'unicamp', t:'A Unicamp quer raciocínio, não decoreba. Resolva uma questão e explique em voz alta por que a resposta está certa.'},
  {u:'unicamp', t:'As questões da Unicamp misturam áreas e pedem interpretação. Hoje, leia um texto fora da sua zona de conforto.'},
  {u:'unicamp', t:'Na redação da Unicamp, o gênero e a situação importam. Treine se adaptar ao que o enunciado pede.'},
  {u:'unicamp', t:'Nas questões abertas, mostre o caminho e não só o resultado. É assim que sua forma de pensar aparece.'},
  {u:'unicamp', t:'Barão Geraldo fica um pouco mais perto a cada página resolvida.'},
  {u:'unesp', t:'A Unesp está espalhada pelo estado, e a vaga que você quer começa na constância de hoje.'},
  {u:'unesp', t:'Fundamentos bem sabidos rendem mais pontos que truques. Revise o básico até virar automático.'},
  {u:'unesp', t:'Faça questões de provas anteriores da Unesp e anote o que errou. O caderno de erros é o seu melhor material.'},
  {u:'unesp', t:'Bauru, Araraquara, Botucatu, Rio Claro, Franca: cada campus tem alguém que já estudou numa noite como esta.'},
  {u:'unesp', t:'A segunda fase é onde a constância aparece. Redija, resolva, corrija e repita.'},
  {u:'vunesp', t:'A Vunesp gosta de enunciado longo com a resposta escondida no texto. Leia tudo, sublinhe o que é dado e só então olhe as alternativas.'},
  {u:'vunesp', t:'Prova da Vunesp é prova de resistência: muitas questões, pouco tempo. Treine com o relógio para não deixar questão fácil para trás.'},
  {u:'vunesp', t:'Na Vunesp, a alternativa "quase certa" é a armadilha preferida. Elimine com calma antes de marcar.'},
  {u:'vunesp', t:'Atualidades e interpretação valem muito nas provas da Vunesp. Um texto por dia já muda o jogo.'},
  {u:'vunesp', t:'Da Unesp à Famema, muita gente passou pela mesma banca. O padrão dela se aprende com provas antigas.'},
  {u:'goias', t:'PUC Goiás, UniEvangélica, UniRV, Unip: cada uma tem seu vestibular, mas todas pesam a redação. Escreva uma por semana.'},
  {u:'goias', t:'Muitas particulares de Goiás aceitam a nota do Enem. Uma boa prova vira porta de entrada em várias faculdades de uma vez.'},
  {u:'goias', t:'Vestibular agendado não é prova fácil: é prova sem desculpa para chegar despreparado. Marque a data e monte o cronograma de trás para frente.'},
  {u:'goias', t:'Medicina na PUC Goiás ou na UniEvangélica cobra fôlego em química e biologia. Resolva questões dessas duas todo dia.'},
  {u:'goias', t:'De Goiânia a Anápolis, a vaga que você quer começa numa noite de estudo como esta.'},
  {u:'fgv', t:'FGV e Insper cobram raciocínio no papel: resposta certa sem justificativa vale pouco. Treine escrever a solução inteira.'},
  {u:'fgv', t:'No Insper, as provas de análise verbal e quantitativa medem como você pensa sob pressão. Faça simulados cronometrados.'},
  {u:'fgv', t:'A matemática discursiva da FGV premia quem organiza a resolução. Comece pelo que sabe e mostre cada passo.'},
  {u:'fgv', t:'A redação da FGV pede argumento com dados, não opinião solta. Monte um repertório de números e fatos.'},
  {u:'fgv', t:'Economia, Administração ou Direito: nas duas escolas, inglês e interpretação aparecem em tudo. Leia um artigo em inglês por dia.'},
  {u:'enem', t:'O Enem é maratona: dois domingos, 180 questões e uma redação. Treinar resistência vale tanto quanto treinar conteúdo.'},
  {u:'enem', t:'Na TRI, acertar as fáceis vale mais que arriscar as difíceis. Garanta o básico antes de brigar pelas questões cabeludas.'},
  {u:'enem', t:'A redação do Enem tem cinco competências. Uma proposta de intervenção completa é o que separa 800 de 960.'},
  {u:'enem', t:'O Enem cobra interpretação em todas as áreas. Até a questão de física começa com um texto: leia com atenção.'},
  {u:'enem', t:'Um simulado completo por mês, com tempo real, mostra onde você perde ponto por cansaço e não por falta de conteúdo.'}
];
const QUOTE_LABEL = {geral:'Para todos os vestibulares', fuvest:'Fuvest · USP', unicamp:'Unicamp', unesp:'Unesp', vunesp:'Banca Vunesp', goias:'Particulares de Goiás', fgv:'FGV · Insper', enem:'ENEM'};

/* ================= utilidades ================= */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const mem = {};
function lsGet(k){ try { return window.localStorage.getItem(k); } catch(e){ return Object.prototype.hasOwnProperty.call(mem,k) ? mem[k] : null; } }
function lsSet(k,v){ try { window.localStorage.setItem(k,v); } catch(e){ mem[k]=v; } }
function lsDel(k){ try { window.localStorage.removeItem(k); } catch(e){ delete mem[k]; } }
function ssGet(k){ try { return window.sessionStorage.getItem(k); } catch(e){ return Object.prototype.hasOwnProperty.call(mem,'s:'+k) ? mem['s:'+k] : null; } }
function ssSet(k,v){ try { window.sessionStorage.setItem(k,v); } catch(e){ mem['s:'+k]=v; } }
function ssDel(k){ try { window.sessionStorage.removeItem(k); } catch(e){ delete mem['s:'+k]; } }
const num = (x) => (typeof x === 'number' && Number.isFinite(x)) ? x : 0;
const cleanText = (v) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g,'').replace(/\s+/g,' ').trim();
const str = (v, n) => typeof v === 'string' ? cleanText(v).slice(0, n) : '';
function cleanCode(v){
  const c = String(v || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9_.-]+/g,'-').replace(/^[^a-z0-9]+/,'').replace(/-+/g,'-').slice(0,48);
  return c || 'mesa-aberta';
}
function fmt(ms){ const s = Math.max(0, Math.ceil(ms/1000)); return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
function todayKey(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function fmtStamp(iso){ try { return new Date(iso).toLocaleDateString('pt-BR'); } catch(e){ return ''; } }
function fmtWhen(iso){ try { return new Date(iso).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}); } catch(e){ return ''; } }
const normEmail = (v) => cleanText(v).toLowerCase().slice(0,120);
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const moneyBR = (n) => Number(n).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

/* ================= Pix BR Code (fallback manual) ================= */
function crc16(s){ let crc = 0xFFFF; for(let i = 0; i < s.length; i++){ crc ^= s.charCodeAt(i) << 8; for(let j = 0; j < 8; j++){ crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1); crc &= 0xFFFF; } } return crc.toString(16).toUpperCase().padStart(4,'0'); }
function emv(id, value){ return id + String(value.length).padStart(2,'0') + value; }
function brcode(txid, amount){
  const t = String(txid || '***').replace(/[^A-Za-z0-9*]/g,'').slice(0,25) || '***';
  const account = emv('00','br.gov.bcb.pix') + emv('01', PIX.key);
  const s = emv('00','01') + emv('01','11') + emv('26', account) + emv('52','0000') + emv('53','986') + emv('54', amount) + emv('58','BR') + emv('59', PIX.name) + emv('60', PIX.city) + emv('62', emv('05', t)) + '6304';
  return s + crc16(s);
}

/* ================= preferências deste aparelho ================= */
function freshState(){ return {room:'mesa-aberta', preset:'classic', subject:SUBJECTS[0], quotesOn:true, quoteGoal:'fuvest', auto:true, demoSeats:true, vol:35, view3d:'list', rankPeriod:'week', stats:{day:todayKey(), pomos:0, sec:0}}; }
function load(){
  const s = freshState();
  try {
    const o = JSON.parse(lsGet(KEY) || 'null');
    if(!o || typeof o !== 'object') return s;
    Object.assign(s, o);
    s.stats = Object.assign(freshState().stats, o.stats || {});
    if(!PRESETS[s.preset]) s.preset = 'classic';
    if(!GOALS[s.quoteGoal]) s.quoteGoal = 'todas';
    if(SUBJECTS.indexOf(s.subject) < 0) s.subject = SUBJECTS[0];
    if(['list','top','first'].indexOf(s.view3d) < 0) s.view3d = 'list';
    if(['day','week','month'].indexOf(s.rankPeriod) < 0) s.rankPeriod = 'week';
    s.room = cleanCode(s.room);
    s.vol = Math.max(0, Math.min(100, num(+s.vol) || 0));
    if(s.stats.day !== todayKey()) s.stats = {day:todayKey(), pomos:0, sec:0};
    return s;
  } catch(e){ return s; }
}
const S = load();
function save(){ lsSet(KEY, JSON.stringify(S)); }

/* ================= visitante (sem conta): acessos grátis ficam neste aparelho ================= */
const CAFE = window.SCCafe || null;
function normAvatar(a){ return CAFE ? CAFE.normalize(a) : (a && typeof a === 'object' ? a : null); }
function randomAvatar(seed){ return CAFE ? CAFE.defaultAvatar(seed) : {skin:1, hair:'short', hairColor:'#3b2a1a', shirt:'#f4b94e', acc:'none', view:'window'}; }
function loadGuest(){
  const g = {id:'', name:'', goal:'fuvest', free:FREE_ACCESSES, avatar:null};
  try {
    const o = JSON.parse(lsGet(GUEST_KEY) || 'null');
    if(o && typeof o === 'object'){
      g.id = /^[a-z0-9]{6,24}$/.test(String(o.id || '')) ? o.id : '';
      g.name = str(o.name, 20);
      g.goal = GOALS[o.goal] ? o.goal : 'fuvest';
      g.free = (o.free === undefined) ? FREE_ACCESSES : Math.max(0, Math.min(FREE_ACCESSES, Math.floor(num(+o.free)) || 0));
      g.avatar = o.avatar ? normAvatar(o.avatar) : null;
    }
  } catch(e){}
  if(!g.id){ g.id = 'g' + Math.random().toString(36).slice(2, 12); }
  if(!g.avatar) g.avatar = randomAvatar(g.id);
  return g;
}
const G = loadGuest();
let guestMode = false;
function saveGuest(){ lsSet(GUEST_KEY, JSON.stringify(G)); }
const isGuest = () => guestMode && !session;

/* ================= toast ================= */
let toastTimer = 0;
function toast(msg){ const el = $('#toast'); el.textContent = msg; el.dataset.show = '1'; clearTimeout(toastTimer); toastTimer = setTimeout(function(){ el.dataset.show = '0'; }, 2800); }
function announce(msg){ $('#sr-live').textContent = msg; }
async function copyText(text, el){
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch(e){ try { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch(e2){} toast('Selecione o texto e copie'); }
}
function busy(btn, on, label){ if(!btn) return; btn.disabled = on; if(label){ if(on){ btn.dataset.label = btn.textContent; btn.textContent = label; } else if(btn.dataset.label){ btn.textContent = btn.dataset.label; } } }

/* ================= Supabase ================= */
const configured = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase && window.supabase.createClient);
const sb = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}}) : null;
const SITE_URL = location.origin + location.pathname;
let session = null;      // sessão do Supabase
let profile = null;      // linha de profiles
let profileChan = null;  // canal realtime do próprio profile
const uid = () => (session && session.user) ? session.user.id : '';
const isPaid = () => !!(profile && profile.lifetime);
const isAdmin = () => !!(profile && profile.is_admin);

async function callFn(name, body){
  const s = sb ? (await sb.auth.getSession()).data.session : null;
  if(!s) return {ok:false, status:401, data:{error:'unauthorized'}};
  let res;
  try {
    res = await fetch(CFG.supabaseUrl.replace(/\/$/,'') + '/functions/v1/' + name, {
      method:'POST', headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + s.access_token, 'apikey':CFG.supabaseAnonKey}, body:JSON.stringify(body || {})
    });
  } catch(e){ return {ok:false, status:0, data:{error:'network'}}; }
  let data = {};
  try { data = await res.json(); } catch(e){ data = {}; }
  return {ok:res.ok, status:res.status, data:data};
}
function authErrorText(error){
  const m = String((error && error.message) || '').toLowerCase();
  const code = String((error && error.code) || '').toLowerCase();
  if(code === 'over_email_send_rate_limit' || m.indexOf('email rate limit') >= 0) return 'O servidor de e-mail de confirmação está no limite agora. Tente de novo em 1 hora, ou entre sem conta por enquanto.';
  if(code === 'email_address_invalid' || (m.indexOf('email') >= 0 && m.indexOf('invalid') >= 0)) return 'Este e-mail não foi aceito. Use um e-mail real (Gmail, Outlook, iCloud…).';
  if(code === 'invalid_credentials' || m.indexOf('invalid login') >= 0 || m.indexOf('invalid credentials') >= 0) return 'E-mail ou senha incorretos. Se você ainda não criou a conta, use "Criar conta".';
  if(code === 'email_not_confirmed' || m.indexOf('not confirmed') >= 0) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if(code === 'user_already_exists' || m.indexOf('already registered') >= 0 || m.indexOf('already been registered') >= 0) return 'Já existe uma conta com este e-mail. Entre com a senha.';
  if(code === 'weak_password' || (m.indexOf('password') >= 0 && m.indexOf('least') >= 0)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if(code === 'over_request_rate_limit' || m.indexOf('rate limit') >= 0 || m.indexOf('too many') >= 0) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  if(m.indexOf('fetch') >= 0 || m.indexOf('network') >= 0) return 'Sem conexão com o servidor. Confira sua internet.';
  return (error && error.message) ? error.message : 'Algo deu errado. Tente de novo.';
}
/* erros que o Supabase devolve na URL quando um link de e-mail falha (#error=...&error_code=otp_expired) */
function urlAuthError(){
  try {
    const h = String(location.hash || '').replace(/^#/, '');
    if(!h || h.indexOf('error') < 0) return '';
    const p = new URLSearchParams(h);
    const code = p.get('error_code') || '', desc = p.get('error_description') || p.get('error') || '';
    if(!code && !desc) return '';
    try { history.replaceState(null, '', location.pathname + location.search); } catch(e){}
    if(code === 'otp_expired' || /expired|invalid/i.test(desc)) return 'Este link de e-mail expirou ou já foi usado. Entre com e-mail e senha; se esqueceu a senha, peça um link novo em "Esqueci a senha".';
    return 'O link de e-mail não funcionou (' + desc.replace(/\+/g, ' ') + '). Entre com e-mail e senha.';
  } catch(e){ return ''; }
}
async function loadProfile(){
  if(!sb || !uid()) { profile = null; return null; }
  const {data, error} = await sb.from('profiles').select('*').eq('id', uid()).maybeSingle();
  if(error){ console.warn('profile', error); return profile; }
  if(!data){
    // trigger ainda não criou o profile: tenta de novo em seguida
    await new Promise(function(r){ setTimeout(r, 700); });
    const again = await sb.from('profiles').select('*').eq('id', uid()).maybeSingle();
    profile = again.data || null;
    return profile;
  }
  profile = data;
  return profile;
}
function applyProfile(p){
  if(!p) return;
  const wasPaid = isPaid();
  profile = Object.assign({}, profile || {}, p);
  renderAccess();
  if(!wasPaid && isPaid()) onLifetime();
}
function watchProfile(){
  if(!sb || !uid() || profileChan) return;
  profileChan = sb.channel('profile:' + uid())
    .on('postgres_changes', {event:'UPDATE', schema:'public', table:'profiles', filter:'id=eq.' + uid()}, function(payload){ if(payload && payload.new) applyProfile(payload.new); })
    .subscribe();
}
function unwatchProfile(){ if(profileChan && sb){ try { sb.removeChannel(profileChan); } catch(e){} } profileChan = null; }
function onLifetime(){
  toast('Acesso vitalício ativo');
  announce('Acesso vitalício ativo');
  if(!$('#view-pay').hidden) payShow('done');
}

/* ================= telas ================= */
const VIEWS = ['entry','room','pay','reset','admin'];
function show(view){
  VIEWS.forEach(function(v){ $('#view-' + v).hidden = (v !== view); });
  if(view !== 'pay') stopPayPolling();
  try { window.scrollTo(0,0); } catch(e){}
}
function renderGuest(){
  const free = G.free;
  const pill = $('#access-pill');
  pill.hidden = false;
  if(free > 0){ pill.textContent = 'Visitante · ' + free + (free === 1 ? ' acesso grátis' : ' acessos grátis'); pill.dataset.state = 'free'; }
  else { pill.textContent = 'Visitante · acessos esgotados'; pill.dataset.state = 'out'; }
  $$('#gu-cups .cup').forEach(function(el,i){ el.dataset.on = (i < free) ? '1' : '0'; });
  $('#gu-access-text').textContent = free > 0 ? (free + ' de ' + FREE_ACCESSES + ' acessos grátis neste aparelho. Entrar usa 1.') : 'Os 3 acessos grátis de visitante acabaram. Crie uma conta para continuar.';
  $('#btn-gu-enter').textContent = free > 0 ? 'Entrar na sala' : 'Criar conta para continuar';
  if(document.activeElement !== $('#gu-name')) $('#gu-name').value = G.name;
  if(document.activeElement !== $('#gu-goal')) $('#gu-goal').value = G.goal;
}
function renderAccess(){
  const pill = $('#access-pill'), logged = !!(session && profile);
  pill.hidden = !logged;
  $('#btn-account').hidden = false;
  $('#btn-admin').hidden = !isAdmin();
  $('#owner-tools').hidden = !isAdmin();
  $('#setup-box').hidden = configured;
  $('#auth-box').hidden = !configured || !!session || guestMode;
  $('#guest-form').hidden = !configured || !!session || !guestMode;
  $('#entry-form').hidden = !configured || !session;
  $('#btn-account-text').textContent = session ? (session.user.email || 'Conta') : 'Entrar';
  if(isGuest()) renderGuest();
  if(!logged) return;
  const free = Math.max(0, Math.floor(num(+profile.free_left)));
  if(isPaid()){ pill.textContent = 'Acesso vitalício'; pill.dataset.state = 'paid'; }
  else if(free > 0){ pill.textContent = free + (free === 1 ? ' acesso grátis' : ' acessos grátis'); pill.dataset.state = 'free'; }
  else { pill.textContent = 'Acessos grátis esgotados'; pill.dataset.state = 'out'; }
  $$('#cups .cup').forEach(function(el,i){ el.dataset.on = (i < free) ? '1' : '0'; });
  $('#cups').hidden = isPaid();
  $('#access-text').textContent = isPaid() ? 'Acesso vitalício ativo nesta conta. Entre quantas vezes quiser.' : (free > 0 ? (free + ' de ' + FREE_ACCESSES + ' acessos grátis. Entrar usa 1.') : 'Os 3 acessos grátis acabaram.');
  $('#btn-enter').textContent = (isPaid() || free > 0) ? 'Entrar na sala' : 'Desbloquear por R$ 10';
  $('#acct-links').hidden = isPaid();
  $('#entry-fine').hidden = isPaid();
  if(document.activeElement !== $('#in-name')) $('#in-name').value = profile.name || '';
  if(document.activeElement !== $('#in-goal')) $('#in-goal').value = GOALS[profile.goal] ? profile.goal : 'fuvest';
  $('#btn-me-pay').hidden = isPaid();
  $('#me-email').textContent = profile.email || session.user.email || '';
  const st = $('#me-status');
  st.dataset.on = isPaid() ? '1' : '0';
  st.textContent = isPaid() ? ('Acesso vitalício ativo desde ' + (fmtStamp(profile.lifetime_since) || 'hoje')) : (free > 0 ? (free + (free === 1 ? ' acesso grátis' : ' acessos grátis') + ' restantes') : 'Acessos grátis esgotados');
}

/* ================= autenticação ================= */
function authTab(tab){
  ['login','signup','forgot'].forEach(function(t){ $('#f-' + t).hidden = (t !== tab); });
  $('#auth-tabs').hidden = (tab === 'forgot');
  $$('#auth-tabs button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.tab === tab ? 'true' : 'false'); });
  $('#auth-title').textContent = tab === 'forgot' ? 'Recuperar a senha' : 'Pegue um lugar na mesa';
  $('#auth-msg').hidden = true;
  ['lg','su','fg'].forEach(function(p){ $('#' + p + '-err').textContent = ''; });
  if(tab === 'signup') mountAvatar('signup', pendingAvatar() || (AV.slot === 'signup' ? AV.cfg : null) || G.avatar); else unmountAvatar('signup');
}
function authMessage(text, kind){ const el = $('#auth-msg'); el.textContent = text; el.dataset.kind = kind || ''; el.hidden = false; }
async function doLogin(){
  const err = $('#lg-err'); err.textContent = '';
  const email = normEmail($('#lg-email').value), pw = $('#lg-pass').value;
  if(!validEmail(email)){ err.textContent = 'Digite um e-mail válido.'; return; }
  if(!pw){ err.textContent = 'Digite sua senha.'; return; }
  busy($('#btn-login'), true, 'Entrando…');
  const {error} = await sb.auth.signInWithPassword({email:email, password:pw});
  busy($('#btn-login'), false, true);
  if(error){ err.textContent = authErrorText(error); return; }
  $('#lg-pass').value = '';
}
async function doSignup(){
  const err = $('#su-err'); err.textContent = '';
  const name = str($('#su-name').value, 20), goal = GOALS[$('#su-goal').value] ? $('#su-goal').value : 'fuvest';
  const email = normEmail($('#su-email').value), pw = $('#su-pass').value;
  if(!name){ err.textContent = 'Digite um apelido para os colegas verem na mesa.'; $('#su-name').focus(); return; }
  if(!validEmail(email)){ err.textContent = 'Digite um e-mail válido.'; return; }
  if(pw.length < 6){ err.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  const avatar = AV.slot === 'signup' ? currentAvatarCfg() : null;
  if(avatar) lsSet(PENDING_AVATAR_KEY, JSON.stringify(avatar));
  busy($('#btn-signup'), true, 'Criando…');
  const {data, error} = await sb.auth.signUp({email:email, password:pw, options:{data:{name:name, goal:goal}, emailRedirectTo:SITE_URL}});
  busy($('#btn-signup'), false, true);
  if(error){ err.textContent = authErrorText(error); return; }
  if(data && data.user && !data.session){
    const taken = data.user.identities && data.user.identities.length === 0;
    authMessage(taken ? 'Já existe uma conta com este e-mail. Entre com a senha ou use "Esqueci a senha".' : 'Enviamos um link de confirmação para ' + email + '. Abra o e-mail para ativar a conta.', 'warn');
  }
  $('#su-pass').value = '';
}
async function doForgot(){
  const err = $('#fg-err'); err.textContent = '';
  const email = normEmail($('#fg-email').value);
  if(!validEmail(email)){ err.textContent = 'Digite o e-mail da conta.'; return; }
  busy($('#btn-forgot'), true, 'Enviando…');
  const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo:SITE_URL});
  busy($('#btn-forgot'), false, true);
  if(error){ err.textContent = authErrorText(error); return; }
  authMessage('Se existir uma conta com ' + email + ', o link para criar uma senha nova chega em instantes.', 'ok');
}
async function doReset(){
  const err = $('#rs-err'); err.textContent = '';
  const pw = $('#rs-pass').value;
  if(pw.length < 6){ err.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  busy($('#btn-reset-save'), true, 'Salvando…');
  const {error} = await sb.auth.updateUser({password:pw});
  busy($('#btn-reset-save'), false, true);
  if(error){ err.textContent = authErrorText(error); return; }
  $('#rs-pass').value = '';
  toast('Senha salva');
  show('entry');
}
async function doChangePassword(){
  const err = $('#np-err'); err.textContent = '';
  const pw = $('#np-pass').value;
  if(pw.length < 6){ err.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  busy($('#btn-pass'), true, 'Salvando…');
  const {error} = await sb.auth.updateUser({password:pw});
  busy($('#btn-pass'), false, true);
  if(error){ err.textContent = authErrorText(error); return; }
  $('#np-pass').value = '';
  toast('Senha trocada');
}
async function doLogout(){
  closeAccount();
  if(!$('#view-room').hidden) exitRoom();
  unwatchProfile();
  await sb.auth.signOut();
  session = null; profile = null; Tasks.clear();
  renderAccess();
  authTab('login');
  show('entry');
  toast('Você saiu da conta');
}
async function handleSession(s, event){
  const hadSession = !!session;
  session = s || null;
  if(event === 'PASSWORD_RECOVERY'){ guestMode = false; await loadProfile(); renderAccess(); show('reset'); return; }
  if(!session){
    profile = null; unwatchProfile();
    if(event === 'INITIAL_SESSION' && ssGet(GUEST_SESSION_KEY) === '1' && G.name && G.free < FREE_ACCESSES){ guestMode = true; renderAccess(); enterRoom(); return; }
    renderAccess();
    if($('#view-room').hidden && $('#view-reset').hidden) show('entry');
    return;
  }
  guestMode = false;
  ssDel(GUEST_SESSION_KEY);
  if(!$('#view-room').hidden && hadSession === false && event === 'SIGNED_IN'){ exitRoom(); }
  await loadProfile();
  try { await ensureProfileAvatar(); } catch(e){}
  renderAccess();
  watchProfile();
  if(!hadSession && event === 'SIGNED_IN'){ show('entry'); }
  if(event === 'INITIAL_SESSION' && ssGet(SESSION_KEY) === '1' && profile && (isPaid() || num(+profile.free_left) < FREE_ACCESSES)){ enterRoom(); }
}

/* ================= visitante ================= */
function startGuest(){
  guestMode = true;
  $('#auth-msg').hidden = true;
  $('#gu-room').value = S.room;
  renderAccess();
  mountAvatar('guest', G.avatar);
  try { $('#gu-name').focus(); } catch(e){}
}
function leaveGuest(tab){
  guestMode = false;
  ssDel(GUEST_SESSION_KEY);
  unmountAvatar('guest');
  renderAccess();
  authTab(tab || 'login');
}
function onGuestEnter(e){
  e.preventDefault();
  const err = $('#gu-error');
  if(G.free <= 0){
    leaveGuest('signup');
    authMessage('Seus 3 acessos grátis de visitante acabaram neste aparelho. Crie uma conta: ela tem 3 acessos grátis e a opção de acesso vitalício.', 'warn');
    $('#su-name').value = G.name; $('#su-goal').value = G.goal;
    return;
  }
  const name = str($('#gu-name').value, 20);
  if(!name){ err.textContent = 'Digite um apelido para os colegas verem na mesa.'; $('#gu-name').focus(); return; }
  err.textContent = '';
  G.name = name;
  G.goal = GOALS[$('#gu-goal').value] ? $('#gu-goal').value : 'fuvest';
  if(AV.slot === 'guest') G.avatar = currentAvatarCfg();
  G.free -= 1;
  saveGuest();
  unmountAvatar('guest');
  S.room = cleanCode($('#gu-room').value); $('#gu-room').value = S.room; $('#in-room').value = S.room;
  S.quoteGoal = G.goal; save();
  ssSet(GUEST_SESSION_KEY, '1');
  renderAccess();
  enterRoom();
}

/* ================= entrar na mesa ================= */
async function onEnter(e){
  e.preventDefault();
  const name = str($('#in-name').value, 20), err = $('#in-error');
  if(!name){ err.textContent = 'Digite um apelido para os colegas verem na mesa.'; $('#in-name').focus(); return; }
  err.textContent = '';
  const goal = GOALS[$('#in-goal').value] ? $('#in-goal').value : 'fuvest';
  S.room = cleanCode($('#in-room').value); $('#in-room').value = S.room;
  S.quoteGoal = goal; save();
  busy($('#btn-enter'), true, 'Entrando…');
  try {
    if(profile && (profile.name !== name || profile.goal !== goal)){
      const {error} = await sb.from('profiles').update({name:name, goal:goal}).eq('id', uid());
      if(!error){ profile.name = name; profile.goal = goal; }
    }
    const {data, error} = await sb.rpc('enter_room', {p_room:S.room});
    if(error){ err.textContent = 'Não consegui te colocar na mesa: ' + authErrorText(error); return; }
    if(!data || data.ok !== true){
      if(data && data.reason === 'no_access'){ profile.free_left = 0; renderAccess(); show('pay'); payStart(); return; }
      err.textContent = 'Não consegui te colocar na mesa. Saia e entre de novo na conta.'; return;
    }
    profile.free_left = num(+data.free_left);
    if(data.lifetime) profile.lifetime = true;
    renderAccess();
    ssSet(SESSION_KEY, '1');
    enterRoom();
  } finally { busy($('#btn-enter'), false, true); }
}

/* ================= pomodoro ================= */
const T = {phase:'focus', running:false, endsAt:0, remaining:0, cycle:0, startedAt:0};
let demoTimer = false;
const presetObj = () => demoTimer ? DEMO_PRESET : PRESETS[S.preset];
const dur = (ph) => presetObj()[ph] * 1000;
T.remaining = dur('focus');
let tickId = 0;
function curRemaining(now){ return T.running ? Math.max(0, T.endsAt - (now || Date.now())) : T.remaining; }
function start(){ ensureAudio(); if(!T.running){ const now = Date.now(); T.running = true; T.endsAt = now + T.remaining; T.startedAt = now; } pushPresence(); renderTimer(); updateSync(); }
function pause(){ if(T.running){ accrueFocus(Date.now()); T.remaining = curRemaining(); T.running = false; flushFocus(false); } pushPresence(); renderTimer(); updateSync(); }
function setPhase(ph){ accrueFocus(Date.now()); flushFocus(false); T.phase = ph; T.running = false; T.remaining = dur(ph); pushPresence(); renderTimer(); updateSync(); }
function resetPhase(){ setPhase(T.phase); }
function recordPomodoro(){ if(demoTimer) return; if(S.stats.day !== todayKey()) S.stats = {day:todayKey(), pomos:0, sec:0}; S.stats.pomos += 1; S.stats.sec += presetObj().focus; save(); }
function nextPhase(counted){
  const was = T.phase;
  if(T.phase === 'focus'){ T.phase = (T.cycle > 0 && T.cycle % 4 === 0) ? 'long' : 'short'; } else { T.phase = 'focus'; }
  T.remaining = dur(T.phase);
  if(counted && S.auto){ const now = Date.now(); T.running = true; T.endsAt = now + T.remaining; T.startedAt = now; } else { T.running = false; }
  announce(PHASE_NAME[was] + ' terminou. ' + PHASE_NAME[T.phase] + (T.running ? ' começou.' : ' pronta para iniciar.'));
  showQuote(true); pushPresence(); renderTimer(); updateSync();
}
function completePhase(){ chime(); if(T.phase === 'focus'){ flushFocus(true); T.cycle += 1; recordPomodoro(); } nextPhase(true); }
function skip(){ accrueFocus(Date.now()); flushFocus(false); nextPhase(false); }
function renderTimer(){
  const total = dur(T.phase), rem = curRemaining();
  $('#timer').dataset.phase = T.phase;
  $('#time').textContent = fmt(rem);
  $('#phase-label').textContent = PHASE_NAME[T.phase];
  $('#arc').style.strokeDashoffset = String(552.92 * Math.min(1, Math.max(0, rem / total)));
  $$('#phases button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.phase === T.phase ? 'true' : 'false'); });
  $$('#presets button').forEach(function(b){ b.setAttribute('aria-pressed', (!demoTimer && b.dataset.preset === S.preset) ? 'true' : 'false'); b.disabled = T.running; b.title = T.running ? 'Pause o timer para trocar a duração' : ''; });
  $('#btn-start').textContent = T.running ? 'Pausar' : (T.remaining < total ? 'Continuar' : 'Iniciar');
  let filled = T.cycle % 4;
  if(T.cycle > 0 && T.cycle % 4 === 0 && T.phase === 'long') filled = 4;
  $$('#dots .dot').forEach(function(d,i){ d.dataset.on = i < filled ? '1' : '0'; });
  const mins = Math.floor(S.stats.sec / 60);
  $('#stats').textContent = S.stats.pomos === 0 ? 'Hoje: nenhum pomodoro ainda' : ('Hoje: ' + S.stats.pomos + (S.stats.pomos === 1 ? ' pomodoro' : ' pomodoros') + ' · ' + mins + ' min de foco');
}
function tick(){ const now = Date.now(); accrueFocus(now); if(T.running && now >= T.endsAt) completePhase(); renderTimer(); updateSeatTimes(); cafeTick(now); }

/* ================= áudio ================= */
let actx = null, rainSrc = null, rainGain = null;
function ensureAudio(){ if(!actx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; try { actx = new AC(); } catch(e){ return null; } } if(actx.state === 'suspended'){ try { actx.resume(); } catch(e){} } return actx; }
const rainLevel = () => (S.vol / 100) * 0.22;
function startRain(){
  const c = ensureAudio(); if(!c) return false;
  const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for(let i = 0; i < len; i++){ d[i] = Math.random() * 2 - 1; }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
  rainGain = c.createGain(); rainGain.gain.value = rainLevel();
  src.connect(hp); hp.connect(lp); lp.connect(rainGain); rainGain.connect(c.destination);
  src.start(); rainSrc = src; return true;
}
function stopRain(){ if(rainSrc){ try { rainSrc.stop(); } catch(e){} rainSrc = null; } rainGain = null; }
function chime(){
  if(!actx) return;
  const t = actx.currentTime;
  [660, 880].forEach(function(f,i){ const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i*0.18); g.gain.exponentialRampToValueAtTime(0.16, t + i*0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i*0.18 + 0.7); o.connect(g); g.connect(actx.destination); o.start(t + i*0.18); o.stop(t + i*0.18 + 0.8); });
}

/* ================= frases ================= */
let lastQuote = -1;
function quotePool(){ return QUOTES.map(function(q,i){ return {q:q, i:i}; }).filter(function(x){ return S.quoteGoal === 'todas' || x.q.u === 'geral' || x.q.u === S.quoteGoal; }); }
function showQuote(fade){
  if(!S.quotesOn) return;
  const pool = quotePool(); if(!pool.length) return;
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if(pool.length > 1){ let guard = 0; while(pick.i === lastQuote && guard++ < 8){ pick = pool[Math.floor(Math.random() * pool.length)]; } }
  lastQuote = pick.i;
  const body = $('#quote-body');
  const apply = function(){ $('#quote-text').textContent = pick.q.t; $('#quote-meta').textContent = QUOTE_LABEL[pick.q.u]; body.classList.remove('swap'); };
  if(fade){ body.classList.add('swap'); setTimeout(apply, 260); } else { apply(); }
}
function renderQuotesUi(){ $('#sw-quotes').checked = S.quotesOn; $('#quotes-inner').hidden = !S.quotesOn; $$('#quote-chips .chip').forEach(function(c){ c.setAttribute('aria-pressed', c.dataset.q === S.quoteGoal ? 'true' : 'false'); }); }

/* ================= mesa ao vivo (Supabase Realtime Presence) ================= */
let roomChan = null, peersList = [], seatEls = [], quoteTimer = 0, roomActive = false;
const tabKey = ':' + Math.random().toString(36).slice(2, 10);
const myId = () => uid() || (isGuest() ? G.id : 'x');
const myName = () => session ? ((profile && profile.name) || '') : (isGuest() ? G.name : '');
const myGoal = () => session ? ((profile && profile.goal) || '') : (isGuest() ? G.goal : '');
function setConn(ok, label){ const el = $('#conn'); el.dataset.ok = ok ? '1' : '0'; el.textContent = label; }
function avatarOr(a, seed){ return (a && typeof a === 'object') ? normAvatar(a) : randomAvatar(seed); }
function myAvatar(){ return avatarOr(session ? (profile && profile.avatar) : (isGuest() ? G.avatar : null), myId()); }
function mySubject(){ const f = Tasks.focus(); return (f && !f.done) ? f.text : S.subject; }
function myPresence(){
  return {uid:myId(), name:myName(), goal:myGoal(), subject:str(mySubject(), 60), phase:T.phase, running:T.running,
    endsAt:T.running ? T.endsAt : 0, remaining:T.running ? 0 : T.remaining, startedAt:T.startedAt, cycle:T.cycle,
    avatar:myAvatar(), mic:!!(voice && voice.isOn())};
}
let presenceTimer = 0;
function pushPresence(){
  if(!roomChan || !roomActive) return;
  clearTimeout(presenceTimer);
  presenceTimer = setTimeout(function(){ try { const p = roomChan.track(myPresence()); if(p && p.catch) p.catch(function(){}); } catch(e){} }, 60);
}
function readPresence(){
  const state = (roomChan && typeof roomChan.presenceState === 'function') ? roomChan.presenceState() : {};
  const list = [];
  const before = {}; peersList.forEach(function(p){ before[p.key] = true; });
  Object.keys(state).forEach(function(key){
    const arr = state[key] || [];
    const pr = arr[arr.length - 1];
    if(!pr) return;
    list.push({key:key, isMe:pr.uid === myId(), sameTab:key === myKey(), presence:pr});
  });
  peersList = list;
  if(voice){
    const now = {}; list.forEach(function(p){ now[p.key] = true; });
    Object.keys(before).forEach(function(k){ if(!now[k]) voice.peerLeft(k); });
    list.forEach(function(p){ if(!before[p.key] && !p.sameTab) voice.peerJoined(p.key); });
  }
  renderSeats(); updateSync();
}
function myKey(){ return myId() + tabKey; }
function joinRoom(code){
  setConn(false, 'Conectando…');
  roomActive = true;
  if(!sb){ setConn(false, 'Modo individual'); renderSeats(); return; }
  try {
    roomChan = sb.channel('room:' + code, {config:{presence:{key:myKey()}, broadcast:{self:false}}});
    roomChan.on('presence', {event:'sync'}, readPresence);
    roomChan.on('broadcast', {event:'rtc'}, function(msg){ if(voice && msg && msg.payload) voice.handleSignal(msg.payload); });
    roomChan.subscribe(function(status){
      if(!roomActive) return;
      if(status === 'SUBSCRIBED'){ setConn(true, 'Ao vivo'); pushPresence(); }
      else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){ setConn(false, 'Reconectando…'); }
      else if(status === 'CLOSED'){ setConn(false, 'Sem conexão com a mesa'); }
    });
  } catch(e){ setConn(false, 'Modo individual'); renderSeats(); }
}
function leaveRoom(){
  roomActive = false;
  clearTimeout(presenceTimer);
  stopVoice(true);
  if(roomChan && sb){ try { roomChan.untrack(); } catch(e){} try { sb.removeChannel(roomChan); } catch(e){} }
  roomChan = null; peersList = []; seatEls = [];
}
function demoLive(off, now){ const t = ((now / 1000) + off) % 1800; return t < 1500 ? {phase:'focus', running:true, ms:(1500 - t) * 1000} : {phase:'short', running:true, ms:(1800 - t) * 1000}; }
function seatModels(){
  const list = [];
  list.push({key:myKey(), name:myName() || 'Você', subject:str(mySubject(), 60), me:true, avatar:myAvatar(), mic:!!(voice && voice.isOn()), get:function(now){ return {phase:T.phase, running:T.running, ms:curRemaining(now)}; }});
  const others = peersList.filter(function(p){ return !p.sameTab; });
  others.forEach(function(p){
    const pr = p.presence || {};
    const phase = PHASES.indexOf(pr.phase) >= 0 ? pr.phase : 'focus';
    const run = pr.running === true && num(pr.endsAt) > 0;
    const end = num(pr.endsAt), rem = num(pr.remaining);
    list.push({key:p.key, name:str(pr.name, 24) || 'Colega', subject:str(pr.subject, 60), me:false, avatar:avatarOr(pr.avatar, p.key), mic:pr.mic === true, get:function(now){ return {phase:phase, running:run, ms:run ? Math.max(0, end - now) : rem}; }});
  });
  const demo = (others.length === 0 && S.demoSeats);
  if(demo){ DEMO_SEATS.forEach(function(d, i){ list.push({key:'demo' + i, name:d.name, subject:d.subject, demo:true, avatar:randomAvatar('demo' + d.name), get:function(now){ return demoLive(d.off, now); }}); }); }
  return {list:list, real:1 + others.length, demo:demo};
}
function buildSeat(m){
  const el = document.createElement('div'); el.className = 'seat';
  const cup = document.createElement('div'); cup.className = 'cup-wrap';
  cup.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-cup"/></svg><span class="steam"><i></i><i></i><i></i></span>';
  const body = document.createElement('div');
  const nameRow = document.createElement('div'); nameRow.className = 'seat-name';
  const nm = document.createElement('span'); nm.textContent = m.name; nameRow.appendChild(nm);
  if(m.me || m.demo){ const tag = document.createElement('em'); tag.textContent = m.me ? 'você' : 'demo'; nameRow.appendChild(tag); }
  const canMute = !m.me && !m.demo && m.mic && voice;
  if(m.mic){ el.dataset.mic = '1'; }
  if(m.mic && !canMute){ const mt = document.createElement('em'); mt.className = 'mic'; mt.textContent = 'mic'; nameRow.appendChild(mt); }
  if(canMute){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ibtn';
    const muted = voice.isMuted(m.key);
    b.dataset.muted = muted ? '1' : '0';
    b.setAttribute('aria-pressed', muted ? 'true' : 'false');
    b.setAttribute('aria-label', muted ? ('Ouvir ' + m.name + ' de novo') : ('Silenciar ' + m.name + ' para mim'));
    b.title = b.getAttribute('aria-label');
    b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + (muted ? 'i-mute' : 'i-mic') + '"/></svg>';
    b.addEventListener('click', function(){ voice.setMuted(m.key, !voice.isMuted(m.key)); renderSeats(); toast(voice.isMuted(m.key) ? (m.name + ' silenciado para você') : ('Você voltou a ouvir ' + m.name)); });
    nameRow.appendChild(b);
  }
  const sub = document.createElement('div'); sub.className = 'seat-sub'; sub.textContent = m.subject || 'Estudando';
  const st = document.createElement('div'); st.className = 'seat-time';
  body.appendChild(nameRow); body.appendChild(sub); body.appendChild(st);
  el.appendChild(cup); el.appendChild(body);
  seatEls.push({el:el, cup:cup, st:st, get:m.get});
  return el;
}
function renderSeats(){
  const box = $('#seats'); if(!box) return;
  seatEls = [];
  const model = seatModels(), frag = document.createDocumentFragment();
  model.list.forEach(function(m){ frag.appendChild(buildSeat(m)); });
  for(let i = 0; i < Math.max(0, 6 - model.list.length); i++){ const e = document.createElement('div'); e.className = 'seat empty'; e.textContent = 'Lugar livre'; frag.appendChild(e); }
  box.replaceChildren(frag);
  $('#table-count').textContent = model.real + (model.real === 1 ? ' pessoa' : ' pessoas') + ' na mesa';
  $('#demo-note').hidden = !model.demo;
  updateSeatTimes();
  cafeUpdate(model);
}
function updateSeatTimes(){ const now = Date.now(); seatEls.forEach(function(s){ const g = s.get(now); s.el.dataset.phase = g.phase; s.cup.dataset.running = g.running ? '1' : '0'; s.st.textContent = g.running ? (PHASE_NAME[g.phase] + ' · ' + fmt(g.ms)) : 'Pausado'; }); }
function syncTarget(){
  const now = Date.now(); let best = null;
  peersList.forEach(function(p){
    if(p.sameTab) return;
    const pr = p.presence || {};
    if(pr.running === true && num(pr.endsAt) > now && PHASES.indexOf(pr.phase) >= 0){
      const st = num(pr.startedAt);
      if(!best || st < best.startedAt) best = {name:str(pr.name, 24) || 'um colega', phase:pr.phase, endsAt:num(pr.endsAt), startedAt:st, cycle:Math.max(0, Math.floor(num(pr.cycle)))};
    }
  });
  return best;
}
let syncBest = null;
function updateSync(){
  syncBest = syncTarget();
  let showIt = !!syncBest;
  if(syncBest && T.running && T.phase === syncBest.phase && Math.abs(T.endsAt - syncBest.endsAt) < 2000) showIt = false;
  $('#sync-wrap').hidden = !showIt;
  if(showIt) $('#btn-sync').textContent = 'Sincronizar com ' + syncBest.name;
}
function adoptSync(){ if(!syncBest) return; ensureAudio(); T.phase = syncBest.phase; T.cycle = syncBest.cycle; T.running = true; T.endsAt = syncBest.endsAt; T.startedAt = syncBest.startedAt; T.remaining = 0; pushPresence(); renderTimer(); updateSync(); toast('Timer sincronizado com ' + syncBest.name); }

/* ================= tempo de foco → ranking ================= */
const FOCUS_CHUNK = 240;       // envia o foco em fatias de 4 min
let focusAcc = 0, focusLastTick = 0, focusSending = false, rankTimer = 0, rankSeq = 0;
function accrueFocus(now){
  if(!session || demoTimer){ focusLastTick = now; return; }
  if(T.running && T.phase === 'focus' && focusLastTick > 0){
    const upto = Math.min(now, T.endsAt);
    if(upto > focusLastTick) focusAcc += (upto - focusLastTick) / 1000;
  }
  focusLastTick = now;
  if(focusAcc >= FOCUS_CHUNK) flushFocus(false);
}
let focusRetryAt = 0, focusLastSendAt = 0;
function flushFocus(drop){
  const now = Date.now();
  let secs = Math.min(900, Math.floor(focusAcc));
  if(secs < 30){ if(drop) focusAcc = 0; return; }
  if(!sb || !session || focusSending || now < focusRetryAt){ if(drop) focusAcc = 0; return; }
  // o servidor só aceita o que cabe no tempo que passou desde o último registro
  if(focusLastSendAt) secs = Math.min(secs, Math.floor((now - focusLastSendAt) / 1000) + 60);
  if(secs < 30){ if(drop) focusAcc = 0; return; }
  focusAcc -= secs; focusSending = true; focusLastSendAt = now; focusRetryAt = now + 30000;
  const room = S.room;
  sb.rpc('log_focus', {p_room:room, p_seconds:secs}).then(function(r){
    focusSending = false;
    if(r.error){ console.warn('log_focus', r.error); focusRetryAt = Date.now() + 60000; if(!drop) focusAcc += secs; return; }
    if(r.data && r.data.ok === true && roomActive && room === S.room) loadRanking();
  }).catch(function(){ focusSending = false; focusRetryAt = Date.now() + 60000; if(!drop) focusAcc += secs; });
}
function fmtHours(sec){
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if(h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'min';
  return m > 0 ? (m + ' min') : '< 1 min';
}
const RANK_WHEN = {day:'hoje', week:'nesta semana', month:'neste mês'};
function rankNoteText(empty){
  if(empty) return 'Ninguém registrou foco ' + RANK_WHEN[S.rankPeriod] + ' nesta mesa ainda. Dê o play no pomodoro!';
  return isGuest() ? 'Visitantes não entram no ranking. Com uma conta, seu tempo de foco conta.' : 'Conta o tempo de foco com o timer rodando. Atualiza a cada minuto.';
}
function renderRanking(rows){
  const list = $('#rank-list'), frag = document.createDocumentFragment();
  rows.forEach(function(r, i){
    const li = document.createElement('li'); li.dataset.me = r.is_me === true ? '1' : '0';
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : String(i + 1)));
    const who = document.createElement('span'); who.className = 'who'; who.textContent = (str(r.name, 24) || 'Colega') + (r.is_me === true ? ' (você)' : '');
    const small = document.createElement('small'); small.textContent = GOALS[r.goal] || ''; who.appendChild(small);
    const time = document.createElement('span'); time.className = 'time'; time.textContent = fmtHours(num(+r.seconds));
    li.appendChild(pos); li.appendChild(who); li.appendChild(time); frag.appendChild(li);
  });
  list.replaceChildren(frag);
  $('#rank-note').textContent = rankNoteText(rows.length === 0);
}
async function loadRanking(){
  $$('#rank-periods button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.period === S.rankPeriod ? 'true' : 'false'); });
  if(!sb){ $('#rank-list').replaceChildren(); $('#rank-note').textContent = 'O ranking aparece quando o site está conectado.'; return; }
  const seq = ++rankSeq, room = S.room;
  try {
    const {data, error} = await sb.rpc('room_ranking', {p_room:room, p_period:S.rankPeriod});
    if(seq !== rankSeq || room !== S.room) return;
    if(error){ console.warn('ranking', error); $('#rank-note').textContent = 'Não consegui carregar o ranking agora.'; return; }
    renderRanking(Array.isArray(data) ? data : []);
  } catch(e){ if(seq === rankSeq) $('#rank-note').textContent = 'Sem conexão para carregar o ranking.'; }
}

/* ================= checklist pessoal ================= */
const TASKS_KEY = 'studycoffee.tasks';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function dayKey(offset){ const d = new Date(); d.setDate(d.getDate() + (offset || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtDue(due){ try { const p = due.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit'}).replace('.', ''); } catch(e){ return due; } }
const Tasks = (function(){
  let items = [], loadSeq = 0;
  const rid = () => 't' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const local = () => !session || !sb;
  function clean(o){
    if(!o || typeof o !== 'object') return null;
    const text = str(o.text, 120); if(!text) return null;
    return {id:String(o.id || '').slice(0, 40) || rid(), text:text, done:o.done === true, is_focus:o.is_focus === true, due:DATE_RE.test(String(o.due || '')) ? String(o.due) : null, position:num(+o.position), created_at:String(o.created_at || '')};
  }
  function sortItems(){ items.sort(function(a, b){ return (a.position - b.position) || (a.created_at < b.created_at ? -1 : (a.created_at > b.created_at ? 1 : 0)); }); }
  function readLocal(){ try { const arr = JSON.parse(lsGet(TASKS_KEY) || '[]'); return Array.isArray(arr) ? arr.map(clean).filter(Boolean) : []; } catch(e){ return []; } }
  function writeLocal(){ lsSet(TASKS_KEY, JSON.stringify(items)); }
  function byId(id){ return items.find(function(t){ return t.id === id; }) || null; }
  function after(){ renderTasks(); renderSeats(); pushPresence(); }
  function persist(p, undo){
    if(!p) return;
    Promise.resolve(p).then(function(r){
      if(r && r.error){ console.warn('tasks', r.error); toast('Não consegui salvar na sua lista'); if(undo){ undo(); after(); } }
    }).catch(function(){ toast('Sem conexão para salvar a lista'); if(undo){ undo(); after(); } });
  }
  async function load(){
    const seq = ++loadSeq;
    if(local()){ items = readLocal(); sortItems(); return items; }
    try {
      const {data, error} = await sb.from('tasks').select('id,text,done,is_focus,due,position,created_at').eq('user_id', uid()).order('position').order('created_at');
      if(seq !== loadSeq) return items;
      if(error){ console.warn('tasks', error); toast('Não consegui carregar sua lista'); return items; }
      items = (data || []).map(clean).filter(Boolean); sortItems();
    } catch(e){ if(seq === loadSeq) toast('Sem conexão para carregar sua lista'); }
    return items;
  }
  function add(text, due){
    const t = {id:rid(), text:text, done:false, is_focus:false, due:due || null, position:items.length ? Math.max.apply(null, items.map(function(x){ return x.position; })) + 1 : 0, created_at:new Date().toISOString()};
    items.push(t); after();
    if(local()){ writeLocal(); return t; }
    const tmp = t.id;
    sb.from('tasks').insert({user_id:uid(), text:t.text, due:t.due, position:t.position}).select('id').single().then(function(r){
      const it = byId(tmp);
      if(r.error || !r.data){ console.warn('tasks', r.error); toast('Não consegui salvar na sua lista'); items = items.filter(function(x){ return x.id !== tmp; }); after(); return; }
      if(!it) return;
      it.id = String(r.data.id);
      if(it.done || it.is_focus) persist(sb.from('tasks').update({done:it.done, is_focus:it.is_focus}).eq('id', it.id));
    }).catch(function(){ toast('Sem conexão para salvar a lista'); items = items.filter(function(x){ return x.id !== tmp; }); after(); });
    return t;
  }
  function toggle(id){
    const t = byId(id); if(!t) return;
    t.done = !t.done; after();
    if(local()){ writeLocal(); return; }
    persist(sb.from('tasks').update({done:t.done}).eq('id', id), function(){ t.done = !t.done; });
  }
  function remove(id){
    const t = byId(id); if(!t) return;
    const idx = items.indexOf(t); items.splice(idx, 1); after();
    if(local()){ writeLocal(); return; }
    persist(sb.from('tasks').delete().eq('id', id), function(){ items.splice(Math.min(idx, items.length), 0, t); });
  }
  function setFocus(id){
    const prev = focus(), prevId = prev ? prev.id : null;
    items.forEach(function(t){ t.is_focus = (t.id === id); }); after();
    if(local()){ writeLocal(); return; }
    const ops = [];
    if(prevId && prevId !== id) ops.push(sb.from('tasks').update({is_focus:false}).eq('id', prevId));
    if(id) ops.push(sb.from('tasks').update({is_focus:true}).eq('id', id));
    persist(Promise.all(ops).then(function(rs){ return rs.find(function(r){ return r && r.error; }) || {}; }), function(){ items.forEach(function(t){ t.is_focus = (t.id === prevId); }); });
  }
  function focus(){ return items.find(function(t){ return t.is_focus; }) || null; }
  function clear(){ items = []; }
  return {load:load, list:function(){ return items.slice(); }, add:add, toggle:toggle, remove:remove, setFocus:setFocus, focus:focus, clear:clear};
})();
function ibtn(icon, label){ const b = document.createElement('button'); b.type = 'button'; b.className = 'ibtn'; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + icon + '"/></svg>'; return b; }
function buildTask(t, group){
  const el = document.createElement('div'); el.className = 'task'; el.dataset.done = t.done ? '1' : '0'; el.dataset.id = t.id;
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.setAttribute('aria-label', (t.done ? 'Desmarcar: ' : 'Concluir: ') + t.text);
  cb.addEventListener('change', function(){ Tasks.toggle(t.id); });
  const txt = document.createElement('div'); txt.className = 'ttext'; txt.textContent = t.text;
  if(t.due && group !== 'today' && group !== 'tomorrow'){ const d = document.createElement('span'); d.className = 'tdue'; d.textContent = fmtDue(t.due); txt.appendChild(d); }
  const star = ibtn('i-star', t.is_focus ? 'Tirar do foco de agora' : 'Marcar como foco de agora'); star.setAttribute('aria-pressed', t.is_focus ? 'true' : 'false');
  star.addEventListener('click', function(){ Tasks.setFocus(t.is_focus ? null : t.id); });
  const del = ibtn('i-x', 'Apagar: ' + t.text);
  del.addEventListener('click', function(){ Tasks.remove(t.id); });
  el.appendChild(cb); el.appendChild(txt); el.appendChild(star); el.appendChild(del);
  return el;
}
const TASK_GROUPS = [['late','Atrasadas'], ['today','Hoje'], ['tomorrow','Amanhã'], ['later','Próximos dias'], ['nodate','Sem data'], ['done','Feitas']];
function renderTasks(){
  const box = $('#tasks-list'); if(!box) return;
  const items = Tasks.list(), today = dayKey(0), tomorrow = dayKey(1);
  const by = {late:[], today:[], tomorrow:[], later:[], nodate:[], done:[]};
  items.forEach(function(t){ by[t.done ? 'done' : (!t.due ? 'nodate' : (t.due < today ? 'late' : (t.due === today ? 'today' : (t.due === tomorrow ? 'tomorrow' : 'later'))))].push(t); });
  const frag = document.createDocumentFragment();
  TASK_GROUPS.forEach(function(g){
    if(!by[g[0]].length) return;
    const h = document.createElement('div'); h.className = 'tgroup'; h.dataset.late = g[0] === 'late' ? '1' : '0'; h.textContent = g[1]; frag.appendChild(h);
    by[g[0]].forEach(function(t){ frag.appendChild(buildTask(t, g[0])); });
  });
  if(!items.length){ const e = document.createElement('p'); e.className = 'tasks-empty'; e.textContent = 'Sua lista está vazia. Anote o que precisa estudar nos próximos dias.'; frag.appendChild(e); }
  box.replaceChildren(frag);
  const open = items.filter(function(t){ return !t.done; }).length;
  $('#tasks-count').textContent = !items.length ? '' : (open === 0 ? 'tudo feito' : (open + (open === 1 ? ' pendente' : ' pendentes')));
  $('#tasks-hint').textContent = isGuest() ? 'Como visitante, a lista fica só neste aparelho. A estrela define o foco de agora, que aparece em cima do timer.' : 'A estrela define o foco de agora, que aparece em cima do timer.';
  renderFocusStrip();
}
function renderFocusStrip(){
  const f = Tasks.focus(), strip = $('#focus-strip'); if(!strip) return;
  strip.dataset.on = (f && !f.done) ? '1' : '0';
  $('#focus-item').hidden = !f;
  if(f){ $('#focus-text').textContent = f.text; $('#focus-done').checked = !!f.done; }
  const empty = $('#focus-empty');
  empty.hidden = !!(f && !f.done);
  empty.textContent = f ? 'Feito! Escolha o próximo na sua lista.' : 'Marque um item da sua lista com a estrela para ele aparecer aqui.';
}
function onTaskSubmit(e){
  e.preventDefault();
  const input = $('#task-text'), text = str(input.value, 120);
  if(!text){ input.focus(); return; }
  const dueRaw = $('#task-due').value;
  Tasks.add(text, DATE_RE.test(dueRaw) ? dueRaw : null);
  input.value = ''; input.focus();
}

/* ================= microfone ================= */
let voice = null;
function renderMicButton(st){
  const btn = $('#btn-mic'); if(!btn) return;
  const on = !!(st && st.micOn);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  $('#btn-mic-text').textContent = on ? 'Desligar microfone' : 'Ligar microfone';
}
function setupVoice(){
  const btn = $('#btn-mic');
  if(voice || !btn) return;
  if(!window.SCVoice || !window.SCVoice.supported() || !sb){ btn.hidden = true; return; }
  btn.hidden = false;
  voice = window.SCVoice.create({
    myKey: myKey(),
    send: function(msg){ if(!roomChan) return; try { const p = roomChan.send({type:'broadcast', event:'rtc', payload:msg}); if(p && p.catch) p.catch(function(){}); } catch(e){} },
    peers: function(){ return peersList.filter(function(p){ return !p.sameTab; }).map(function(p){ return p.key; }); },
    onChange: renderMicButton,
    onAutoplayBlocked: function(){
      const n = $('#voice-note'); n.hidden = false; n.textContent = 'Alguém ligou o microfone, mas o navegador só toca o som depois de um clique. ';
      const b = document.createElement('button'); b.className = 'linkbtn'; b.type = 'button'; b.textContent = 'Ouvir a mesa';
      b.addEventListener('click', function(){ voice && voice.unblock(); n.hidden = true; });
      n.appendChild(b);
    }
  });
  renderMicButton(voice.state());
}
function stopVoice(dispose){
  if(!voice) return;
  if(dispose){ try { voice.dispose(); } catch(e){} voice = null; renderMicButton(null); const n = $('#voice-note'); if(n) n.hidden = true; }
  else { voice.stop(); }
}
async function toggleMic(){
  if(!voice) return;
  const btn = $('#btn-mic');
  if(voice.isOn()){ voice.stop(); pushPresence(); renderSeats(); toast('Microfone desligado'); return; }
  busy(btn, true);
  try {
    await voice.start();
    pushPresence(); renderSeats();
    toast('Microfone ligado. Quem está na mesa te ouve, e cada um pode te silenciar.');
  } catch(e){
    const n = e && e.name;
    toast(n === 'NotAllowedError' ? 'O navegador não liberou o microfone' : (n === 'NotFoundError' ? 'Nenhum microfone encontrado' : 'Não consegui ligar o microfone'));
  } finally { busy(btn, false); }
}

/* ================= café 3D ================= */
let cafe = null, cafeModel = null, cafeSig = '', cafeLastCheck = 0;
function cafeAvailable(){ return !!(CAFE && CAFE.available()); }
function cafePeople(model){
  const now = Date.now();
  return model.list.map(function(m){ const g = m.get(now); return {key:m.key, name:m.name, isMe:!!m.me, running:!!g.running, phase:g.phase, mic:!!m.mic, avatar:m.avatar}; });
}
function cafeUpdate(model){
  cafeModel = model;
  if(!cafe || S.view3d === 'list') return;
  const people = cafePeople(model);
  const sig = JSON.stringify(people);
  if(sig === cafeSig) return;
  cafeSig = sig;
  cafe.setPeople(people);
  cafe.setMode(S.view3d);
}
function cafeTick(now){ if(cafe && S.view3d !== 'list' && now - cafeLastCheck > 1000){ cafeLastCheck = now; cafeUpdate(seatModels()); } }
function cafeStop(){ if(cafe) cafe.stop(); }
function applyViewMode(mode){
  if(mode !== 'top' && mode !== 'first') mode = 'list';
  const ok = cafeAvailable();
  $('#view-modes').hidden = !ok;
  if(mode !== 'list' && !ok) mode = 'list';
  S.view3d = mode; save();
  $$('#view-modes button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.view === mode ? 'true' : 'false'); });
  const wrap = $('#cafe-wrap'), seats = $('#seats');
  if(mode === 'list'){ wrap.hidden = true; seats.hidden = false; cafeStop(); return; }
  if(!cafe){
    try { cafe = CAFE.createScene($('#cafe-canvas'), {mode:mode, rain:true}); }
    catch(e){ console.warn('cafe3d', e); cafe = null; toast('Não consegui abrir o café 3D neste navegador'); S.view3d = 'list'; save(); return applyViewMode('list'); }
  }
  seats.hidden = true; wrap.hidden = false;
  $('#cafe-hint').textContent = mode === 'first' ? 'Arraste para olhar ao redor da sua mesa. Quem está com a caneca fumegando está em foco.' : 'Arraste para girar o café. Quem está com a caneca fumegando está em foco.';
  cafeSig = '';
  cafeUpdate(cafeModel || seatModels());
  cafe.setMode(mode);
  cafe.start();
  requestAnimationFrame(function(){ if(cafe) cafe.resize(); });
}

/* ================= personagem ================= */
const PENDING_AVATAR_KEY = 'studycoffee.avatar.pending';
const AV = {cfg:null, preview:null, slot:'', built:false};
function pendingAvatar(){ try { return normAvatar(JSON.parse(lsGet(PENDING_AVATAR_KEY) || 'null')); } catch(e){ return null; } }
function segButton(box, value, label, onPick){ const b = document.createElement('button'); b.type = 'button'; b.dataset.v = value; b.textContent = label; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', function(){ onPick(value); }); box.appendChild(b); }
function swatch(box, value, label, onPick){ const b = document.createElement('button'); b.type = 'button'; b.className = 'swatch'; b.dataset.v = String(value); b.style.setProperty('--sw', typeof value === 'number' ? CAFE.OPTIONS.skins[value] : value); b.setAttribute('aria-label', label); b.title = label; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', function(){ onPick(value); }); box.appendChild(b); }
function buildAvatarUi(){
  if(AV.built || !CAFE) return;
  AV.built = true;
  const O = CAFE.OPTIONS;
  O.skins.forEach(function(c, i){ swatch($('#av-skin'), i, 'Tom de pele ' + (i + 1), function(v){ AV.cfg.skin = v; avatarChanged(); }); });
  O.hairs.forEach(function(h){ segButton($('#av-hair'), h[0], h[1], function(v){ AV.cfg.hair = v; avatarChanged(); }); });
  O.hairColors.forEach(function(c, i){ swatch($('#av-haircolor'), c, 'Cor de cabelo ' + (i + 1), function(v){ AV.cfg.hairColor = v; avatarChanged(); }); });
  O.shirts.forEach(function(c, i){ swatch($('#av-shirt'), c, 'Camisa ' + (i + 1), function(v){ AV.cfg.shirt = v; avatarChanged(); }); });
  O.accs.forEach(function(a){ segButton($('#av-acc'), a[0], a[1], function(v){ AV.cfg.acc = v; avatarChanged(); }); });
  const sel = $('#av-view'); O.views.forEach(function(v){ const o = document.createElement('option'); o.value = v[0]; o.textContent = v[1]; sel.appendChild(o); });
  sel.addEventListener('change', function(){ AV.cfg.view = sel.value; avatarChanged(); });
  $('#av-random').addEventListener('click', function(){ AV.cfg = randomAvatar(String(Math.random())); avatarChanged(); });
}
function renderAvatarUi(){
  if(!AV.cfg) return;
  $$('#av-skin .swatch').forEach(function(b){ b.setAttribute('aria-pressed', Number(b.dataset.v) === AV.cfg.skin ? 'true' : 'false'); });
  $$('#av-hair button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.v === AV.cfg.hair ? 'true' : 'false'); });
  $$('#av-haircolor .swatch').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.v === AV.cfg.hairColor ? 'true' : 'false'); });
  $$('#av-shirt .swatch').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.v === AV.cfg.shirt ? 'true' : 'false'); });
  $$('#av-acc button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.v === AV.cfg.acc ? 'true' : 'false'); });
  $('#av-view').value = AV.cfg.view;
}
function avatarChanged(){ AV.cfg = normAvatar(AV.cfg) || randomAvatar('x'); renderAvatarUi(); if(AV.preview) AV.preview.setAvatar(AV.cfg); }
function mountAvatar(slot, cfg){
  const el = $('#avatar-builder'), target = $('.avatar-slot[data-slot="' + slot + '"]');
  if(!el || !target || !CAFE) return;
  buildAvatarUi();
  if(el.parentNode !== target) target.appendChild(el);
  el.hidden = false;
  AV.slot = slot;
  AV.cfg = normAvatar(cfg) || randomAvatar(String(Math.random()));
  renderAvatarUi();
  if(cafeAvailable()){
    if(!AV.preview){ try { AV.preview = CAFE.createPreview($('#av-canvas')); } catch(e){ console.warn('preview', e); AV.preview = null; } }
  }
  if(AV.preview){ AV.preview.setAvatar(AV.cfg); AV.preview.start(); requestAnimationFrame(function(){ if(AV.preview) AV.preview.resize(); }); $('#av-nowebgl').hidden = true; }
  else { $('#av-nowebgl').hidden = false; }
}
function unmountAvatar(slot){
  if(slot && AV.slot !== slot) return;
  if(AV.preview) AV.preview.stop();
  const el = $('#avatar-builder'); if(el) el.hidden = true;
  AV.slot = '';
}
function currentAvatarCfg(){ return normAvatar(AV.cfg) || randomAvatar(String(Math.random())); }
async function ensureProfileAvatar(){
  if(!sb || !profile || !uid()) return;
  if(profile.avatar && typeof profile.avatar === 'object') return;
  const a = pendingAvatar() || randomAvatar(uid());
  const {error} = await sb.from('profiles').update({avatar:a}).eq('id', uid());
  if(!error){ profile.avatar = a; lsDel(PENDING_AVATAR_KEY); }
}
async function saveAccountAvatar(){
  const err = $('#av-err'); err.textContent = '';
  if(!sb || !uid()) return;
  const a = currentAvatarCfg(), btn = $('#btn-avatar-save');
  busy(btn, true, 'Salvando…');
  try {
    const {error} = await sb.from('profiles').update({avatar:a}).eq('id', uid());
    if(error){ err.textContent = 'Não consegui salvar o personagem: ' + authErrorText(error); return; }
    profile.avatar = a;
    toast('Personagem salvo');
    renderSeats(); pushPresence();
  } finally { busy(btn, false, true); }
}

function enterRoom(){
  show('room');
  $('#room-code').textContent = S.room;
  $('#sel-subject').value = S.subject;
  $('#sw-auto').checked = S.auto;
  $('#rng-vol').value = String(S.vol);
  renderQuotesUi(); showQuote(false); renderTimer();
  Tasks.load().then(function(){ renderTasks(); renderSeats(); pushPresence(); });
  renderTasks();
  setupVoice();
  renderSeats();
  applyViewMode(S.view3d);
  clearInterval(tickId); tickId = setInterval(tick, 250);
  clearInterval(quoteTimer); quoteTimer = setInterval(function(){ showQuote(true); }, 120000);
  focusAcc = 0; focusLastTick = 0;
  loadRanking();
  clearInterval(rankTimer); rankTimer = setInterval(loadRanking, 60000);
  joinRoom(S.room);
}
function exitRoom(){
  clearInterval(tickId); tickId = 0;
  clearInterval(quoteTimer); quoteTimer = 0;
  clearInterval(rankTimer); rankTimer = 0;
  flushFocus(true);
  cafeStop();
  leaveRoom(); stopRain();
  $('#btn-rain').setAttribute('aria-pressed','false'); $('#btn-rain').textContent = 'Ligar chuva';
  if(T.running){ T.remaining = curRemaining(); T.running = false; }
  ssDel(SESSION_KEY); ssDel(GUEST_SESSION_KEY);
  renderAccess(); show('entry');
}

/* ================= pagamento ================= */
let pay = {mode:'', payment:null, pollId:0, expId:0};
function payShow(part){
  ['pay-loading','pay-mp','pay-manual','pay-error','pay-done'].forEach(function(id){ $('#' + id).hidden = (id !== 'pay-' + part); });
  $('#pay-head').hidden = (part === 'done');
  $('#redeem-box').hidden = (part === 'done');
  if(part === 'done') stopPayPolling();
}
function stopPayPolling(){ clearInterval(pay.pollId); pay.pollId = 0; clearInterval(pay.expId); pay.expId = 0; }
async function payStart(){
  stopPayPolling();
  if(isPaid()){ payShow('done'); return; }
  payShow('loading');
  const r = await callFn('create-pix', {});
  if(!r.ok){
    $('#pay-error-text').textContent = r.status === 0 ? 'Sem conexão com o servidor. Confira sua internet e tente de novo.' : ('Não consegui gerar o Pix agora (' + (r.data.message || r.data.error || r.status) + ').');
    payShow('error'); return;
  }
  const d = r.data;
  if(d.status === 'lifetime'){ profile.lifetime = true; renderAccess(); payShow('done'); return; }
  $('#pay-amount').textContent = String(Math.round(num(+d.amount) || 10));
  if(d.fallback){ pay.mode = 'manual'; renderManual(d); payShow('manual'); return; }
  pay.mode = 'mp'; pay.payment = d;
  renderMp(d);
  payShow('mp');
  pay.pollId = setInterval(pollPix, 6000);
  pay.expId = setInterval(renderExpiry, 1000);
}
function renderMp(d){
  const box = $('#mp-qr');
  box.textContent = '';
  if(d.qr_code_base64){ const img = document.createElement('img'); img.alt = 'QR Code Pix'; img.src = 'data:image/png;base64,' + d.qr_code_base64; box.appendChild(img); box.hidden = false; }
  else if(d.qr_code && typeof window.qrcode === 'function'){ try { const q = window.qrcode(0, 'M'); q.addData(d.qr_code); q.make(); box.innerHTML = q.createSvgTag(4, 4); box.hidden = false; } catch(e){ box.hidden = true; } }
  else { box.hidden = true; }
  $('#mp-code').textContent = d.qr_code || '';
  const st = $('#mp-status'); st.dataset.state = 'wait'; st.textContent = 'Aguardando o pagamento…';
  $('#btn-mp-new').hidden = true;
  renderExpiry();
}
function renderExpiry(){
  const d = pay.payment; if(!d || !d.expires_at) return;
  const left = new Date(d.expires_at).getTime() - Date.now();
  if(left <= 0){
    $('#mp-expires').textContent = 'Este Pix expirou.';
    const st = $('#mp-status'); st.dataset.state = 'bad'; st.textContent = 'Pix expirado. Gere um novo para pagar.';
    $('#btn-mp-new').hidden = false;
    stopPayPolling();
    return;
  }
  $('#mp-expires').textContent = 'Vale por mais ' + fmt(left);
}
async function pollPix(){
  if($('#view-pay').hidden || pay.mode !== 'mp' || !pay.payment) return;
  const r = await callFn('check-pix', {payment_id:pay.payment.payment_id});
  if(!r.ok) return;
  if(r.data.status === 'approved' || r.data.lifetime){ profile.lifetime = true; renderAccess(); payShow('done'); toast('Pagamento confirmado'); }
  else if(r.data.status === 'expired' || r.data.status === 'cancelled' || r.data.status === 'rejected'){
    const st = $('#mp-status'); st.dataset.state = 'bad'; st.textContent = 'Este Pix não vale mais. Gere um novo para pagar.';
    $('#btn-mp-new').hidden = false; stopPayPolling();
  }
}
function payMessage(ref){ return 'Oi, Arthur! Paguei o Study Coffee (R$ ' + moneyBR(PIX.amount) + '). Identificador do Pix: ' + ref + '. Minha conta é ' + (profile ? profile.email : '') + '. Pode liberar meu acesso vitalício?'; }
let manualQr = '';
function renderManual(d){
  const ref = d.pay_ref || (profile && profile.pay_ref) || '';
  const amount = PIX.amount;
  $('#pay-ref').textContent = ref;
  const payload = brcode(ref, amount);
  $('#pix-code').textContent = payload;
  $('#pix-key').textContent = PIX.key;
  const msg = payMessage(ref);
  $('#pay-msg').textContent = msg;
  const wa = $('#lnk-wa'), n = String(CFG.whatsapp || '').replace(/\D/g,'');
  if(n){ wa.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg); wa.hidden = false; } else { wa.hidden = true; }
  if(manualQr !== payload){
    const box = $('#pix-qr');
    try { if(typeof window.qrcode === 'function'){ const q = window.qrcode(0, 'M'); q.addData(payload); q.make(); box.innerHTML = q.createSvgTag(4, 4); box.hidden = false; manualQr = payload; } else { box.hidden = true; } } catch(e){ box.hidden = true; }
  }
}
async function doRedeem(){
  const err = $('#rd-err'); err.textContent = '';
  const code = String($('#rd-code').value || '').trim();
  if(!code){ err.textContent = 'Cole o código que você recebeu.'; return; }
  busy($('#btn-redeem'), true, 'Conferindo…');
  const r = await callFn('redeem-code', {code:code});
  busy($('#btn-redeem'), false, true);
  if(r.ok && r.data.ok){ profile.lifetime = true; renderAccess(); $('#rd-code').value = ''; $('#redeem-box').open = false; onLifetime(); if($('#view-pay').hidden){ toast('Código ativado'); } return; }
  const e = r.data.error;
  err.textContent = e === 'format' ? 'Não reconhecemos este código. Cole o código completo, do SC1 até o final.'
    : e === 'invalid' ? 'Este código não é válido. Confira se copiou tudo ou fale com o Arthur.'
    : e === 'used' ? 'Este código já foi usado em outra conta.'
    : e === 'other_email' ? ('Este código foi emitido para ' + (r.data.email || 'outro e-mail') + '. Entre com essa conta para ativá-lo.')
    : r.status === 0 ? 'Sem conexão com o servidor.' : 'Não consegui ativar agora. Tente de novo em instantes.';
}

/* ================= conta e admin ================= */
function openAccount(){ renderAccess(); const dlg = $('#dlg'); if(!dlg.open){ try { dlg.showModal(); } catch(e){ dlg.setAttribute('open',''); } } }
function closeAccount(){ const dlg = $('#dlg'); try { dlg.close(); } catch(e){ dlg.removeAttribute('open'); } $('#me-avatar-details').open = false; unmountAvatar('account'); }
function cell(tr, text, cls){ const td = document.createElement('td'); if(cls) td.className = cls; td.textContent = text; tr.appendChild(td); return td; }
function tagCell(tr, text, state){ const td = document.createElement('td'); const s = document.createElement('span'); s.className = 'tag'; s.dataset.on = state; s.textContent = text; td.appendChild(s); tr.appendChild(td); }
async function loadAdmin(){
  if(!isAdmin()) return;
  const users = await sb.from('profiles').select('id,email,name,lifetime,lifetime_source,free_left,pay_ref,created_at').order('created_at', {ascending:false}).limit(500);
  const tb = $('#tbl-users tbody'); tb.textContent = '';
  const byId = {};
  (users.data || []).forEach(function(u){
    byId[u.id] = u;
    const tr = document.createElement('tr');
    cell(tr, u.email); cell(tr, u.name || '');
    tagCell(tr, u.lifetime ? ('vitalício' + (u.lifetime_source ? ' · ' + u.lifetime_source : '')) : 'grátis', u.lifetime ? '1' : '0');
    cell(tr, String(u.free_left), 'num'); cell(tr, u.pay_ref || '', 'num'); cell(tr, fmtWhen(u.created_at), 'num');
    tb.appendChild(tr);
  });
  const pays = await sb.from('payments').select('user_id,status,amount,provider_id,created_at').order('created_at', {ascending:false}).limit(300);
  const tp = $('#tbl-pay tbody'); tp.textContent = '';
  (pays.data || []).forEach(function(p){
    const tr = document.createElement('tr');
    cell(tr, fmtWhen(p.created_at), 'num'); cell(tr, byId[p.user_id] ? byId[p.user_id].email : p.user_id);
    cell(tr, 'R$ ' + moneyBR(p.amount), 'num');
    tagCell(tr, p.status, p.status === 'approved' ? '1' : (p.status === 'pending' ? 'pending' : '0'));
    cell(tr, p.provider_id || '', 'num');
    tp.appendChild(tr);
  });
  if(!(pays.data || []).length){ const tr = document.createElement('tr'); cell(tr, 'Nenhum pagamento pelo Mercado Pago ainda.'); tp.appendChild(tr); }
}
async function adminGrant(action){
  const err = $('#ad-err'); err.textContent = '';
  const email = normEmail($('#ad-email').value);
  if(!validEmail(email)){ err.textContent = 'Digite o e-mail do aluno.'; return; }
  busy($('#btn-grant'), true, '…');
  const r = await callFn('admin-grant', {email:email, action:action});
  busy($('#btn-grant'), false, true);
  if(!r.ok){ err.textContent = r.data.error === 'not_found' ? 'Não existe conta com este e-mail.' : ('Não deu: ' + (r.data.message || r.data.error || r.status)); return; }
  toast(action === 'revoke' ? 'Acesso revogado' : 'Acesso vitalício liberado para ' + email);
  $('#ad-email').value = '';
  loadAdmin();
}

/* ================= ligações ================= */
function init(){
  const sub = $('#sel-subject');
  SUBJECTS.forEach(function(s){ const o = document.createElement('option'); o.value = s; o.textContent = s; sub.appendChild(o); });
  $$('select.goal-select').forEach(function(sel){ GOAL_OPTIONS.forEach(function(g){ const o = document.createElement('option'); o.value = g[0]; o.textContent = g[1]; sel.appendChild(o); }); });
  const chips = $('#quote-chips');
  Object.keys(GOALS).forEach(function(k){ const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.dataset.q = k; b.setAttribute('aria-pressed', 'false'); b.textContent = GOALS[k]; chips.appendChild(b); });
  $('#in-room').value = S.room;
  $('#gu-room').value = S.room;
  $('#pix-key').textContent = PIX.key;

  /* mostrar/ocultar senha */
  $$('.pw-toggle').forEach(function(b){
    b.addEventListener('click', function(){
      const input = document.getElementById(b.dataset.for); if(!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      b.setAttribute('aria-pressed', showing ? 'false' : 'true');
      b.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
      b.textContent = showing ? 'Mostrar' : 'Ocultar';
      try { input.focus({preventScroll:true}); } catch(e){}
    });
  });

  /* visitante */
  $('#lnk-guest').addEventListener('click', startGuest);
  $('#lnk-guest-2').addEventListener('click', startGuest);
  $('#guest-form').addEventListener('submit', onGuestEnter);
  $('#lnk-gu-login').addEventListener('click', function(){ leaveGuest('login'); });
  $('#lnk-gu-signup').addEventListener('click', function(){ leaveGuest('signup'); $('#su-name').value = G.name; $('#su-goal').value = G.goal; });

  $('#f-login').addEventListener('submit', function(e){ e.preventDefault(); doLogin(); });
  $('#f-signup').addEventListener('submit', function(e){ e.preventDefault(); doSignup(); });
  $('#f-forgot').addEventListener('submit', function(e){ e.preventDefault(); doForgot(); });
  $('#f-reset').addEventListener('submit', function(e){ e.preventDefault(); doReset(); });
  $('#f-pass').addEventListener('submit', function(e){ e.preventDefault(); doChangePassword(); });
  $$('#auth-tabs button').forEach(function(b){ b.addEventListener('click', function(){ authTab(b.dataset.tab); }); });
  $('#lnk-forgot').addEventListener('click', function(){ $('#fg-email').value = normEmail($('#lg-email').value); authTab('forgot'); });
  $('#btn-forgot-back').addEventListener('click', function(){ authTab('login'); });
  $('#entry-form').addEventListener('submit', onEnter);
  $('#lnk-redeem').addEventListener('click', function(){ show('pay'); payShow('loading'); $('#redeem-box').open = true; payStart(); setTimeout(function(){ try { $('#rd-code').focus(); } catch(e){} }, 50); });

  $('#btn-leave').addEventListener('click', exitRoom);
  $('#btn-mic').addEventListener('click', toggleMic);
  $$('#view-modes button').forEach(function(b){ b.addEventListener('click', function(){ applyViewMode(b.dataset.view); }); });
  $$('#rank-periods button').forEach(function(b){ b.addEventListener('click', function(){ S.rankPeriod = b.dataset.period; save(); loadRanking(); }); });
  $('#f-task').addEventListener('submit', onTaskSubmit);
  $('#focus-done').addEventListener('change', function(){ const f = Tasks.focus(); if(f) Tasks.toggle(f.id); });
  $('#me-avatar-details').addEventListener('toggle', function(){ if($('#me-avatar-details').open) mountAvatar('account', profile && profile.avatar); else unmountAvatar('account'); });
  $('#btn-avatar-save').addEventListener('click', saveAccountAvatar);
  document.addEventListener('visibilitychange', function(){ if(document.hidden){ flushFocus(false); } else if(roomActive){ cafeSig = ''; cafeUpdate(seatModels()); } });
  $('#btn-copy').addEventListener('click', function(){ copyText(S.room, $('#room-code')); });
  $('#btn-start').addEventListener('click', function(){ T.running ? pause() : start(); });
  $('#btn-reset').addEventListener('click', resetPhase);
  $('#btn-skip').addEventListener('click', skip);
  $('#btn-sync').addEventListener('click', adoptSync);
  $$('#phases button').forEach(function(b){ b.addEventListener('click', function(){ setPhase(b.dataset.phase); }); });
  $$('#presets button').forEach(function(b){ b.addEventListener('click', function(){ if(T.running) return; S.preset = b.dataset.preset; save(); T.remaining = dur(T.phase); pushPresence(); renderTimer(); }); });
  sub.addEventListener('change', function(){ S.subject = sub.value; save(); renderSeats(); pushPresence(); });
  $('#sw-auto').addEventListener('change', function(e){ S.auto = e.target.checked; save(); });
  $('#btn-hide-demo').addEventListener('click', function(){ S.demoSeats = false; save(); renderSeats(); });
  $('#sw-quotes').addEventListener('change', function(e){ S.quotesOn = e.target.checked; save(); renderQuotesUi(); if(S.quotesOn) showQuote(false); });
  $$('#quote-chips .chip').forEach(function(c){ c.addEventListener('click', function(){ S.quoteGoal = c.dataset.q; save(); renderQuotesUi(); showQuote(true); }); });
  $('#btn-quote').addEventListener('click', function(){ showQuote(true); });
  $('#btn-rain').addEventListener('click', function(){ const btn = $('#btn-rain'); if(rainSrc){ stopRain(); btn.setAttribute('aria-pressed','false'); btn.textContent = 'Ligar chuva'; } else if(startRain()){ btn.setAttribute('aria-pressed','true'); btn.textContent = 'Desligar chuva'; } else { toast('Seu navegador não liberou o som'); } });
  $('#rng-vol').addEventListener('input', function(e){ S.vol = Number(e.target.value) || 0; save(); if(rainGain && actx){ rainGain.gain.setTargetAtTime(rainLevel(), actx.currentTime, 0.05); } });

  $('#btn-copy-mp').addEventListener('click', function(){ copyText($('#mp-code').textContent, $('#mp-code')); });
  $('#btn-copy-key').addEventListener('click', function(){ copyText(PIX.key, $('#pix-key')); });
  $('#btn-copy-code').addEventListener('click', function(){ copyText($('#pix-code').textContent, $('#pix-code')); });
  $('#btn-copy-msg').addEventListener('click', function(){ copyText($('#pay-msg').textContent, $('#pay-msg')); });
  $('#btn-mp-new').addEventListener('click', payStart);
  $('#btn-pay-retry').addEventListener('click', payStart);
  $('#btn-pay-back').addEventListener('click', function(){ renderAccess(); show('entry'); });
  $('#btn-done-enter').addEventListener('click', function(){ show('entry'); $('#entry-form').requestSubmit ? $('#entry-form').requestSubmit() : $('#btn-enter').click(); });
  $('#f-redeem').addEventListener('submit', function(e){ e.preventDefault(); doRedeem(); });

  $('#btn-account').addEventListener('click', function(){
    if(session){ openAccount(); return; }
    if(!$('#view-room').hidden){ exitRoom(); }
    leaveGuest('login');
    try { $('#lg-email').focus(); } catch(e){}
  });
  $('#dlg-close').addEventListener('click', closeAccount);
  $('#dlg').addEventListener('click', function(e){ if(e.target === $('#dlg')) closeAccount(); });
  $('#btn-logout').addEventListener('click', doLogout);
  $('#btn-me-pay').addEventListener('click', function(){ closeAccount(); show('pay'); payStart(); });
  $('#btn-admin').addEventListener('click', function(){ show('admin'); loadAdmin(); });
  $('#btn-admin-back').addEventListener('click', function(){ show('entry'); });
  $('#btn-admin-refresh').addEventListener('click', loadAdmin);
  $('#f-grant').addEventListener('submit', function(e){ e.preventDefault(); adminGrant('grant'); });
  $('#btn-revoke').addEventListener('click', function(){ adminGrant('revoke'); });
  $('#t-fast').addEventListener('click', function(){
    demoTimer = !demoTimer; T.phase = 'focus'; T.running = false; T.cycle = 0; T.remaining = dur('focus');
    const b = $('#t-fast'); b.setAttribute('aria-pressed', demoTimer ? 'true' : 'false'); b.textContent = 'Pomodoro de 10 segundos: ' + (demoTimer ? 'ligado' : 'desligado');
    pushPresence(); renderTimer(); toast(demoTimer ? 'Pomodoro de teste: 10 s de foco, 5 s de pausa' : 'Duração normal restaurada');
  });
  window.addEventListener('beforeunload', function(){ flushFocus(true); if(voice){ try { voice.dispose(); } catch(e){} } if(roomChan){ try { roomChan.untrack(); } catch(e){} } });

  authTab('login');
  const linkErr = urlAuthError();
  if(linkErr) authMessage(linkErr, 'warn');
  renderAccess();
  show('entry');
  if(sb){
    sb.auth.onAuthStateChange(function(event, s){ setTimeout(function(){ handleSession(s, event); }, 0); });
  }
}
init();
})();
