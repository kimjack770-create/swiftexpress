// ========================================================
// SWIFT EXPRESS LOGISTICS - DUAL-SYNC QUOTE SERVICE
// Calculates, submits & converts quotes with Supabase Cloud backend storage
// ========================================================

import { dbEngine } from './supabaseClient.js';
import { shipmentService } from './shipmentService.js';

class QuoteService {
  async submitQuoteRequest(quoteData) {
    let ratePerKg = 15;
    if (quoteData.delivery_type === 'Air Freight') ratePerKg = 25;
    if (quoteData.delivery_type === 'Express Delivery') ratePerKg = 30;
    if (quoteData.delivery_type === 'Sea Freight') ratePerKg = 8;

    const estimatedPrice = Math.max(25, (quoteData.weight_kg || 1) * ratePerKg);

    const localQuote = {
      id: "qt-" + Date.now(),
      ...quoteData,
      estimated_price: estimatedPrice,
      status: "Pending",
      created_at: new Date().toISOString()
    };

    // 1. Local Storage save
    const quotes = dbEngine.getCollection('quotes');
    quotes.unshift(localQuote);
    dbEngine.setCollection('quotes', quotes);

    // 2. Sync to Supabase Backend
    if (dbEngine.isRealSupabase) {
      try {
        const cloudPayload = { ...localQuote };
        delete cloudPayload.id; // Allow PostgreSQL to auto-generate UUID

        const { data, error } = await dbEngine.client.from('quotes').insert([cloudPayload]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase quote insert notice:', err.message);
      }
    }

    return localQuote;
  }

  async getAllQuotes() {
    let cloudQuotes = [];
    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('quotes').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) cloudQuotes = data;
      } catch (err) {
        console.warn('Supabase quote fetch notice:', err.message);
      }
    }

    const localQuotes = dbEngine.getCollection('quotes');
    const combinedMap = new Map();
    localQuotes.forEach(q => combinedMap.set(q.id || q.created_at, q));
    cloudQuotes.forEach(q => combinedMap.set(q.id, q));

    return Array.from(combinedMap.values());
  }

  async updateQuoteStatus(quoteId, status) {
    // 1. Update Local Storage
    const quotes = dbEngine.getCollection('quotes');
    const idx = quotes.findIndex(q => q.id === quoteId);
    if (idx !== -1) {
      quotes[idx].status = status;
      dbEngine.setCollection('quotes', quotes);
    }

    // 2. Sync to Supabase Backend
    if (dbEngine.isRealSupabase) {
      try {
        await dbEngine.client.from('quotes').update({ status }).eq('id', quoteId);
      } catch (err) {
        console.warn('Supabase quote status update notice:', err.message);
      }
    }
  }

  async convertQuoteToShipment(quoteId) {
    const quotes = await this.getAllQuotes();
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error("Quote not found");

    const shipmentData = {
      sender_name: quote.full_name,
      sender_phone: quote.phone,
      sender_email: quote.email,
      sender_address: quote.pickup_address,
      sender_city: quote.pickup_country,
      sender_country: quote.pickup_country,
      receiver_name: "Recipient",
      receiver_phone: "N/A",
      receiver_email: quote.email,
      receiver_address: quote.destination_address,
      receiver_city: quote.destination_country,
      receiver_country: quote.destination_country,
      package_type: quote.package_type,
      weight_kg: quote.weight_kg,
      quantity: 1,
      service_type: quote.delivery_type,
      origin: `${quote.pickup_address}, ${quote.pickup_country}`,
      destination: `${quote.destination_address}, ${quote.destination_country}`,
      current_location: `${quote.pickup_address}, ${quote.pickup_country}`,
      estimated_delivery: new Date(Date.now() + 5*24*60*60*1000).toISOString().slice(0,10),
      shipping_cost: quote.estimated_price,
      status: "In Transit"
    };

    const newShipment = await shipmentService.createShipment(shipmentData);
    await this.updateQuoteStatus(quoteId, "Converted");
    return newShipment;
  }
}

export const quoteService = new QuoteService();
