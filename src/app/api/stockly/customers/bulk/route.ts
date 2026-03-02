import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';
import { sendPortalInviteEmail } from '@/lib/stockly/portalInvitationHelpers';

/**
 * Parse address string into address_line1 and address_line2
 * Handles newlines, commas, and other separators
 */
function parseAddress(address: string): { address_line1: string; address_line2: string | null } {
  if (!address || !address.trim()) {
    return { address_line1: '', address_line2: null };
  }

  // Try splitting on newlines first
  const lines = address.split(/\r?\n/).map(line => line.trim()).filter(line => line);
  
  if (lines.length > 1) {
    return {
      address_line1: lines[0],
      address_line2: lines.slice(1).join(', '),
    };
  }

  // Try splitting on comma if no newlines
  const commaParts = address.split(',').map(part => part.trim()).filter(part => part);
  
  if (commaParts.length > 1) {
    return {
      address_line1: commaParts[0],
      address_line2: commaParts.slice(1).join(', '),
    };
  }

  // Single line address
  return {
    address_line1: address.trim(),
    address_line2: null,
  };
}

/**
 * Extract city from address if not provided
 * Simple heuristic: look for common UK city patterns or use "London" as default
 */
function extractCity(address: string, postcode?: string): string {
  // Common UK cities to look for
  const commonCities = [
    'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Sheffield',
    'Bristol', 'Edinburgh', 'Glasgow', 'Cardiff', 'Belfast', 'Newcastle',
    'Nottingham', 'Leicester', 'Coventry', 'Bradford', 'Brighton', 'Plymouth'
  ];

  const addressLower = address.toLowerCase();
  
  for (const city of commonCities) {
    if (addressLower.includes(city.toLowerCase())) {
      return city;
    }
  }

  // If postcode starts with common patterns, infer city
  if (postcode) {
    const postcodeUpper = postcode.toUpperCase().trim();
    if (postcodeUpper.startsWith('E') || postcodeUpper.startsWith('N') || 
        postcodeUpper.startsWith('W') || postcodeUpper.startsWith('SW') ||
        postcodeUpper.startsWith('SE') || postcodeUpper.startsWith('NW')) {
      return 'London';
    }
  }

  // Default to London if we can't determine
  return 'London';
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * POST /api/stockly/customers/bulk
 * Bulk import customers from spreadsheet data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier record found. Please set up your supplier profile before adding customers.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { customers } = body;

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: customers must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get supplier's company_id
    const { data: supplier } = await supabase
      .from('order_book_suppliers')
      .select('company_id')
      .eq('id', supplierId)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [] as Array<{ index: number; business_name?: string; error: string }>,
      data: [] as any[],
    };

    // Process customers in batches
    const batchSize = 50;
    const batches: typeof customers[] = [];
    
    for (let i = 0; i < customers.length; i += batchSize) {
      batches.push(customers.slice(i, i + batchSize));
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const customersToInsert: any[] = [];
      const customerIndices: number[] = []; // Track original indices for error reporting

      // Prepare each customer in the batch
      for (let i = 0; i < batch.length; i++) {
        const originalIndex = batchIndex * batchSize + i;
        const customer = batch[i];

        try {
          // Validate required fields
          if (!customer.business_name || !customer.email) {
            results.failed++;
            results.errors.push({
              index: originalIndex,
              business_name: customer.business_name || 'Unknown',
              error: 'Missing required fields: business_name and email are required',
            });
            continue;
          }

          // Validate email format
          if (!isValidEmail(customer.email)) {
            results.failed++;
            results.errors.push({
              index: originalIndex,
              business_name: customer.business_name,
              error: `Invalid email format: ${customer.email}`,
            });
            continue;
          }

          // Parse address
          const address = customer.address || '';
          const { address_line1, address_line2 } = parseAddress(address);

          if (!address_line1) {
            results.failed++;
            results.errors.push({
              index: originalIndex,
              business_name: customer.business_name,
              error: 'Address is required',
            });
            continue;
          }

          // Extract city from address if not provided
          const city = customer.city || extractCity(address, customer.postcode);

          // Prepare customer record with defaults
          customersToInsert.push({
            supplier_id: supplierId,
            company_id: supplier.company_id,
            business_name: customer.business_name.trim(),
            trading_name: customer.business_name.trim(), // Same as business name
            contact_name: customer.contact ? customer.contact.trim() : null,
            email: customer.email.toLowerCase().trim(),
            phone: customer.phone ? customer.phone.trim() : null,
            address_line1: address_line1,
            address_line2: address_line2,
            city: city,
            postcode: customer.postcode ? customer.postcode.trim().toUpperCase() : null,
            country: 'UK',
            delivery_notes: customer.delivery_notes ? customer.delivery_notes.trim() : null,
            payment_terms_days: 30, // Net 30
            credit_limit: 1000, // £1000
            minimum_order_value: 30, // £30
            internal_notes: null,
            portal_access_enabled: true,
            status: 'pending',
          });

          customerIndices.push(originalIndex);
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            index: originalIndex,
            business_name: customer.business_name || 'Unknown',
            error: error.message || 'Failed to process customer data',
          });
        }
      }

      // Insert batch if we have valid customers
      if (customersToInsert.length > 0) {
        const { data: createdCustomers, error: insertError } = await supabase
          .from('order_book_customers')
          .insert(customersToInsert)
          .select();

        if (insertError) {
          // If batch insert fails, mark all in batch as failed
          for (let i = 0; i < customersToInsert.length; i++) {
            results.failed++;
            results.errors.push({
              index: customerIndices[i],
              business_name: customersToInsert[i].business_name,
              error: insertError.message || 'Failed to create customer',
            });
          }
        } else {
          // Successfully created customers
          if (createdCustomers) {
            results.created += createdCustomers.length;
            results.data.push(...createdCustomers);

            // Send portal invitations for each created customer (async, don't wait)
            for (const customer of createdCustomers) {
              try {
                await sendPortalInviteEmail({
                  id: customer.id,
                  email: customer.email,
                  business_name: customer.business_name,
                  contact_name: customer.contact_name,
                });
              } catch (inviteError: any) {
                console.error(`Error sending invitation for ${customer.business_name}:`, inviteError);
                // Don't fail the import if invitation fails
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: results.created,
      failed: results.failed,
      errors: results.errors,
      data: results.data,
    });
  } catch (error: any) {
    console.error('Error in POST /api/stockly/customers/bulk:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

