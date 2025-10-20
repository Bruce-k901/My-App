import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the generate_daily_ppm_notifications function
    const { data, error } = await supabaseClient.rpc('generate_daily_ppm_notifications')

    if (error) {
      console.error('Error generating PPM notifications:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Generated ${data} PPM notifications`)

    // Optionally, also create linked tasks for due/overdue PPMs
    const { data: taskData, error: taskError } = await supabaseClient.rpc('create_ppm_tasks')

    if (taskError) {
      console.error('Error creating PPM tasks:', taskError)
      // Don't fail the entire function if task creation fails
    } else {
      console.log(`Created ${taskData} PPM tasks`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_created: data,
        tasks_created: taskData || 0,
        message: `Generated ${data} notifications and ${taskData || 0} tasks`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})