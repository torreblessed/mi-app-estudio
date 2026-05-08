
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://cwdomlmvalfnrpykmcmg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZG9tbG12YWxmbnJweWttY21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYzNDMsImV4cCI6MjA5MzQ5MjM0M30.0feO8t0-78wZtGoJVboHC-bkEutoPXSqX43P0FPOC1g'

export const supabase = createClient(supabaseUrl, supabaseKey)