import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    let countId: string | undefined;
    
    // Try to get ID from params (handle both sync and async)
    if (params) {
      const resolvedParams = params instanceof Promise ? await params : params;
      countId = resolvedParams?.id;
    }
    
    // Fallback: extract from URL if params didn't work
    if (!countId) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const idIndex = pathParts.indexOf('reject');
      if (idIndex >= 0 && pathParts[idIndex + 1]) {
        countId = pathParts[idIndex + 1];
      }
    }
    
    if (!countId) {
      console.error('Count ID is missing. URL:', request.url, 'Params:', params);
      return NextResponse.json(
        { error: 'Stock count ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get rejection reason from request body
    const body = await request.json().catch(() => ({}));
    const rejectionReason = body.rejectionReason;
    const approvalComments = body.approvalComments || {};

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Use admin client for operations that need to bypass RLS
    const supabaseAdmin = getSupabaseAdmin();

    // Get the stock count
    const { data: count, error: countError } = await supabaseAdmin
      .from('stock_counts')
      .select('*')
      .eq('id', countId)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        { error: 'Stock count not found' },
        { status: 404 }
      );
    }

    // Check if count is in a valid state for rejection
    if (count.status !== 'pending_review' && count.status !== 'ready_for_approval') {
      return NextResponse.json(
        { error: `Stock count must be in 'pending_review' or 'ready_for_approval' status. Current status: ${count.status}` },
        { status: 400 }
      );
    }

    // Check if user is the approver (for ready_for_approval status)
    if (count.status === 'ready_for_approval' && count.approver_id && count.approver_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned approver can reject this stock count' },
        { status: 403 }
      );
    }

    // Save approval comments to items
    if (Object.keys(approvalComments).length > 0) {
      for (const [itemId, comment] of Object.entries(approvalComments)) {
        if (comment) {
          await supabaseAdmin
            .from('stock_count_items')
            .update({ approval_comments: comment as string })
            .eq('id', itemId)
            .eq('stock_count_id', countId);
        }
      }
    }

    // Update count status to rejected
    const { error: updateError } = await supabaseAdmin
      .from('stock_counts')
      .update({
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason.trim(),
      })
      .eq('id', countId);

    if (updateError) {
      console.error('Error updating count status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update count status' },
        { status: 500 }
      );
    }

    // Get the original user who marked it ready for approval (the counter)
    const counterId = count.ready_for_approval_by || count.completed_by || count.created_by;
    
    // Get approver and counter profiles
    const { data: approverProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    const { data: counterProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', counterId)
      .single();

    // Send notifications back to counter
    if (counterId && counterId !== user.id) {
      // 1. In-app notification
      const { data: notificationData, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          company_id: count.company_id,
          site_id: count.site_id,
          user_id: counterId,
          type: 'stock_count_requires_attention',
          title: '⚠️ Stock Count Requires Attention',
          message: `Your stock count "${count.name || count.count_number}" requires attention. Reason: ${rejectionReason.trim()}`,
          severity: 'warning',
          action_url: `/dashboard/stockly/stock-counts/${countId}/review`,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (notifError) {
        console.error('❌ Error creating in-app notification:', notifError);
        console.error('Notification error details:', JSON.stringify(notifError, null, 2));
      } else {
        console.log('✅ In-app notification created:', notificationData?.id, 'for user:', counterId);
      }

      // 2. Msgly message - Create or find direct message channel
      let channelId: string | null = null;

      console.log('🔍 Looking for existing direct message channel between approver:', user.id, 'and counter:', counterId);

      // Check if direct message channel already exists between these two users
      const { data: existingChannels, error: channelsError } = await supabaseAdmin
        .from('messaging_channels')
        .select('id')
        .eq('company_id', count.company_id)
        .eq('channel_type', 'direct')
        .limit(50); // Get more to check members

      if (channelsError) {
        console.error('Error fetching existing channels:', channelsError);
      } else {
        console.log(`Found ${existingChannels?.length || 0} direct channels to check`);
      }

      // Check if any of these channels has both users as members
      if (existingChannels && existingChannels.length > 0) {
        for (const channel of existingChannels) {
          const { data: members, error: membersError } = await supabaseAdmin
            .from('messaging_channel_members')
            .select('profile_id')
            .eq('channel_id', channel.id)
            .in('profile_id', [user.id, counterId]);
          
          if (membersError) {
            console.warn('Error checking members for channel', channel.id, ':', membersError);
            continue;
          }
          
          if (members && members.length === 2) {
            channelId = channel.id;
            console.log('✅ Found existing direct message channel:', channelId);
            break;
          }
        }
      }

      if (!channelId) {
        console.log('📝 Creating new direct message channel...');
        // Create new direct message channel
        const channelName = `${approverProfile?.full_name || 'Approver'} & ${counterProfile?.full_name || 'Counter'}`;
        const { data: newChannel, error: channelError } = await supabaseAdmin
          .from('messaging_channels')
          .insert({
            company_id: count.company_id,
            channel_type: 'direct',
            name: channelName,
            created_by: user.id,
          } as any)
          .select('id')
          .single();

        if (channelError) {
          console.error('❌ Error creating messaging channel:', channelError);
          console.error('Channel error details:', JSON.stringify(channelError, null, 2));
        } else if (newChannel) {
          channelId = newChannel.id;
          console.log('✅ Messaging channel created:', channelId, 'name:', channelName);

          // Add both users as members
          const membersToInsert = [
            { channel_id: channelId, profile_id: user.id, member_role: 'member' },
            { channel_id: channelId, profile_id: counterId, member_role: 'member' },
          ];
          
          const { error: membersError } = await supabaseAdmin
            .from('messaging_channel_members')
            .insert(membersToInsert as any);

          if (membersError) {
            console.error('❌ Error adding channel members:', membersError);
            console.error('Members error details:', JSON.stringify(membersError, null, 2));
          } else {
            console.log('✅ Channel members added:', membersToInsert.map(m => m.profile_id));
          }
        }
      }

      // Send Msgly message
      if (channelId) {
        const messageContent = `⚠️ **Stock Count Requires Attention**

Your stock count "${count.name || count.count_number}" requires attention before it can be approved.

**Reason:**
${rejectionReason.trim()}

**Next Steps:**
Please review the count, make any necessary corrections, and resubmit for approval.

[Open Stock Count →](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/stockly/stock-counts/${countId}/review)

---
*This is an automated message from Opsly Admin*`;

        console.log('📤 Inserting message into channel:', channelId);
        console.log('Message content length:', messageContent.length);
        
        // Use approver as sender (like ready-for-approval route does)
        // The metadata will indicate it's from Opsly Admin
        const { data: messageData, error: messageError } = await supabaseAdmin
          .from('messaging_messages')
          .insert({
            channel_id: channelId,
            sender_id: user.id, // Use approver as sender
            content: messageContent,
            message_type: 'system',
            metadata: {
              is_system: true,
              system_type: 'stock_count_requires_attention',
              from_opsly: true,
              stock_count_id: countId,
              sender_name: 'Opsly Admin',
              rejection_reason: rejectionReason.trim(),
            },
          } as any)
          .select('id, channel_id, created_at')
          .single();

        if (messageError) {
          console.error('❌ Error sending Msgly message:', messageError);
          console.error('Message error details:', JSON.stringify(messageError, null, 2));
        } else if (messageData) {
          console.log('✅✅✅ Msgly message sent successfully!');
          console.log('Message ID:', messageData?.id);
          console.log('Channel ID:', channelId);
          console.log('Counter should see this in their direct message with approver');
          
          // Update channel's last_message_at
          const { error: updateError } = await supabaseAdmin
            .from('messaging_channels')
            .update({ 
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', channelId);
          
          if (updateError) {
            console.error('❌ Error updating channel last_message_at:', updateError);
          } else {
            console.log('✅ Channel last_message_at updated - channel should appear in conversation list');
          }
        } else {
          console.error('❌ Message insert returned no data and no error');
        }
      }

      // 3. Calendar task for counter to fix and resubmit (RED, BOLD, SAME DAY)
      const today = new Date();
      const dueDateStr = today.toISOString().split('T')[0];

      const taskId = `task-attention-${Date.now()}`;
      const assignedToId = counterProfile?.id || counterId;
      const handoverKey = `handover:${dueDateStr}:${assignedToId}`;
      
      const newTask = {
        id: taskId,
        title: `⚠️ URGENT: Fix Stock Count - ${count.name || count.count_number}`,
        dueDate: dueDateStr,
        dueTime: today.toTimeString().slice(0, 5),
        assignedTo: assignedToId,
        assignedToName: counterProfile?.full_name || counterProfile?.email,
        priority: 'urgent', // Highest priority
        status: 'pending',
        color: '#EF4444', // RED for requires attention
        isBold: true, // Bold styling
        metadata: {
          type: 'stock_count_requires_attention',
          stock_count_id: countId,
          link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/stockly/stock-counts/${countId}/review`,
          rejection_reason: rejectionReason.trim(),
          reviewed_by: user.id,
          reviewed_by_name: approverProfile?.full_name,
        },
      };

      // Get existing calendar data for this specific user
      const { data: existingCalendar } = await supabaseAdmin
        .from('profile_settings')
        .select('key, value')
        .eq('company_id', count.company_id)
        .eq('key', handoverKey)
        .maybeSingle();

      let calendarData: any = {};
      if (existingCalendar) {
        calendarData = typeof existingCalendar.value === 'string' 
          ? JSON.parse(existingCalendar.value)
          : existingCalendar.value || {};
      }

      if (!calendarData.tasks) {
        calendarData.tasks = [];
      }
      
      // Check if task already exists (avoid duplicates)
      const existingTaskIndex = calendarData.tasks.findIndex((t: any) => 
        t.id === taskId || (t.metadata?.stock_count_id === countId && t.metadata?.type === 'stock_count_requires_attention')
      );
      
      if (existingTaskIndex >= 0) {
        console.log('⚠️ Task already exists, updating it');
        calendarData.tasks[existingTaskIndex] = newTask;
      } else {
        calendarData.tasks.push(newTask);
        console.log('✅ Added new task to calendar data. Total tasks:', calendarData.tasks.length);
      }

      const { data: calendarDataResult, error: calendarError } = await supabaseAdmin
        .from('profile_settings')
        .upsert({
          key: handoverKey,
          profile_id: assignedToId,
          company_id: count.company_id,
          value: calendarData,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'key,company_id'
        })
        .select()
        .single();

      if (calendarError) {
        console.error('❌ Error creating calendar task:', calendarError);
        console.error('Calendar error details:', JSON.stringify(calendarError, null, 2));
        console.error('Task data:', JSON.stringify(newTask, null, 2));
      } else {
        console.log('✅ Calendar task created for counter (red, bold, urgent)');
        console.log('Calendar entry ID:', calendarDataResult?.id);
        console.log('Task assigned to:', counterId, 'Task ID:', taskId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stock count marked as requires attention',
      notifications_sent: {
        in_app: true,
        msgly: true,
        calendar_task: true,
      },
    });

  } catch (error: any) {
    console.error('Error in reject endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
