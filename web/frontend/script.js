const API = "";

/* ── Auth ────────────────────────────────────────────────────────── */
const getToken = () => localStorage.getItem('cp_token');
const getUser = () => JSON.parse(localStorage.getItem('cp_user') || 'null');

// ── Role Permissions ──────────────────────────────────────────────
const ROLE_TABS = {
    'Admin': ['trace', 'verify', 'search', 'reports', 'iot', 'admin'],
    'Manufacturer': ['trace', 'verify', 'register', 'transfer', 'search', 'reports', 'iot'],
    'Logistics': ['trace', 'verify', 'transfer', 'search', 'reports', 'iot'],
    'Retailer': ['trace', 'verify', 'transfer', 'search', 'reports', 'iot'],
    'Consumer': ['trace', 'verify', 'search'],
};

const TAB_BTN = {
    'trace': '[onclick*="\'trace\'"]',
    'verify': '[onclick*="\'verify\'"]',
    'register': '[onclick*="\'register\'"]',
    'transfer': '[onclick*="\'transfer\'"]',
    'search': '[onclick*="\'search\'"]',
    'reports': '[onclick*="\'reports\'"]',
    'iot': '[onclick*="\'iot\'"]',
    'admin': '#tab-admin',
};

function applyRolePermissions(role) {
    const allowed = ROLE_TABS[role] || ['trace', 'verify', 'search'];
    Object.entries(TAB_BTN).forEach(([tab, sel]) => {
        const btns = document.querySelectorAll(sel);
        btns.forEach(btn => {
            if (allowed.includes(tab)) {
                btn.style.display = '';
            } else {
                btn.style.display = 'none';
            }
        });
    });

    const regBtnWelcome = document.getElementById('welcome-register-btn');
    if (regBtnWelcome) {
        if (allowed.includes('register')) {
            regBtnWelcome.style.display = 'inline-block';
        } else {
            regBtnWelcome.style.display = 'none';
        }
    }

    const ds = document.getElementById('delivered-section');
    if (ds) ds.style.display = 'none'; // Hide checkbox completely

    // Dynamic Text for Retailer
    const transferTab = document.querySelector('[onclick*="\'transfer\'"]');
    const transferTitle = document.querySelector('#sec-transfer .section-title');
    const transferDesc = document.querySelector('#sec-transfer .section-desc');
    const transferBtn = document.getElementById('btn-transfer');

    if (role === 'Retailer') {
        if (transferTab) transferTab.textContent = 'Confirm Delivery';
        if (transferTitle) transferTitle.textContent = 'Confirm Delivery to Consumer';
        if (transferDesc) transferDesc.textContent = 'Mark the product as delivered to finalize its journey on the blockchain.';
        if (transferBtn) {
            transferBtn.textContent = '✅ Confirm Delivery';
            transferBtn.style.background = 'var(--green)';
        }
    } else {
        if (transferTab) transferTab.textContent = 'Record Transfer';
        if (transferTitle) transferTitle.textContent = 'Record Ownership Transfer';
        if (transferDesc) transferDesc.textContent = 'Log a transfer event between supply chain parties. All data is permanently recorded on the ledger.';
        if (transferBtn) {
            transferBtn.innerHTML = '🚚 Record Transfer';
            transferBtn.style.background = '';
        }
    }

    // Show role badge
    const badges = {
        'Admin': { label: '👑 Admin', color: '#7c3aed' },
        'Manufacturer': { label: '🏭 Manufacturer', color: '#0891b2' },
        'Logistics': { label: '🚚 Logistics', color: '#0369a1' },
        'Retailer': { label: '🏪 Retailer', color: '#059669' },
        'Consumer': { label: '👤 Consumer', color: '#64748b' },
    };
    const badge = badges[role] || { label: role, color: '#64748b' };
    const pill = document.getElementById('user-pill');
    if (pill) {
        pill.title = 'Role: ' + role;
        pill.style.background = badge.color + '22';
        pill.style.color = badge.color;
        pill.style.border = '1px solid ' + badge.color + '44';
    }
    // After permissions applied, switch to first allowed tab
    const firstTab = document.querySelector('[onclick*="\'' + allowed[0] + '\'"]');
    if (firstTab && !document.querySelector('.tab.active')) {
        firstTab.click();
    }
}

window.goToLandingPage = function() {
    localStorage.setItem('forceHome', 'true');
    checkAuth();
};

window.goToTrace = function() {
    if (getToken()) {
        localStorage.removeItem('forceHome');
        checkAuth();
        const traceBtn = document.querySelector('[onclick*="\'trace\'"]');
        if (traceBtn) switchTab('trace', traceBtn);
    } else {
        showAuthModal('login');
    }
};

window.goToVerify = function() {
    if (getToken()) {
        localStorage.removeItem('forceHome');
        checkAuth();
        const verifyBtn = document.querySelector('[onclick*="\'verify\'"]');
        if (verifyBtn) switchTab('verify', verifyBtn);
    } else {
        showAuthModal('login');
    }
};

window.goToDashboard = function() {
    localStorage.removeItem('forceHome');
    checkAuth();
};

function checkAuth() {
    const overlay = document.getElementById('login-overlay');
    const lp = document.getElementById('landing-page');
    const dash = document.getElementById('app-dashboard');
    const forceHome = localStorage.getItem('forceHome') === 'true';

    const loginBtn = document.getElementById('top-login-btn');
    const signupBtn = document.getElementById('top-signup-btn');
    const lpDash = document.getElementById('lp-nav-dashboard');
    
    if (loginBtn) {
        if (getToken()) {
            loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (lpDash) lpDash.style.display = 'inline-block';
        } else {
            loginBtn.style.display = 'inline-block';
            loginBtn.textContent = 'Log In';
            loginBtn.onclick = function() { showAuthModal('login'); };
            if (signupBtn) signupBtn.style.display = 'inline-flex';
            if (lpDash) lpDash.style.display = 'none';
        }
    }

    if (!getToken() || forceHome) { 
        if(lp) lp.style.display = 'flex';
        if(dash) dash.style.display = 'none';
        if(overlay) overlay.style.display = 'none';
        return false; 
    }

    if(overlay) overlay.style.display = 'none';
    if(lp) lp.style.display = 'none';
    if(dash) dash.style.display = 'block';

    const u = getUser();
    if (u) {
        if (document.getElementById('user-pill-dash')) {
             document.getElementById('user-pill-dash').textContent = u.name + ' (' + u.role + ')';
        } else if (document.getElementById('user-pill')) {
             document.getElementById('user-pill').textContent = u.name + ' (' + u.role + ')';
        }
        if (document.getElementById('welcome-name')) {
            document.getElementById('welcome-name').textContent = u.name;
        }
        
        // Manufacturer auto-fill
        const r_manu = document.getElementById('r_manu');
        if (r_manu) {
            r_manu.value = u.company || u.name;
            r_manu.readOnly = true;
            r_manu.style.background = '#e2e8f0'; // make it look disabled
        }
        
        applyRolePermissions(u.role);
    }
    return true;
}

// Global helper to open auth modal from the landing page
window.showAuthModal = function(tab) {
    document.getElementById('login-overlay').style.display = 'flex';
    if(typeof showAuthTab === 'function') showAuthTab(tab);
};


async function fetchAuth(url, opts = {}) {
    opts.headers = { ...opts.headers, 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' };
    const r = await fetch(url, opts);
    if (r.status === 401) { localStorage.clear(); checkAuth(); throw new Error('Session expired.'); }
    return r;
}

function showAuthTab(tab) {
    document.getElementById('auth-login').style.display = tab === 'login' ? '' : 'none';
    document.getElementById('auth-register').style.display = tab === 'register' ? '' : 'none';
    document.querySelectorAll('.auth-tab-btn').forEach(b =>
        b.classList.toggle('active', b.textContent.toLowerCase().includes(tab === 'login' ? 'sign' : 'create'))
    );
    if (tab === 'register') {
        loadCompaniesDropdown();
    }
}

async function loadCompaniesDropdown() {
    try {
        const r = await fetch(API + '/api/companies');
        const comps = await r.json();
        const sel = document.getElementById('ru_company');
        const roleSel = document.getElementById('ru_role');
        const compField = document.getElementById('ru_company_field');
        const currentRole = roleSel ? roleSel.value : '';
        
        if (compField) {
            if (currentRole === 'Consumer' || currentRole === 'Admin') {
                compField.style.display = 'none';
            } else {
                compField.style.display = 'block';
            }
        }

        if (sel) {
            const filtered = comps.filter(c => !currentRole || c.role === currentRole);
            sel.innerHTML = '<option value="">Select your company</option>' + 
                            filtered.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
    } catch(e){}
}

async function doLogin() {
    const userID = document.getElementById('l_userid').value.trim();
    const pass = document.getElementById('l_pass').value;
    document.getElementById('l_err').textContent = '';
    if (!userID || !pass) { document.getElementById('l_err').textContent = 'Please enter User ID and password.'; return; }
    document.getElementById('btn-login').disabled = true;
    try {
        const r = await fetch(API + '/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID, password: pass })
        });
        const d = await r.json();
        if (d.error) { document.getElementById('l_err').textContent = d.error; return; }
        localStorage.setItem('cp_token', d.token);
        localStorage.setItem('cp_user', JSON.stringify(d.user));
        checkAuth(); pollNotifications();
    } catch (e) { document.getElementById('l_err').textContent = 'Cannot connect to server.'; }
    finally { document.getElementById('btn-login').disabled = false; }
}

async function doRegisterUser() {
    const body = {
        userID: document.getElementById('ru_id').value.trim(),
        name: document.getElementById('ru_name').value.trim(),
        email: document.getElementById('ru_email').value.trim(),
        role: document.getElementById('ru_role').value,
        company: (document.getElementById('ru_company') ? document.getElementById('ru_company').value : ''),
        password: document.getElementById('ru_pass').value
    };
    document.getElementById('ru_err').textContent = '';
    if (!body.userID || !body.name || !body.email || !body.password) {
        document.getElementById('ru_err').textContent = 'All fields are required.'; return;
    }
    if (body.role !== 'Admin' && body.role !== 'Consumer' && !body.company) {
        document.getElementById('ru_err').textContent = 'Please select a company.'; return;
    }
    if (body.name.length < 2) {
        document.getElementById('ru_err').textContent = 'Name must be at least 2 characters long.'; return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
        document.getElementById('ru_err').textContent = 'Please enter a valid email address.'; return;
    }
    document.getElementById('btn-reg-user').disabled = true;
    try {
        const r = await fetch(API + '/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const d = await r.json();
        if (d.error) { document.getElementById('ru_err').textContent = d.error; return; }
        
        let msg = 'Account created! You can now sign in as "' + body.userID + '".';
        if (body.role !== 'Consumer' && body.role !== 'Admin') {
            msg = 'Registration successful! Since you registered as a ' + body.role + ', your account is pending Admin approval. You will be able to log in once an administrator enables your account.';
        }
        alert(msg);
        showAuthTab('login');
    } catch (e) { document.getElementById('ru_err').textContent = 'Cannot connect to server.'; }
    finally { document.getElementById('btn-reg-user').disabled = false; }
}

async function doLogout() {
    try { await fetchAuth(API + '/api/auth/logout', { method: 'POST' }); } catch { }
    localStorage.clear(); checkAuth();
}

/* ── Tabs ─────────────────────────────────────────────────────────── */
function switchTab(name, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    if(el) el.classList.add('active');
    const sec = document.getElementById('sec-' + name);
    if(sec) sec.classList.add('active');
    if (name === 'admin') loadAdmin();
    if (name === 'reports') loadReports();
    if (name === 'transfer') loadTransferUsers();
}

async function loadTransferUsers() {
    if (!checkAuth()) return;
    const u = getUser();
    if (!u) return;
    
    let targetRole = [];
    if (u.role === 'Manufacturer') targetRole = ['Logistics'];
    else if (u.role === 'Logistics') targetRole = ['Logistics', 'Retailer'];
    else if (u.role === 'Admin') targetRole = ['All']; // Admin can transfer to anyone
    
    const ownerSelect = document.getElementById('t_owner');
    const wrapOwner = document.getElementById('wrap_t_owner');
    const batchList = document.getElementById('batch_list');
    
    if (u.role === 'Retailer') {
        if (wrapOwner) wrapOwner.style.display = 'none'; // Hide New Owner completely
        ownerSelect.innerHTML = '<option value="Consumer">End Customer / Final Store</option>';
    } else {
        if (wrapOwner) wrapOwner.style.display = 'flex';
        try {
            const r = await fetch(API + '/api/companies');
            const companies = await r.json();
            
            ownerSelect.innerHTML = '<option value="">Select Target Company</option>';
            
            companies.forEach(comp => {
                // Filter companies based on allowed target roles
                if (targetRole.includes('All') || targetRole.includes(comp.role)) {
                    // Prevent transferring to own company
                    if (comp.name !== u.company) {
                        const opt = document.createElement('option');
                        opt.value = comp.name;
                        opt.textContent = comp.name + ' (' + comp.role + ')';
                        ownerSelect.appendChild(opt);
                    }
                }
            });
        } catch(e) {
            console.error('Failed to load companies for transfer', e);
        }
    }

    // Populate the Batch Datalist with products they own
    try {
        const pr = await fetchAuth(API + '/api/products');
        const prods = await pr.json();
        if (batchList) {
            batchList.innerHTML = ''; // clear old options
            prods.forEach(p => {
                // Determine if user owns the product (by individual ID or Company Name)
                const isOwner = p.currentOwner === u.company || p.currentOwner === u.userID || p.currentOwner === u.name;
                const isManu = (u.role === 'Manufacturer' && p.status === 'Registered' && (p.manufacturer === u.company || p.manufacturer === u.userID || p.manufacturer === u.name));
                
                if (u.role === 'Admin' || isOwner || isManu) {
                    if (p.status !== 'Delivered') {
                        const opt = document.createElement('option');
                        opt.value = p.batchID;
                        opt.textContent = p.productName;
                        batchList.appendChild(opt);
                    }
                }
            });
            
            // Add listener to auto-fill number of batches
            const batchInput = document.getElementById('t_batch');
            const batchesInput = document.getElementById('t_batches');
            batchInput.addEventListener('input', () => {
                const selected = prods.find(p => p.batchID === batchInput.value);
                if (selected && selected.numberOfBatches) {
                    batchesInput.value = selected.numberOfBatches;
                } else {
                    batchesInput.value = '';
                }
            });
        }
    } catch(e) {
        console.error('Failed to load products', e);
    }
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function setLoading(id, on) {
    const b = document.getElementById(id); if (!b) return;
    if (on) { b._txt = b.innerHTML; b.innerHTML = '<div class="spinner"></div> Loading...'; b.disabled = true; }
    else { b.innerHTML = b._txt; b.disabled = false; }
}
function showBox(wId, bId, pId, data, ok) {
    document.getElementById(wId).className = 'result-wrap show';
    const bar = document.getElementById(bId);
    bar.className = 'result-bar ' + (ok ? 'success' : 'error');
    bar.textContent = ok ? '✅ Success' : '❌ Error';
    document.getElementById(pId).textContent = JSON.stringify(data, null, 2);
}

/* ── Trace ────────────────────────────────────────────────────────── */
async function doTrace() {
    const id = document.getElementById('trace_id').value.trim();
    if (!id) return alert('Please enter a Batch ID.');
    setLoading('btn-trace', true);
    document.getElementById('trace-output').className = 'product-info';
    document.getElementById('trace-error').className = 'result-wrap';
    try {
        const r = await fetch(API + '/api/trace/' + encodeURIComponent(id));
        const d = await r.json();
        if (d.error) {
            document.getElementById('trace-error').className = 'result-wrap show';
            document.getElementById('trace-error-bar').textContent = '❌ ' + d.error;
            document.getElementById('trace-error-pre').textContent = JSON.stringify(d, null, 2);
        } else { renderProduct(d); }
    } catch (e) {
        document.getElementById('trace-error').className = 'result-wrap show';
        document.getElementById('trace-error-bar').textContent = '❌ Cannot connect to API';
        document.getElementById('trace-error-pre').textContent = e.message;
    }
    setLoading('btn-trace', false);
}

function renderProduct(d) {
    document.getElementById('t-name').textContent = d.productName;
    document.getElementById('t-id').textContent = 'Batch ID: ' + d.batchID;
    document.getElementById('t-mfr').textContent = d.manufacturer;
    document.getElementById('t-batches').textContent = d.numberOfBatches ? d.numberOfBatches : '1';
    document.getElementById('t-date').textContent = d.productionDate;
    document.getElementById('t-owner').textContent = d.currentOwner;
    document.getElementById('t-txcount').textContent = (d.transactions?.length || 0) + ' events';
    const limitMaxTemp = d.limits?.maxTemp ?? 30;
    const limitMinTemp = d.limits?.minTemp !== null && d.limits?.minTemp !== undefined ? d.limits.minTemp : 'No Min';
    document.getElementById('t-templim').textContent = limitMinTemp + ' - ' + limitMaxTemp + ' °C';

    const limitMaxHum = d.limits?.maxHum ?? 85;
    const limitMinHum = d.limits?.minHum !== null && d.limits?.minHum !== undefined ? d.limits.minHum : '0';
    document.getElementById('t-humlim').textContent = limitMinHum + ' - ' + limitMaxHum + ' %';
    
    const map = { 'Registered': 'status-registered', 'In Transit': 'status-transit', 'Delivered': 'status-delivered', 'Alert': 'status-alert' };
    const cls = map[d.status] || 'status-registered';
    document.getElementById('t-status-pill').innerHTML =
        '<span class="status-pill ' + cls + '"><span class="dot"></span> ' + (d.status === 'Alert' ? '🔴 Alert' : d.status) + '</span>';
    const tl = document.getElementById('t-timeline');
    if (!d.transactions || d.transactions.length === 0) {
        tl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No transfers recorded yet.</p></div>';
    } else {
        tl.innerHTML = d.transactions.map(tx => {
            const s = new Date(tx.timestamp).toLocaleString('en-US',
                { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return '<div class="tl-item"><div class="tl-dot"></div><div class="tl-card">'
                + '<div class="tl-header"><span class="tl-route"><strong>' + tx.from + '</strong> → <strong>' + tx.to + '</strong></span>'
                + '<span class="tl-time">🕐 ' + s + '</span></div>'
                + '<div class="tl-chips"><span class="chip">📍 ' + tx.location + '</span>'
                + '<span class="chip">🌡️ ' + tx.temperature + '°C</span></div>'
                + '</div></div>';
        }).join('');
    }

    const alertWrap = document.getElementById('t-alert-reason');
    const alertText = document.getElementById('t-alert-text');
    if (d.status === 'Alert') {
        let reason = 'System Alert Triggered';
        
        const LMaxTemp = d.limits?.maxTemp !== undefined && d.limits?.maxTemp !== null ? d.limits.maxTemp : 30;
        const LMinTemp = d.limits?.minTemp ?? null;
        const LMaxHum = d.limits?.maxHum !== undefined && d.limits?.maxHum !== null ? d.limits.maxHum : 85;
        const LMinHum = d.limits?.minHum ?? null;

        const alertTxs = (d.transactions || []).filter(tx => {
            const v = parseFloat(tx.temperature);
            if(isNaN(v)) return false;
            return (v > LMaxTemp || (LMinTemp !== null && v < LMinTemp));
        });
        
        const alertIot = (d.iotReadings || []).filter(r => {
            const v = parseFloat(r.value);
            if(isNaN(v)) return false;
            if (r.sensorType.toLowerCase() === 'temperature') return (v > LMaxTemp || (LMinTemp !== null && v < LMinTemp));
            if (r.sensorType.toLowerCase() === 'humidity') return (v > LMaxHum || (LMinHum !== null && v < LMinHum));
            return false;
        });

        if (alertTxs.length > 0) {
            const tx = alertTxs[alertTxs.length - 1];
            reason = 'Temperature violated: ' + tx.temperature + '°C during transfer in ' + tx.location;
        } else if (alertIot.length > 0) {
            const r = alertIot[alertIot.length - 1];
            reason = 'Critical IoT Alert: ' + r.sensorType + ' = ' + r.value + r.unit + ' (' + r.deviceID + ')';
        }
        alertText.textContent = reason;
        alertWrap.style.display = 'block';
    } else {
        alertWrap.style.display = 'none';
    }

    const iotWrap = document.getElementById('iot-history-wrap');
    const iotTl = document.getElementById('t-iot-timeline');
    if (!d.iotReadings || d.iotReadings.length === 0) {
        iotWrap.style.display = 'none';
    } else {
        iotWrap.style.display = 'block';
        iotTl.innerHTML = d.iotReadings.map(r => {
            const s = new Date(r.timestamp).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const icon = r.sensorType.toLowerCase() === 'temperature' ? '🌡️' : r.sensorType.toLowerCase() === 'humidity' ? '💧' : '📡';
            
            const limitMaxTemp = d.limits?.maxTemp ?? 30;
            const limitMinTemp = d.limits?.minTemp ?? null;
            const limitMaxHum = d.limits?.maxHum ?? 85;
            const limitMinHum = d.limits?.minHum ?? null;
            
            const val = parseFloat(r.value);
            let isAlert = false;
            
            if (r.sensorType.toLowerCase() === 'temperature') {
                if (val > limitMaxTemp || (limitMinTemp !== null && val < limitMinTemp)) isAlert = true;
            } else if (r.sensorType.toLowerCase() === 'humidity') {
                if (val > limitMaxHum || (limitMinHum !== null && val < limitMinHum)) isAlert = true;
            }

            return '<div class="tl-item"><div class="tl-dot" style="' + (isAlert ? 'background:var(--red);box-shadow:0 0 0 2px #fecaca;' : '') + '"></div><div class="tl-card" style="' + (isAlert ? 'border-color:#fca5a5;background:var(--red-lt);' : '') + '">'
                + '<div class="tl-header"><span class="tl-route" style="' + (isAlert ? 'color:var(--red)' : '') + '"><strong>' + r.deviceID + '</strong></span>'
                + '<span class="tl-time">🕐 ' + s + '</span></div>'
                + '<div class="tl-chips"><span class="chip" style="' + (isAlert ? 'border-color:#fca5a5;color:var(--red)' : '') + '">' + icon + ' ' + r.sensorType + ': ' + r.value + r.unit + '</span></div>'
                + '</div></div>';
        }).join('');
    }

    document.getElementById('trace-output').className = 'product-info show';
}

/* ── Verify ───────────────────────────────────────────────────────── */
window.handleInternalQrImage = async function(file) {
    if (!file) return;
    const html5QrCode = new Html5Qrcode('qr-reader');
    try {
        const decodedText = await html5QrCode.scanFile(file, true);
        document.getElementById('verify_id').value = decodedText;
        doVerify();
    } catch (err) {
        alert('❌ Could not read a valid QR code from the image. Please try another image that is clearer.');
    } finally {
        try { await html5QrCode.clear(); } catch(e) {}
        const fileInput = document.getElementById('internal-qr-file-input');
        if (fileInput) fileInput.value = '';
        document.getElementById('qr-scanner-wrap').style.display = 'none';
        if(window.html5QrCodeScannerInstance) {
            window.html5QrCodeScannerInstance.stop().catch(console.error);
            window.html5QrCodeScannerInstance = null;
        }
    }
};

async function doVerify(batchID) {
    const id = batchID || document.getElementById('verify_id').value.trim();
    if (!id) return alert('Please enter a Batch ID.');
    document.getElementById('verify_id').value = id;
    setLoading('btn-verify', true);
    const card = document.getElementById('verify-output');
    card.className = 'verify-card';
    try {
        const r = await fetch(API + '/api/verify/' + encodeURIComponent(id));
        const d = await r.json();
        const ok = d.authentic === true || (d.message && d.message.includes('AUTHENTIC'));
        card.className = 'verify-card show ' + (ok ? 'authentic' : 'notfound');
        document.getElementById('v-icon').textContent = ok ? '🛡️' : '⚠️';
        document.getElementById('v-title').textContent = ok ? 'Authentic Product' : 'Not Found';
        document.getElementById('v-title').style.color = ok ? 'var(--green)' : 'var(--red)';
        document.getElementById('v-sub').textContent = d.message || 'Unknown result.';
    } catch (e) {
        card.className = 'verify-card show notfound';
        document.getElementById('v-icon').textContent = '❌';
        document.getElementById('v-title').textContent = 'Connection Error';
        document.getElementById('v-title').style.color = 'var(--red)';
        document.getElementById('v-sub').textContent = e.message;
    }
    setLoading('btn-verify', false);
}

/* ── QR Scanner ───────────────────────────────────────────────────── */
let qrScanner = null;

function toggleQrScanner() {
    const wrap = document.getElementById('qr-scanner-wrap');
    if (wrap.style.display === 'none') {
        wrap.style.display = 'block';
        startQrScanner();
    } else {
        stopQrScanner();
    }
}

function startQrScanner() {
    if (qrScanner) { qrScanner.clear(); qrScanner = null; }

    qrScanner = new Html5Qrcode('qr-reader');

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    qrScanner.start(
        { facingMode: 'environment' }, // كاميرا الخلف على الجوال
        config,
        (decodedText) => {
            // تم مسح الكود بنجاح
            stopQrScanner();
            document.getElementById('verify_id').value = decodedText;
            doVerify(decodedText);
        },
        (error) => { /* تجاهل أخطاء المسح المستمرة */ }
    ).catch(err => {
        document.getElementById('qr-scanner-wrap').style.display = 'none';
        alert('❌ Cannot access camera. Please allow camera permission.');
    });
}

function stopQrScanner() {
    document.getElementById('qr-scanner-wrap').style.display = 'none';
    if (qrScanner) {
        try {
            qrScanner.stop().then(() => {
                qrScanner.clear();
                qrScanner = null;
            }).catch(() => { qrScanner = null; });
        } catch(e) { qrScanner = null; }
    }
}

/* ── Public QR Scanner (no login required) ────────────────────────── */
let publicQrScanner = null;

function openPublicQr() {
    const overlay = document.getElementById('public-qr-overlay');
    overlay.style.display = 'flex';
    document.getElementById('public-qr-result').style.display = 'none';
    document.getElementById('public-qr-reader').style.display = 'none';
    document.getElementById('public-qr-manual-id').value = '';
    document.getElementById('btn-toggle-camera').textContent = '📷 Use Camera';
    if (publicQrScanner) {
        try { publicQrScanner.stop().catch(()=>{}); publicQrScanner.clear(); } catch(e){}
        publicQrScanner = null;
    }
}

function togglePublicCamera() {
    const reader = document.getElementById('public-qr-reader');
    const btn = document.getElementById('btn-toggle-camera');
    
    if (reader.style.display === 'block') {
        reader.style.display = 'none';
        btn.textContent = '📷 Use Camera';
        if (publicQrScanner) {
            try { publicQrScanner.stop().catch(()=>{}); publicQrScanner.clear(); } catch(e){}
            publicQrScanner = null;
        }
    } else {
        reader.style.display = 'block';
        btn.textContent = '🛑 Stop Camera';
        document.getElementById('public-qr-result').style.display = 'none';
        
        if (publicQrScanner) { publicQrScanner.clear(); publicQrScanner = null; }
        publicQrScanner = new Html5Qrcode('public-qr-reader');
        publicQrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            async (decodedText) => {
                togglePublicCamera();
                await showPublicVerifyResult(decodedText);
            },
            () => { }
        ).catch(() => {
            togglePublicCamera();
            alert('❌ Cannot access camera. Please allow camera permission.');
        });
    }
}

async function verifyManualId() {
    const id = document.getElementById('public-qr-manual-id').value.trim();
    if (!id) return alert('Please enter a Batch ID.');
    await showPublicVerifyResult(id);
}

async function handleQrImage(file) {
    if (!file) return;
    document.getElementById('public-qr-result').style.display = 'none';
    const html5QrCode = new Html5Qrcode('public-qr-reader');
    try {
        const decodedText = await html5QrCode.scanFile(file, true);
        await showPublicVerifyResult(decodedText);
    } catch (err) {
        alert('❌ Could not read a valid QR code from the image. Please try another image.');
    } finally {
        html5QrCode.clear();
        document.getElementById('qr-file-input').value = '';
    }
}

async function showPublicVerifyResult(batchID) {
    const resultEl = document.getElementById('public-qr-result');
    resultEl.style.display = 'block';
    document.getElementById('pqr-icon').textContent = '⏳';
    document.getElementById('pqr-title').textContent = 'Verifying...';
    document.getElementById('pqr-id').textContent = batchID;
    document.getElementById('pqr-msg').textContent = '';

    try {
        const r = await fetch(API + '/api/verify/' + encodeURIComponent(batchID));
        const d = await r.json();
        const ok = d.authentic === true || (d.message && d.message.includes('AUTHENTIC'));
        resultEl.style.background = ok ? '#f0fdf4' : '#fef2f2';
        resultEl.style.border = '2px solid ' + (ok ? '#86efac' : '#fca5a5');
        document.getElementById('pqr-icon').textContent = ok ? '🛡️' : '⚠️';
        document.getElementById('pqr-title').textContent = ok ? 'Authentic Product' : 'Not Found';
        document.getElementById('pqr-title').style.color = ok ? 'var(--green)' : 'var(--red)';
        document.getElementById('pqr-id').textContent = 'Batch ID: ' + batchID;
        document.getElementById('pqr-msg').textContent = d.message || '';
    } catch (e) {
        resultEl.style.background = '#fef2f2';
        resultEl.style.border = '2px solid #fca5a5';
        document.getElementById('pqr-icon').textContent = '❌';
        document.getElementById('pqr-title').textContent = 'Connection Error';
        document.getElementById('pqr-title').style.color = 'var(--red)';
        document.getElementById('pqr-msg').textContent = e.message;
    }
}

function resetPublicQr() {
    document.getElementById('public-qr-result').style.display = 'none';
    openPublicQr();
}

function closePublicQr() {
    document.getElementById('public-qr-overlay').style.display = 'none';
    if (publicQrScanner) {
        try {
            publicQrScanner.stop().catch(() => { });
            publicQrScanner.clear();
        } catch(e) { }
        publicQrScanner = null;
    }
}


/* ── Register Product ─────────────────────────────────────────────── */
async function doRegister() {
    if (!checkAuth()) return;
    const body = {
        batchID: document.getElementById('r_batch').value.trim(),
        productName: document.getElementById('r_name').value.trim(),
        manufacturer: document.getElementById('r_manu').value.trim(),
        productionDate: document.getElementById('r_date').value,
        minTemp: document.getElementById('r_min_temp').value,
        maxTemp: document.getElementById('r_max_temp').value,
        minHum: document.getElementById('r_min_hum').value,
        maxHum: document.getElementById('r_max_hum').value,
        numberOfBatches: document.getElementById('r_batches').value.trim()
    };
    if (!body.batchID || !body.productName || !body.manufacturer || !body.productionDate)
        return alert('Please fill in all required fields.');

    if (body.minTemp && body.maxTemp && parseFloat(body.minTemp) > parseFloat(body.maxTemp)) {
        return alert('Minimum temperature cannot be higher than maximum temperature.');
    }
    if (body.minHum && (parseFloat(body.minHum) < 0 || parseFloat(body.minHum) > 100)) {
        return alert('Humidity must be between 0 and 100.');
    }
    if (body.maxHum && (parseFloat(body.maxHum) < 0 || parseFloat(body.maxHum) > 100)) {
        return alert('Humidity must be between 0 and 100.');
    }
    if (body.minHum && body.maxHum && parseFloat(body.minHum) > parseFloat(body.maxHum)) {
        return alert('Minimum humidity cannot be higher than maximum humidity.');
    }
    if (body.productionDate) {
        const selectedDate = new Date(body.productionDate);
        selectedDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (selectedDate > today) {
            return alert('Production date cannot be in the future.');
        }
    }
    setLoading('btn-register', true);
    try {
        const r = await fetchAuth(API + '/api/products/register', { method: 'POST', body: JSON.stringify(body) });
        const d = await r.json();
        showBox('register-output', 'register-bar', 'register-pre', d, !d.error);
        if (!d.error && d.batchID) generateQR(d.batchID);
    } catch (e) { showBox('register-output', 'register-bar', 'register-pre', { error: e.message }, false); }
    setLoading('btn-register', false);
}

function generateQR(batchID) {
    const wrap = document.getElementById('qr-wrap');
    wrap.innerHTML = '<p style="font-size:12px;color:var(--muted);margin-bottom:8px">QR Code — <strong>' + batchID + '</strong></p>';
    const container = document.createElement('div');
    wrap.appendChild(container);
    // Try qrcode library (toCanvas API)
    if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
        const c = document.createElement('canvas');
        container.appendChild(c);
        QRCode.toCanvas(c, batchID, { width: 140, margin: 1 }, () => { });
        // Try qrcodejs library (constructor API)
    } else if (typeof QRCode !== 'undefined') {
        new QRCode(container, { text: batchID, width: 140, height: 140 });
    } else {
        container.innerHTML = '<p style="color:var(--green);font-size:13px">✅ Registered: <strong>' + batchID + '</strong></p>';
    }
    wrap.style.display = 'block';
}

/* ── Transfer ─────────────────────────────────────────────────────── */
function onDeliveredToggle(cb) {
    const btn = document.getElementById('btn-transfer');
    if (!btn) return;
    if (cb.checked) {
        btn.textContent = '✅ Confirm Delivery';
        btn.style.background = 'var(--green)';
    } else {
        btn.innerHTML = '🚚 Record Transfer';
        btn.style.background = '';
    }
}

async function doTransfer() {
    if (!checkAuth()) return;
    const u = getUser();

    // Batch ID from the datalist input
    const batchID = document.getElementById('t_batch').value.trim();

    let newOwner = document.getElementById('t_owner').value.trim();
    if (u && u.role === 'Retailer') {
        newOwner = 'Consumer'; // Force Consumer for Retailer
    }

    // إذا الرتيلر يقوم بالعملية، أضف كلمة retailer ليُفعّل شرط الـ Chaincode
    if (u && u.role === 'Retailer' && !newOwner.toLowerCase().includes('retailer') && !newOwner.toLowerCase().includes('delivered')) {
        newOwner = newOwner + ' [Retailer-Delivered]';
    }

    const body = {
        batchID: document.getElementById('t_batch').value.trim(),
        newOwner,
        location: document.getElementById('t_loc').value.trim(),
        temperature: document.getElementById('t_temp').value.trim()
    };
    if (!body.batchID || !body.newOwner || !body.location)
        return alert('Please fill in all required fields.');

    setLoading('btn-transfer', true);
    
    try {
        // Verify ownership before allowing transfer
        const productRes = await fetch(API + '/api/trace/' + encodeURIComponent(body.batchID));
        const productData = await productRes.json();
        
        if (productData.error) {
            setLoading('btn-transfer', false);
            return alert('Product not found.');
        }

        const isOwner = productData.currentOwner === u.company || productData.currentOwner === u.userID || productData.currentOwner === u.name;
        const isManu = (u.role === 'Manufacturer' && productData.status === 'Registered' && (productData.manufacturer === u.company || productData.manufacturer === u.userID || productData.manufacturer === u.name));
        
        if (u.role !== 'Admin' && !isOwner && !isManu) {
            setLoading('btn-transfer', false);
            return alert('Unauthorized: You cannot transfer this product because it is currently owned by ' + productData.currentOwner + '. As a member of ' + (u.company || 'no company') + ', you can only manage products owned by your company.');
        }

        if (u.role === 'Retailer' && productData.transactions && productData.transactions.length > 0) {
            const lastTx = productData.transactions[productData.transactions.length - 1];
            if (lastTx.location !== body.location) {
                setLoading('btn-transfer', false);
                return alert('Error: The confirm delivery location (' + body.location + ') must match the location where you received the product (' + lastTx.location + ').');
            }
        }

        const r = await fetchAuth(API + '/api/tx', { method: 'POST', body: JSON.stringify(body) });
        const d = await r.json();
        const isRetailerDelivery = (u && u.role === 'Retailer');
        
        if (d.error && d.error.includes('already been delivered')) {
            // Hide the error box as requested
            document.getElementById('transfer-output').className = 'result-wrap';
        } else if (!d.error && isRetailerDelivery) {
            d._deliveryConfirmed = true;
            showBox('transfer-output', 'transfer-bar', 'transfer-pre',
                { ...d, status: '✅ Delivered Successfully' }, true);
        } else {
            showBox('transfer-output', 'transfer-bar', 'transfer-pre', d, !d.error);
        }
        if (!d.error) setTimeout(pollNotifications, 3000);
    } catch (e) { showBox('transfer-output', 'transfer-bar', 'transfer-pre', { error: e.message }, false); }
    setLoading('btn-transfer', false);
}


/* ── Search ───────────────────────────────────────────────────────── */
async function doSearch() {
    const q = document.getElementById('search_q').value.trim();
    if (!q) return alert('Please enter a search keyword.');
    setLoading('btn-search', true);
    document.getElementById('search-results').innerHTML = '';
    try {
        const r = await fetch(API + '/api/search?q=' + encodeURIComponent(q));
        const data = await r.json();
        const el = document.getElementById('search-results');
        if (!Array.isArray(data) || data.length === 0) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔎</div><p>No products found for "' + q + '".</p></div>';
        } else {
            el.innerHTML = data.map(p =>
                '<div class="card" style="margin-bottom:12px;cursor:pointer" onclick="quickTrace(\'' + p.batchID + '\')">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'
                + '<div><div style="font-weight:700;font-size:15px">' + p.productName + '</div>'
                + '<div style="font-size:12px;color:var(--muted);font-family:monospace">' + p.batchID + '</div></div>'
                + '<div style="display:flex;gap:8px"><span class="badge badge-blue">' + p.manufacturer + '</span>'
                + '<span class="badge ' + (p.status === 'Delivered' ? 'badge-green' : 'badge-blue') + '">' + p.status + '</span></div></div>'
                + '<div style="margin-top:8px;font-size:12.5px;color:var(--muted)">📦 ' + p.currentOwner
                + ' &nbsp;|&nbsp; 📅 ' + p.productionDate
                + ' &nbsp;|&nbsp; 🔄 ' + (p.transactions || []).length + ' transfers</div></div>'
            ).join('');
        }
    } catch (e) { document.getElementById('search-results').innerHTML = '<p style="color:var(--red)">' + e.message + '</p>'; }
    setLoading('btn-search', false);
}

function quickTrace(batchID) {
    document.getElementById('trace_id').value = batchID;
    const traceBtn = document.querySelector('[onclick*="\'trace\'"]');
    if (traceBtn) switchTab('trace', traceBtn);
    doTrace();
}

/* ── IoT ──────────────────────────────────────────────────────────── */
function updateUnit(type) {
    const m = { temperature: '°C', humidity: '%' };
    document.getElementById('iot_unit').value = m[type] || '';
}

async function doIoT() {
    if (!checkAuth()) return;
    const body = {
        batchID: document.getElementById('iot_batch').value.trim(),
        deviceID: document.getElementById('iot_device').value.trim(),
        sensorType: document.getElementById('iot_type').value,
        value: document.getElementById('iot_value').value.trim(),
        unit: document.getElementById('iot_unit').value.trim()
    };
    if (!body.batchID || !body.deviceID || !body.value || !body.unit)
        return alert('Please fill all fields.');

    const val = parseFloat(body.value);
    if (body.sensorType === 'humidity') {
        if (isNaN(val) || val < 0 || val > 100) {
            return alert('Humidity value must be a percentage between 0 and 100.');
        }
    } else if (val < -100 || val > 100) { // General safety check for temperature as well
        if (isNaN(val)) return alert('Please enter a valid numeric value.');
    }
    
    if (val < 0 && body.sensorType === 'humidity') {
        return alert('Humidity cannot be negative.');
    }
    setLoading('btn-iot', true);
    try {
        const r = await fetchAuth(API + '/api/iot', { method: 'POST', body: JSON.stringify(body) });
        const d = await r.json();
        showBox('iot-output', 'iot-bar', 'iot-pre', d, !d.error);
        if (!d.error) setTimeout(pollNotifications, 3000);
    } catch (e) { showBox('iot-output', 'iot-bar', 'iot-pre', { error: e.message }, false); }
    setLoading('btn-iot', false);
}

/* ── Reports ──────────────────────────────────────────────────────── */
async function loadReports() {
    if (!checkAuth()) return;
    const startDate = document.getElementById('rep_start').value || '';
    const endDate = document.getElementById('rep_end').value || '';
    setLoading('btn-report', true);
    document.getElementById('report-content').innerHTML = '';
    try {
        const r = await fetchAuth(API + '/api/reports?startDate=' + startDate + '&endDate=' + endDate);
        const d = await r.json();
        if (d.error) { document.getElementById('report-content').innerHTML = '<p style="color:var(--red)">' + d.error + '</p>'; return; }
        const s = d.summary || {};
        const statusRows = Object.entries(s.byStatus || {}).map(([k, v]) =>
            '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">'
            + '<span style="font-weight:600">' + k + '</span><span class="badge badge-blue">' + v + ' products</span></div>'
        ).join('');
        const mfRows = Object.entries(s.byManufacturer || {}).map(([k, v]) =>
            '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">'
            + '<span>' + k + '</span><span class="badge badge-blue">' + v + '</span></div>'
        ).join('');
        document.getElementById('report-content').innerHTML =
            '<div class="stats-grid">'
            + '<div class="stat-card"><div class="stat-num">' + (s.totalProducts || 0) + '</div><div class="stat-label">Products</div></div>'
            + '<div class="stat-card"><div class="stat-num">' + (s.totalTransactions || 0) + '</div><div class="stat-label">Transfers</div></div>'
            + '<div class="stat-card"><div class="stat-num">' + (s.totalIoTReadings || 0) + '</div><div class="stat-label">IoT Readings</div></div>'
            + '<div class="stat-card"><div class="stat-num">' + Object.keys(s.byManufacturer || {}).length + '</div><div class="stat-label">Manufacturers</div></div>'
            + '</div>'
            + '<div class="card" style="margin-bottom:16px"><div class="section-title" style="font-size:14px;margin-bottom:12px">Status Breakdown</div>'
            + (statusRows || '<p style="color:var(--muted)">No data</p>') + '</div>'
            + '<div class="card"><div class="section-title" style="font-size:14px;margin-bottom:12px">By Manufacturer</div>'
            + (mfRows || '<p style="color:var(--muted)">No data</p>') + '</div>'
            + '<div style="margin-top:10px;font-size:12px;color:var(--muted)">Generated: ' + new Date(d.generatedAt).toLocaleString() + '</div>';
    } catch (e) { document.getElementById('report-content').innerHTML = '<p style="color:var(--red)">' + e.message + '</p>'; }
    setLoading('btn-report', false);
}

/* ── Admin ────────────────────────────────────────────────────────── */
async function loadAdmin() {
    if (!checkAuth() || getUser()?.role !== 'Admin') return;
    setLoading('btn-refresh-admin', true);
    try {
        const [r, cRes, ucRes] = await Promise.all([
            fetchAuth(API + '/api/users'),
            fetch(API + '/api/companies'),
            fetchAuth(API + '/api/users/companies')
        ]);
        const users = await r.json();
        const comps = await cRes.json();
        const userComps = await ucRes.json();
        
        if (users.error) { alert(users.error); return; }
        const roles = ['Admin', 'Manufacturer', 'Logistics', 'Retailer', 'Consumer'];
        
        document.getElementById('admin-tbody').innerHTML = users.map(u => {
            const uComp = userComps[u.userID] || '';
            const compOptions = '<option value="">-- None --</option>' + comps.map(c => 
                `<option value="${c.name}" ${c.name === uComp ? 'selected' : ''}>${c.name}</option>`
            ).join('');
            
            return '<tr>'
            + '<td style="font-family:monospace;font-size:12.5px">' + u.userID + '</td>'
            + '<td>' + u.name + '</td>'
            + '<td style="font-size:12.5px">' + u.email + '</td>'
            + '<td><select onchange="changeCompany(\'' + u.userID + '\',this.value)" style="border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:12px;font-family:inherit">'
            + compOptions
            + '</select></td>'
            + '<td><span class="badge" style="background:var(--bg);color:var(--text);border:1px solid var(--border)">' + u.role + '</span></td>'
            + '<td><span class="badge ' + (u.status === 'Active' ? 'badge-green' : 'badge-yellow') + '">' 
            + (u.status === 'Active' ? 'Active' : (u.role === 'Consumer' ? 'Disabled' : 'Pending Approval')) + '</span></td>'
            + '<td>' + (u.role !== 'Admin'
                ? '<button class="btn btn-sm ' + (u.status === 'Active' ? 'btn-warn' : 'btn-primary') + '" onclick="'
                + (u.status === 'Active' ? 'disableUser' : 'enableUser') + '(\'' + u.userID + '\')">'
                + (u.status === 'Active' ? 'Disable' : 'Enable') + '</button>'
                : '—') + '</td>'
            + '</tr>'
        }).join('');
    } catch (e) { alert(e.message); }
    setLoading('btn-refresh-admin', false);
}


async function changeCompany(id, company) {
    try { await fetchAuth(API + '/api/users/' + id + '/company', { method: 'PUT', body: JSON.stringify({ company }) }); loadAdmin(); }
    catch (e) { alert(e.message); }
}
async function disableUser(id) {
    if (!confirm('Disable user "' + id + '"?')) return;
    try { await fetchAuth(API + '/api/users/' + id + '/disable', { method: 'PUT' }); loadAdmin(); }
    catch (e) { alert(e.message); }
}
async function enableUser(id) {
    try { await fetchAuth(API + '/api/users/' + id + '/enable', { method: 'PUT' }); loadAdmin(); }
    catch (e) { alert(e.message); }
}

async function createCompany() {
    const name = document.getElementById('new_comp_name').value.trim();
    const role = document.getElementById('new_comp_role').value;
    if(!name) return alert('Enter company name');
    try {
        await fetchAuth(API + '/api/companies', { method: 'POST', body: JSON.stringify({ name, role }) });
        alert('Company created successfully!');
        document.getElementById('new_comp_name').value = '';
    } catch(e) { alert(e.message); }
}

/* ── Notifications ────────────────────────────────────────────────── */
function toggleNotifPanel() {
    const p = document.getElementById('notif-panel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

async function pollNotifications() {
    if (!getToken()) return;
    try {
        const r = await fetchAuth(API + '/api/notifications');
        const notifs = await r.json();
        if (!Array.isArray(notifs)) return;
        const unread = notifs.filter(n => !n.read).length;
        const cnt = document.getElementById('notif-count');
        cnt.textContent = unread;
        cnt.style.display = unread > 0 ? '' : 'none';
        const icons = { info: '📦', warning: '⚠️', success: '✅' };
        const bgs = { info: 'var(--blue-lt)', warning: 'var(--yellow-lt)', success: 'var(--green-lt)' };
        const el = document.getElementById('notif-list');
        if (!notifs.length) {
            el.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:13px;text-align:center">No notifications yet.</div>';
            return;
        }
        el.innerHTML = notifs.slice(0, 15).map(n =>
            '<div style="padding:12px 16px;border-bottom:1px solid var(--border);background:' + (n.read ? '#fff' : (bgs[n.type] || 'var(--blue-lt)')) + '">'
            + '<div style="font-size:13px">' + (icons[n.type] || '🔔') + ' ' + n.message + '</div>'
            + '<div style="font-size:11px;color:var(--muted);margin-top:3px">' + new Date(n.timestamp).toLocaleString() + '</div></div>'
        ).join('');
    } catch { }
}

async function markNotifsRead() {
    try { await fetchAuth(API + '/api/notifications/read', { method: 'POST' }); pollNotifications(); } catch { }
}

window.addEventListener('click', e => {
    const btn = document.getElementById('notif-btn');
    if (p && btn && !btn.contains(e.target) && !p.contains(e.target)) p.style.display = 'none';
});

/* ── Init ─────────────────────────────────────────────────────────── */
checkAuth();
const todayISO = new Date().toISOString().split("T")[0];
if(document.getElementById('r_date')) document.getElementById('r_date').max = todayISO;
setInterval(pollNotifications, 30000);

window.subscribeNewsletter = function() {
    const input = document.getElementById('footer-email');
    if(!input) return;
    const email = input.value.trim();
    if(!email || !email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }
    input.value = '';
    alert('Thank you for subscribing, ' + email + '! You will receive the latest Hyperledger updates.');
};
