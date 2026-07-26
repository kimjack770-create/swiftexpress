// ========================================================
// SWIFT EXPRESS LOGISTICS - SUPABASE DATABASE SHIPMENT SERVICE
// Pure Database Operations (Supabase PostgreSQL)
// ========================================================

import { dbEngine } from './supabaseClient.js';

function normalizeCode(str) {
  if (!str) return '';
  return str.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function generateFallbackTrackingNumber(prefix = 'SEL') {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  return `${prefix}-${datePart}-${randomHex}`;
}

// Normalize a Supabase tracking_event row → consistent shape used by the UI
function normalizeEvent(ev) {
  if (!ev) return ev;
  return {
    ...ev,
    timestamp: ev.timestamp || ev.event_timestamp || new Date().toISOString()
  };
}

class ShipmentService {
  async getAllShipments() {
    if (!dbEngine.client) return [];
    try {
      const { data, error } = await dbEngine.client
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch shipments error:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Supabase fetch shipments notice:', err.message);
      return [];
    }
  }

  async getShipmentByTrackingNumber(trackingNumber) {
    if (!trackingNumber || !dbEngine.client) return null;
    const rawCode = trackingNumber.trim();
    const targetNorm = normalizeCode(rawCode);

    if (!targetNorm) return null;

    try {
      // 1. Exact case-insensitive match
      const { data, error } = await dbEngine.client
        .from('shipments')
        .select('*')
        .ilike('tracking_number', rawCode)
        .maybeSingle();

      if (!error && data) return data;

      // 2. Fetch all & match normalized or substring fuzzy match
      const { data: allData } = await dbEngine.client.from('shipments').select('*');
      if (allData && allData.length > 0) {
        let match = allData.find(s => s && s.tracking_number && normalizeCode(s.tracking_number) === targetNorm);
        if (match) return match;

        match = allData.find(s => s && s.tracking_number && (
          normalizeCode(s.tracking_number).includes(targetNorm) || 
          targetNorm.includes(normalizeCode(s.tracking_number))
        ));
        if (match) return match;
      }
    } catch (err) {
      console.error('Supabase lookup error:', err.message);
    }

    return null;
  }

  async getTrackingEvents(shipmentId) {
    if (!shipmentId || !dbEngine.client) return [];
    try {
      const { data, error } = await dbEngine.client
        .from('tracking_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('event_timestamp', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(normalizeEvent);
      }
    } catch (err) {
      console.error('Supabase tracking events fetch notice:', err.message);
    }
    return [];
  }

  async createShipment(shipmentData) {
    if (!dbEngine.client) {
      throw new Error('Database client is not connected. Please check Supabase configuration.');
    }

    const trackingNumber = (shipmentData.tracking_number || '').toString().trim();
    const resolvedTrackingNumber = trackingNumber || generateFallbackTrackingNumber('SEL');

    const payload = {
      tracking_number: resolvedTrackingNumber,
      status: shipmentData.status || "In Transit",
      payment_status: shipmentData.payment_status || "Paid",
      company_name: shipmentData.company_name || "Swift Express Logistics",
      logistics_provider: shipmentData.logistics_provider || "Swift Express",
      quantity: shipmentData.quantity || 1,
      comment: shipmentData.comment || "",
      created_at: new Date().toISOString(),
      ...shipmentData
    };

    delete payload.id;

    const { data, error } = await dbEngine.client
      .from('shipments')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Supabase shipment insert error:', error.message);
      throw new Error(error.message);
    }

    // Insert initial tracking event into database
    const cloudEventPayload = {
      shipment_id: data.id,
      status: data.status,
      location: data.origin || data.current_location || "Origin Hub",
      description: data.comment || 'Package record created and shipping label generated.',
      updated_by: 'Admin',
      event_timestamp: new Date().toISOString()
    };

    try {
      await dbEngine.client.from('tracking_events').insert([cloudEventPayload]);
    } catch (e) {
      console.warn('Supabase tracking event insert notice:', e.message);
    }

    return data;
  }

  async updateShipmentStatus(shipmentId, newStatus, location, comment, updatedBy = "Admin", dateValue = '', timeValue = '') {
    if (!dbEngine.client) {
      throw new Error('Database client is not connected.');
    }

    const selectedDateTime = dateValue && timeValue
      ? `${dateValue}T${timeValue}:00`
      : new Date().toISOString();
    const eventTimestamp = new Date(selectedDateTime).toISOString();

    // Resolve target shipment UUID
    let targetId = shipmentId;
    const { data: shipmentMatch } = await dbEngine.client
      .from('shipments')
      .select('id, tracking_number')
      .or(`id.eq.${shipmentId},tracking_number.eq.${shipmentId}`)
      .maybeSingle();

    if (shipmentMatch) {
      targetId = shipmentMatch.id;
    }

    const updatePayload = {
      status: newStatus,
      current_location: location,
      updated_at: eventTimestamp
    };
    if (newStatus === 'Delivered') {
      updatePayload.actual_delivery = eventTimestamp;
    }

    const { error: updateErr } = await dbEngine.client
      .from('shipments')
      .update(updatePayload)
      .eq('id', targetId);

    if (updateErr) {
      console.error('Supabase status update error:', updateErr.message);
      throw new Error(updateErr.message);
    }

    const { error: eventErr } = await dbEngine.client
      .from('tracking_events')
      .insert([{
        shipment_id: targetId,
        status: newStatus,
        location: location,
        description: comment,
        updated_by: updatedBy,
        event_timestamp: eventTimestamp
      }]);

    if (eventErr) {
      console.warn('Supabase tracking event insert notice:', eventErr.message);
    }
  }

  async deleteShipment(shipmentId) {
    if (!dbEngine.client) return;
    try {
      await dbEngine.client
        .from('shipments')
        .delete()
        .or(`id.eq.${shipmentId},tracking_number.eq.${shipmentId}`);
    } catch (err) {
      console.warn('Supabase delete notice:', err.message);
    }
  }
}

export const shipmentService = new ShipmentService();
