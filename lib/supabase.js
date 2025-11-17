// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// =========================================================================
// INVOICE MODULE APIs (New)
// =========================================================================

// Doctors API
export const doctorsAPI = {
  // Fetches list for the Attending Doctor dropdown
  async getAll() {
    const { data, error } = await supabase
      .from('doctors')
      .select('doctor_id, name, specialization')
      .eq('status', 'Active') // Only fetch active doctors
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  },
};

// Services API (Price List)
export const servicesAPI = {
  // Fetches list for the Service item dropdown and price lookup
  async getAll() {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, standard_price')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    
    // Map standard_price to 'price' for easier use in the frontend component
    return data.map(s => ({
      ...s,
      price: s.standard_price, 
    })); 
  },
};

// Invoices API
export const invoicesAPI = {
  // Simple client-side number generator (best practice is to use a DB function)
  async generateInvoiceNumber() {
    const prefix = 'INV-';
    const now = new Date();
    // Format: INV-YYYYMM-XXXX (e.g., INV-202510-1234)
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}${datePart}-${randomPart}`;
  },

  async create(invoiceData) {
    const { 
      patient, attendingDoctor, services,
      subTotal, grandTotal, totalDiscount, netAmount, notes 
    } = invoiceData;

    const invoiceNumber = await this.generateInvoiceNumber();

    // 1. Insert Invoice Header
    const { data: invoiceHeader, error: headerError } = await supabase
      .from('invoices')
      .insert({
        patient_id: patient.id,
        patient_name: patient.name,
        patient_mr_number: patient.patient_id, // Assumes patient_id from FE is the MR Number
        invoice_number: invoiceNumber, 
        total_amount: subTotal,
        discount: totalDiscount,
        net_amount: netAmount,
        notes: notes,
        doctor_id: attendingDoctor.doctor_id,
        doctor_name: attendingDoctor.name,
        status: netAmount > 0 ? 'unpaid' : 'paid', // Simple initial status check
      })
      .select('id, invoice_number')
      .single();

    if (headerError) throw headerError;
    const newInvoiceId = invoiceHeader.id;

    // 2. Insert Invoice Items (Line Items)
    const itemsToInsert = services.map(item => ({
      invoice_id: newInvoiceId,
      service_name: item.service,
      unit_charge: item.charges,
      quantity: item.qty,
      discount: item.discount,
      // Note: If you need service_id, you must map it from the frontend data.
    }));
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
    
    // 3. Handle Payments (Payments table insertion logic would go here)
    
    return { 
        success: true, 
        invoiceNumber: invoiceHeader.invoice_number, 
        id: newInvoiceId 
    };
  },
};

// =========================================================================
// EXISTING APIs
// =========================================================================

export const treatmentPlansAPI = {
  async create(planData) {
    const { data, error } = await supabase
      .from('treatment_plans')
      .insert(planData)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async getAll() {
    const { data, error } = await supabase
      .from('treatment_plans')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
}

export const treatmentPlanItemsAPI = {
  async createMultiple(items) {
    const { data, error } = await supabase
      .from('treatment_plan_items')
      .insert(items)
    if (error) throw error
    return data
  }
}

// Form Configuration API
export const formConfigAPI = {
  // Get form configuration
  async getConfig() {
    const { data, error } = await supabase
      .from('form_configurations')
      .select('*')
      .eq('configuration_name', 'default')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Save form configuration
  async saveConfig(config) {
    const { data: existing } = await supabase
      .from('form_configurations')
      .select('id')
      .eq('configuration_name', 'default')
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('form_configurations')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('form_configurations')
        .insert([{ ...config, configuration_name: 'default' }])
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }
}

// Patients API
export const patientsAPI = {
  // Get all patients
  async getAll() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get patient by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Generate MR Number
  async generateMRNumber() {
    const { data, error } = await supabase
      .rpc('generate_mr_number')
    
    if (error) {
      // Fallback if function doesn't exist
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
      
      return `MR-${String((count || 0) + 1).padStart(3, '0')}`
    }
    
    return data
  },
  
  // Create patient
  async create(patientData) {
    // Generate MR number if not provided
    if (!patientData.mr_number) {
      patientData.mr_number = await this.generateMRNumber()
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update patient
  async update(id, patientData) {
    const { data, error } = await supabase
      .from('patients')
      .update(patientData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete patient
  async delete(id) {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // Search patients
  async search(searchTerm) {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, phone, mr_number') // Optimized to select only necessary fields
      .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,mr_number.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // CRITICAL FOR INVOICE FRONTEND: Maps mr_number to patient_id 
    // to match the field expected by the patient search modal.
    return (data || []).map(p => ({
      ...p,
      patient_id: p.mr_number,
    }));
  }
}