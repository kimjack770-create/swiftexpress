// ========================================================
// SWIFT EXPRESS LOGISTICS - ULTRA-RESILIENT DUAL-SYNC SHIPMENT SERVICE
// Local-first + Substring fuzzy matching + Supabase Cloud backend persistence
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
    // Supabase schema uses event_timestamp; local uses timestamp. Unify here.
    timestamp: ev.timestamp || ev.event_timestamp || new Date().toISOString()
  };
}

class ShipmentService {
  async getAllShipments() {
    const localShipments = dbEngine.getCollection('shipments');
    const combinedMap = new Map();
    localShipments.forEach(s => {
      if (s.tracking_number) combinedMap.set(normalizeCode(s.tracking_number), s);
    });

    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('shipments').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          data.forEach(s => {
            if (s.tracking_number) combinedMap.set(normalizeCode(s.tracking_number), s);
          });
        }
      } catch (err) {
        console.warn('Real Supabase fetch notice:', err.message);
      }
    }

    return Array.from(combinedMap.values());
  }

  // Internal helper: fetch only cloud shipments (used for UUID resolution)
  async _getCloudShipments() {
    if (!dbEngine.isRealSupabase) return [];
    try {
      const { data, error } = await dbEngine.client.from('shipments').select('id, tracking_number');
      if (!error && data) return data;
    } catch (err) {
      console.warn('Cloud shipments fetch notice:', err.message);
    }
    return [];
  }

  async getShipmentByTrackingNumber(trackingNumber) {
    if (!trackingNumber) return null;
    const rawCode = trackingNumber.trim();
    const targetNorm = normalizeCode(rawCode);

    if (!targetNorm) return null;

    // 1. Check Supabase Cloud Backend FIRST
    if (dbEngine.isRealSupabase) {
      try {
        // Exact case-insensitive match
        const { data, error } = await dbEngine.client.from('shipments').select('*').ilike('tracking_number', rawCode).single();
        if (!error && data) return data;

        // Fetch all & match normalized
        const { data: allData } = await dbEngine.client.from('shipments').select('*');
        if (allData && allData.length > 0) {
          let cloudMatch = allData.find(s => s && s.tracking_number && normalizeCode(s.tracking_number) === targetNorm);
          if (cloudMatch) return cloudMatch;

          cloudMatch = allData.find(s => s && s.tracking_number && (
            normalizeCode(s.tracking_number).includes(targetNorm) || 
            targetNorm.includes(normalizeCode(s.tracking_number))
          ));
          if (cloudMatch) return cloudMatch;
        }
      } catch (err) {
        console.warn('Real Supabase lookup notice:', err.message);
      }
    }

    // 2. Fall back to Local Storage for instant offline/demo lookup
    try {
      const localShipments = dbEngine.getCollection('shipments');
      if (Array.isArray(localShipments) && localShipments.length > 0) {
        // Exact normalized match
        let match = localShipments.find(s => s && s.tracking_number && normalizeCode(s.tracking_number) === targetNorm);
        if (match) return match;

        // Substring / partial match
        match = localShipments.find(s => s && s.tracking_number && (
          normalizeCode(s.tracking_number).includes(targetNorm) || 
          targetNorm.includes(normalizeCode(s.tracking_number))
        ));
        if (match) return match;
      }
    } catch (e) {
      console.warn('Local storage lookup notice:', e);
    }

    return null;
  }

  async getTrackingEvents(shipmentId) {
    // 1. Try Supabase cloud first (handles UUID IDs from cloud-created shipments)
    if (dbEngine.isRealSupabase) {
      try {
        // Supabase schema column is event_timestamp, order by it
        const { data, error } = await dbEngine.client
          .from('tracking_events')
          .select('*')
          .eq('shipment_id', shipmentId)
          .order('event_timestamp', { ascending: true });
        if (!error && data && data.length > 0) {
          const normalized = data.map(normalizeEvent);
          // Mirror into local storage for offline resilience
          const localEvents = dbEngine.getCollection('tracking_events');
          normalized.forEach(ev => {
            if (!localEvents.find(le => le.id === ev.id)) {
              localEvents.push({ ...ev, local_backup: true });
            }
          });
          dbEngine.setCollection('tracking_events', localEvents);
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase tracking events fetch notice:', err.message);
      }
    }

    // 2. Fall back to local storage
    const localEvents = dbEngine.getCollection('tracking_events')
      .filter(e => e.shipment_id === shipmentId)
      .map(normalizeEvent);

    return localEvents;
  }

  async createShipment(shipmentData) {
    const trackingNumber = (shipmentData.tracking_number || '').toString().trim();
    // Always generate client-side so the admin sees it immediately, even if Supabase
    // trigger overrides it (it won't if we pass a non-empty value).
    const resolvedTrackingNumber = trackingNumber || generateFallbackTrackingNumber('SEL');

    const localShipment = {
      id: "sh-" + Date.now(),
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

    // Always attempt primary cloud persistence first
    if (dbEngine.isRealSupabase) {
      try {
        const cloudPayload = { ...localShipment };
        delete cloudPayload.id;

        const { data, error } = await dbEngine.client.from('shipments').insert([cloudPayload]).select().single();
        if (!error && data) {
          const cloudShipment = { ...data, id: data.id || localShipment.id };
          // Insert initial tracking event — use event_timestamp to match DB schema
          const cloudEventPayload = {
            shipment_id: cloudShipment.id,
            status: cloudShipment.status,
            location: cloudShipment.origin || cloudShipment.current_location,
            description: cloudShipment.comment || 'Package record created and shipping label generated.',
            updated_by: 'Admin',
            event_timestamp: new Date().toISOString()
          };
          const localFallbackEvent = normalizeEvent({
            id: 'ev-' + Date.now(),
            shipment_id: cloudShipment.id,
            status: cloudShipment.status,
            location: cloudShipment.origin || cloudShipment.current_location,
            description: cloudShipment.comment || 'Package record created and shipping label generated.',
            event_timestamp: new Date().toISOString(),
            updated_by: 'Admin'
          });
          try {
            const { data: evData } = await dbEngine.client.from('tracking_events').insert([cloudEventPayload]).select().single();
            if (evData) {
              const normalizedCloudEvent = normalizeEvent(evData);
              const events = dbEngine.getCollection('tracking_events');
              events.push({ ...normalizedCloudEvent, local_backup: true });
              dbEngine.setCollection('tracking_events', events);
            }
          } catch (e) {
            console.warn('Supabase tracking event insert notice:', e.message);
            // Store locally with matching shipment_id so tracking page finds it
            const eventsLocal = dbEngine.getCollection('tracking_events');
            eventsLocal.push({ ...localFallbackEvent, local_backup: true });
            dbEngine.setCollection('tracking_events', eventsLocal);
          }

          // Mirror shipment to local storage as a fallback/cache
          const shipments = dbEngine.getCollection('shipments');
          const existingIdx = shipments.findIndex(s => normalizeCode(s.tracking_number) === normalizeCode(cloudShipment.tracking_number));
          if (existingIdx !== -1) {
            shipments[existingIdx] = { ...cloudShipment, local_backup: true };
          } else {
            shipments.unshift({ ...cloudShipment, local_backup: true });
          }
          dbEngine.setCollection('shipments', shipments);

          return cloudShipment;
        }

        if (error) {
          console.warn('Supabase DB Insert Notice (Run SQL script in Supabase):', error.message);
        }
      } catch (err) {
        console.warn('Supabase cloud insert notice:', err.message);
      }
    }

    // Fallback: save locally if Supabase is unavailable
    const shipments = dbEngine.getCollection('shipments');
    const existingIdx = shipments.findIndex(s => normalizeCode(s.tracking_number) === normalizeCode(resolvedTrackingNumber));
    if (existingIdx !== -1) {
      shipments[existingIdx] = localShipment;
    } else {
      shipments.unshift(localShipment);
    }
    dbEngine.setCollection('shipments', shipments);

    const events = dbEngine.getCollection('tracking_events');
    events.push({
      id: "ev-" + Date.now(),
      shipment_id: localShipment.id,
      status: localShipment.status,
      location: localShipment.origin,
      description: localShipment.comment || "Package record created and shipping label generated.",
      timestamp: new Date().toISOString(),
      updated_by: "Admin"
    });
    dbEngine.setCollection('tracking_events', events);

    return localShipment;
  }

  async updateShipmentStatus(shipmentId, newStatus, location, comment, updatedBy = "Admin", dateValue = '', timeValue = '') {
    const shipments = dbEngine.getCollection('shipments');
    const index = shipments.findIndex(s => s.id === shipmentId || s.tracking_number === shipmentId);
    if (index !== -1) {
      shipments[index].status = newStatus;
      shipments[index].current_location = location;
      if (newStatus === 'Delivered') {
        shipments[index].actual_delivery = new Date().toISOString();
      }
      dbEngine.setCollection('shipments', shipments);
    }

    const selectedDateTime = dateValue && timeValue
      ? `${dateValue}T${timeValue}:00`
      : new Date().toISOString();
    const eventTimestamp = new Date(selectedDateTime).toISOString();

    const events = dbEngine.getCollection('tracking_events');
    events.push({
      id: "ev-" + Date.now(),
      shipment_id: shipmentId,
      status: newStatus,
      location: location,
      description: comment,
      timestamp: eventTimestamp,
      updated_by: updatedBy
    });
    dbEngine.setCollection('tracking_events', events);

    if (dbEngine.isRealSupabase) {
      try {
        // Resolve the actual cloud shipment UUID — look it up by tracking_number if needed
        const cloudShipments = await this._getCloudShipments();
        const targetShipment = cloudShipments.find(s =>
          s.id === shipmentId ||
          s.tracking_number === shipmentId ||
          normalizeCode(s.tracking_number) === normalizeCode(shipmentId)
        ) || shipments.find(s => s.id === shipmentId || s.tracking_number === shipmentId);

        const cloudId = targetShipment?.id || shipmentId;
        const trackingNum = targetShipment?.tracking_number || shipmentId;

        const { error: updateErr } = await dbEngine.client.from('shipments').update({
          status: newStatus,
          current_location: location,
          updated_at: eventTimestamp
        }).eq('tracking_number', trackingNum);

        if (!updateErr) {
          const { data: evData } = await dbEngine.client.from('tracking_events').insert([{
            shipment_id: cloudId,
            status: newStatus,
            location: location,
            description: comment,
            updated_by: updatedBy,
            event_timestamp: eventTimestamp
          }]).select().single();

          if (evData) {
            // Mirror to local
            const localEvents = dbEngine.getCollection('tracking_events');
            localEvents.push(normalizeEvent({ ...evData, local_backup: true }));
            dbEngine.setCollection('tracking_events', localEvents);
          }
        }
      } catch (err) {
        console.warn('Supabase status update notice:', err.message);
      }
    }
  }

  async deleteShipment(shipmentId) {
    let shipments = dbEngine.getCollection('shipments');
    shipments = shipments.filter(s => s.id !== shipmentId);
    dbEngine.setCollection('shipments', shipments);

    if (dbEngine.isRealSupabase) {
      try {
        await dbEngine.client.from('shipments').delete().eq('id', shipmentId);
      } catch (err) {
        console.warn('Supabase delete notice:', err.message);
      }
    }
  }
}

export const shipmentService = new ShipmentService();
