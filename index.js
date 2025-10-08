// index.js
// Handler command (tanpa pairing). Dipanggil dari main.js
// require('./index.js')(ziole, processedMsg, store)

const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const { format, addDays } = require("date-fns");
const idLocale = require("date-fns/locale/id");

// -------------------- Config / Paths --------------------
const DATA_DIR = "./data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  AUTO: path.join(DATA_DIR, "autoMessages.json"),
  KAS: path.join(DATA_DIR, "kas.json"),
  PIKET: path.join(DATA_DIR, "piket.json"),
  HARIAN_TEMPLATES: path.join(DATA_DIR, "harianTemplates.json"),
  HARIAN_AUTO: path.join(DATA_DIR, "harianAuto.json"),
  PR: path.join(DATA_DIR, "pr.json"),
  ABSEN: path.join(DATA_DIR, "absen.json"),
  EVENT: path.join(DATA_DIR, "event.json"),
  SETTINGS: path.join(".", "settings.json"),
  MYREM: path.join(DATA_DIR, "myrem.json"),
  MYPR: path.join(DATA_DIR, "mypr.json"),
  MYNOTES: path.join(DATA_DIR, "mynotes.json"),
};

// ensure files exist with sane defaults
const _ensure = (p, init) => {
  if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(init, null, 2));
};
_ensure(FILES.AUTO, []);
_ensure(FILES.KAS, {});
_ensure(FILES.PIKET, {});
_ensure(FILES.HARIAN_TEMPLATES, {});
_ensure(FILES.HARIAN_AUTO, []);
_ensure(FILES.PR, {});
_ensure(FILES.ABSEN, {});
_ensure(FILES.EVENT, []);
_ensure(FILES.SETTINGS, { allowedAdmins: [], memberList: [], versibot: "2.0", kelas: "VIII.1" });
_ensure(FILES.MYREM, {});
_ensure(FILES.MYPR, {});
_ensure(FILES.MYNOTES, {});

// -------------------- Helpers --------------------
function readJSON(p, fallback = null) {
  try {
    if (!fs.existsSync(p)) return fallback;
    const raw = fs.readFileSync(p, "utf8") || "null";
    return JSON.parse(raw) ?? fallback;
  } catch (e) {
    console.error("readJSON error", p, e);
    return fallback;
  }
}
function writeJSON(p, obj) {
  try { fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8"); }
  catch (e) { console.error("writeJSON error", p, e); }
}
function cancelPrefix(prefix) {
  Object.keys(schedule.scheduledJobs).forEach(k => { if (k.startsWith(prefix)) schedule.cancelJob(k); });
}

// -------------------- Default mapel --------------------
const JADWAL_MAPEL = {
  senin: ["INFOR", "BINA", "MAT", "PJOK", "BING", "Prakarya", "PA", "PA"],
  selasa: ["IPA", "IPA", "MAT", "BING", "PA", "PJOK", "BINA"],
  rabu: ["IPA", "IPA", "MAT", "MAT", "IPS", "PJOK", "BINA"],
  kamis: ["INFOR", "BINA", "BING", "MAT", "PKn"],
  jumat: ["IPS", "PKn", "Prakarya", "IPA"]
};

// -------------------- Scheduling functions --------------------
function scheduleAllAutoMessages(ziole) {
  cancelPrefix("auto-");
  const auto = readJSON(FILES.AUTO, []) || [];
  auto.forEach((a, i) => {
    try {
      const [hh, mm] = a.time.split(":").map(s => parseInt(s, 10));
      const rule = new schedule.RecurrenceRule();
      rule.hour = hh; rule.minute = mm; rule.tz = "Asia/Jakarta";
      if (Array.isArray(a.days) && a.days.length) rule.dayOfWeek = a.days;
      schedule.scheduleJob(`auto-${i}`, rule, async () => {
        try { await ziole.sendMessage(a.groupJid, { text: a.text }); }
        catch (e) { console.error("auto send fail", e); }
      });
    } catch (e) { console.error("scheduleAllAutoMessages error", e); }
  });
}

function scheduleHarian(ziole) {
  cancelPrefix("harian-");
  const harian = readJSON(FILES.HARIAN_AUTO, []) || [];
  harian.forEach((h, idx) => {
    try {
      const [hh, mm] = h.time.split(":").map(s => parseInt(s, 10));
      const rule = new schedule.RecurrenceRule();
      rule.hour = hh; rule.minute = mm; rule.tz = "Asia/Jakarta";
      if (Array.isArray(h.days) && h.days.length) rule.dayOfWeek = h.days;
      schedule.scheduleJob(`harian-${idx}`, rule, async () => {
        try {
          const besok = addDays(new Date(), 1);
          const tanggal = format(besok, "EEEE, dd MMMM yyyy", { locale: idLocale });
          const templates = readJSON(FILES.HARIAN_TEMPLATES, {}) || {};
          const template = templates[h.dayKey] || {};
          const piket = readJSON(FILES.PIKET, {}) || {};
          const piketList = (piket[h.dayKey] || []).map(n => `• ${n}`).join("\n") || "• Belum ada data";
          const seragam = template.seragam || "-";
          const mapel = (template.mapel || JADWAL_MAPEL[h.dayKey] || []).map(m => `• ${m}`).join("\n") || "-";
          const pr = (template.pr || []).map(p => `• ${p}`).join("\n") || "-";

          const pesan = `Assalamualaikum wr. wb.\nselamat malam semuanya\n🗓️ besok:\n•${tanggal}\n\n👔 SERAGAM:\n${seragam}\n\n📚 Mapel pelajaran\n${mapel}\n\n📌 PR:\n${pr}\n\n🧹YANG BESOK PIKET🧹\n${piketList}\n\n📌datang lebih awal dan jika tidak melaksanakan piket dikenakan sanksi.`;
          await ziole.sendMessage(h.groupJid, { text: pesan });
        } catch (e) { console.error("harian send error", e); }
      });
    } catch (e) { console.error("scheduleHarian error", e); }
  });
}

// personal reminder scheduler
function schedulePersonalReminders(ziole) {
  cancelPrefix("myrem-");
  const myrem = readJSON(FILES.MYREM, {}) || {};
  Object.keys(myrem).forEach((jid) => {
    (myrem[jid] || []).forEach((r, idx) => {
      try {
        const [hh, mm] = r.time.split(":").map(s => parseInt(s, 10));
        const rule = new schedule.RecurrenceRule();
        rule.hour = hh; rule.minute = mm; rule.tz = "Asia/Jakarta";
        schedule.scheduleJob(`myrem-${jid}-${idx}`, rule, async () => {
          try {
            await ziole.sendMessage(jid, { text: `⏰ Reminder!\n${r.text}` });
          } catch (e) { console.error("send personal reminder fail:", e); }
        });
      } catch (e) { console.error("schedulePersonalReminders error", e); }
    });
  });
}

// schedule once on load flag
let _initedSchedules = false;
function _ensureSchedules(ziole) {
  if (_initedSchedules) return;
  _initedSchedules = true;
  try { scheduleAllAutoMessages(ziole); } catch {}
  try { scheduleHarian(ziole); } catch {}
  try { schedulePersonalReminders(ziole); } catch {}
}

// -------------------- Command handler --------------------
module.exports = async (ziole, m, store) => {
  try {
    _ensureSchedules(ziole);

    const from = m.key?.remoteJid || m.chat || "";
    const participant = m.key?.participant || m.sender || "";
    const senderNumber = String(participant).split("@")[0];

    // text
    let body = "";
    if (m.message?.conversation) body = m.message.conversation;
    else if (m.message?.extendedTextMessage?.text) body = m.message.extendedTextMessage.text;
    else if (m.message?.imageMessage?.caption) body = m.message.imageMessage.caption;
    else if (typeof m.text === "string") body = m.text;
    body = String(body || "").trim();
    if (!body) return;

    const settings = readJSON(FILES.SETTINGS, {});
    const allowedAdmins = (settings.allowedAdmins || []).map(n => String(n));

    const prefix = ".";
    if (!body.startsWith(prefix)) return;

    const parts = body.slice(prefix.length).trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const text = args.join(" ");

    const reply = async (txt) => {
      try { await ziole.sendMessage(from, { text: String(txt) }, { quoted: m }); }
      catch (e) { console.error("reply error", e); }
    };
    const isAdmin = (num) => allowedAdmins.includes(String(num));

    // ================ SWITCH COMMAND =================
    switch (command) {
      // HELP
      case "menu":
case "help": {
  const kelas = settings.kelas || "VIII.1";
  const versi = settings.versibot || "2.0";

  const menuText = `👋 Hai semua!  
Bot Kelas *${kelas}* (v${versi}) siap membantu 🎓  
by bhimantara
free and floss
━━━━━━━━━━━━━━━
📌 *Fitur Umum*
━━━━━━━━━━━━━━━
• .ping  → tes bot hidup  
• .menu  → lihat menu ini  

━━━━━━━━━━━━━━━
📚 *Pelajaran & PR*
━━━━━━━━━━━━━━━
• .previewharian <hari>  
• .setharian <hari> <seragam|mapel|pr> <isi> (admin)  
• .autoharian <hari> <HH:MM> <groupJid> (admin)  
• .addpr <hari> <mapel> <deskripsi> (admin)  
• .listpr <hari>  
• .removepr <hari> <mapel> (admin)  

━━━━━━━━━━━━━━━
🧹 *Piket*
━━━━━━━━━━━━━━━
• .addpiket <hari> <nama1,nama2> (admin)  
• .listpiket <hari>  
• .piketremove <hari> <nama> (admin)  

━━━━━━━━━━━━━━━
💰 *Kas Kelas*
━━━━━━━━━━━━━━━
• .bayarkas <nama> (admin)  
• .listkas  
• .kasrekap (admin)  

━━━━━━━━━━━━━━━
📋 *Absen*
━━━━━━━━━━━━━━━
• .absen mulai|stop (admin)  
• .hadir  
• .listabsen (admin)  

━━━━━━━━━━━━━━━
📅 *Event*
━━━━━━━━━━━━━━━
• .addevent <YYYY-MM-DD> <judul> (admin)  
• .listevent  
• .removeevent <id> (admin)  

━━━━━━━━━━━━━━━
🔁 *Auto Messages*
━━━━━━━━━━━━━━━
• .setoauto <HH:MM> <groupJid> <pesan> (admin)  
• .listauto (admin)  
• .removeauto <id> (admin)  

━━━━━━━━━━━━━━━
👤 *Fitur Pribadi (DM saja)*
━━━━━━━━━━━━━━━
• .myreminder <HH:MM> <pesan>  
• .mylistrem  
• .delrem <id>  
• .mypr add|list|remove  
• .mynotes add|list|remove  

━━━━━━━━━━━━━━━
🛠️ *Admin Tools*
━━━━━━━━━━━━━━━
• .addadmin <nomor> <password>  
• .deladmin <nomor> <password>  
• .addmembers (scan semua member grup → memberList)  
• .listmembers  
• .removemember <nomor>  
━━━━━━━━━━━━━━━
> jika ada yang eror hubungi saya 6281250555198
`;

  return reply(menuText);
}

      // PERSONAL REMINDER
      case "myreminder": {
        if (from.endsWith("@g.us")) return reply("❌ Hanya bisa di DM");
        if (args.length < 2) return reply("Gunakan: .myreminder <HH:MM> <pesan>");
        const [time, ...rest] = args;
        const pesan = rest.join(" ");
        const myrem = readJSON(FILES.MYREM, {}) || {};
        myrem[participant] = myrem[participant] || [];
        myrem[participant].push({ id: Date.now(), time, text: pesan });
        writeJSON(FILES.MYREM, myrem);
        schedulePersonalReminders(ziole);
        return reply("✅ Reminder pribadi diset");
      }

      case "mylistrem": {
        if (from.endsWith("@g.us")) return;
        const myrem = readJSON(FILES.MYREM, {}) || {};
        const list = myrem[participant] || [];
        if (!list.length) return reply("Belum ada reminder");
        let out = "📌 Reminder kamu:\n";
        list.forEach((r,i)=> out += `${i+1}. [${r.time}] ${r.text} (id:${r.id})\n`);
        return reply(out);
      }

      case "delrem": {
        if (from.endsWith("@g.us")) return;
        const myrem = readJSON(FILES.MYREM, {}) || {};
        const list = myrem[participant] || [];
        if (!list.length) return reply("Tidak ada reminder");
        const id = args[0];
        let idx = list.findIndex(r => String(r.id) === id);
        if (idx === -1 && !isNaN(parseInt(id))) idx = parseInt(id)-1;
        if (idx < 0 || idx >= list.length) return reply("ID tidak valid");
        const removed = list.splice(idx,1);
        myrem[participant] = list;
        writeJSON(FILES.MYREM, myrem);
        schedulePersonalReminders(ziole);
        return reply(`✅ Reminder dihapus: ${removed[0].text}`);
      }

      // MYPR
      case "mypr": {
        if (from.endsWith("@g.us")) return;
        const mypr = readJSON(FILES.MYPR, {}) || {};
        mypr[participant] = mypr[participant] || [];
        const sub = args[0];
        if (sub === "add") {
          if (args.length < 3) return reply("Gunakan: .mypr add <mapel> <deskripsi>");
          const mapel = args[1]; const desc = args.slice(2).join(" ");
          mypr[participant].push({ id: Date.now(), mapel, desc });
          writeJSON(FILES.MYPR, mypr);
          return reply(`✅ PR ${mapel} ditambahkan`);
        } else if (sub === "list") {
          const list = mypr[participant];
          if (!list.length) return reply("Belum ada PR pribadi");
          let out = "📚 PR pribadi:\n";
          list.forEach((p,i)=> out += `${i+1}. ${p.mapel} - ${p.desc}\n`);
          return reply(out);
        } else if (sub === "remove") {
          const idx = parseInt(args[1]) - 1;
          if (isNaN(idx) || !mypr[participant][idx]) return reply("Index tidak valid");
          const removed = mypr[participant].splice(idx,1);
          writeJSON(FILES.MYPR, mypr);
          return reply(`✅ PR dihapus: ${removed[0].mapel}`);
        } else return reply("Gunakan: .mypr add|list|remove");
      }

      // MYNOTES
      case "mynotes": {
        if (from.endsWith("@g.us")) return;
        const notes = readJSON(FILES.MYNOTES, {}) || {};
        notes[participant] = notes[participant] || [];
        const sub = args[0];
        if (sub === "add") {
          if (args.length < 2) return reply("Gunakan: .mynotes add <isi>");
          const isi = args.slice(1).join(" ");
          notes[participant].push({ id: Date.now(), isi });
          writeJSON(FILES.MYNOTES, notes);
          return reply("✅ Catatan ditambahkan");
        } else if (sub === "list") {
          const list = notes[participant];
          if (!list.length) return reply("Belum ada catatan");
          let out = "📝 Catatan kamu:\n";
          list.forEach((n,i)=> out += `${i+1}. ${n.isi}\n`);
          return reply(out);
        } else if (sub === "remove") {
          const idx = parseInt(args[1]) - 1;
          if (isNaN(idx) || !notes[participant][idx]) return reply("Index tidak valid");
          const removed = notes[participant].splice(idx,1);
          writeJSON(FILES.MYNOTES, notes);
          return reply(`✅ Catatan dihapus: ${removed[0].isi}`);
        } else return reply("Gunakan: .mynotes add|list|remove");
      }

      case "previewharian": {
        const hari = args[0]?.toLowerCase();
        if (!hari) return reply("Gunakan: .previewharian <hari>");
        if (!JADWAL_MAPEL[hari]) return reply("Hari tidak valid (senin..jumat).");
        const templates = readJSON(FILES.HARIAN_TEMPLATES, {}) || {};
        const t = templates[hari] || { seragam: "-", mapel: JADWAL_MAPEL[hari], pr: [] };
        const piket = readJSON(FILES.PIKET, {}) || {};
        const piketList = (piket[hari] || []).map(n => `• ${n}`).join("\n") || "• Belum ada data";
        const tanggal = format(addDays(new Date(), 1), "EEEE, dd MMMM yyyy", { locale: idLocale });
        return reply(`🗓️ besok:\n•${tanggal}\n\n👔 SERAGAM:\n${t.seragam}\n\n📚 Mapel pelajaran\n${(t.mapel || []).map(m => `• ${m}`).join("\n")}\n\n📌 PR:\n${(t.pr || []).map(p => `• ${p}`).join("\n") || "•Tidak ada PR"}\n\n🧹YANG BESOK PIKET🧹\n${piketList}`);
      }

      case "setharian": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (args.length < 3) return reply("Gunakan: .setharian <hari> <seragam|mapel|pr> <nilai...>");
        const [hari, type, ...rest] = args;
        const templates = readJSON(FILES.HARIAN_TEMPLATES, {}) || {};
        templates[hari] = templates[hari] || {};
        if (type === "seragam") templates[hari].seragam = rest.join(" ");
        else if (type === "mapel") templates[hari].mapel = rest;
        else if (type === "pr") templates[hari].pr = rest;
        else return reply("type harus: seragam | mapel | pr");
        writeJSON(FILES.HARIAN_TEMPLATES, templates);
        return reply(`✅ Template harian untuk ${hari} disimpan.`);
      }

      case "autoharian": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (args.length < 3) return reply("Gunakan: .autoharian <hari> <HH:MM> <groupJid>");
        const [hari, waktu, groupJid] = args;
        const days = []; // you can map hari -> dayOfWeek if needed; leave for admin to pass day array later
        const harianAuto = readJSON(FILES.HARIAN_AUTO, []) || [];
        harianAuto.push({ dayKey: hari, days, time: waktu, groupJid });
        writeJSON(FILES.HARIAN_AUTO, harianAuto);
        scheduleHarian(ziole);
        return reply("✅ Autoharian disimpan dan dijadwalkan.");
      }

      // ---------- PIKET ----------
      case "addpiket":
      case "piketadd": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (args.length < 2) return reply("Gunakan: .addpiket <hari> <name1,name2>");
        const hari = args[0].toLowerCase();
        const names = args.slice(1).join(" ").split(",").map(s => s.trim()).filter(Boolean);
        const piket = readJSON(FILES.PIKET, {}) || {};
        piket[hari] = Array.from(new Set([...(piket[hari] || []), ...names]));
        writeJSON(FILES.PIKET, piket);
        return reply(`✅ Piket ${hari} diset: ${piket[hari].join(", ")}`);
      }

      case "listpiket": {
        if (args.length < 1) return reply("Gunakan: .listpiket <hari>");
        const hari = args[0].toLowerCase();
        const piket = readJSON(FILES.PIKET, {}) || {};
        const list = piket[hari] || [];
        return reply(`🧹 Piket ${hari}:\n${list.length ? list.join("\n") : "Belum ada data"}`);
      }

      case "piketremove": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (args.length < 2) return reply("Gunakan: .piketremove <hari> <name>");
        const hari = args[0].toLowerCase();
        const name = args.slice(1).join(" ").trim();
        const piket = readJSON(FILES.PIKET, {}) || {};
        piket[hari] = (piket[hari] || []).filter(x => x !== name);
        writeJSON(FILES.PIKET, piket);
        return reply(`✅ ${name} dihapus dari piket ${hari}`);
      }

      // ---------- PR ----------
      case "addpr": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (args.length < 3) return reply("Gunakan: .addpr <hari> <mapel> <deskripsi>");
        const [hari, mapel, ...descArr] = args;
        const desc = descArr.join(" ");
        const pr = readJSON(FILES.PR, {}) || {};
        pr[hari] = pr[hari] || [];
        pr[hari].push({ mapel, desc });
        writeJSON(FILES.PR, pr);
        return reply(`✅ PR ditambahkan untuk ${mapel} (${hari})`);
      }

      case "listpr": {
        if (args.length < 1) return reply("Gunakan: .listpr <hari>");
        const hari = args[0].toLowerCase();
        const pr = readJSON(FILES.PR, {}) || {};
        const list = pr[hari] || [];
        if (!list.length) return reply(`📌 PR ${hari}: Belum ada`);
        let out = `📌 PR ${hari}:\n`;
        list.forEach((p, i) => out += `${i + 1}. ${p.mapel} - ${p.desc}\n`);
        return reply(out);
      }

      case "removepr": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (args.length < 2) return reply("Gunakan: .removepr <hari> <mapel>");
        const [hari, mapel] = args;
        const pr = readJSON(FILES.PR, {}) || {};
        pr[hari] = (pr[hari] || []).filter(p => p.mapel !== mapel);
        writeJSON(FILES.PR, pr);
        return reply(`✅ PR ${mapel} di ${hari} dihapus`);
      }

      // ---------- KAS ----------
      case "bayarkas": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (!args[0]) return reply("Gunakan: .bayarkas <nama>");
        const nama = args[0];
        const kas = readJSON(FILES.KAS, {}) || {};
        kas[nama] = (kas[nama] || 0) + 2000;
        writeJSON(FILES.KAS, kas);
        return reply(`✅ ${nama} membayar kas Rp2000. Total: Rp${kas[nama]}`);
      }

      case "listkas": {
        const kas = readJSON(FILES.KAS, {}) || {};
        const keys = Object.keys(kas);
        if (!keys.length) return reply("Belum ada data kas");
        let out = "📒 Daftar Kas:\n";
        keys.forEach(k => out += `• ${k}: Rp${kas[k]}\n`);
        return reply(out);
      }

      case "kasrekap": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        const kas = readJSON(FILES.KAS, {}) || {};
        const total = Object.values(kas).reduce((a, b) => a + b, 0);
        return reply(`📊 Total kas: Rp${total}`);
      }

      // ---------- ABSEN ----------
      case "absen": {
        // .absen mulai / .absen stop
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        const sub = args[0]?.toLowerCase();
        const absen = readJSON(FILES.ABSEN, {}) || {};
        if (sub === "mulai" || sub === "start") {
          absen[from] = { started: true, list: [] , startedAt: Date.now()};
          writeJSON(FILES.ABSEN, absen);
          return reply("✅ Absen dimulai, peserta ketik .hadir untuk hadir");
        } else if (sub === "stop" || sub === "selesai") {
          if (!absen[from] || !absen[from].started) return reply("Absen belum dimulai");
          absen[from].started = false;
          writeJSON(FILES.ABSEN, absen);
          return reply("✅ Absen dihentikan");
        } else return reply("Gunakan: .absen mulai|stop");
      }

      case "hadir": {
        const absen = readJSON(FILES.ABSEN, {}) || {};
        if (!absen[from] || !absen[from].started) return reply("Absen belum dimulai");
        if (absen[from].list.includes(participant)) return reply("Kamu sudah hadir");
        absen[from].list.push(participant);
        writeJSON(FILES.ABSEN, absen);
        return reply("✅ Kehadiran dicatat");
      }

      case "listabsen": {
        const absen = readJSON(FILES.ABSEN, {}) || {};
        const data = absen[from];
        if (!data) return reply("Belum ada absen untuk grup ini");
        const lines = (data.list || []).map((u,i) => `${i+1}. ${String(u).split("@")[0]}`);
        return reply(`📋 Daftar hadir:\n${lines.join("\n") || "Kosong"}`);
      }

      // ---------- EVENT ----------
      case "addevent": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (args.length < 2) return reply("Gunakan: .addevent <YYYY-MM-DD> <judul>");
        const tanggal = args[0];
        const judul = args.slice(1).join(" ");
        const ev = readJSON(FILES.EVENT, []) || [];
        ev.push({ id: Date.now(), tanggal, judul, group: from });
        writeJSON(FILES.EVENT, ev);
        return reply("✅ Event ditambahkan");
      }

      case "listevent": {
        const ev = (readJSON(FILES.EVENT, []) || []).filter(e => e.group === from);
        if (!ev.length) return reply("Belum ada event di grup ini");
        const out = ev.map((e,i)=> `${i+1}. [${e.tanggal}] ${e.judul} (id:${e.id})`).join("\n");
        return reply("📅 Daftar Event:\n" + out);
      }

      case "removeevent": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        if (!args[0]) return reply("Gunakan: .removeevent <id>");
        const id = args[0];
        let ev = readJSON(FILES.EVENT, []) || [];
        const idx = ev.findIndex(x => String(x.id) === String(id) && x.group === from);
        if (idx === -1) return reply("Event tidak ditemukan");
        const removed = ev.splice(idx,1);
        writeJSON(FILES.EVENT, ev);
        return reply(`✅ Event dihapus: ${removed[0].judul}`);
      }

      // ---------- AUTO MESSAGES ----------
      case "setoauto": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        // .setoauto <HH:MM> <groupJid> <pesan>
        if (args.length < 3) return reply("Gunakan: .setoauto <HH:MM> <groupJid> <pesan>");
        const [time, groupJid, ...rest] = args;
        const pesan = rest.join(" ");
        const auto = readJSON(FILES.AUTO, []) || [];
        auto.push({ time, groupJid, text: pesan, days: [] });
        writeJSON(FILES.AUTO, auto);
        scheduleAllAutoMessages(ziole);
        return reply("✅ Auto message diset");
      }

      case "listauto": {
        const auto = readJSON(FILES.AUTO, []) || [];
        if (!auto.length) return reply("Belum ada auto message");
        return reply("🔁 Auto Messages:\n" + auto.map((a,i)=> `${i+1}. ${a.time} -> ${a.text}`).join("\n"));
      }

      case "removeauto": {
        if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
        const idx = parseInt(args[0]) - 1;
        const auto = readJSON(FILES.AUTO, []) || [];
        if (isNaN(idx) || !auto[idx]) return reply("Index tidak valid");
        const removed = auto.splice(idx,1);
        writeJSON(FILES.AUTO, auto);
        scheduleAllAutoMessages(ziole);
        return reply(`✅ Auto msg dihapus: ${removed[0].text}`);
      }
      case "addmembers": {
  if (!isAdmin(senderNumber)) return reply("❌ Anda tidak punya izin.");
  if (!from.endsWith("@g.us")) return reply("❌ Command ini hanya bisa dipakai di grup.");

  try {
    // Ambil metadata grup
    const metadata = await ziole.groupMetadata(from);
    const participants = metadata.participants.map(p => p.id.replace(/@s.whatsapp.net$/, ""));

    const settings = readJSON(FILES.SETTINGS, {});
    const admins = settings.allowedAdmins || [];
    settings.memberList = settings.memberList || [];

    let added = [];
    participants.forEach(num => {
      if (!admins.includes(num) && !settings.memberList.includes(num)) {
        settings.memberList.push(num);
        added.push(num);
      }
    });

    writeJSON(FILES.SETTINGS, settings);

    if (added.length) {
      return reply(`✅ Ditambahkan ${added.length} member ke memberList.\n${added.join(", ")}`);
    } else {
      return reply("⚠️ Tidak ada member baru yang ditambahkan.");
    }
  } catch (e) {
    console.error("addmembers error:", e);
    return reply("❌ Gagal mengambil data grup.");
  }
}
// ----------- ADMIN MANAGEMENT ------------
case "addadmin": {
  if (args.length < 2) return reply("Gunakan: .addadmin <nomor> <password>");
  const nomor = args[0];
  const pass = args[1];

  const settings = readJSON(FILES.SETTINGS, {});
  const adminPass = settings.adminPassword || "12345"; // default

  if (pass !== adminPass) return reply("❌ Password salah!");

  if (!settings.allowedAdmins.includes(nomor)) {
    settings.allowedAdmins.push(nomor);
    writeJSON(FILES.SETTINGS, settings);
    return reply(`✅ Admin baru ditambahkan: ${nomor}`);
  } else {
    return reply("⚠️ Nomor sudah jadi admin.");
  }
}

case "deladmin": {
  if (args.length < 2) return reply("Gunakan: .deladmin <nomor> <password>");
  const nomor = args[0];
  const pass = args[1];

  const settings = readJSON(FILES.SETTINGS, {});
  const adminPass = settings.adminPassword || "12345";

  if (pass !== adminPass) return reply("❌ Password salah!");

  const idx = settings.allowedAdmins.indexOf(nomor);
  if (idx !== -1) {
    settings.allowedAdmins.splice(idx, 1);
    writeJSON(FILES.SETTINGS, settings);
    return reply(`✅ Admin ${nomor} dihapus.`);
  } else {
    return reply("⚠️ Nomor bukan admin.");
  }
}

    }
  } catch (err) {
    console.error("index.js handler error:", err);
  }
};
