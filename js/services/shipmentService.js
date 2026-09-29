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

// Extract the creating admin owner from shipment record
export function getShipmentOwner(shipment) {
  if (!shipment) return 'geniusmaxx00@gmail.com';

  // 1. Direct created_by property (if column exists or local mock)
  if (shipment.created_by && typeof shipment.created_by === 'string') {
    return shipment.created_by.toLowerCase().trim();
  }

  // 2. Embedded creator tag in special_instructions: [creator:email@domain.com]
  if (shipment.special_instructions && typeof shipment.special_instructions === 'string') {
    const match = shipment.special_instructions.match(/\[creator:([^\]]+)\]/i);
    if (match && match[1]) {
      return match[1].toLowerCase().trim();
    }
  }

  // 3. Embedded creator tag in comment: [creator:email@domain.com]
  if (shipment.comment && typeof shipment.comment === 'string') {
    const match = shipment.comment.match(/\[creator:([^\]]+)\]/i);
    if (match && match[1]) {
      return match[1].toLowerCase().trim();
    }
  }

  // Fallback for seed / legacy shipments: they belong to the primary admin
  return 'geniusmaxx00@gmail.com';
}

// Determines if a shipment is visible to a given admin email
export function isShipmentVisibleToAdmin(shipment, adminEmail) {
  if (!adminEmail) return true;

  const owner = getShipmentOwner(shipment);
  const current = adminEmail.toLowerCase().trim();

  // Admin 1 (Genius Maxx / Primary Admin) alias matching
  const isCurrentAdmin1 = current === 'geniusmaxx00@gmail.com' || current === 'admin@swiftexpress.com';
  const isOwnerAdmin1 = owner === 'geniusmaxx00@gmail.com' || owner === 'admin@swiftexpress.com';

  if (isCurrentAdmin1 && isOwnerAdmin1) {
    return true;
  }

  return owner === current;
}

// Extract package photo or proof image from shipment record
export function getShipmentImage(shipment) {
  if (!shipment) return null;
  if (shipment.package_image && typeof shipment.package_image === 'string' && shipment.package_image.trim()) {
    return shipment.package_image.trim();
  }
  if (shipment.image_url && typeof shipment.image_url === 'string' && shipment.image_url.trim()) {
    return shipment.image_url.trim();
  }

  // Extract from special_instructions: [image:URL]
  if (shipment.special_instructions && typeof shipment.special_instructions === 'string') {
    const match = shipment.special_instructions.match(/\[image:([^\]]+)\]/i);
    if (match && match[1]) return match[1].trim();
  }

  // Extract from comment: [image:URL]
  if (shipment.comment && typeof shipment.comment === 'string') {
    const match = shipment.comment.match(/\[image:([^\]]+)\]/i);
    if (match && match[1]) return match[1].trim();
  }

  return null;
}

class ShipmentService {
  async getAllShipments(adminEmail = null) {
    let all = [];
    if (dbEngine.client) {
      try {
        const { data, error } = await dbEngine.client
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          all = data;
        } else if (error) {
          console.error('Supabase fetch shipments error:', error.message);
        }
      } catch (err) {
        console.error('Supabase fetch shipments notice:', err.message);
      }
    }

    if (!all || all.length === 0) {
      all = dbEngine.getCollection('shipments') || [];
    }

    if (adminEmail) {
      return all.filter(s => isShipmentVisibleToAdmin(s, adminEmail));
    }
    return all;
  }

  async getShipmentsForAdmin(adminEmail) {
    if (!adminEmail) return [];
    return this.getAllShipments(adminEmail);
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

    // Determine creating admin email
    let currentAdminEmail = shipmentData.created_by;
    let currentAdminName = 'Admin';
    try {
      const stored = JSON.parse(localStorage.getItem('sel_current_user') || 'null');
      if (stored) {
        if (!currentAdminEmail && stored.email) currentAdminEmail = stored.email;
        if (stored.full_name) currentAdminName = stored.full_name;
      }
    } catch (_) {}

    if (!currentAdminEmail) currentAdminEmail = 'geniusmaxx00@gmail.com';
    currentAdminEmail = currentAdminEmail.toLowerCase().trim();

    // Extract package image if provided
    const packageImage = (shipmentData.package_image || shipmentData.image_url || '').trim();
    const imageTag = packageImage ? ` [image:${packageImage}]` : '';

    // Embed creator tag and image tag into special_instructions for database persistence without column errors
    const creatorTag = `[creator:${currentAdminEmail}]${imageTag}`;
    const userSpecial = (shipmentData.special_instructions || '').trim();
    const mergedSpecialInstructions = userSpecial
      ? `${userSpecial} | ${creatorTag}`
      : creatorTag;

    const payload = {
      tracking_number: resolvedTrackingNumber,
      status: shipmentData.status || "In Transit",
      payment_status: shipmentData.payment_status || "Paid",
      company_name: shipmentData.company_name || "Swift Express Logistics",
      logistics_provider: shipmentData.logistics_provider || "Swift Express",
      quantity: shipmentData.quantity || 1,
      comment: shipmentData.comment || "",
      special_instructions: mergedSpecialInstructions,
      created_at: new Date().toISOString(),
      ...shipmentData,
      special_instructions: mergedSpecialInstructions
    };

    delete payload.id;
    delete payload.created_by; // Keep Supabase payload resilient to columns
    delete payload.package_image;
    delete payload.image_url;

    const { data, error } = await dbEngine.client
      .from('shipments')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Supabase shipment insert error:', error.message);
      throw new Error(error.message);
    }

    // Attach creator and image attributes to returned object
    data.created_by = currentAdminEmail;
    data.special_instructions = mergedSpecialInstructions;
    if (packageImage) {
      data.package_image = packageImage;
      data.image_url = packageImage;
    }

    // Synchronize local storage collection
    try {
      const localShipments = dbEngine.getCollection('shipments') || [];
      const updatedLocal = [data, ...localShipments.filter(s => s.id !== data.id && s.tracking_number !== data.tracking_number)];
      dbEngine.setCollection('shipments', updatedLocal);
    } catch (_) {}

    // Insert initial tracking event into database
    const cloudEventPayload = {
      shipment_id: data.id,
      status: data.status,
      location: data.origin || data.current_location || "Origin Hub",
      description: data.comment || 'Package record created and shipping label generated.',
      updated_by: currentAdminName,
      event_timestamp: new Date().toISOString()
    };

    try {
      await dbEngine.client.from('tracking_events').insert([cloudEventPayload]);
    } catch (e) {
      console.warn('Supabase tracking event insert notice:', e.message);
    }

    return data;
  }

  async updateShipmentStatus(shipmentId, newStatus, location, comment, updatedBy = "Admin", dateValue = '', timeValue = '', statusImage = '') {
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

    const imgTag = statusImage ? ` [image:${statusImage}]` : '';
    const finalDescription = `${comment || ''}${imgTag}`.trim();

    const { error: eventErr } = await dbEngine.client
      .from('tracking_events')
      .insert([{
        shipment_id: targetId,
        status: newStatus,
        location: location,
        description: finalDescription,
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

  async deleteTrackingEvent(eventId) {
    if (!dbEngine.client) return;
    try {
      const { error } = await dbEngine.client
        .from('tracking_events')
        .delete()
        .eq('id', eventId);
      if (error) throw new Error(error.message);
    } catch (err) {
      console.warn('Supabase delete tracking event notice:', err.message);
      throw err;
    }
  }
}

export const shipmentService = new ShipmentService();
