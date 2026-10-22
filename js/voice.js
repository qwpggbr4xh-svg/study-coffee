/* Study Coffee — microfone da mesa.
   Malha WebRTC entre os presentes, sinalizada pelo broadcast do canal Realtime do Supabase.
   Quem liga o microfone oferece conexão a todos; quem não liga só escuta. Cada pessoa pode silenciar colegas só para si. */
(function(){
'use strict';

const ICE = {iceServers:[{urls:['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']}]};

function create(opts){
  const o = Object.assign({myKey:'', send:function(){}, peers:function(){ return []; }, onChange:function(){}, onAutoplayBlocked:function(){}}, opts || {});
  const pcs = {};          // key -> {pc, audio, makingOffer, ignoreOffer, polite, hasRemote}
  const muted = {};        // key -> true
  let localStream = null;
  let micOn = false;
  let disposed = false;

  function supported(){ return !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function notify(){ try { o.onChange(state()); } catch(e){} }
  function state(){ return {micOn:micOn, peers:Object.keys(pcs).map(function(k){ const p = pcs[k]; return {key:k, connected:p.pc.connectionState === 'connected', hasAudio:p.hasRemote, muted:!!muted[k]}; })}; }

  function entry(key){
    if(pcs[key]) return pcs[key];
    const pc = new RTCPeerConnection(ICE);
    const audio = document.createElement('audio');
    audio.autoplay = true; audio.playsInline = true; audio.setAttribute('playsinline', ''); audio.muted = !!muted[key];
    audio.style.display = 'none';
    document.body.appendChild(audio);
    const e = {pc:pc, audio:audio, makingOffer:false, ignoreOffer:false, polite:String(o.myKey) < String(key), hasRemote:false, key:key};
    pcs[key] = e;
    if(localStream){ localStream.getTracks().forEach(function(t){ pc.addTrack(t, localStream); }); }
    pc.onicecandidate = function(ev){ if(ev.candidate) o.send({to:key, from:o.myKey, type:'ice', candidate:ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate}); };
    pc.ontrack = function(ev){
      const stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
      audio.srcObject = stream; e.hasRemote = true;
      const p = audio.play(); if(p && p.catch) p.catch(function(){ try { o.onAutoplayBlocked(); } catch(err){} });
      notify();
    };
    pc.onnegotiationneeded = async function(){
      try { e.makingOffer = true; await pc.setLocalDescription(); o.send({to:key, from:o.myKey, type:'offer', sdp:pc.localDescription}); }
      catch(err){ console.warn('voice offer', err); }
      finally { e.makingOffer = false; }
    };
    pc.onconnectionstatechange = function(){
      if(pc.connectionState === 'failed' || pc.connectionState === 'closed'){ drop(key); }
      notify();
    };
    return e;
  }
  function drop(key){
    const e = pcs[key]; if(!e) return;
    delete pcs[key];
    try { e.pc.onicecandidate = null; e.pc.ontrack = null; e.pc.onnegotiationneeded = null; e.pc.onconnectionstatechange = null; e.pc.close(); } catch(err){}
    try { e.audio.srcObject = null; e.audio.remove(); } catch(err){}
    notify();
  }
  async function handleSignal(msg){
    if(disposed || !msg || msg.to !== o.myKey || !msg.from || msg.from === o.myKey) return;
    const key = msg.from;
    if(msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice'){
      const e = entry(key), pc = e.pc;
      try {
        if(msg.type === 'offer'){
          const collision = e.makingOffer || pc.signalingState !== 'stable';
          e.ignoreOffer = !e.polite && collision;
          if(e.ignoreOffer) return;
          await pc.setRemoteDescription(msg.sdp);
          await pc.setLocalDescription();
          o.send({to:key, from:o.myKey, type:'answer', sdp:pc.localDescription});
        } else if(msg.type === 'answer'){
          if(pc.signalingState === 'have-local-offer') await pc.setRemoteDescription(msg.sdp);
        } else if(msg.type === 'ice'){
          try { await pc.addIceCandidate(msg.candidate); } catch(err){ if(!e.ignoreOffer) console.warn('voice ice', err); }
        }
      } catch(err){ console.warn('voice signal', err); }
    } else if(msg.type === 'bye'){
      drop(key);
    }
  }
  async function start(){
    if(!supported()) throw new Error('unsupported');
    if(micOn) return true;
    localStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}, video:false});
    micOn = true;
    // conecta a todos os presentes (quem já tem conexão recebe a trilha nova)
    const keys = o.peers().filter(function(k){ return k !== o.myKey; });
    keys.forEach(function(k){
      const e = entry(k);
      localStream.getTracks().forEach(function(t){
        // quem só ouvia tem um transceiver "recvonly": troca a trilha e abre o sentido de envio (gera nova negociação)
        const tr = (e.pc.getTransceivers ? e.pc.getTransceivers() : []).find(function(x){ return x.receiver && x.receiver.track && x.receiver.track.kind === t.kind; }) || null;
        if(tr){ tr.sender.replaceTrack(t); try { if(tr.direction !== 'sendrecv') tr.direction = 'sendrecv'; } catch(err){} return; }
        const s = e.pc.getSenders().find(function(x){ return x.track && x.track.kind === t.kind; });
        if(s){ s.replaceTrack(t); } else { e.pc.addTrack(t, localStream); }
      });
    });
    notify();
    return true;
  }
  function stop(){
    if(!micOn) return;
    micOn = false;
    Object.keys(pcs).forEach(function(k){ pcs[k].pc.getSenders().forEach(function(s){ if(s.track){ try { s.replaceTrack(null); } catch(e){} } }); });
    if(localStream){ localStream.getTracks().forEach(function(t){ t.stop(); }); localStream = null; }
    notify();
  }
  function peerJoined(key){ if(micOn && key !== o.myKey){ entry(key); } }
  function peerLeft(key){ drop(key); }
  function setMuted(key, v){ muted[key] = !!v; if(pcs[key]) pcs[key].audio.muted = !!v; notify(); }
  function isMuted(key){ return !!muted[key]; }
  function unblock(){ Object.keys(pcs).forEach(function(k){ const p = pcs[k].audio.play(); if(p && p.catch) p.catch(function(){}); }); }
  function dispose(){
    disposed = true;
    Object.keys(pcs).forEach(function(k){ try { o.send({to:k, from:o.myKey, type:'bye'}); } catch(e){} drop(k); });
    stop();
  }
  return {supported:supported, start:start, stop:stop, handleSignal:handleSignal, peerJoined:peerJoined, peerLeft:peerLeft, setMuted:setMuted, isMuted:isMuted, unblock:unblock, state:state, dispose:dispose, isOn:function(){ return micOn; }};
}

window.SCVoice = {create:create, supported:function(){ return !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }};
})();
