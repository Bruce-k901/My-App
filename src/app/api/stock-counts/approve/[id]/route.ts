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
      const idIndex = pathParts.indexOf('approve');
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

    // Check if count is in a valid state for approval
    if (count.status !== 'pending_review' && count.status !== 'ready_for_approval') {
      return NextResponse.json(
        { error: `Stock count must be in 'pending_review' or 'ready_for_approval' status. Current status: ${count.status}` },
        { status: 400 }
      );
    }

    // Check if user is the approver (for ready_for_approval status)
    if (count.status === 'ready_for_approval' && count.approver_id && count.approver_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned approver can approve this stock count' },
        { status: 403 }
      );
    }

    // Get approval comments from request body if provided
    const body = await request.json().catch(() => ({}));
    const approvalComments = body.approvalComments || {};

    console.log('💬 Approval comments received:', {
      count: Object.keys(approvalComments).length,
      comments: Object.entries(approvalComments).map(([id, comment]) => ({
        itemId: id,
        comment: comment,
        hasComment: !!comment,
      })),
    });

    // Save approval comments to items
    if (Object.keys(approvalComments).length > 0) {
      let savedCount = 0;
      let errorCount = 0;
      
      for (const [itemId, comment] of Object.entries(approvalComments)) {
        // Save even if comment is empty string (to clear previous comments)
        // But skip if comment is undefined/null
        if (comment !== undefined && comment !== null) {
          const { error: updateError } = await supabaseAdmin
            .from('stock_count_items')
            .update({ approval_comments: comment as string || null })
            .eq('id', itemId)
            .eq('stock_count_id', countId);
          
          if (updateError) {
            console.error(`❌ Error saving approval comment for item ${itemId}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Saved approval comment for item ${itemId}:`, comment);
            savedCount++;
          }
        }
      }
      
      console.log(`💬 Approval comments save summary: ${savedCount} saved, ${errorCount} errors`);
    } else {
      console.log('⚠️ No approval comments received in request body');
    }

    // Update count status to approved
    const { error: updateError } = await supabaseAdmin
      .from('stock_counts')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
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
    
    console.log('🔍 Counter ID from count:', counterId);
    console.log('🔍 Count data:', {
      ready_for_approval_by: count.ready_for_approval_by,
      completed_by: count.completed_by,
      created_by: count.created_by,
    });
    
    // Get approver and counter profiles
    const { data: approverProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    const { data: counterProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, auth_user_id')
      .eq('id', counterId)
      .single();

    console.log('🔍 Counter profile found:', {
      counterId,
      counterProfile: counterProfile ? {
        id: counterProfile.id,
        full_name: counterProfile.full_name,
        email: counterProfile.email,
        auth_user_id: counterProfile.auth_user_id,
      } : null,
    });

    // Send notifications back to counter (or to approver if self-approval)
    // Compare profile IDs, not auth user ID
    const approverProfileId = approverProfile?.id;
    const isSelfApproval = counterId === approverProfileId;
    
    console.log('🔔 Notification check:', {
      counterId,
      approverProfileId,
      approverAuthId: user.id,
      isSelfApproval,
      willSendNotifications: counterId && !isSelfApproval,
    });
    
    if (counterId && !isSelfApproval) {
      // 1. In-app notification
      const { data: notificationData, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          company_id: count.company_id,
          site_id: count.site_id,
          user_id: counterId,
          type: 'stock_count_approved',
          title: 'Stock Count Approved ✅',
          message: `Your stock count "${count.name || count.count_number}" has been approved by ${approverProfile?.full_name || 'the approver'}. You can now finalize it to update stock levels.`,
          severity: 'success',
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
        const messageContent = `✅ **Stock Count Approved**

Your stock count "${count.name || count.count_number}" has been approved.

**Next Steps:**
Please finalize the count to update your stock on hand levels.

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
              system_type: 'stock_count_approved',
              from_opsly: true,
              stock_count_id: countId,
              sender_name: 'Opsly Admin',
            },
          } as any)
          .select('id, channel_id, created_at')
          .single();

        if (messageError) {
          console.error('❌ Error sending Msgly message:', messageError);
          console.error('Message error details:', JSON.stringify(messageError, null, 2));
          console.error('Channel ID:', channelId);
          console.error('Sender ID:', user.id);
          console.error('Counter ID:', counterId);
        } else if (messageData) {
          console.log('✅✅✅ Msgly message sent successfully!');
          console.log('Message ID:', messageData?.id);
          console.log('Channel ID:', channelId);
          console.log('Counter should see this in their direct message with approver');
          
          // Update channel's last_message_at to make it appear in conversations list
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

      // 3. Calendar task for counter to finalize (ALWAYS create, even for self-approval)
      console.log('📅 Starting calendar task creation...');
      const today = new Date();
      const dueDateStr = today.toISOString().split('T')[0];

      const taskId = `task-finalize-${Date.now()}`;
      
      // Use counter's profile ID (not auth user ID) for assignedTo
      // The calendar page filters by userProfile?.id which should match the profile ID
      const assignedToId = counterProfile?.id || counterId;
      const handoverKey = `handover:${dueDateStr}:${assignedToId}`;
      
      console.log('📅 Creating calendar task:', {
        taskId,
        assignedTo: assignedToId,
        counterId,
        counterProfileId: counterProfile?.id,
        dueDate: dueDateStr,
        handoverKey,
      });
      
      const newTask = {
        id: taskId,
        title: `✅ Finalize Approved Stock Count: ${count.name || count.count_number}`,
        dueDate: dueDateStr,
        dueTime: today.toTimeString().slice(0, 5),
        assignedTo: assignedToId, // Use profile ID, not auth user ID
        assignedToName: counterProfile?.full_name || counterProfile?.email,
        priority: 'high',
        status: 'pending',
        color: '#10B981', // Green for approved
        metadata: {
          type: 'stock_count_finalize',
          stock_count_id: countId,
          link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/stockly/stock-counts/${countId}/review`,
          approved_by: user.id,
          approved_by_name: approverProfile?.full_name,
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
        t.id === taskId || (t.metadata?.stock_count_id === countId && t.metadata?.type === 'stock_count_finalize')
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
        console.error('Due date:', dueDateStr);
        console.error('Counter ID:', counterId);
      } else {
        console.log('✅✅✅ Calendar task created successfully!');
        console.log('Calendar key:', calendarDataResult?.key);
        console.log('Calendar entry ID:', calendarDataResult?.id);
        console.log('Task ID:', taskId);
        console.log('Task assigned to:', assignedToId, '(', counterProfile?.full_name || counterProfile?.email, ')');
        console.log('Counter ID used:', counterId);
        console.log('Counter profile ID:', counterProfile?.id);
        console.log('Task link:', newTask.metadata?.link);
        console.log('Due date:', dueDateStr);
        console.log('⚠️ IMPORTANT: Counter must have userProfile?.id ===', assignedToId, 'to see this task');
        console.log('Counter should see this task in their calendar at /dashboard/calendar');
        
        // Verify the saved data (use the same key format as the upsert)
        const { data: verifyData } = await supabaseAdmin
          .from('profile_settings')
          .select('key, value')
          .eq('key', handoverKey)
          .eq('company_id', count.company_id)
          .single();
        
        if (verifyData) {
          const verifyTasks = (typeof verifyData.value === 'string' 
            ? JSON.parse(verifyData.value) 
            : verifyData.value)?.tasks || [];
          const ourTask = verifyTasks.find((t: any) => t.id === taskId);
          if (ourTask) {
            console.log('✅ Verified: Task exists in database:', {
              taskId: ourTask.id,
              assignedTo: ourTask.assignedTo,
              title: ourTask.title,
            });
          } else {
            console.error('❌ ERROR: Task not found in database after save!');
          }
        }
      }
    }

    // 3. Calendar task for counter to finalize (ALWAYS create, even for self-approval)
    // This should always run regardless of who approved
    if (counterId) {
      console.log('📅 Starting calendar task creation (outside notification block)...');
      const today = new Date();
      const dueDateStr = today.toISOString().split('T')[0];

      const taskId = `task-finalize-${Date.now()}`;
      
      // Use counter's profile ID (not auth user ID) for assignedTo
      // The calendar page filters by userProfile?.id which should match the profile ID
      const assignedToId = counterProfile?.id || counterId;
      const handoverKey = `handover:${dueDateStr}:${assignedToId}`;
      
      console.log('📅 Creating calendar task:', {
        taskId,
        assignedTo: assignedToId,
        counterId,
        counterProfileId: counterProfile?.id,
        dueDate: dueDateStr,
        handoverKey,
        isSelfApproval: counterId === user.id,
      });
      
      const newTask = {
        id: taskId,
        title: `✅ Finalize Approved Stock Count: ${count.name || count.count_number}`,
        dueDate: dueDateStr,
        dueTime: today.toTimeString().slice(0, 5),
        assignedTo: assignedToId, // Use profile ID, not auth user ID
        assignedToName: counterProfile?.full_name || counterProfile?.email,
        priority: 'high',
        status: 'pending',
        color: '#10B981', // Green for approved
        metadata: {
          type: 'stock_count_finalize',
          stock_count_id: countId,
          link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/stockly/stock-counts/${countId}/review`,
          approved_by: user.id,
          approved_by_name: approverProfile?.full_name,
        },
      };

      // Get existing calendar data for this specific user
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
      }

      if (!calendarData.tasks) {
        calendarData.tasks = [];
      }
      
      // Check if task already exists (avoid duplicates)
      const existingTaskIndex = calendarData.tasks.findIndex((t: any) => 
        t.id === taskId || (t.metadata?.stock_count_id === countId && t.metadata?.type === 'stock_count_finalize')
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
        console.error('❌❌❌ Error creating calendar task:', calendarError);
        console.error('Calendar error details:', JSON.stringify(calendarError, null, 2));
        console.error('Task data:', JSON.stringify(newTask, null, 2));
        console.error('Due date:', dueDateStr);
        console.error('Counter ID:', counterId);
        console.error('Company ID:', count.company_id);
      } else {
        console.log('✅✅✅ Calendar task created successfully!');
        console.log('Calendar key:', calendarDataResult?.key);
        console.log('Calendar entry ID:', calendarDataResult?.id);
        console.log('Task ID:', taskId);
        console.log('Task assigned to:', assignedToId, '(', counterProfile?.full_name || counterProfile?.email, ')');
        console.log('Counter ID used:', counterId);
        console.log('Counter profile ID:', counterProfile?.id);
        console.log('Task link:', newTask.metadata?.link);
        console.log('Due date:', dueDateStr);
        console.log('⚠️ IMPORTANT: Counter must have userProfile?.id ===', assignedToId, 'to see this task');
        console.log('Counter should see this task in their calendar widget');
        
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
          const ourTask = verifyTasks.find((t: any) => t.id === taskId);
          if (ourTask) {
            console.log('✅ Verified: Task exists in database:', {
              taskId: ourTask.id,
              assignedTo: ourTask.assignedTo,
              title: ourTask.title,
            });
          } else {
            console.error('❌ ERROR: Task not found in database after save!');
            console.error('All tasks in database:', verifyTasks.map((t: any) => ({ id: t.id, title: t.title, assignedTo: t.assignedTo })));
          }
        } else {
          console.error('❌ ERROR: Could not retrieve calendar data after save!');
        }
      }
    } else {
      console.error('❌ Cannot create calendar task - counterId is null or undefined');
    }

    return NextResponse.json({
      success: true,
      message: 'Stock count approved successfully',
      notifications_sent: {
        in_app: true,
        msgly: true,
        calendar_task: true,
      },
    });

  } catch (error: any) {
    console.error('Error in approve endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
