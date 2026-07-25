// ========================================================
// SWIFT EXPRESS LOGISTICS - HYBRID DATA CLIENT SERVICE
// Transparent Supabase PostgreSQL integration with Guaranteed Local Storage Seed
// ========================================================

import { SUPABASE_CONFIG } from '../config/supabase.js';

class DataStorageEngine {
  constructor() {
    this.isRealSupabase = false;
    this.client = null;
    this.init();
  }

  init() {
    // Always seed local mock storage so sample tracking codes like SEL-20260723-884920 work instantly
    this.seedInitialMockData();

    // Check if Supabase JS SDK is present on window and valid credentials exist
    if (window.supabase && SUPABASE_CONFIG.SUPABASE_URL.startsWith('https://') && !SUPABASE_CONFIG.SUPABASE_URL.includes('demo')) {
      try {
        this.client = window.supabase.createClient(SUPABASE_CONFIG.SUPABASE_URL, SUPABASE_CONFIG.SUPABASE_ANON_KEY);
        this.isRealSupabase = true;
        console.log('⚡ Connected to Supabase Cloud Engine');
      } catch (err) {
        console.warn('Supabase initialization failed, falling back to Local Storage Engine:', err);
      }
    }
  }

  seedInitialMockData() {
    if (!localStorage.getItem('sel_shipments')) {
      const initialShipments = [
        {
          id: "sh-101",
          tracking_number: "SEL-20260723-884920",
          company_name: "Swift Express Logistics",
          logistics_provider: "DHL Express",
          sender_name: "John Harrison",
          sender_phone: "+1 202 555 0147",
          sender_email: "john@example.com",
          sender_address: "1200 Pennsylvania Ave NW",
          sender_city: "Washington",
          sender_country: "United States",
          receiver_name: "Emma Watson",
          receiver_phone: "+44 20 7946 0912",
          receiver_email: "emma@example.co.uk",
          receiver_address: "221B Baker Street",
          receiver_city: "London",
          receiver_country: "United Kingdom",
          package_type: "Carton",
          quantity: 1,
          weight_kg: 4.5,
          dimensions: "30x25x20 cm",
          service_type: "Express Delivery",
          status: "In Transit",
          origin: "Washington, USA",
          destination: "London, UK",
          current_location: "Sorting Center, Heathrow Airport, UK",
          current_lat: 51.4700,
          current_lng: -0.4543,
          dispatch_date: "2026-07-23",
          estimated_delivery: "2026-07-25",
          comment: "Handle with extreme care. High priority fragile package.",
          shipping_cost: 145.00,
          payment_status: "Paid",
          created_at: new Date().toISOString()
        },
        {
          id: "sh-102",
          tracking_number: "SEL-20260723-339102",
          company_name: "Swift Express Logistics",
          logistics_provider: "FedEx Express",
          sender_name: "Global Tech Corp",
          sender_phone: "+1 415 555 0199",
          sender_email: "shipping@globaltech.io",
          sender_address: "500 Howard Street",
          sender_city: "San Francisco",
          sender_country: "United States",
          receiver_name: "Tokyo Robotics Lab",
          receiver_phone: "+81 3 5555 0143",
          receiver_email: "import@tokyorobotics.jp",
          receiver_address: "1-1 Chiyoda",
          receiver_city: "Tokyo",
          receiver_country: "Japan",
          package_type: "Box",
          quantity: 2,
          weight_kg: 18.0,
          dimensions: "60x40x40 cm",
          service_type: "Air Freight",
          status: "Customs Clearance",
          origin: "San Francisco, USA",
          destination: "Tokyo, Japan",
          current_location: "Narita Customs Facility, Tokyo",
          current_lat: 35.7720,
          current_lng: 140.3929,
          dispatch_date: "2026-07-22",
          estimated_delivery: "2026-07-26",
          comment: "Contains electronic testing equipment.",
          shipping_cost: 320.00,
          payment_status: "Paid",
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('sel_shipments', JSON.stringify(initialShipments));
    }

    if (!localStorage.getItem('sel_tracking_events')) {
      const initialEvents = [
        {
          id: "ev-1",
          shipment_id: "sh-101",
          status: "Shipment Created",
          location: "Washington DC Hub, USA",
          description: "Shipping label generated and package pickup confirmed.",
          timestamp: "2026-07-23T08:00:00Z",
          updated_by: "Dispatcher"
        },
        {
          id: "ev-2",
          shipment_id: "sh-101",
          status: "In Transit",
          location: "Sorting Center, Heathrow Airport, UK",
          description: "Arrived at destination sorting facility. Custom clearance in progress.",
          timestamp: "2026-07-23T14:30:00Z",
          updated_by: "System Operations"
        }
      ];
      localStorage.setItem('sel_tracking_events', JSON.stringify(initialEvents));
    }

    if (!localStorage.getItem('sel_drivers')) {
      const drivers = [
        { id: "dr-01", full_name: "Michael Scott", email: "michael@swiftexpress.com", phone: "+1 202 555 0188", license_number: "DL-9948201", status: "On Duty", rating: 4.9, total_deliveries: 342 },
        { id: "dr-02", full_name: "Sarah Jenkins", email: "sarah@swiftexpress.com", phone: "+1 202 555 0192", license_number: "DL-3882910", status: "Available", rating: 4.8, total_deliveries: 215 },
        { id: "dr-03", full_name: "David Vance", email: "david@swiftexpress.com", phone: "+1 202 555 0122", license_number: "DL-7729104", status: "Off Duty", rating: 5.0, total_deliveries: 512 }
      ];
      localStorage.setItem('sel_drivers', JSON.stringify(drivers));
    }

    if (!localStorage.getItem('sel_vehicles')) {
      const vehicles = [
        { id: "veh-01", plate_number: "NY-7749-EX", model: "Mercedes Sprinter 3500", type: "Cargo Van", capacity_kg: 2500, status: "In Transit", fuel_type: "Diesel" },
        { id: "veh-02", plate_number: "NY-9920-TR", model: "Volvo FH16 Heavy Cargo", type: "Heavy Truck", capacity_kg: 18000, status: "Available", fuel_type: "Diesel" },
        { id: "veh-03", plate_number: "FLT-BOEING-747", model: "Boeing 747-8 Freighter", type: "Freight Plane", capacity_kg: 130000, status: "Available", fuel_type: "Jet A-1" }
      ];
      localStorage.setItem('sel_vehicles', JSON.stringify(vehicles));
    }
  }

  // Collection getter for local storage mode
  getCollection(key) {
    return JSON.parse(localStorage.getItem(`sel_${key}`) || '[]');
  }

  // Collection setter
  setCollection(key, data) {
    localStorage.setItem(`sel_${key}`, JSON.stringify(data));
  }
}

export const dbEngine = new DataStorageEngine();
