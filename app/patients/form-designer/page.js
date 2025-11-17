// app/patients/form-designer/page.js
'use client';

import { Settings, CheckSquare, Square, Check } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { formConfigAPI } from '@/lib/supabase';

const LOCAL_STORAGE_KEY = 'patient-form-config';

export default function FormDesigner() {
  /* ------------------------------------------------------------------ *
   * 1. FIELD DEFINITIONS & MANDATORY DEFAULTS
   * ------------------------------------------------------------------ */
  const fieldDefinitions = useMemo(
    () => [
      { key: 'phone', label: 'Phone', mandatory: true, column: 1 },
      { key: 'gender', label: 'Gender', mandatory: true, column: 1 }, // Now mandatory
      { key: 'bmi', label: 'BMI', mandatory: false, column: 1 },
      { key: 'picture', label: 'Picture', mandatory: false, column: 1 },
      { key: 'profession', label: 'Profession', mandatory: false, column: 1 },
      { key: 'associated_service', label: 'Associated Service', mandatory: false, column: 1 },
      { key: 'medical_alert', label: 'Medical Alert', mandatory: false, column: 1 },
      { key: 'civil_id', label: 'Civil ID', mandatory: false, column: 1 },

      { key: 'name', label: 'Name', mandatory: true, column: 2 },
      { key: 'date_of_birth', label: 'Date Of Birth', mandatory: false, column: 2 },
      { key: 'blood_group', label: 'Blood Group', mandatory: false, column: 2 },
      { key: 'age', label: 'Age', mandatory: false, column: 2 },
      { key: 'nationality', label: 'Nationality', mandatory: false, column: 2 },
      { key: 'referral', label: 'Referral', mandatory: false, column: 2 },
      { key: 'tags', label: 'Tags', mandatory: false, column: 2 },

      { key: 'cnic', label: 'CNIC', mandatory: false, column: 3 },
      { key: 'height', label: 'Height', mandatory: false, column: 3 },
      { key: 'address', label: 'Address', mandatory: false, column: 3 },
      { key: 'marital_status', label: 'Marital Status', mandatory: true, column: 3 }, // Now mandatory
      { key: 'family_relationship', label: 'Family Relationship', mandatory: false, column: 3 },
      { key: 'coverage', label: 'Coverage', mandatory: false, column: 3 },
      { key: 'assign_doctor', label: 'Assign Doctor', mandatory: false, column: 3 },

      { key: 'email', label: 'Email', mandatory: false, column: 4 },
      { key: 'weight', label: 'Weight', mandatory: false, column: 4 },
      { key: 'secondary_phone', label: 'Secondary Phone Number', mandatory: false, column: 4 },
      { key: 'religion', label: 'Religion', mandatory: false, column: 4 },
      { key: 'reference', label: 'Reference', mandatory: false, column: 4 },
      { key: 'membership_fee', label: 'Membership Fee', mandatory: false, column: 4 },
      { key: 'manual_mr_no', label: 'Manual MrNo', mandatory: false, column: 4 },
    ],
    []
  );

  const mandatoryDefaults = useMemo(() => {
    const map = {};
    fieldDefinitions.forEach((f) => {
      map[f.key] = f.mandatory;
    });
    return map;
  }, [fieldDefinitions]);

  /* ------------------------------------------------------------------ *
   * 2. STATE
   * ------------------------------------------------------------------ */
  const [formFields, setFormFields] = useState(mandatoryDefaults);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  /* ------------------------------------------------------------------ *
   * 3. LOCAL STORAGE HELPERS
   * ------------------------------------------------------------------ */
  const saveToLocalStorage = useCallback((data) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to read localStorage:', e);
      return null;
    }
  }, []);

  /* ------------------------------------------------------------------ *
   * 4. SUPABASE SYNC (background)
   * ------------------------------------------------------------------ */
  const syncWithSupabase = useCallback(async (data) => {
    try {
      await formConfigAPI.saveConfig(data);
    } catch (err) {
      console.error('Supabase sync failed (local data is safe):', err);
    }
  }, []);

  /* ------------------------------------------------------------------ *
   * 5. LOAD CONFIG: local → supabase → defaults
   * ------------------------------------------------------------------ */
  const loadConfiguration = useCallback(async () => {
    setLoading(true);

    const local = loadFromLocalStorage();
    let remote = null;
    try {
      remote = await formConfigAPI.getConfig();
    } catch (err) {
      console.warn('Supabase load failed, using local data:', err);
    }

    const merged = { ...mandatoryDefaults };
    if (local) Object.assign(merged, local);
    if (remote) Object.assign(merged, remote);

    fieldDefinitions.forEach((f) => {
      if (merged[f.key] === undefined) {
        merged[f.key] = f.mandatory;
      }
    });

    setFormFields(merged);
    setLoading(false);
  }, [fieldDefinitions, mandatoryDefaults, loadFromLocalStorage]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  /* ------------------------------------------------------------------ *
   * 6. SAVE: local first, then sync
   * ------------------------------------------------------------------ */
  const saveFormConfiguration = useCallback(
    async (updated) => {
      saveToLocalStorage(updated);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      syncWithSupabase(updated);
    },
    [saveToLocalStorage, syncWithSupabase]
  );

  /* ------------------------------------------------------------------ *
   * 7. TOGGLE FIELD
   * ------------------------------------------------------------------ */
  const toggleField = useCallback(
    async (key) => {
      const field = fieldDefinitions.find((f) => f.key === key);
      if (!field || field.mandatory) return;

      const updated = { ...formFields, [key]: !formFields[key] };
      setFormFields(updated);
      await saveFormConfiguration(updated);
    },
    [formFields, fieldDefinitions, saveFormConfiguration]
  );

  /* ------------------------------------------------------------------ *
   * 8. RESET TO MANDATORY
   * ------------------------------------------------------------------ */
  const resetToMandatory = useCallback(async () => {
    const reset = { ...mandatoryDefaults };
    setFormFields(reset);
    await saveFormConfiguration(reset);
  }, [mandatoryDefaults, saveFormConfiguration]);

  /* ------------------------------------------------------------------ *
   * 9. RENDER
   * ------------------------------------------------------------------ */
  const columns = [1, 2, 3, 4];
  const selectedCount = Object.values(formFields).filter(Boolean).length;
  const totalFields = fieldDefinitions.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <p className="font-medium">Configuration saved!</p>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-purple-700">Patient Form Designer</h1>
            <p className="text-sm text-gray-600 mt-1">Customize your patient registration form fields</p>
          </div>
        </div>
      </div>

      {/* Main Designer Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 md:p-8 border border-purple-100">
          <h3 className="text-lg font-bold text-purple-800 mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-purple-600 rounded-full"></span>
            Patient Registration Fields
          </h3>

          {/* 4-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {columns.map((col) => (
              <div key={col} className="space-y-3">
                {fieldDefinitions
                  .filter((f) => f.column === col)
                  .map((field) => (
                    <div
                      key={field.key}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        formFields[field.key]
                          ? 'bg-white shadow-sm border border-purple-200'
                          : 'bg-white/70 border border-transparent'
                      } ${!field.mandatory && 'hover:shadow-md hover:border-purple-300'}`}
                    >
                      <button
                        onClick={() => toggleField(field.key)}
                        disabled={field.mandatory}
                        className={`transition-all ${
                          field.mandatory
                            ? 'cursor-not-allowed opacity-60'
                            : 'hover:scale-110 active:scale-95'
                        }`}
                      >
                        {formFields[field.key] ? (
                          <CheckSquare className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      <label
                        className={`text-sm font-medium leading-tight ${
                          field.mandatory ? 'text-purple-700' : 'text-gray-700'
                        } ${!field.mandatory && 'cursor-pointer'}`}
                      >
                        {field.label}
                        {field.mandatory && (
                          <span className="text-pink-600 text-xs font-bold ml-1">(Mandatory)</span>
                        )}
                      </label>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
              {selectedCount}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Fields Selected</p>
              <p className="text-xs text-gray-500">Out of {totalFields} total</p>
            </div>
          </div>

          <button
            onClick={resetToMandatory}
            className="px-6 py-2.5 bg-white border-2 border-purple-300 text-purple-700 rounded-full font-medium text-sm hover:bg-purple-50 hover:border-purple-400 transition-all shadow-sm"
          >
            Reset to Mandatory Only
          </button>
        </div>
      </div>
    </div>
  );
}