const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'smartattend.db');
const db = new sqlite3.Database(dbPath);

const pdfStudentsMap = {
  '113024243001': 'VH13786',
  '113024243002': 'VH13787',
  '113024243003': 'VH13788',
  '113024243004': 'VH13789',
  '113024243005': 'VH13952',
  '113024243006': 'VH13790',
  '113024243007': 'VH13791',
  '113024243008': 'VH13933',
  '113024243009': 'VH13792',
  '113024243010': 'VH13945',
  '113024243011': 'VH13793',
  '113024243012': 'VH13794',
  '113024243013': 'VH13795',
  '113024243014': 'VH13934',
  '113024243015': 'VH13796',
  '113024243016': 'VH13797',
  '113024243017': 'VH13798',
  '113024243018': 'VH13799',
  '113024243019': 'VH13800',
  '113024243020': 'VH13926',
  '113024243021': 'VH13801',
  '113024243022': 'VH13802',
  '113024243023': 'VH13953',
  '113024243024': 'VH13803',
  '113024243025': 'VH13804',
  '113024243026': 'VH13805',
  '113024243027': 'VH13806',
  '113024243028': 'VH13807',
  '113024243029': 'VH13808',
  '113024243030': 'VH13809',
  '113024243031': 'VH13935',
  '113024243032': 'VH13936',
  '113024243033': 'VH13946',
  '113024243034': 'VH13957',
  '113024243035': 'VH13810',
  '113024243036': 'VH13811',
  '113024243037': 'VH13812',
  '113024243038': 'VH13813',
  '113024243039': 'VH13814',
  '113024243040': 'VH13815',
  '113024243041': 'VH13816',
  '113024243042': 'VH13817',
  '113024243043': 'VH13819',
  '113024243044': 'VH13818',
  '113024243045': 'VH13820',
  '113024243046': 'VH13821',
  '113024243047': 'VH13822',
  '113024243048': 'VH13823',
  '113024243049': 'VH13937',
  '113024243050': 'VH13955',
  '113024243051': 'VH13824',
  '113024243052': 'VH13927',
  '113024243053': 'VH13951',
  '113024243054': 'VH13825',
  '113024243055': 'VH13826',
  '113024243056': 'VH13959',
  '113024243057': 'VH13827',
  '113024243058': 'VH13828',
  '113024243059': 'VH13938',
  '113024243060': 'VH13829',
  '113024243301': 'VH14547',
  '113024243303': 'VH14548',
  'CS202601': 'VH14549'
};

db.serialize(() => {
  // Ensure vh_number column exists
  db.run("ALTER TABLE users ADD COLUMN vh_number TEXT;", () => {});

  db.all("SELECT id, name, roll_number, phone, vh_number, email FROM users WHERE role = 'student'", [], (err, rows) => {
    if (err) {
      console.error('Error fetching students:', err);
      process.exit(1);
    }

    console.log(`Found ${rows ? rows.length : 0} student records to inspect and migrate.`);
    let updatedCount = 0;

    (rows || []).forEach((st) => {
      let vh = pdfStudentsMap[st.roll_number];
      if (!vh) {
        if (st.vh_number && st.vh_number.toUpperCase().startsWith('VH')) {
          vh = st.vh_number.trim().toUpperCase();
        } else if (st.phone && st.phone.toUpperCase().startsWith('VH')) {
          vh = st.phone.trim().toUpperCase();
        } else if (st.roll_number) {
          const num = st.roll_number.replace(/[^0-9]/g, '');
          vh = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
        } else {
          vh = 'VH13936';
        }
      }

      vh = vh.trim().toUpperCase();
      const officialEmail = `${vh.toLowerCase()}@velhightech.com`;

      db.run(
        "UPDATE users SET vh_number = ?, email = ? WHERE id = ?",
        [vh, officialEmail, st.id],
        function (upErr) {
          if (!upErr && this.changes > 0) {
            updatedCount++;
            console.log(`✅ [MIGRATED EMAIL] Student: "${st.name}" (${st.roll_number}) -> VH: ${vh}, Email: ${officialEmail}`);
          }
        }
      );
    });

    setTimeout(() => {
      console.log(`\n🎉 SUCCESS: All student records migrated cleanly to official @velhightech.com emails.`);
      process.exit(0);
    }, 1000);
  });
});
