import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://hfmfltkzdjeqvglehciz.supabase.co'
const supabaseKey = 'sb_publishable_gJyVjuKp53etiXLkXajPMQ_dN042jav'

export const supabase = createClient(supabaseUrl, supabaseKey)
