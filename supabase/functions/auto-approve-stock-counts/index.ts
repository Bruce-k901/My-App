import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Find stock counts ready for approval for more than 24 hours
    // Check both stockly and public schemas
    let countsToApprove: any[] = []

    // Try stockly schema first
    const { data: stocklyCounts, error: stocklyError } = await supabase
      .from('stock_counts')
      .select('*')
      .eq('status', 'ready_for_approval')
      .not('ready_for_approval_at', 'is', null)
      .lt('ready_for_approval_at', twentyFourHoursAgo.toISOString())
      .eq('auto_approved', false)

    if (!stocklyError && stocklyCounts) {
      countsToApprove = stocklyCounts
    } else {
      // If stockly schema doesn't work, try public schema
      // Note: This is a workaround - ideally we'd know which schema to use
      console.log('Checking stockly schema failed, trying alternative approach')
    }

    // Alternative: Query using RPC or direct SQL if needed
    // For now, let's use a more flexible approach
    const { data: allCounts, error: queryError } = await supabase
      .rpc('get_stock_counts_ready_for_auto_approve', {
        p_hours_ago: 24
      })
      .catch(async () => {
        // Fallback: Direct query (may need schema prefix)
        const { data, error } = await supabase
          .from('stock_counts')
          .select('*')
          .eq('status', 'ready_for_approval')
          .not('ready_for_approval_at', 'is', null)
          .lt('ready_for_approval_at', twentyFourHoursAgo.toISOString())
          .eq('auto_approved', false)
        
        return { data, error }
      })

    if (queryError && !allCounts) {
      console.error('Error querying stock counts:', queryError)
      // Try direct query as fallback
      const { data: directCounts, error: directError } = await supabase
        .from('stock_counts')
        .select('*')
        .eq('status', 'ready_for_approval')
        .not('ready_for_approval_at', 'is', null)
        .lt('ready_for_approval_at', twentyFourHoursAgo.toISOString())
        .eq('auto_approved', false)

      if (directError) {
        throw directError
      }
      countsToApprove = directCounts || []
    } else {
      countsToApprove = allCounts || []
    }

    const results = {
      checked: countsToApprove.length,
      approved: 0,
      errors: [] as Array<{ countId: string; error: string }>,
    }

    // Process each count
    for (const count of countsToApprove) {
      try {
        // Update count status to approved with auto-approve flag
        const { error: updateError } = await supabase
          .from('stock_counts')
          .update({
            status: 'approved',
            auto_approved: true,
            auto_approved_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            // Note: approved_by is null for auto-approvals
          })
          .eq('id', count.id)

        if (updateError) {
          throw updateError
        }

        // Call the database function to process the approved count
        const { error: processError } = await supabase.rpc(
          'process_approved_stock_count',
          { p_count_id: count.id }
        )

        if (processError) {
          // Rollback the status update
          await supabase
            .from('stock_counts')
            .update({ 
              status: 'ready_for_approval',
              auto_approved: false,
              auto_approved_at: null,
              approved_at: null,
            })
            .eq('id', count.id)
          
          throw processError
        }

        // Get the original user who marked it ready
        const originalUserId = count.ready_for_approval_by || count.completed_by

        // Send notification to original user
        if (originalUserId) {
          const message = `Your stock count "${count.name || count.count_number}" was auto-approved after 24 hours. Stock on hand figures have been updated. This ensures inventory accuracy is maintained.`

          // In-app notification
          await supabase
            .from('notifications')
            .insert({
              company_id: count.company_id,
              user_id: originalUserId,
              type: 'stock_count_approval_response',
              title: 'Stock Count Auto-Approved',
              message: message,
              severity: 'info',
              action_url: `/dashboard/stockly/stock-counts/${count.id}/review`,
              created_at: new Date().toISOString(),
            })

          // Find or create conversation with approver (if approver exists)
          if (count.approver_id) {
            let conversationId: string | null = null

            const { data: existingConversation } = await supabase
              .from('conversations')
              .select('id')
              .eq('type', 'direct')
              .contains('participant_ids', [originalUserId, count.approver_id])
              .limit(1)
              .single()

            if (existingConversation) {
              conversationId = existingConversation.id
            } else {
              const { data: newConversation } = await supabase
                .from('conversations')
                .insert({
                  type: 'direct',
                  company_id: count.company_id,
                  participant_ids: [originalUserId, count.approver_id],
                  created_by: originalUserId,
                })
                .select('id')
                .single()

              if (newConversation) {
                conversationId = newConversation.id
                await supabase
                  .from('conversation_participants')
                  .insert([
                    { conversation_id: conversationId, user_id: originalUserId, role: 'member' },
                    { conversation_id: conversationId, user_id: count.approver_id, role: 'member' },
                  ])
              }
            }

            // Send system message
            if (conversationId) {
              await supabase
                .from('messages')
                .insert({
                  conversation_id: conversationId,
                  sender_id: originalUserId, // System message from original user's perspective
                  content: `[System] ${message}\n\n[View Stock Count](${Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'}/dashboard/stockly/stock-counts/${count.id}/review)`,
                  message_type: 'system',
                  created_at: new Date().toISOString(),
                })
            }
          }
        }

        results.approved++
      } catch (error: any) {
        console.error(`Error auto-approving count ${count.id}:`, error)
        results.errors.push({
          countId: count.id,
          error: error.message || 'Unknown error',
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.checked} counts, auto-approved ${results.approved}`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in auto-approve-stock-counts:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
