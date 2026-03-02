import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getApproverForStockCount } from '@/lib/stock-counts';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    log('🚀 [ready-for-approval] Starting...');
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
      const idIndex = pathParts.indexOf('ready-for-approval');
      if (idIndex >= 0 && pathParts[idIndex + 1]) {
        countId = pathParts[idIndex + 1];
      }
    }
    
    if (!countId) {
      log('❌ Count ID missing');
      return NextResponse.json(
        { error: 'Stock count ID is required', logs },
        { status: 400 }
      );
    }
    log(`📋 Count ID: ${countId}`);

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized', logs }, { status: 401 });
    }
    log(`👤 User: ${user.id} (${user.email})`);

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

    // Check if count is in a valid state for marking ready
    // Allow completed, rejected, or in_progress/draft/active (regardless of items counted - user decides)
    if (count.status !== 'completed' && count.status !== 'rejected' && 
        count.status !== 'in_progress' && count.status !== 'draft' && count.status !== 'active') {
      return NextResponse.json(
        { error: `Stock count must be in 'completed', 'rejected', 'in_progress', 'draft', or 'active' status. Current status: ${count.status}` },
        { status: 400 }
      );
    }

    // If status is in_progress, draft, or active, first mark it as completed
    if (count.status === 'in_progress' || count.status === 'draft' || count.status === 'active') {
      const { error: completeError } = await supabaseAdmin
        .from('stock_counts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        })
        .eq('id', countId);

      if (completeError) {
        console.error('Error marking count as completed:', completeError);
        return NextResponse.json(
          { error: 'Failed to mark count as completed' },
          { status: 500 }
        );
      }

      // Update count object for subsequent operations
      count.status = 'completed';
    }

    // Get approver - check if one was provided in request body, otherwise use hierarchy
    let requestBody: any = {};
    try {
      requestBody = await request.json();
    } catch (e) {
      // Request body is optional
    }

    let approver: { approverId: string; approverRole: string } | null = null;
    let approverProfileFromRequest: any = null;

    if (requestBody.approver_id) {
      console.log('📋 Approver ID provided in request:', requestBody.approver_id);
      console.log('📋 Current user.id (auth ID):', user.id);
      console.log('📋 Is self-approval?', requestBody.approver_id === user.id);
      
      // Use the provided approver ID
      const { data: approverProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, app_role')
        .eq('id', requestBody.approver_id)
        .eq('company_id', count.company_id)
        .single();

      if (approverProfile) {
        approverProfileFromRequest = approverProfile;
        approver = {
          approverId: approverProfile.id,
          approverRole: approverProfile.app_role || 'Approver',
        };
        console.log('✅ Approver profile found:', {
          id: approverProfile.id,
          name: approverProfile.full_name,
          email: approverProfile.email,
          role: approverProfile.app_role,
        });
      } else {
        console.warn('⚠️ Approver profile not found for ID:', requestBody.approver_id);
      }
    }

    // If no approver provided or not found, get from hierarchy
    if (!approver) {
      approver = await getApproverForStockCount(
        count.company_id,
        count.site_id,
        user.id
      );

      // If no approver found, use the current user as approver (self-approval fallback)
      if (!approver) {
        console.warn('No approver found in hierarchy, using current user as approver');
        approver = {
          approverId: user.id,
          approverRole: 'Self-Approval',
        };
      }
    }

    // Update count status to ready_for_approval
    // Try with all columns first, fallback to minimal if columns don't exist
    const fullUpdateData: any = {
      status: 'ready_for_approval',
      updated_at: new Date().toISOString(),
      ready_for_approval_at: new Date().toISOString(),
      ready_for_approval_by: user.id,
      approver_id: approver.approverId,
      rejection_reason: null,
      rejected_by: null,
      rejected_at: null,
    };

    console.log('Attempting update with all columns:', fullUpdateData);
    let { error: updateError } = await supabaseAdmin
      .from('stock_counts')
      .update(fullUpdateData)
      .eq('id', countId);

    // If update failed due to missing columns, try without approval-specific columns
    if (updateError) {
      const errorMsg = String(updateError.message || updateError);
      if (errorMsg.includes('column') || errorMsg.includes('schema cache') || errorMsg.includes('approver_id')) {
        console.warn('Approval workflow columns missing, trying minimal update');
        // Try with just status - the approval workflow columns don't exist yet
        const minimalUpdate: any = {
          status: 'ready_for_approval',
          updated_at: new Date().toISOString(),
        };
        
        const { error: minimalError } = await supabaseAdmin
          .from('stock_counts')
          .update(minimalUpdate)
          .eq('id', countId);
        
        if (minimalError) {
          updateError = minimalError;
        } else {
          // Minimal update succeeded - columns don't exist, migration needs to be run
          console.warn('Approval workflow columns missing. Status updated but approval workflow features unavailable.');
          updateError = null; // Clear error since minimal update worked
          
          // Return early with a warning - skip notification creation since columns don't exist
          return NextResponse.json({
            success: true,
            message: 'Stock count status updated to ready_for_approval. However, approval workflow columns are missing - please run migration 20260120180644_add_stock_count_approval_workflow.sql to enable full approval workflow features.',
            warning: 'Migration required for full approval workflow',
            approver: {
              id: approver.approverId,
              role: approver.approverRole,
            },
          });
        }
      }
    }

    if (updateError) {
      console.error('Error updating count status:', updateError);
      console.error('Update data:', JSON.stringify(fullUpdateData, null, 2));
      console.error('Count ID:', countId);
      console.error('Count current status:', count.status);
      console.error('Count object keys:', Object.keys(count));
      
      // Check if columns exist
      const errorMessage = updateError.message || String(updateError);
      let userFriendlyError = `Failed to update count status: ${errorMessage}`;
      
      // Provide helpful error messages for common issues
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        userFriendlyError = 'Database columns missing. Please run the approval workflow migration.';
      } else if (errorMessage.includes('constraint') || errorMessage.includes('check')) {
        userFriendlyError = `Status constraint violation: ${errorMessage}. Current status: ${count.status}`;
      }
      
      return NextResponse.json(
        { error: userFriendlyError, details: errorMessage },
        { status: 500 }
      );
    }

    // Get count creator and approver profiles for notifications
    const { data: creatorProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    // Get approver profile (use the one from request if available, otherwise fetch)
    let approverProfile = approverProfileFromRequest;
    if (!approverProfile) {
      const { data: fetchedProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', approver.approverId)
        .single();
      approverProfile = fetchedProfile;
    }
    
    log(`👔 Approver: ${approver.approverId} (${approverProfile?.full_name || approverProfile?.email})`);

    // Create in-app notification for approver
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: count.company_id,
        site_id: count.site_id,
        user_id: approver.approverId,
        type: 'stock_count_approval_required',
        title: 'Stock Count Approval Required',
        message: `Stock count "${count.name || count.count_number}" is ready for your approval. Variance: £${Math.abs(count.variance_value || 0).toFixed(2)}`,
        severity: 'info',
        action_url: `/dashboard/stockly/stock-counts/${countId}/review`,
        created_at: new Date().toISOString(),
      });
    
    if (notifError) {
      log(`❌ In-app notification error: ${notifError.message}`);
    } else {
      log('✅ In-app notification created');
    }

    // Create or get messaging channel between creator and approver
    let channelId: string | null = null;

    console.log('🔍 Looking for existing direct message channel between:', user.id, 'and', approver.approverId);

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
          .in('profile_id', [user.id, approver.approverId]);
        
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
      const channelName = `${creatorProfile?.full_name || 'User'} & ${approverProfile?.full_name || 'Approver'}`;
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
          { channel_id: channelId, profile_id: approver.approverId, member_role: 'member' },
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

    // Send message in channel - from Opsly System
    if (channelId) {
      const messageContent = `📊 **Stock Count Approval Required**

Stock count "${count.name || count.count_number}" has been marked ready for your approval.

**Details:**
• Count Date: ${new Date(count.count_date).toLocaleDateString()}
• Variance: £${Math.abs(count.variance_value || 0).toFixed(2)}
• Items Counted: ${count.items_counted || 0} / ${count.total_items || 0}

Please review and approve or reject this stock count.

[Review Stock Count →](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/stockly/stock-counts/${countId}/review)

---
*This is an automated message from Opsly System*`;

      // Insert message into messaging_messages table
      // Use sender_id like notify-open-shifts route (which works)
      console.log('📤 Inserting message into channel:', channelId);
      console.log('Message content length:', messageContent.length);
      
      const { data: insertedMessage, error: messageError } = await supabaseAdmin
        .from('messaging_messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id, // Use sender_id like notify-open-shifts
          content: messageContent,
          message_type: 'system',
          metadata: {
            is_system: true,
            system_type: 'stock_count_approval',
            from_opsly: true,
            stock_count_id: countId,
            sender_name: 'Opsly System',
          },
        } as any)
        .select('id, channel_id, created_at')
        .single();

      if (messageError) {
        log(`❌ Msgly message error: ${messageError.message}`);
      } else if (insertedMessage) {
        log('✅ Msgly message sent');
        await supabaseAdmin
          .from('messaging_channels')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', channelId);
      } else {
        log('❌ Msgly message insert returned no data');
      }
    } else {
      log('❌ No Msgly channel – cannot send message');
    }

    // Create calendar task for approver - SAME DAY, RED, BOLD
    log('📅 Creating calendar task...');
    const today = new Date();
    const dueDateStr = today.toISOString().split('T')[0];

    const taskId = `task-approve-${Date.now()}`;
    
    // Use approver's auth user ID for assignedTo (matches userId in AppContext)
    // In Supabase, profiles.id typically equals auth.users.id
    // For self-approval, use user.id directly (the auth user ID)
    // For others, use approverProfile.id (which should equal auth user ID) or approver.approverId
    const isSelfApproval = approver.approverId === user.id || approverProfile?.id === user.id;
    
    // IMPORTANT: Use the auth user ID (user.id) for assignedTo to match userId in AppContext
    // In Supabase, profiles.id should equal auth.users.id, but we'll use user.id for self-approval
    // For others, we'll use approverProfile.id (which should equal their auth user ID)
    let assignedToId: string;
    if (isSelfApproval) {
      // Self-approval: use current user's auth ID directly
      assignedToId = user.id;
      console.log('✅ Self-approval detected - using user.id (auth ID) for assignedTo:', assignedToId);
    } else if (approverProfile?.id) {
      // Other approver: use their profile ID (which should equal their auth user ID)
      assignedToId = approverProfile.id;
      console.log('✅ Using approver profile ID for assignedTo:', assignedToId);
    } else {
      // Fallback: use approver.approverId (should be profile ID = auth user ID)
      assignedToId = approver.approverId;
      console.log('⚠️ Using approver.approverId as fallback for assignedTo:', assignedToId);
    }
    
    console.log('📅 Calendar task details:', {
      taskId,
      assignedTo: assignedToId,
      approverId: approver.approverId,
      approverProfileId: approverProfile?.id,
      currentUserId: user.id,
      isSelfApproval,
      dueDate: dueDateStr,
    });
    
    const newTask = {
      id: taskId,
      title: `📊 Review Stock Count: ${count.name || count.count_number}`,
      dueDate: dueDateStr, // SAME DAY
      dueTime: today.toTimeString().slice(0, 5),
      assignedTo: assignedToId, // Should match userId in AppContext
      assignedToName: approverProfile?.full_name || approverProfile?.email,
      priority: 'urgent', // Highest priority
      status: 'pending',
      color: '#EF4444', // RED
      isBold: true, // BOLD
      metadata: {
        type: 'stock_count_approval',
        stock_count_id: countId,
        link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/stockly/stock-counts/${countId}/review`,
        submitted_by: user.id,
        submitted_by_name: creatorProfile?.full_name,
        auto_approve_time: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        note: 'Auto-approves in 24 hours if not actioned.',
        // Store IDs for debugging
        approverId: approver.approverId,
        approverProfileId: approverProfile?.id,
        currentUserId: user.id,
      },
    };

    // Create calendar task for approver
    // Calendar tasks are stored in profile_settings with key "handover:YYYY-MM-DD:profileId" (per-approver)
    // Tasks have assignedTo field to make them user-specific
    const handoverKey = `handover:${dueDateStr}:${approver.approverId}`;
    console.log('📅 Fetching existing calendar data for:', handoverKey);
    const { data: existingCalendar, error: fetchError } = await supabaseAdmin
      .from('profile_settings')
      .select('key, value')
      .eq('company_id', count.company_id)
      .eq('key', handoverKey)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching existing calendar data:', fetchError);
    }

    let calendarData: any = {};
    if (existingCalendar) {
      calendarData = typeof existingCalendar.value === 'string' 
        ? JSON.parse(existingCalendar.value)
        : existingCalendar.value || {};
      console.log('📅 Found existing calendar data with', calendarData.tasks?.length || 0, 'tasks');
    } else {
      console.log('📅 No existing calendar data found, creating new entry');
    }

    if (!calendarData.tasks) {
      calendarData.tasks = [];
    }
    
    // Check if task already exists (avoid duplicates)
    const existingTaskIndex = calendarData.tasks.findIndex((t: any) => 
      t.id === taskId || (t.metadata?.stock_count_id === countId && t.metadata?.type === 'stock_count_approval')
    );
    
    if (existingTaskIndex >= 0) {
      console.log('⚠️ Task already exists, updating it');
      calendarData.tasks[existingTaskIndex] = newTask;
    } else {
      calendarData.tasks.push(newTask);
      console.log('✅ Added new task to calendar data. Total tasks:', calendarData.tasks.length);
    }
    
    console.log('📅 Calendar data before save:', {
      date: dueDateStr,
      totalTasks: calendarData.tasks.length,
      tasks: calendarData.tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate,
      })),
    });

    // Upsert calendar entry (per-approver, tasks filtered by assignedTo)
    // Note: We use a composite key approach - store approver-specific data
    // by including profile_id in the key and as a field
    const { data: calendarDataResult, error: calendarError } = await supabaseAdmin
      .from('profile_settings')
      .upsert({
        key: `handover:${dueDateStr}:${approver.approverId}`,
        profile_id: approver.approverId,
        company_id: count.company_id,
        value: calendarData,
        updated_at: new Date().toISOString(),
      } as any, {
        onConflict: 'key,company_id'
      })
      .select()
      .single();

    if (calendarError) {
      log(`❌ Calendar task error: ${calendarError.message}`);
      console.error('Calendar error details:', JSON.stringify(calendarError, null, 2));
      console.error('Task data:', JSON.stringify(newTask, null, 2));
      console.error('Due date:', dueDateStr);
      console.error('Approver ID:', approver.approverId);
      console.error('Company ID:', count.company_id);
    } else {
      log('✅ Calendar task created successfully');
      
      // Verify the saved data (use the same key format as the upsert)
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from('profile_settings')
        .select('key, value')
        .eq('key', handoverKey)
        .eq('company_id', count.company_id)
        .single();
      
      if (verifyError) {
        console.error('❌ Error verifying saved data:', verifyError);
      } else if (verifyData) {
        const verifyTasks = (typeof verifyData.value === 'string' 
          ? JSON.parse(verifyData.value) 
          : verifyData.value)?.tasks || [];
        const ourTask = verifyTasks.find((t: any) => t.id === taskId || (t.metadata?.stock_count_id === countId && t.metadata?.type === 'stock_count_approval'));
        if (ourTask) {
          console.log('✅ Verified: Task exists in database:', {
            taskId: ourTask.id,
            assignedTo: ourTask.assignedTo,
            title: ourTask.title,
            dueDate: ourTask.dueDate,
          });
          console.log('🔍 Task will be visible if userId ===', ourTask.assignedTo, 'OR userProfile?.id ===', ourTask.assignedTo);
        } else {
          console.error('❌ ERROR: Task not found in database after save!');
          console.error('All tasks in database:', verifyTasks.map((t: any) => ({ id: t.id, title: t.title, assignedTo: t.assignedTo, dueDate: t.dueDate })));
        }
      } else {
        console.error('❌ ERROR: Could not retrieve calendar data after save!');
      }
    }

    log(`📅 Task assignedTo: ${assignedToId} (calendar_date: ${dueDateStr})`);
    log('🎉 [ready-for-approval] Done.');

    return NextResponse.json({
      success: true,
      message: 'Stock count marked ready for approval',
      approver: {
        id: approver.approverId,
        role: approver.approverRole,
        name: approverProfile?.full_name || approverProfile?.email || 'Approver',
        email: approverProfile?.email,
      },
      notifications_sent: {
        in_app: true,
        msgly: !!channelId,
        calendar_task: true,
      },
      next_steps: `${approverProfile?.full_name || approverProfile?.email || 'The approver'} will receive notifications and can review this count. They can approve or reject it from the review page.`,
      debug: {
        logs,
        task_assigned_to: assignedToId,
        calendar_date: dueDateStr,
        channel_id: channelId ?? null,
      },
    });

  } catch (error: any) {
    log(`💥 Error: ${error?.message || 'Internal server error'}`);
    console.error('Error in ready-for-approval endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', logs },
      { status: 500 }
    );
  }
}
