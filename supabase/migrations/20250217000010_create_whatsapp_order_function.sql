-- ============================================================================
-- Migration: Create WhatsApp Order Generation Function
-- Description: Function to generate WhatsApp order messages for purchase orders
-- ============================================================================

BEGIN;

-- URL encode helper
CREATE OR REPLACE FUNCTION url_encode(text) RETURNS TEXT AS $$
SELECT string_agg(
    CASE 
        WHEN char ~ '[a-zA-Z0-9._~-]' THEN char
        ELSE '%' || upper(encode(char::bytea, 'hex'))
    END, ''
)
FROM regexp_split_to_table($1, '') AS char;
$$ LANGUAGE sql IMMUTABLE;

-- Function to generate WhatsApp order message
CREATE OR REPLACE FUNCTION generate_whatsapp_order(p_po_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_supplier RECORD;
    v_site_name TEXT;
    v_order RECORD;
    v_lines RECORD;
    v_message TEXT;
    v_whatsapp_number TEXT;
BEGIN
    -- Get order details
    SELECT po.*, s.name as site_name, sup.name as supplier_name,
           sup.ordering_config->>'whatsapp_number' as whatsapp_number
    INTO v_order
    FROM purchase_orders po
    JOIN sites s ON s.id = po.site_id
    JOIN suppliers sup ON sup.id = po.supplier_id
    WHERE po.id = p_po_id;
    
    IF v_order IS NULL THEN
        RETURN jsonb_build_object('error', 'Order not found');
    END IF;
    
    v_whatsapp_number := v_order.whatsapp_number;
    
    -- Build message
    v_message := format(E'🛒 ORDER from %s\n📅 Date: %s\n📦 Supplier: %s\n\n━━━━━━━━━━━━━━━\n',
        v_order.site_name,
        to_char(v_order.order_date, 'DD/MM/YYYY'),
        v_order.supplier_name
    );
    
    -- Add line items
    FOR v_lines IN
        SELECT pv.product_name, pol.quantity_ordered, u.abbreviation
        FROM purchase_order_lines pol
        JOIN product_variants pv ON pv.id = pol.product_variant_id
        JOIN uom u ON u.id = pv.pack_unit_id
        WHERE pol.purchase_order_id = p_po_id
        ORDER BY pv.product_name
    LOOP
        v_message := v_message || format(E'• %s × %s %s\n',
            v_lines.product_name,
            TRIM(TO_CHAR(v_lines.quantity_ordered, '999990.##')),
            v_lines.abbreviation
        );
    END LOOP;
    
    v_message := v_message || E'\n━━━━━━━━━━━━━━━\n';
    v_message := v_message || E'Please confirm delivery date.\nThank you! 🙏';
    
    -- Update PO with message
    UPDATE purchase_orders
    SET sent_message = v_message
    WHERE id = p_po_id;
    
    RETURN jsonb_build_object(
        'message', v_message,
        'whatsapp_number', v_whatsapp_number,
        'whatsapp_url', format('https://wa.me/%s?text=%s', 
            REPLACE(REPLACE(v_whatsapp_number, '+', ''), ' ', ''),
            url_encode(v_message)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

