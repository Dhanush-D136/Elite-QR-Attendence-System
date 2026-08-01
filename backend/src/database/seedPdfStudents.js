const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, 'smartattend.db');
const db = new sqlite3.Database(dbPath);

const pdfStudents = [
  { roll: '113024243001', name: 'ABASKAR N', vh: 'VH13786' },
  { roll: '113024243002', name: 'ABHISHEK G', vh: 'VH13787' },
  { roll: '113024243003', name: 'ABINESH E', vh: 'VH13788' },
  { roll: '113024243004', name: 'ABINESH S', vh: 'VH13789' },
  { roll: '113024243005', name: 'ADVAITHA SAI KUMAR P K R', vh: 'VH13952' },
  { roll: '113024243006', name: 'AKASH S(29.08.2006)', vh: 'VH13790' },
  { roll: '113024243007', name: 'AKASH S(05.01.2007)', vh: 'VH13791' },
  { roll: '113024243008', name: 'ANUKSHA S', vh: 'VH13933' },
  { roll: '113024243009', name: 'APARNA K', vh: 'VH13792' },
  { roll: '113024243010', name: 'ARCHANA J', vh: 'VH13945' },
  { roll: '113024243011', name: 'ARCHANA P', vh: 'VH13793' },
  { roll: '113024243012', name: 'ARUL SELVAM M', vh: 'VH13794' },
  { roll: '113024243013', name: 'ARYAN SONKAR G', vh: 'VH13795' },
  { roll: '113024243014', name: 'ASWIN R', vh: 'VH13934' },
  { roll: '113024243015', name: 'ASWIN S', vh: 'VH13796' },
  { roll: '113024243016', name: 'ASWINKUMAR R', vh: 'VH13797' },
  { roll: '113024243017', name: 'BALAJI P', vh: 'VH13798' },
  { roll: '113024243018', name: 'BALAJI R', vh: 'VH13799' },
  { roll: '113024243019', name: 'BARKAVI M', vh: 'VH13800' },
  { roll: '113024243020', name: 'BHARATKUMAR D', vh: 'VH13926' },
  { roll: '113024243021', name: 'BHARGAVI R B', vh: 'VH13801' },
  { roll: '113024243022', name: 'BHUVANESH S', vh: 'VH13802' },
  { roll: '113024243023', name: 'BIBIN RAJ K R', vh: 'VH13953' },
  { roll: '113024243024', name: 'BOOBESH A', vh: 'VH13803' },
  { roll: '113024243025', name: 'BOOPATHI S', vh: 'VH13804' },
  { roll: '113024243026', name: 'CHANDRA MOWLISWARAN P', vh: 'VH13805' },
  { roll: '113024243027', name: 'DARSAN S S J', vh: 'VH13806' },
  { roll: '113024243028', name: 'DEEPAK PRAKASH S', vh: 'VH13807' },
  { roll: '113024243029', name: 'DEEPAN R', vh: 'VH13808' },
  { roll: '113024243030', name: 'DEEPAVADHANA V', vh: 'VH13809' },
  { roll: '113024243031', name: 'DHAKSH A R', vh: 'VH13935' },
  { roll: '113024243032', name: 'DHANUSH D', vh: 'VH13936' },
  { roll: '113024243033', name: 'DHANUSH M', vh: 'VH13946' },
  { roll: '113024243034', name: 'DIVITHA EZHILARASAN', vh: 'VH13957' },
  { roll: '113024243035', name: 'DIVYABHARATHI T', vh: 'VH13810' },
  { roll: '113024243036', name: 'DONALD MELVIN A', vh: 'VH13811' },
  { roll: '113024243037', name: 'GAYATHRI R', vh: 'VH13812' },
  { roll: '113024243038', name: 'GOPALAKRISHNAN P', vh: 'VH13813' },
  { roll: '113024243039', name: 'GOWTHAM K', vh: 'VH13814' },
  { roll: '113024243040', name: 'GUNASRI R B', vh: 'VH13815' },
  { roll: '113024243041', name: 'HARINI THARANI RAJAN', vh: 'VH13816' },
  { roll: '113024243042', name: 'HARISH G', vh: 'VH13817' },
  { roll: '113024243043', name: 'HARISH S(21.08.2006)', vh: 'VH13819' },
  { roll: '113024243044', name: 'HARISH S(27.03.2007)', vh: 'VH13818' },
  { roll: '113024243045', name: 'HARSHAVARDHAN M S', vh: 'VH13820' },
  { roll: '113024243046', name: 'HARSHINI PRIYA R', vh: 'VH13821' },
  { roll: '113024243047', name: 'HEMA VARSHINI S', vh: 'VH13822' },
  { roll: '113024243048', name: 'HEMACHANDRAN S', vh: 'VH13823' },
  { roll: '113024243049', name: 'HEMASREESHANTH C', vh: 'VH13937' },
  { roll: '113024243050', name: 'IMAM HASSAN S', vh: 'VH13955' },
  { roll: '113024243051', name: 'JAGADESHWARAN M', vh: 'VH13824' },
  { roll: '113024243052', name: 'JAGAN K', vh: 'VH13927' },
  { roll: '113024243053', name: 'JAI SURIYA S(26.11.2006)', vh: 'VH13951' },
  { roll: '113024243054', name: 'JAI SURIYA S(23.12.2006)', vh: 'VH13825' },
  { roll: '113024243055', name: 'JAMUNA S', vh: 'VH13826' },
  { roll: '113024243056', name: 'JANA NITHI R', vh: 'VH13959' },
  { roll: '113024243057', name: 'JANAGAN S', vh: 'VH13827' },
  { roll: '113024243058', name: 'JASWANTH S', vh: 'VH13828' },
  { roll: '113024243059', name: 'JAYASHRI V', vh: 'VH13938' },
  { roll: '113024243060', name: 'KALAIARASI V', vh: 'VH13829' },
  { roll: '113024243301', name: 'GIRINATH', vh: 'VH14547' },
  { roll: '113024243303', name: 'KISHORE C', vh: 'VH14548' },
  { roll: 'CS202601', name: 'DEMO STUDENT 2', vh: 'VH14549' }
];

async function seedPdfStudents() {
  const defaultPasswordHash = await bcrypt.hash('1234', 10);
  let seeded = 0;

  db.serialize(() => {
    for (const st of pdfStudents) {
      const vh = st.vh || `VH${13000 + Math.floor(Math.random() * 2000)}`;
      const email = `${vh.toLowerCase()}@velhightech.com`;
      const photo = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`;
      
      db.run(
        `INSERT OR IGNORE INTO users (id, name, roll_number, vh_number, email, role, department, year, section, phone, profile_photo, password_hash, must_change_password)
         VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, 1)`,
        [
          uuidv4(),
          st.name,
          st.roll,
          vh,
          email,
          'AI & Data Science',
          2,
          'A',
          '+91 9876543210',
          photo,
          defaultPasswordHash
        ],
        function (err) {
          if (!err && this.changes > 0) {
            seeded++;
          }
        }
      );
    }
  });

  setTimeout(() => {
    console.log(`Successfully seeded ${pdfStudents.length} students from PDF into AI & Data Science department.`);
    process.exit(0);
  }, 1500);
}

seedPdfStudents();
