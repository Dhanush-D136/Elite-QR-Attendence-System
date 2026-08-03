const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper to fetch the currently active spell
 */
function fetchActiveSpellHelper(cb) {
  db.get(
    "SELECT * FROM spell_management WHERE is_active = 1 OR is_active = '1' ORDER BY updated_at DESC LIMIT 1",
    [],
    (err, row) => {
      if (err) return cb(err, null);
      if (row) return cb(null, row);

      // Fallback: If no spell marked active, pick the latest spell
      db.get(
        "SELECT * FROM spell_management ORDER BY created_at DESC LIMIT 1",
        [],
        (err2, row2) => {
          if (err2 || !row2) {
            // Default fallback if table is empty
            return cb(null, {
              id: 'default-fallback',
              spell_name: 'Spell 1',
              start_date: '2026-08-01',
              end_date: '2026-09-30',
              is_active: 1
            });
          }
          return cb(null, row2);
        }
      );
    }
  );
}

/**
 * 1. GET ALL SPELLS
 */
function getSpells(req, res) {
  db.all("SELECT * FROM spell_management ORDER BY start_date ASC, created_at ASC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch spells: ' + err.message });
    }

    fetchActiveSpellHelper((errActive, activeSpell) => {
      return res.json({
        success: true,
        spells: rows || [],
        activeSpell: activeSpell || null
      });
    });
  });
}

/**
 * 2. GET ACTIVE SPELL
 */
function getActiveSpell(req, res) {
  fetchActiveSpellHelper((err, activeSpell) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch active spell: ' + err.message });
    }
    return res.json({
      success: true,
      activeSpell
    });
  });
}

/**
 * 3. CREATE SPELL
 */
function createSpell(req, res) {
  const { spell_name, start_date, end_date, status, is_active } = req.body;

  if (!spell_name || !start_date || !end_date) {
    return res.status(400).json({ success: false, error: 'Spell name, start date, and end date are required.' });
  }

  const isActiveVal = (is_active === 1 || is_active === true || status === 'ACTIVE') ? 1 : 0;
  const newId = 'spell-' + uuidv4();
  const nowStr = new Date().toISOString();

  const doInsert = () => {
    db.run(
      `INSERT INTO spell_management (id, spell_name, start_date, end_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, spell_name.trim(), start_date, end_date, isActiveVal, nowStr, nowStr],
      function (err) {
        if (err) {
          return res.status(500).json({ success: false, error: 'Failed to create spell: ' + err.message });
        }
        return res.json({
          success: true,
          message: 'Spell created successfully.',
          spell: {
            id: newId,
            spell_name: spell_name.trim(),
            start_date,
            end_date,
            is_active: isActiveVal,
            created_at: nowStr,
            updated_at: nowStr
          }
        });
      }
    );
  };

  // If new spell is active, deactivate all existing spells first
  if (isActiveVal === 1) {
    db.run("UPDATE spell_management SET is_active = 0", [], (errDeact) => {
      if (errDeact) {
        console.warn('Failed to deactivate old spells:', errDeact.message);
      }
      doInsert();
    });
  } else {
    doInsert();
  }
}

/**
 * 4. UPDATE SPELL
 */
function updateSpell(req, res) {
  const { id } = req.params;
  const { spell_name, start_date, end_date, status, is_active } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Spell ID is required.' });
  }

  const isActiveVal = (is_active === 1 || is_active === true || status === 'ACTIVE') ? 1 : 0;
  const nowStr = new Date().toISOString();

  const doUpdate = () => {
    db.run(
      `UPDATE spell_management 
       SET spell_name = COALESCE(?, spell_name),
           start_date = COALESCE(?, start_date),
           end_date = COALESCE(?, end_date),
           is_active = ?,
           updated_at = ?
       WHERE id = ?`,
      [spell_name ? spell_name.trim() : null, start_date, end_date, isActiveVal, nowStr, id],
      function (err) {
        if (err) {
          return res.status(500).json({ success: false, error: 'Failed to update spell: ' + err.message });
        }
        return res.json({
          success: true,
          message: 'Spell updated successfully.'
        });
      }
    );
  };

  if (isActiveVal === 1) {
    db.run("UPDATE spell_management SET is_active = 0", [], (errDeact) => {
      if (errDeact) {
        console.warn('Failed to deactivate existing active spells:', errDeact.message);
      }
      doUpdate();
    });
  } else {
    doUpdate();
  }
}

/**
 * 5. SET ACTIVE SPELL
 */
function setActiveSpell(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Spell ID is required.' });
  }

  const nowStr = new Date().toISOString();

  // Deactivate all spells first
  db.run("UPDATE spell_management SET is_active = 0", [], (errDeact) => {
    if (errDeact) {
      return res.status(500).json({ success: false, error: 'Failed to reset active status: ' + errDeact.message });
    }

    // Activate the requested spell
    db.run(
      "UPDATE spell_management SET is_active = 1, updated_at = ? WHERE id = ?",
      [nowStr, id],
      function (errAct) {
        if (errAct) {
          return res.status(500).json({ success: false, error: 'Failed to activate spell: ' + errAct.message });
        }
        return res.json({
          success: true,
          message: 'Spell activated successfully. All portals are now updated.'
        });
      }
    );
  });
}

/**
 * 6. DUPLICATE SPELL
 */
function duplicateSpell(req, res) {
  const { id } = req.params;

  db.get("SELECT * FROM spell_management WHERE id = ?", [id], (err, sourceSpell) => {
    if (err || !sourceSpell) {
      return res.status(404).json({ success: false, error: 'Source spell not found.' });
    }

    const newId = 'spell-' + uuidv4();
    const newName = `${sourceSpell.spell_name} (Copy)`;
    const nowStr = new Date().toISOString();

    db.run(
      `INSERT INTO spell_management (id, spell_name, start_date, end_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [newId, newName, sourceSpell.start_date, sourceSpell.end_date, nowStr, nowStr],
      function (errInsert) {
        if (errInsert) {
          return res.status(500).json({ success: false, error: 'Failed to duplicate spell: ' + errInsert.message });
        }
        return res.json({
          success: true,
          message: 'Spell duplicated successfully.',
          spell: {
            id: newId,
            spell_name: newName,
            start_date: sourceSpell.start_date,
            end_date: sourceSpell.end_date,
            is_active: 0
          }
        });
      }
    );
  });
}

/**
 * 7. DELETE SPELL (SAFETY RULE: MUST NOT DELETE ATTENDANCE / STUDENTS / SUBJECTS)
 */
function deleteSpell(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Spell ID is required.' });
  }

  // Delete ONLY spell metadata configuration row
  db.run("DELETE FROM spell_management WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to delete spell configuration: ' + err.message });
    }

    // Check if any active spell remains; if not, set the latest remaining spell as active
    fetchActiveSpellHelper((errHelper, activeSpell) => {
      if (activeSpell && activeSpell.id !== 'default-fallback') {
        db.run("UPDATE spell_management SET is_active = 1 WHERE id = ?", [activeSpell.id], () => {});
      }
      return res.json({
        success: true,
        message: 'Spell configuration deleted successfully. Attendance data remains completely intact.'
      });
    });
  });
}

module.exports = {
  fetchActiveSpellHelper,
  getSpells,
  getActiveSpell,
  createSpell,
  updateSpell,
  setActiveSpell,
  duplicateSpell,
  deleteSpell
};
