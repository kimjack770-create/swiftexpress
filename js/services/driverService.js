// ========================================================
// SWIFT EXPRESS LOGISTICS - DUAL-SYNC DRIVER & FLEET SERVICE
// Drivers, vehicles & fleet assignments with Supabase Cloud backend storage
// ========================================================

import { dbEngine } from './supabaseClient.js';

class DriverService {
  async getAllDrivers() {
    let cloudDrivers = [];
    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('drivers').select('*');
        if (!error && data && data.length > 0) cloudDrivers = data;
      } catch (err) {
        console.warn('Supabase driver fetch notice:', err.message);
      }
    }

    const localDrivers = dbEngine.getCollection('drivers');
    const combinedMap = new Map();
    localDrivers.forEach(d => combinedMap.set(d.license_number || d.id, d));
    cloudDrivers.forEach(d => combinedMap.set(d.license_number || d.id, d));

    return Array.from(combinedMap.values());
  }

  async getAllVehicles() {
    let cloudVehicles = [];
    if (dbEngine.isRealSupabase) {
      try {
        const { data, error } = await dbEngine.client.from('vehicles').select('*');
        if (!error && data && data.length > 0) cloudVehicles = data;
      } catch (err) {
        console.warn('Supabase vehicle fetch notice:', err.message);
      }
    }

    const localVehicles = dbEngine.getCollection('vehicles');
    const combinedMap = new Map();
    localVehicles.forEach(v => combinedMap.set(v.plate_number || v.id, v));
    cloudVehicles.forEach(v => combinedMap.set(v.plate_number || v.id, v));

    return Array.from(combinedMap.values());
  }

  async addDriver(driverData) {
    const localDriver = {
      id: "dr-" + Date.now(),
      status: "Available",
      rating: 5.0,
      total_deliveries: 0,
      ...driverData
    };

    // 1. Save to Local Storage
    const drivers = dbEngine.getCollection('drivers');
    drivers.push(localDriver);
    dbEngine.setCollection('drivers', drivers);

    // 2. Sync to Supabase Backend
    if (dbEngine.isRealSupabase) {
      try {
        const cloudPayload = { ...localDriver };
        delete cloudPayload.id; // Let PostgreSQL generate native UUID

        const { data, error } = await dbEngine.client.from('drivers').insert([cloudPayload]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase driver insert notice:', err.message);
      }
    }

    return localDriver;
  }

  async addVehicle(vehicleData) {
    const localVehicle = {
      id: "vh-" + Date.now(),
      status: "Available",
      ...vehicleData
    };

    // 1. Save to Local Storage
    const vehicles = dbEngine.getCollection('vehicles');
    vehicles.push(localVehicle);
    dbEngine.setCollection('vehicles', vehicles);

    // 2. Sync to Supabase Backend
    if (dbEngine.isRealSupabase) {
      try {
        const cloudPayload = { ...localVehicle };
        delete cloudPayload.id; // Let PostgreSQL generate native UUID

        const { data, error } = await dbEngine.client.from('vehicles').insert([cloudPayload]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase vehicle insert notice:', err.message);
      }
    }

    return localVehicle;
  }
}

export const driverService = new DriverService();
