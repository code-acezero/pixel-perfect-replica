const { getSqlClient } = require('./db.cjs');

async function upgradeSchema() {
  console.log('--- UPGRADING SUPABASE SCHEMA FOR BANGLADESH QA & DEVICE ECOSYSTEM ---');
  const sql = getSqlClient();

  try {
    // 1. Upgrade rolls table with mill traceability & physical parameters
    await sql`
      ALTER TABLE public.rolls
        ADD COLUMN IF NOT EXISTS shift text NOT NULL DEFAULT 'Shift A (06:00-14:00)',
        ADD COLUMN IF NOT EXISTS machine_no text NOT NULL DEFAULT 'Circular Knit #04',
        ADD COLUMN IF NOT EXISTS dye_batch text NOT NULL DEFAULT 'B-2026-001',
        ADD COLUMN IF NOT EXISTS yarn_count text NOT NULL DEFAULT '30/1 Ne Combed',
        ADD COLUMN IF NOT EXISTS fabric_type text NOT NULL DEFAULT '100% Cotton Single Jersey',
        ADD COLUMN IF NOT EXISTS cuttable_width_in numeric NOT NULL DEFAULT 59.0,
        ADD COLUMN IF NOT EXISTS gsm_left numeric NOT NULL DEFAULT 180.0,
        ADD COLUMN IF NOT EXISTS gsm_center numeric NOT NULL DEFAULT 180.0,
        ADD COLUMN IF NOT EXISTS gsm_right numeric NOT NULL DEFAULT 180.0,
        ADD COLUMN IF NOT EXISTS bow_skew_pct numeric NOT NULL DEFAULT 1.2;
    `;
    console.log('1. Upgraded public.rolls with BD traceability & GSM fields.');

    // 2. Upgrade defects table with continuous defect tracking and 5-zone spatial mapping
    await sql`
      ALTER TABLE public.defects
        ADD COLUMN IF NOT EXISTS length_in numeric NOT NULL DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS is_continuous boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS zone text NOT NULL DEFAULT 'center';
    `;
    console.log('2. Upgraded public.defects with length_in, is_continuous, zone.');

    // 3. Upgrade devices table with battery and stream role
    await sql`
      ALTER TABLE public.devices
        ADD COLUMN IF NOT EXISTS battery_pct integer NOT NULL DEFAULT 100,
        ADD COLUMN IF NOT EXISTS stream_role text NOT NULL DEFAULT 'overhead';
    `;
    console.log('3. Upgraded public.devices with battery_pct and stream_role.');

    // 4. Upgrade certificates table with verification & physical scorecard
    await sql`
      ALTER TABLE public.certificates
        ADD COLUMN IF NOT EXISTS cuttable_width_in numeric,
        ADD COLUMN IF NOT EXISTS gsm_variance_pct numeric,
        ADD COLUMN IF NOT EXISTS bow_skew_pct numeric,
        ADD COLUMN IF NOT EXISTS continuous_fault_count integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS verification_hash text;
    `;
    console.log('4. Upgraded public.certificates with physical specs & hash.');

    // 5. Update verify_certificate RPC to return complete cryptographic verification payload
    await sql`
      CREATE OR REPLACE FUNCTION public.verify_certificate(cert_no text)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        result jsonb;
      BEGIN
        SELECT jsonb_build_object(
          'id', c.id,
          'certificate_no', c.certificate_no,
          'roll_id', c.roll_id,
          'final_grade', c.final_grade,
          'points_per_100_sq_yd', c.points_per_100_sq_yd,
          'score_system', c.score_system,
          'created_at', c.created_at,
          'status', c.status,
          'cuttable_width_in', c.cuttable_width_in,
          'gsm_variance_pct', c.gsm_variance_pct,
          'bow_skew_pct', c.bow_skew_pct,
          'continuous_fault_count', c.continuous_fault_count,
          'verification_hash', c.verification_hash,
          'roll', jsonb_build_object(
            'roll_no', r.roll_no,
            'style', r.style,
            'color', r.color,
            'composition', r.composition,
            'construction', r.construction,
            'total_length_m', r.total_length_m,
            'width_in', r.width_in,
            'cuttable_width_in', r.cuttable_width_in,
            'target_gsm', r.target_gsm,
            'gsm_left', r.gsm_left,
            'gsm_center', r.gsm_center,
            'gsm_right', r.gsm_right,
            'bow_skew_pct', r.bow_skew_pct,
            'shift', r.shift,
            'machine_no', r.machine_no,
            'dye_batch', r.dye_batch,
            'yarn_count', r.yarn_count,
            'fabric_type', r.fabric_type
          )
        )
        INTO result
        FROM public.certificates c
        LEFT JOIN public.rolls r ON r.id = c.roll_id
        WHERE c.certificate_no = cert_no;

        RETURN result;
      END;
      $$;
    `;
    console.log('5. Created/Updated public.verify_certificate RPC.');

    console.log('=== BANGLADESH QA SCHEMA UPGRADE COMPLETE ===');
  } catch (err) {
    console.error('Error upgrading schema:', err);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

upgradeSchema();
