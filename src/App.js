import './App.css';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

/* ══════════════════════════════════════
   CONSTANTS
══════════════════════════════════════ */
const PRODUCTS = [
  { id: "pizza",     name: "Fatia de Pizza",   price: 6.00, cost: 2.50, emoji: "🍕" },
  { id: "sanduiche", name: "Sanduíche Natural", price: 6.00, cost: 3.49, emoji: "🥪" },
  { id: "esfirra",   name: "Esfirra",           price: 5.00, cost: 2.30, emoji: "🫓" },
  { id: "calzone",   name: "Calzone",           price: 7.00, cost: 3.70, emoji: "🥙" },
];

const SK = { C: "snack_v1_clients", S: "snack_v1_sales" };

const TABS = [
  { id: "billing",  label: "Cobranças",  icon: "💰" },
  { id: "new-sale", label: "Nova Venda", icon: "🛒" },
  { id: "clients",  label: "Clientes",   icon: "👥" },
  { id: "data",     label: "Dados",      icon: "📦" },
];

/* ══════════════════════════════════════
   UTILITIES
══════════════════════════════════════ */
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const fmt   = v => "R$ " + Number(v).toFixed(2).replace(".", ",");
const fmtDate = iso => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ══════════════════════════════════════
   STORAGE (window.storage API)
══════════════════════════════════════ */
function storageLoad(key) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    return null;
  }
}

function storageSave(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Erro ao salvar dados:", e);
  }
}

/* ══════════════════════════════════════
   LOYALTY HELPERS
══════════════════════════════════════ */
function getLoyalty(client) {
  const consumed      = client.totalConsumed || 0;
  const earned        = Math.floor(consumed / 10);
  const used          = client.freeUsed || 0;
  const freeAvailable = earned - used;
  const cycleProgress = consumed % 10;
  return { consumed, earned, used, freeAvailable, cycleProgress };
}

/* ══════════════════════════════════════
   CSS
══════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --red:#EA1D2C;--red-dark:#C41525;--orange:#FF6900;
  --bg:#F5F5F5;--surface:#FFFFFF;--border:#E8E8E8;
  --text:#1A1A1A;--muted:#717171;
  --green:#16A34A;--green-light:#DCFCE7;--red-light:#FEE2E2;
  --shadow:0 2px 12px rgba(0,0,0,.08);--shadow-sm:0 1px 4px rgba(0,0,0,.06);
  --r:16px;--rs:10px;--nav:68px;
}
body{font-family:'Nunito',sans-serif;background:var(--bg);color:var(--text)}
.app{max-width:480px;margin:0 auto;min-height:100vh;background:var(--bg);padding-bottom:var(--nav)}

/* HEADER */
.hdr{background:linear-gradient(135deg,var(--red),var(--orange));padding:16px 20px 20px;color:#fff}
.hdr-logo{font-size:22px;font-weight:900;letter-spacing:-.5px}
.hdr-logo span{opacity:.7;font-weight:600}
.hdr-sub{font-size:13px;opacity:.8;margin-top:3px;font-weight:600}

/* TAB CONTENT */
.tab{padding:16px}

/* SUMMARY CARD */
.sum-card{background:linear-gradient(135deg,var(--red),var(--orange));border-radius:var(--r);padding:20px;color:#fff;margin-bottom:16px;box-shadow:0 4px 20px rgba(234,29,44,.3)}
.sum-card .lbl{font-size:11px;font-weight:800;opacity:.85;text-transform:uppercase;letter-spacing:1px}
.sum-card .amt{font-size:34px;font-weight:900;line-height:1.1}
.sum-card .sub{font-size:13px;opacity:.8;margin-top:4px;font-weight:600}

/* DEBT CARD */
.debt-card{background:var(--surface);border-radius:var(--rs);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;box-shadow:var(--shadow-sm);border:1px solid var(--border)}
.debt-name{font-weight:800;font-size:15px}
.debt-amt{color:var(--red);font-weight:900;font-size:18px;margin:2px 0}
.debt-sub{color:var(--muted);font-size:12px;font-weight:600}

/* BUTTONS */
.btn{border:none;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all .15s}
.btn:active{transform:scale(.97)}
.btn-pay{background:var(--green);color:#fff;padding:10px 16px;border-radius:50px;font-size:14px;box-shadow:0 2px 8px rgba(22,163,74,.3)}
.btn-pay:hover{background:#15803d}
.btn-primary{background:var(--red);color:#fff;padding:14px 20px;border-radius:50px;font-size:15px;width:100%;box-shadow:0 4px 14px rgba(234,29,44,.3)}
.btn-primary:hover{background:var(--red-dark)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-secondary{background:var(--border);color:var(--text);padding:12px 20px;border-radius:50px;font-size:14px}
.btn-outline{background:transparent;color:var(--red);border:2px solid var(--red);padding:10px 16px;border-radius:50px;font-size:14px;width:100%}
.btn-success{background:var(--green);color:#fff;padding:14px 20px;border-radius:50px;font-size:15px;width:100%;box-shadow:0 4px 14px rgba(22,163,74,.3)}
.btn-icon{background:transparent;color:var(--muted);padding:6px 10px;border-radius:8px;font-size:18px;border:none;cursor:pointer}
.btn-icon:hover{background:var(--bg)}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;align-items:flex-end;justify-content:center}
.sheet{background:var(--surface);border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:24px 20px}
.m-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.m-title{font-size:18px;font-weight:800}
.m-close{background:var(--bg);border:none;cursor:pointer;width:32px;height:32px;border-radius:50%;font-size:16px;display:flex;align-items:center;justify-content:center}

/* FORM */
.fg{margin-bottom:16px}
.flbl{display:block;font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.finput{width:100%;padding:12px 14px;border:2px solid var(--border);border-radius:var(--rs);font-family:'Nunito',sans-serif;font-size:15px;font-weight:600;color:var(--text);background:var(--surface);outline:none;transition:border-color .15s}
.finput:focus{border-color:var(--red)}
.fselect{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23717171' stroke-width='2' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}

/* CLIENT SEARCH */
.search-wrapper{position:relative;margin-bottom:16px}
.search-input-wrap{position:relative}
.search-input-wrap .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none}
.search-input{width:100%;padding:12px 14px 12px 40px;border:2px solid var(--border);border-radius:var(--rs);font-family:'Nunito',sans-serif;font-size:15px;font-weight:600;color:var(--text);background:var(--surface);outline:none;transition:border-color .15s}
.search-input:focus{border-color:var(--red)}
.search-dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--surface);border:2px solid var(--border);border-radius:var(--rs);z-index:50;box-shadow:var(--shadow);max-height:220px;overflow-y:auto}
.search-item{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;font-weight:700;font-size:14px;border-bottom:1px solid var(--border);transition:background .1s}
.search-item:last-child{border-bottom:none}
.search-item:hover{background:var(--bg)}
.search-item .si-icon{font-size:16px;color:var(--muted)}
.search-item .si-name{flex:1}
.search-empty{padding:16px;text-align:center;color:var(--muted);font-weight:600;font-size:14px}
.search-selected{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--red-light);border:2px solid var(--red);border-radius:var(--rs);margin-bottom:16px;cursor:pointer}
.search-selected .ss-name{font-weight:800;font-size:15px;color:var(--red);flex:1}
.search-selected .ss-clear{font-size:12px;color:var(--red);font-weight:700;background:none;border:none;cursor:pointer;font-family:'Nunito',sans-serif}

/* LOYALTY POINTS EDITOR */
.points-editor{display:flex;align-items:center;gap:12px;margin:8px 0 6px}
.points-btn{width:36px;height:36px;border-radius:50%;border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:'Nunito',sans-serif;transition:all .15s;line-height:1}
.points-btn.minus{border-color:var(--red);color:var(--red)}
.points-btn.minus:hover{background:var(--red-light)}
.points-btn.plus{border-color:var(--green);color:var(--green);background:none}
.points-btn.plus:hover{background:var(--green-light)}
.points-btn:active{transform:scale(.92)}
.points-display{min-width:64px;text-align:center;padding:8px 12px;border:2px solid var(--border);border-radius:var(--rs);font-size:22px;font-weight:900;color:var(--text);background:var(--bg)}
.points-hint{font-size:12px;color:var(--muted);font-weight:600;margin-top:4px}
.cycle-info{background:var(--bg);border-radius:8px;padding:10px 12px;margin-top:8px;font-size:13px;font-weight:700;color:var(--muted)}
.cycle-info span{color:var(--red);font-weight:900}

/* PRODUCT GRID */
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.pcard{background:var(--surface);border:2px solid var(--border);border-radius:var(--rs);padding:12px;cursor:pointer;transition:all .15s;text-align:center;position:relative}
.pcard:hover{border-color:#ccc}
.pcard.sel{border-color:var(--red);background:var(--red-light)}
.pcard .pe{font-size:28px}
.pcard .pn{font-size:12px;font-weight:700;margin:4px 0 2px}
.pcard .pp{font-size:14px;font-weight:800;color:var(--red)}
.pcard .pbadge{background:var(--red);color:#fff;border-radius:20px;font-size:11px;font-weight:800;padding:2px 8px;margin-top:6px;display:inline-block}

/* CART */
.cart-item{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:8px}
.cart-name{font-weight:700;font-size:14px}
.cart-sub{font-size:12px;color:var(--muted);font-weight:600}
.qty-row{display:flex;align-items:center;gap:10px}
.qbtn{width:28px;height:28px;border-radius:50%;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Nunito',sans-serif}
.qbtn.add{background:var(--red);color:#fff;border-color:var(--red)}
.qnum{font-weight:800;font-size:16px;min-width:20px;text-align:center}

/* LOYALTY */
.ldots{display:flex;gap:5px;flex-wrap:wrap}
.ldot{width:18px;height:18px;border-radius:50%;background:#e0e0e0;transition:background .2s}
.ldot.on{background:var(--red);box-shadow:0 0 4px rgba(234,29,44,.4)}
.lbadge{background:var(--red-light);border:2px solid var(--red);border-radius:8px;padding:8px 12px;margin-top:10px;font-size:13px;font-weight:700;color:var(--red);display:flex;align-items:center;gap:6px}

/* CLIENT CARD */
.cc{background:var(--surface);border-radius:var(--rs);padding:16px;margin-bottom:10px;box-shadow:var(--shadow-sm);border:1px solid var(--border)}
.cc-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.cc-name{font-weight:800;font-size:16px}
.cc-lbl{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}

/* TOGGLE */
.tog{display:flex;border:2px solid var(--border);border-radius:50px;overflow:hidden;margin-bottom:16px}
.tog-opt{flex:1;padding:10px;text-align:center;font-weight:700;font-size:14px;cursor:pointer;transition:all .15s;color:var(--muted);background:var(--surface);font-family:'Nunito',sans-serif;border:none}
.tog-opt.on{background:var(--red);color:#fff}

/* CHECKBOX */
.chk-row{display:flex;align-items:center;gap:10px;padding:12px 0;cursor:pointer}
.chk{width:22px;height:22px;border:2px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;font-size:12px;color:#fff}
.chk.on{background:var(--red);border-color:var(--red)}
.chk-lbl{font-weight:700;font-size:15px}

/* TOTALS */
.trow{display:flex;justify-content:space-between;align-items:center;padding:3px 0}
.trow .tlbl{font-weight:600;font-size:14px;color:var(--muted)}
.trow .tval{font-weight:700;font-size:14px}
.trow.big .tlbl{font-weight:800;font-size:16px;color:var(--text)}
.trow.big .tval{font-weight:900;font-size:18px;color:var(--red)}

/* BOTTOM NAV */
.bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;height:var(--nav);background:var(--surface);border-top:1px solid var(--border);display:flex;align-items:center;z-index:50;padding:0 4px;box-shadow:0 -4px 20px rgba(0,0,0,.08)}
.nbtn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px 4px;cursor:pointer;border:none;background:none;border-radius:12px;position:relative}
.nbtn .ni{font-size:22px;transition:transform .15s}
.nbtn.on .ni{transform:scale(1.15)}
.nbtn .nl{font-size:11px;font-weight:700;color:var(--muted);font-family:'Nunito',sans-serif}
.nbtn.on .nl{color:var(--red)}
.nbadge{background:var(--red);color:#fff;border-radius:10px;font-size:10px;font-weight:800;padding:1px 5px;position:absolute;top:2px;right:8px}

/* MISC */
.sec{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:10px}
.divider{height:1px;background:var(--border);margin:12px 0}
.empty{text-align:center;padding:48px 20px;color:var(--muted)}
.empty-ico{font-size:48px;margin-bottom:12px}
.empty-txt{font-size:16px;font-weight:700}
.empty-sub{font-size:14px;margin-top:6px;font-weight:600}
.sale-row{padding:12px;background:var(--bg);border-radius:var(--rs);margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start}
.sale-row-date{font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px}
.sale-row-item{font-weight:700;font-size:13px;margin-bottom:2px}
.sale-row-price{font-weight:900;color:var(--red);font-size:15px;white-space:nowrap;padding-left:10px}
.exp-card{background:var(--surface);border-radius:var(--r);padding:20px;margin-bottom:12px;box-shadow:var(--shadow-sm);border:1px solid var(--border)}
.exp-title{font-size:16px;font-weight:800;margin-bottom:4px}
.exp-desc{font-size:13px;color:var(--muted);font-weight:600;margin-bottom:14px}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
`;

/* ══════════════════════════════════════
   SHARED UI COMPONENTS
══════════════════════════════════════ */

function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="m-hdr">
          <h2 className="m-title">{title}</h2>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoyaltyDots({ progress }) {
  return (
    <div className="ldots">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`ldot${i < progress ? " on" : ""}`} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════
   CLIENT SEARCH COMPONENT
══════════════════════════════════════ */
function ClientSearch({ clients, selectedId, onSelect }) {
  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const wrapRef                 = useRef(null);

  const selected = clients.find(c => c.id === selectedId);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients.slice(0, 8);
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return clients.filter(c =>
      c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
    ).slice(0, 8);
  }, [query, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = client => {
    onSelect(client.id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onSelect("");
    setQuery("");
    setOpen(false);
  };

  if (selected) {
    return (
      <div className="search-selected" onClick={handleClear}>
        <span style={{ fontSize: 18 }}>👤</span>
        <span className="ss-name">{selected.name}</span>
        <button className="ss-clear">✕ Trocar</button>
      </div>
    );
  }

  return (
    <div className="search-wrapper" ref={wrapRef}>
      <div className="fg" style={{ marginBottom: 0 }}>
        <label className="flbl">Para quem é o pedido?</label>
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Buscar cliente pelo nome..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
        </div>
      </div>

      {open && clients.length > 0 && (
        <div className="search-dropdown">
          {filtered.length > 0 ? filtered.map(c => (
            <div key={c.id} className="search-item" onMouseDown={() => handleSelect(c)}>
              <span className="si-icon">👤</span>
              <span className="si-name">{c.name}</span>
            </div>
          )) : (
            <div className="search-empty">Nenhum cliente encontrado</div>
          )}
        </div>
      )}

      {open && clients.length === 0 && (
        <div className="search-dropdown">
          <div className="search-empty">Nenhum cliente cadastrado</div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   BILLING TAB
══════════════════════════════════════ */
function PaymentModal({ client, unpaidSales, onConfirm, onClose }) {
  const total = unpaidSales.reduce((a, s) => a + s.total - (s.partiallyPaid || 0), 0);
  const [amount, setAmount] = useState("");

  const handleConfirm = () => {
    const paid = parseFloat(amount.replace(",", ".")) || 0;
    if (paid <= 0) return;
    onConfirm(paid);
  };

  return (
    <Modal title={`Receber de ${client.name}`} onClose={onClose}>
      <div style={{ background: "#FEE2E2", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#DC2626", textTransform: "uppercase", letterSpacing: 1 }}>Dívida atual</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: "#DC2626" }}>{fmt(total)}</div>
      </div>

      <div className="sec">Vendas em aberto</div>
      {unpaidSales.map(sale => (
        <div key={sale.id} className="sale-row">
          <div>
            <div className="sale-row-date">{fmtDate(sale.date)}</div>
            {sale.items.map((it, i) => (
              <div key={i} className="sale-row-item">{it.emoji} {it.productName} ×{it.qty}</div>
            ))}
            {sale.discount > 0 && (
              <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>
                Desconto: −{fmt(sale.discount)}
              </div>
            )}
          </div>
          <div className="sale-row-price">{fmt(sale.total)}</div>
        </div>
      ))}

      <div className="divider" />

      <div className="fg">
        <label className="flbl">Valor recebido (R$)</label>
        <input
          className="finput"
          type="number"
          step="0.01"
          placeholder="0,00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      <button
        className="btn btn-outline"
        style={{ marginBottom: 10 }}
        onClick={() => setAmount(total.toFixed(2))}
      >
        💰 Pagar dívida total ({fmt(total)})
      </button>
      <button className="btn btn-success" onClick={handleConfirm}>
        ✅ Confirmar Pagamento
      </button>
    </Modal>
  );
}

function BillingTab({ clients, sales, updateSales }) {
  const [payingId, setPayingId] = useState(null);

  const debtors = useMemo(() => {
    const map = {};
    sales.filter(s => !s.paid).forEach(s => {
      if (!map[s.clientId]) map[s.clientId] = { total: 0, count: 0 };
      map[s.clientId].total += s.total - (s.partiallyPaid || 0);
      map[s.clientId].count += 1;
    });
    return clients
      .map(c => ({ ...c, debt: map[c.id]?.total || 0, count: map[c.id]?.count || 0 }))
      .filter(c => c.debt > 0)
      .sort((a, b) => b.debt - a.debt);
  }, [clients, sales]);

  const grandTotal = debtors.reduce((a, c) => a + c.debt, 0);

  const handleConfirm = (clientId, paidAmount) => {
  let remaining = paidAmount;
  const sorted = [...sales]
    .filter(s => s.clientId === clientId && !s.paid)
    .sort((a, b) => a.date.localeCompare(b.date));

  const updated = sales.map(s => {
    if (s.clientId !== clientId || s.paid) return s;
    const match = sorted.find(u => u.id === s.id);
    if (!match || remaining <= 0) return s;

    const effectiveTotal = s.total - (s.partiallyPaid || 0);

    if (remaining >= effectiveTotal) {
      remaining -= effectiveTotal;
      return { ...s, paid: true, paidAt: todayISO() };
    } else {
      const newPartial = (s.partiallyPaid || 0) + remaining;
      remaining = 0;
      return { ...s, partiallyPaid: newPartial };
    }
  });

  updateSales(updated);
  setPayingId(null);
};

  const payingClient = clients.find(c => c.id === payingId);
  const payingSales  = payingId ? sales.filter(s => s.clientId === payingId && !s.paid) : [];

  return (
    <div className="tab">
      <div className="sum-card">
        <div className="lbl">Total em aberto</div>
        <div className="amt">{fmt(grandTotal)}</div>
        <div className="sub">
          {debtors.length} cliente{debtors.length !== 1 ? "s" : ""} devendo
        </div>
      </div>

      {debtors.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">🎉</div>
          <div className="empty-txt">Tudo em dia!</div>
          <div className="empty-sub">Nenhum cliente com dívidas pendentes</div>
        </div>
      ) : (
        debtors.map(c => (
          <div key={c.id} className="debt-card">
            <div>
              <div className="debt-name">👤 {c.name}</div>
              <div className="debt-amt">{fmt(c.debt)}</div>
              <div className="debt-sub">{c.count} venda{c.count !== 1 ? "s" : ""} em aberto</div>
            </div>
            <button className="btn btn-pay" onClick={() => setPayingId(c.id)}>
              💰 Pagar
            </button>
          </div>
        ))
      )}

      {payingId && payingClient && (
        <PaymentModal
          client={payingClient}
          unpaidSales={payingSales}
          onConfirm={amt => handleConfirm(payingId, amt)}
          onClose={() => setPayingId(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   SALES TAB
══════════════════════════════════════ */
function SalesTab({ clients, sales, updateSales, updateClients }) {
  const [clientId,    setClientId]    = useState("");
  const [cart,        setCart]        = useState({});
  const [payNow,      setPayNow]      = useState(true);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountVal, setDiscountVal] = useState("");
  const [useFreeItem, setUseFreeItem] = useState(false);
  const [success,     setSuccess]     = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);
  const loyalty        = selectedClient ? getLoyalty(selectedClient) : null;
  const canFree        = loyalty && loyalty.freeAvailable > 0;

  const cartItems   = PRODUCTS.map(p => ({ ...p, qty: cart[p.id] || 0 })).filter(p => p.qty > 0);
  const totalQty    = cartItems.reduce((a, p) => a + p.qty, 0);
  const subtotal    = cartItems.reduce((a, p) => a + p.qty * p.price, 0);
  const discountAmt = hasDiscount ? Math.max(0, parseFloat(discountVal.replace(",", ".")) || 0) : 0;
  const freeItemVal = useFreeItem && canFree && cartItems.length > 0
    ? Math.min(...cartItems.map(p => p.price)) : 0;
  const total       = Math.max(0, subtotal - discountAmt - freeItemVal);

  const adjustQty = (id, delta) => {
    setCart(prev => {
      const cur  = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const handleSubmit = () => {
    if (!clientId || cartItems.length === 0) return;

    const sale = {
      id:         genId(),
      clientId,
      clientName: selectedClient.name,
      date:       todayISO(),
      items:      cartItems.map(p => ({
        productId: p.id, productName: p.name,
        emoji: p.emoji, qty: p.qty, unitPrice: p.price,
      })),
      subtotal,
      discount:   discountAmt + freeItemVal,
      total,
      paid:       payNow,
      paidAt:     payNow ? todayISO() : null,
      usedFreeItem: useFreeItem && canFree,
    };

    updateSales([sale, ...sales]);

    const updatedClients = clients.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        totalConsumed: (c.totalConsumed || 0) + totalQty,
        freeUsed:      (c.freeUsed || 0) + (useFreeItem && canFree ? 1 : 0),
      };
    });
    updateClients(updatedClients);

    setCart({}); setClientId(""); setPayNow(true);
    setHasDiscount(false); setDiscountVal(""); setUseFreeItem(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  if (success) {
    return (
      <div className="tab" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 16 }}>Venda registrada!</div>
        <div style={{ color: "var(--muted)", marginTop: 8, fontWeight: 600 }}>
          {payNow ? "Pagamento recebido." : "Dívida registrada no fiado."}
        </div>
      </div>
    );
  }

  return (
    <div className="tab">
      <div className="sec">Nova Venda</div>

      {/* ── NOVA: busca de cliente ── */}
      <ClientSearch
        clients={clients}
        selectedId={clientId}
        onSelect={id => { setClientId(id); setUseFreeItem(false); }}
      />

      {selectedClient && canFree && (
        <div className="lbadge" style={{ marginBottom: 16 }}>
          🎁 {selectedClient.name} tem {loyalty.freeAvailable} lanche{loyalty.freeAvailable > 1 ? "s" : ""} grátis disponível!
        </div>
      )}

      <div className="sec">Produtos</div>
      <div className="pgrid">
        {PRODUCTS.map(p => (
          <div
            key={p.id}
            className={`pcard${(cart[p.id] || 0) > 0 ? " sel" : ""}`}
            onClick={() => adjustQty(p.id, 1)}
          >
            <div className="pe">{p.emoji}</div>
            <div className="pn">{p.name}</div>
            <div className="pp">{fmt(p.price)}</div>
            {(cart[p.id] || 0) > 0 && (
              <span className="pbadge">×{cart[p.id]}</span>
            )}
          </div>
        ))}
      </div>

      {cartItems.length > 0 && (
        <>
          <div className="sec">Carrinho</div>
          {cartItems.map(it => (
            <div key={it.id} className="cart-item">
              <div>
                <div className="cart-name">{it.emoji} {it.name}</div>
                <div className="cart-sub">{fmt(it.price)} cada</div>
              </div>
              <div className="qty-row">
                <button className="qbtn" onClick={() => adjustQty(it.id, -1)}>−</button>
                <span className="qnum">{it.qty}</span>
                <button className="qbtn add" onClick={() => adjustQty(it.id, 1)}>+</button>
              </div>
            </div>
          ))}

          {canFree && (
            <div className="chk-row" onClick={() => setUseFreeItem(!useFreeItem)}>
              <div className={`chk${useFreeItem ? " on" : ""}`}>{useFreeItem && "✓"}</div>
              <span className="chk-lbl">🎁 Usar lanche grátis (fidelidade)</span>
            </div>
          )}

          <div className="chk-row" onClick={() => setHasDiscount(!hasDiscount)}>
            <div className={`chk${hasDiscount ? " on" : ""}`}>{hasDiscount && "✓"}</div>
            <span className="chk-lbl">🏷️ Aplicar desconto</span>
          </div>

          {hasDiscount && (
            <div className="fg">
              <label className="flbl">Valor do desconto (R$)</label>
              <input
                className="finput"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={discountVal}
                onChange={e => setDiscountVal(e.target.value)}
              />
            </div>
          )}

          <div className="divider" />
          <div className="trow"><span className="tlbl">Subtotal</span><span className="tval">{fmt(subtotal)}</span></div>
          {discountAmt > 0 && (
            <div className="trow"><span className="tlbl">Desconto</span><span className="tval" style={{ color: "var(--green)" }}>−{fmt(discountAmt)}</span></div>
          )}
          {freeItemVal > 0 && (
            <div className="trow"><span className="tlbl">🎁 Lanche grátis</span><span className="tval" style={{ color: "var(--green)" }}>−{fmt(freeItemVal)}</span></div>
          )}
          <div className="trow big" style={{ marginTop: 8 }}>
            <span className="tlbl">Total</span><span className="tval">{fmt(total)}</span>
          </div>
          <div className="divider" />

          <div className="sec">Pagamento</div>
          <div className="tog">
            <button className={`tog-opt${payNow ? " on" : ""}`} onClick={() => setPayNow(true)}>💵 Pagar agora</button>
            <button className={`tog-opt${!payNow ? " on" : ""}`} onClick={() => setPayNow(false)}>📋 Pagar depois</button>
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={!clientId}>
            {payNow ? "✅ Confirmar venda" : "📋 Registrar no fiado"}
          </button>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   CLIENTS TAB
══════════════════════════════════════ */

/* ── Modal de cliente com edição de pontos ── */
function ClientModal({ client, onSave, onClose }) {
  const [name,   setName]   = useState(client?.name || "");
  // totalConsumed é a fonte de verdade; editamos diretamente
  const [points, setPoints] = useState(client?.totalConsumed || 0);

  const cycleProgress  = points % 10;
  const totalEarned    = Math.floor(points / 10);
  const freeUsed       = client?.freeUsed || 0;
  const freeAvailable  = Math.max(0, totalEarned - freeUsed);
  const currentCycle   = Math.floor(points / 10) + 1;

  const changePoints = delta => {
    setPoints(prev => Math.max(0, prev + delta));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), points);
  };

  return (
    <Modal title={client ? "✏️ Editar Cliente" : "Novo Cliente"} onClose={onClose}>
      <div className="fg">
        <label className="flbl">Nome</label>
        <input
          className="finput"
          placeholder="Ex: Maria Silva"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      {client && (
        <div className="fg">
          <label className="flbl">⭐ Pontos de Fidelidade</label>

          <div className="points-editor">
            <button
              className="points-btn minus"
              onClick={() => changePoints(-1)}
              disabled={points === 0}
            >−</button>
            <div className="points-display">{points}</div>
            <button
              className="points-btn plus"
              onClick={() => changePoints(1)}
            >+</button>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>pontos acumulados</span>
          </div>

          <div className="points-hint">
            A cada 10 pontos o cliente ganha 1 lanche grátis. Ciclo atual: {cycleProgress}/10
          </div>

          <div className="cycle-info">
            Ciclo <span>{currentCycle}</span> · {cycleProgress} ponto{cycleProgress !== 1 ? "s" : ""} no ciclo atual
            {freeAvailable > 0 && (
              <> · <span>{freeAvailable} lanche{freeAvailable > 1 ? "s" : ""} grátis disponível</span></>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>
              Progresso do ciclo atual
            </div>
            <LoyaltyDots progress={cycleProgress} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
        <button
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {client ? "Salvar Alterações" : "Cadastrar"}
        </button>
      </div>
    </Modal>
  );
}

function ClientsTab({ clients, sales, updateClients }) {
  const [showModal,     setShowModal]     = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // onSave agora recebe (name, totalConsumed)
  const handleSave = (name, totalConsumed) => {
    if (editingClient) {
      updateClients(clients.map(c =>
        c.id === editingClient.id
          ? { ...c, name, totalConsumed }
          : c
      ));
    } else {
      updateClients([...clients, {
        id: genId(), name,
        totalConsumed: 0, freeUsed: 0,
        createdAt: todayISO(),
      }]);
    }
    setShowModal(false); setEditingClient(null);
  };

  const handleDelete = id => {
    if (window.confirm("Excluir este cliente? As vendas associadas serão mantidas.")) {
      updateClients(clients.filter(c => c.id !== id));
    }
  };

  const debtMap = useMemo(() => {
    const m = {};
    sales.filter(s => !s.paid).forEach(s => {
      m[s.clientId] = (m[s.clientId] || 0) + s.total;
    });
    return m;
  }, [sales]);

  const totalMap = useMemo(() => {
    const m = {};
    sales.forEach(s => { m[s.clientId] = (m[s.clientId] || 0) + s.total; });
    return m;
  }, [sales]);

  return (
    <div className="tab">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="sec" style={{ marginBottom: 0 }}>{clients.length} cliente{clients.length !== 1 ? "s" : ""}</div>
        <button
          className="btn btn-primary"
          style={{ padding: "10px 16px", fontSize: 14, width: "auto" }}
          onClick={() => { setEditingClient(null); setShowModal(true); }}
        >
          + Novo
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">👥</div>
          <div className="empty-txt">Nenhum cliente cadastrado</div>
          <div className="empty-sub">Cadastre seu primeiro cliente acima</div>
        </div>
      ) : (
        clients.map(client => {
          const { cycleProgress, freeAvailable, consumed } = getLoyalty(client);
          const debt = debtMap[client.id] || 0;
          return (
            <div key={client.id} className="cc">
              <div className="cc-hdr">
                <div>
                  <div className="cc-name">👤 {client.name}</div>
                  {debt > 0 && (
                    <div style={{ color: "var(--red)", fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                      Deve {fmt(debt)}
                    </div>
                  )}
                  {debt === 0 && totalMap[client.id] > 0 && (
                    <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                      ✓ Em dia
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-icon" onClick={() => { setEditingClient(client); setShowModal(true); }}>✏️</button>
                  <button className="btn-icon" onClick={() => handleDelete(client.id)}>🗑️</button>
                </div>
              </div>

              <div className="cc-lbl">⭐ Fidelidade — {consumed} ponto{consumed !== 1 ? "s" : ""}</div>
              <LoyaltyDots progress={cycleProgress} />

              {freeAvailable > 0 && (
                <div className="lbadge">
                  🎁 Resgate disponível! Troque por {freeAvailable} lanche{freeAvailable > 1 ? "s" : ""} grátis.
                </div>
              )}
            </div>
          );
        })
      )}

      {showModal && (
        <ClientModal
          client={editingClient}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   EXPORT / IMPORT TAB
══════════════════════════════════════ */
function ExportTab({ clients, sales, updateClients, updateSales }) {
  const [importText, setImportText] = useState("");
  const [msg,        setMsg]        = useState(null);

  const notify = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleExport = () => {
    const payload = { exportedAt: new Date().toISOString(), version: 2, clients, sales };
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url     = URL.createObjectURL(blob);
    const a       = Object.assign(document.createElement("a"), { href: url, download: `lanchonete_${todayISO()}.json` });
    a.click();
    URL.revokeObjectURL(url);
    notify("✅ Backup exportado com sucesso!");
  };

  const doImport = text => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.clients) || !Array.isArray(data.sales))
        throw new Error("Formato inválido — verifique o arquivo.");
      updateClients(data.clients);
      updateSales(data.sales);
      notify(`✅ Importados: ${data.clients.length} clientes e ${data.sales.length} vendas.`);
      setImportText("");
    } catch (e) {
      notify("❌ Erro: " + e.message, false);
    }
  };

  const handleFileImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => doImport(ev.target.result);
    reader.readAsText(file);
  };

  const totalRevenue = sales.filter(s => s.paid).reduce((a, s) => a + s.total, 0);
  const totalPending = sales.filter(s => !s.paid).reduce((a, s) => a + s.total, 0);
  const totalCost    = sales.reduce((a, s) =>
    a + s.items.reduce((b, it) => {
      const p = PRODUCTS.find(p => p.id === it.productId);
      return b + (p ? p.cost * it.qty : 0);
    }, 0), 0);
  const totalItems   = sales.reduce((a, s) => a + s.items.reduce((b, it) => b + it.qty, 0), 0);

  return (
    <div className="tab">
      <div className="sum-card" style={{ background: "linear-gradient(135deg,#1e293b,#334155)" }}>
        <div className="lbl">Resumo Geral</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {[
            ["👥 Clientes",   clients.length],
            ["🧾 Vendas",     sales.length],
            ["📦 Itens",      totalItems],
            ["💰 Recebido",   fmt(totalRevenue)],
            ["📋 Pendente",   fmt(totalPending)],
            ["📊 Lucro est.", fmt(totalRevenue - totalCost)],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 11, opacity: .7, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.ok ? "var(--green-light)" : "var(--red-light)",
          border: `2px solid ${msg.ok ? "var(--green)" : "var(--red)"}`,
          borderRadius: 10, padding: "10px 14px",
          fontWeight: 700, fontSize: 14, marginBottom: 12,
          color: msg.ok ? "var(--green)" : "var(--red)",
        }}>
          {msg.text}
        </div>
      )}

      <div className="exp-card">
        <div className="exp-title">📤 Exportar Dados</div>
        <div className="exp-desc">Baixe um backup JSON com todos os clientes, vendas e pontos de fidelidade.</div>
        <button className="btn btn-primary" onClick={handleExport}>⬇️ Baixar backup JSON</button>
      </div>

      <div className="exp-card">
        <div className="exp-title">📥 Importar Dados</div>
        <div className="exp-desc">
          Restaure dados de um backup anterior. <strong>Atenção:</strong> os dados atuais serão substituídos.
        </div>
        <label className="btn btn-outline" style={{ cursor: "pointer", marginBottom: 12 }}>
          📂 Escolher arquivo JSON
          <input type="file" accept=".json" style={{ display: "none" }} onChange={handleFileImport} />
        </label>
        <div className="fg">
          <label className="flbl">Ou cole o JSON aqui</label>
          <textarea
            className="finput"
            style={{ height: 90, resize: "vertical", fontSize: 12, fontFamily: "monospace" }}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='{"version":2,"clients":[...],"sales":[...]}'
          />
        </div>
        {importText.trim() && (
          <button className="btn btn-success" onClick={() => doImport(importText)}>
            ✅ Importar e substituir dados
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   BOTTOM NAV
══════════════════════════════════════ */
function BottomNav({ tab, setTab, pendingCount }) {
  return (
    <nav className="bnav">
      {TABS.map(t => (
        <button key={t.id} className={`nbtn${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
          <span className="ni">{t.icon}</span>
          <span className="nl">{t.label}</span>
          {t.id === "billing" && pendingCount > 0 && (
            <span className="nbadge">{pendingCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

/* ══════════════════════════════════════
   ROOT APP
══════════════════════════════════════ */
export default function App() {
  const [clients, setClients] = useState([]);
  const [sales,   setSales]   = useState([]);
  const [tab,     setTab]     = useState("billing");
  const [ready,   setReady]   = useState(false);

  // Carregamento inicial
  useEffect(() => {
    const savedClients = storageLoad(SK.C);
    const savedSales   = storageLoad(SK.S);
    
    if (savedClients) setClients(savedClients);
    if (savedSales)   setSales(savedSales);
    
    setReady(true);
  }, []);

  // Funções de atualização que também salvam no cache
  const updateClients = useCallback(c => { 
    const newClients = typeof c === 'function' ? c(clients) : c;
    setClients(newClients); 
    storageSave(SK.C, newClients); 
  }, [clients]);

  const updateSales = useCallback(s => { 
    const newSales = typeof s === 'function' ? s(sales) : s;
    setSales(newSales);   
    storageSave(SK.S, newSales); 
  }, [sales]);
  const pendingCount = useMemo(() => {
    return new Set(sales.filter(s => !s.paid).map(s => s.clientId)).size;
  }, [sales]);

  if (!ready) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "'Nunito', sans-serif",
        background: "linear-gradient(135deg, #EA1D2C, #FF6900)",
        color: "#fff", flexDirection: "column", gap: 16,
      }}>
        <div style={{ fontSize: 52 }}>🍕</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Lanchonete Pro</div>
        <div style={{ fontSize: 14, opacity: .8, fontWeight: 600 }}>Carregando dados...</div>
      </div>
    );
  }

  const tabProps = { clients, sales, updateClients, updateSales };

  return (
    <div className="app">
      <style>{CSS}</style>

      <header className="hdr">
        <div className="hdr-logo">🍕 Lanchonete <span>Pro</span></div>
        <div className="hdr-sub">
          {clients.length} cliente{clients.length !== 1 ? "s" : ""} · {sales.length} venda{sales.length !== 1 ? "s" : ""}
        </div>
      </header>

      <main>
        {tab === "billing"  && <BillingTab  {...tabProps} />}
        {tab === "new-sale" && <SalesTab    {...tabProps} />}
        {tab === "clients"  && <ClientsTab  {...tabProps} />}
        {tab === "data"     && <ExportTab   {...tabProps} />}
      </main>

      <BottomNav tab={tab} setTab={setTab} pendingCount={pendingCount} />
    </div>
  );
}
