import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkSchema() {
    const { data, error } = await supabase.from('profiles').select().limit(1)
    if (error) {
        console.error(error)
    } else if (data && data[0]) {
        console.log('Columns in profiles:', Object.keys(data[0]))
    } else {
        console.log('No data in profiles table')
    }
}

checkSchema()
