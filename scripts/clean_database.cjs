const { getSqlClient } = require('./db.cjs');

async function cleanTestData() {
  console.log('--- PURGING TEST DATA FROM SUPABASE ---');
  const sql = getSqlClient();

  try {
    // 1. Delete all test defects
    const delDefects = await sql`DELETE FROM public.defects;`;
    console.log('Purged defects:', delDefects.count);

    // 2. Delete all test alerts
    const delAlerts = await sql`DELETE FROM public.alerts;`;
    console.log('Purged alerts:', delAlerts.count);

    // 3. Delete all test certificates
    const delCerts = await sql`DELETE FROM public.certificates;`;
    console.log('Purged certificates:', delCerts.count);

    // 4. Delete all test inspection sessions
    const delSessions = await sql`DELETE FROM public.inspection_sessions;`;
    console.log('Purged inspection_sessions:', delSessions.count);

    // 5. Reset rolls: delete test rolls and create a single fresh, clean starting roll ready for inspection
    await sql`DELETE FROM public.rolls;`;
    console.log('Purged test rolls.');

    // 6. Insert clean baseline roll for Ashulia Mill Unit 03
    const newRoll = await sql`
      INSERT INTO public.rolls (
        roll_no,
        style,
        color,
        composition,
        construction,
        total_length_m,
        width_in,
        cuttable_width_in,
        target_gsm,
        gsm_left,
        gsm_center,
        gsm_right,
        bow_skew_pct,
        shift,
        machine_no,
        dye_batch,
        yarn_count,
        fabric_type,
        status,
        inspection_points
      ) VALUES (
        'TX-8829',
        'HM-BASIC-TEE-01',
        'Phantom Black',
        '100% Combed Cotton',
        'Single Jersey 24GG',
        120.0,
        60.0,
        59.0,
        180.0,
        181.0,
        180.0,
        179.0,
        1.2,
        'Shift A (06:00-14:00)',
        'Circular Knit #04',
        'B-2026-001',
        '30/1 Ne Combed',
        '100% Cotton Single Jersey',
        'in_inspection',
        '[]'::jsonb
      )
      RETURNING id, roll_no, status;
    `;

    console.log('Created fresh production starting roll:', newRoll[0]);
    console.log('=== TEST DATA SUCCESSFULLY PURGED ===');
  } catch (err) {
    console.error('Error purging test data:', err);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

cleanTestData();
