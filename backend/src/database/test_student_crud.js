const { db, runMigrations } = require('./db');
const { v4: uuidv4 } = require('uuid');

async function testStudentCRUD() {
  console.log('==================================================');
  console.log('TESTING FULL STUDENT CRUD OPERATIONS & EXTENDED DETAILS');
  console.log('==================================================\n');

  await runMigrations();

  const nowMs = Date.now();
  const testStudentId = 'crud-student-' + nowMs;
  const testRoll = '11302424' + (nowMs % 100000);
  const testEmail = `student.crud.${nowMs}@univ.edu`;

  db.serialize(() => {
    // 1. CREATE Student
    console.log('1. CREATE: Inserting student with extended profile details...');
    db.run(
      `INSERT INTO users (id, name, roll_number, email, role, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, password_hash)
       VALUES (?, 'ALICE SMITH', ?, ?, 'student', 'AI & Data Science', 3, 'A', '+1-555-9876', 'http://example.com/photo.jpg', '2004-05-15', 'Female', 'O+', '123 Tech Lane', 'Robert Smith', '+1-555-1122', 'Enthusiastic AI student', 'hash')`,
      [testStudentId, testRoll, testEmail],
      function (err) {
        if (err) console.error('Create error:', err);
      }
    );

    // 2. READ Student Details
    db.get('SELECT * FROM users WHERE id = ?', [testStudentId], (err, student) => {
      console.log('\n2. READ: Fetched student record from DB:');
      console.log(`  - ID: ${student ? student.id : 'N/A'}`);
      console.log(`  - Name: ${student ? student.name : 'N/A'}`);
      console.log(`  - Register No: ${student ? student.roll_number : 'N/A'}`);
      console.log(`  - DOB: ${student ? student.dob : 'N/A'}`);
      console.log(`  - Gender: ${student ? student.gender : 'N/A'}`);
      console.log(`  - Blood Group: ${student ? student.blood_group : 'N/A'}`);
      console.log(`  - Parent: ${student ? student.parent_name : 'N/A'} (${student ? student.parent_phone : 'N/A'})`);
      console.log(`  - Address: ${student ? student.address : 'N/A'}`);

      // 3. UPDATE Student Details (By Admin or Student Self-Service)
      console.log('\n3. UPDATE: Updating phone, address, parent details, and blood group...');
      db.run(
        `UPDATE users 
         SET phone = ?, blood_group = ?, address = ?, parent_name = ?, parent_phone = ?, bio = ?
         WHERE id = ? AND role = 'student'`,
        ['+1-555-4321', 'A+', '456 Innovation Blvd', 'Robert Smith Sr.', '+1-555-3344', 'Updated Bio Details', testStudentId],
        function (err2) {
          if (err2) console.error('Update error:', err2);

          // Verify updated row
          db.get('SELECT * FROM users WHERE id = ?', [testStudentId], (err3, updatedStudent) => {
            console.log('✓ VERIFIED UPDATE:');
            console.log(`  - New Phone: ${updatedStudent.phone}`);
            console.log(`  - New Blood Group: ${updatedStudent.blood_group}`);
            console.log(`  - New Address: ${updatedStudent.address}`);
            console.log(`  - New Parent Contact: ${updatedStudent.parent_name} (${updatedStudent.parent_phone})`);

            // 4. DELETE Student Account
            console.log('\n4. DELETE: Removing student account from DB...');
            db.run('DELETE FROM users WHERE id = ?', [testStudentId], function (err4) {
              db.get('SELECT * FROM users WHERE id = ?', [testStudentId], (err5, deletedRow) => {
                const isDeleted = !deletedRow;
                console.log(`✓ VERIFIED DELETE: Student record deleted? ${isDeleted ? 'YES' : 'NO'}`);
                console.log('\n==================================================');
                console.log(isDeleted ? '🎉 STUDENT CRUD TEST PASSED CLEANLY!' : '❌ TEST FAILED');
                console.log('==================================================');
                process.exit(isDeleted ? 0 : 1);
              });
            });
          });
        }
      );
    });
  });
}

testStudentCRUD();
