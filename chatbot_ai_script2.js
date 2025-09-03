console.log("AI Script");
/* =========================
   UTILITIES (logging + fetch)
   ========================= */
const toHeaderObject = (headers) => { const o={}; headers.forEach((v,k)=>o[k]=v); return o; };
const toQueryObject  = (url) => { const out={}, usp=new URL(url).searchParams; usp.forEach((v,k)=>out[k]=v); return out; };
const isJson = (headers) => (headers.get("content-type") || "").includes("application/json");

async function fetchWithDetails(url, options = {}) {
  const start = performance.now();
  const reqMethod  = (options.method || "GET").toUpperCase();
  const reqHeaders = new Headers(options.headers || {});
  const reqBody    = options.body ?? null;

  const res = await fetch(url, {
    method: reqMethod, headers: reqHeaders, body: reqBody,
    credentials: options.credentials || "same-origin",
    mode: options.mode || "cors",
  });

  const resClone = res.clone();
  let responseBody;
  try { responseBody = isJson(res.headers) ? await resClone.json() : await resClone.text(); }
  catch(e){ responseBody = `<!> Failed to read body: ${e.message}`; }

  const details = {
    timing_ms: Math.round(performance.now() - start),
    request: {
      url, url_decoded: decodeURI(url), query_params: toQueryObject(url),
      method: reqMethod, headers: toHeaderObject(reqHeaders),
      body_raw: reqBody,
      body_json: (()=>{ try{return typeof reqBody==="string"?JSON.parse(reqBody):null;}catch{return null;}})(),
    },
    response: { ok: res.ok, status: res.status, status_text: res.statusText, headers: toHeaderObject(res.headers), body: responseBody },
  };

  console.groupCollapsed(`📡 ${reqMethod} ${url} → ${details.response.status} (${details.timing_ms}ms)`);
  console.log("Request:", details.request); console.log("Response:", details.response); console.groupEnd();
  window.lastRequestDetails = details;
  return details;
}

/* ===============
   SIMPLE HELPERS
   =============== */
function uid(){ return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
function getSessionId(){
  const key="chat_session_id"; let sid=localStorage.getItem(key);
  if(!sid){ sid=uid(); localStorage.setItem(key,sid); }
  return sid;
}
function getQueryParam(name){ return new URL(window.location.href).searchParams.get(name); }
function validEmail(str){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str); }

/* =========================
   UI: WIDGET CONSTRUCTION
   ========================= */
const chatToggle = document.createElement("button");
chatToggle.innerText = "💬";
chatToggle.className = "btn";
chatToggle.style.cssText = `
  position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;
  border:none;background:#2563eb;color:#fff;font-size:28px;z-index:1000;
  font-family:'Poppins',sans-serif;box-shadow:0 6px 14px rgba(0,0,0,.25);transition:all .2s;`;
chatToggle.onmouseover = () => chatToggle.style.transform = "scale(1.1)";
chatToggle.onmouseout  = () => chatToggle.style.transform = "scale(1)";
document.body.appendChild(chatToggle);

const chatContainer = document.createElement("div");
chatContainer.style.cssText = `
  position:fixed;bottom:90px;right:20px;width:380px;height:520px;background:#fff;border-radius:20px;
  box-shadow:0 10px 25px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;z-index:999;
  font-family:'Poppins',sans-serif;`;
document.body.appendChild(chatContainer);

// Header
const header = document.createElement("div");
header.style.cssText = `
  padding:16px;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;font-weight:600;
  display:flex;justify-content:space-between;align-items:center;font-size:16px;letter-spacing:.3px;`;
header.innerHTML = `<span>🤖 Chatbot • AI Agent <span id="who" class="chip" style="display:none"></span></span>`;
const closeBtn = document.createElement("button");
closeBtn.innerText = "×";
closeBtn.className = "btn";
closeBtn.style.cssText = `background:none;border:none;color:#fff;font-size:22px;font-weight:600`;
header.appendChild(closeBtn);
chatContainer.appendChild(header);

// Messages
const messages = document.createElement("div");
messages.style.cssText = `flex:1;overflow-y:auto;padding:14px;background:#f9fafb;`;
chatContainer.appendChild(messages);

// Input
const inputWrapper = document.createElement("div");
inputWrapper.style.cssText = `display:flex;align-items:center;padding:10px;border-top:1px solid #eee;background:#fff;`;
const input = document.createElement("input");
input.className = "field";
input.type = "text";
input.placeholder = "Reply to Chatbot...";
input.style.borderRadius = "25px";
const sendBtn = document.createElement("button");
sendBtn.innerText = "➤";
sendBtn.className = "submit";
sendBtn.style.cssText = `
  margin-left:8px;width:42px;height:42px;border-radius:50%;box-shadow:0 3px 8px rgba(37,99,235,.4)`;
inputWrapper.appendChild(input); inputWrapper.appendChild(sendBtn);
chatContainer.appendChild(inputWrapper);

/* =========================
   UI: MESSAGES / TYPING
   ========================= */
function addMessage(text, sender="user"){
  const wrap = document.createElement("div");
  wrap.style.cssText = "margin-bottom:14px;display:flex;align-items:flex-start;gap:8px;";

  if(sender==="bot" || sender==="typing"){
    const avatar = document.createElement("div");
    avatar.textContent = "🤖"; avatar.style.cssText = "font-size:20px;margin-top:4px;"; wrap.appendChild(avatar);

    const content = document.createElement("div");
    if(sender==="bot"){
      const label = document.createElement("div");
      label.textContent = "AI Agent";
      label.style.cssText = "font-size:12px;color:#666;margin-bottom:3px;font-weight:500;";
      content.appendChild(label);
    }
    const bubble = document.createElement("div");
    bubble.style.cssText = `
      background:#f3f4f6;padding:12px 16px;border-radius:16px;max-width:75%;
      font-size:14px;color:#111;line-height:1.4;box-shadow:0 2px 5px rgba(0,0,0,.08);`;

    if(sender==="typing"){
      bubble.innerHTML = `
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:blink 1s infinite;"></span>
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#9ca3af;margin:0 6px;animation:blink 1s .15s infinite;"></span>
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:blink 1s .3s infinite;"></span>`;
      wrap.dataset.typing="true";
    } else {
      bubble.innerHTML = text; // render bot HTML
    }
    content.appendChild(bubble); wrap.appendChild(content);
  } else {
    wrap.style.justifyContent = "flex-end";
    const bubble = document.createElement("div");
    bubble.textContent = text; // user is plain text
    bubble.style.cssText = `
      background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;padding:12px 16px;border-radius:16px;
      max-width:75%;font-size:14px;line-height:1.4;box-shadow:0 2px 5px rgba(0,0,0,.2)`;
    wrap.appendChild(bubble);
  }

  messages.appendChild(wrap); messages.scrollTop = messages.scrollHeight;
  return wrap;
}

function attachDebugBlock(parentMsgEl, details){
//   const container = document.createElement("div"); container.style.cssText="margin-top:8px;font-size:12px;color:#374151;";
//   const toggle = document.createElement("a"); toggle.href="javascript:void(0)"; toggle.textContent="View request/response details";
//   toggle.style.cssText="text-decoration:underline;display:inline-block;margin-top:6px;";
//   const pre = document.createElement("pre"); pre.style.cssText="display:none;background:#111827;color:#e5e7eb;padding:10px;border-radius:10px;max-width:75%;overflow:auto;";
//   pre.textContent = JSON.stringify(details,null,2);
//   toggle.addEventListener("click",()=> pre.style.display = pre.style.display==="none"?"block":"none");
//   container.appendChild(toggle); container.appendChild(pre);

//   const bubble = parentMsgEl.querySelector("div > div:last-child");
//   if(bubble) bubble.appendChild(container);
}

/* ==============================================
   NEW: IDENTITY CAPTURE (name/email via localStorage)
   ============================================== */
function getIdentity(){
  return {
    user_name:  localStorage.getItem("chat_user_name")  || null,
    user_email: localStorage.getItem("chat_user_email") || null,
  };
}

function setIdentity(name, email){
  localStorage.setItem("chat_user_name", name);
  localStorage.setItem("chat_user_email", email);
  const badge = document.getElementById("who");
  if (badge){ badge.textContent = name; badge.style.display = "inline-block"; }
}

function ensureUserIdentity(){
  return new Promise((resolve)=>{
    const {user_name, user_email} = getIdentity();
    if (user_name && user_email){
      setIdentity(user_name, user_email);
      resolve({user_name, user_email});
      return;
    }

    // Ask for details
    const formWrap = addMessage("", "bot");
    const formHtml = `
      <h3 style="margin:0 0 8px 0;">Let’s get to know you</h3>
      <p style="margin:0 0 10px 0;color:#374151">Please share your name and email to continue.</p>
      <input id="id_name" class="field" type="text" placeholder="Your name" />
      <input id="id_email" class="field" type="email" placeholder="you@example.com" />
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
        <button id="id_submit" class="submit">Save & Continue</button>
        <span id="id_error" class="error" style="display:none"></span>
      </div>
    `;
    formWrap.querySelector("div > div:last-child").innerHTML = formHtml;

    const nameEl  = formWrap.querySelector("#id_name");
    const emailEl = formWrap.querySelector("#id_email");
    const btn     = formWrap.querySelector("#id_submit");
    const err     = formWrap.querySelector("#id_error");

    btn.addEventListener("click", ()=>{
      const n = (nameEl.value || "").trim();
      const e = (emailEl.value || "").trim();
      if(!n){ err.textContent="Please enter your name."; err.style.display="inline"; return; }
      if(!validEmail(e)){ err.textContent="Please enter a valid email."; err.style.display="inline"; return; }
      err.style.display="none";

      setIdentity(n, e);
      // Replace the form with a confirmation
      formWrap.querySelector("div > div:last-child").innerHTML =
        `<p>Thanks, <strong>${n}</strong>! You're all set ✅</p>`;
      resolve({user_name:n, user_email:e});
    });
  });
}

/* =========================
   API CALL (integrated) API url
   ========================= */
//const API_BASE = "https://anonivate-chatbot.onrender.com";
const API_BASE = "https://chatbot-j42r.onrender.com/chat";
let brandname = 'Anoni';
const scripts = document.querySelectorAll('script[brandname]');
scripts.forEach(script => {
  const brand = script.getAttribute('brandname');
  if(brand){
      brandname = brand;
  }
});

async function sendToAPI(userText, identity){
 // const websiteUrl = getQueryParam("website_url");
 const websiteUrl = window.location.origin;
  const endpoint = websiteUrl ? `${API_BASE}?website_url=${encodeURIComponent(websiteUrl)}` : API_BASE;

  const payload = {
    message: userText,
    assistant_name: brandname,
    session_id: getSessionId(),
    user_email: identity.user_email,
    user_name:  identity.user_name,
  };

  const details = await fetchWithDetails(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const replyHtml =
    (details.response && details.response.body && details.response.body.response)
      ? details.response.body.response
      : (typeof details.response.body === "string" ? details.response.body : "⚠️ No response field found.");

  return { replyHtml, details };
}

/* =========================
   EVENTS & FLOW
   ========================= */
let sending = false;
let identityReady = false;
let identity = null;

async function openChat(){
  const isOpen = chatContainer.style.display === "flex";
  chatContainer.style.display = isOpen ? "none" : "flex";
  if (!isOpen) {
    // Ensure identity once per session (first open)
    if (!identityReady){
      identity = await ensureUserIdentity();
      identityReady = true;
      addMessage(`Hi ${identity.user_name}! 👋, My name is ${brandname}. How can I help today?`, "bot");
    }
    input.focus();
  }
}

async function handleSend(){
  const text = input.value.trim();
  if(!text || sending) return;

  // if user bypassed identity (rare), ensure here too
  if(!identityReady){ identity = await ensureUserIdentity(); identityReady = true; }

  addMessage(text, "user");
  input.value = "";

  const typingEl = addMessage("", "typing");

  try{
    sending = true; setInputDisabled(true);
    const { replyHtml, details } = await sendToAPI(text, identity);
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    const botMsgEl = addMessage(replyHtml, "bot");
    attachDebugBlock(botMsgEl, details);
  }catch(err){
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    addMessage("⚠️ Sorry, I couldn't reach the server. Please try again.", "bot");
    console.error(err);
  }finally{
    sending = false; setInputDisabled(false);
  }
}

function setInputDisabled(state){
  input.disabled = state; sendBtn.disabled = state;
  input.style.opacity = state ? ".6" : "1"; sendBtn.style.opacity = state ? ".6" : "1";
  if(!state) input.focus();
}

// open/close + events
chatToggle.addEventListener("click", openChat);
closeBtn.addEventListener("click", ()=> chatContainer.style.display="none");
sendBtn.addEventListener("click", handleSend);
input.addEventListener("keydown",(e)=>{ if(e.key==="Enter") handleSend(); });

// If identity already exists, reflect in header chip immediately
(function primeIdentityBadge(){
  const {user_name, user_email} = getIdentity();
  if (user_name && user_email) setIdentity(user_name, user_email);
})();
  
