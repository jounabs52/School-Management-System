// app/settings/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Building2, Clock, Bell, User, Save,
  Globe, Phone, Mail, MapPin,
  ChevronRight, AlertCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const defaultSettings = {
  clinic_name: 'Your Clinic Name',
  address: '123 Main St, Lahore, Punjab, Pakistan',
  phone: '+92 300 1234567',
  email: 'info@clinic.com',
  website: 'https://yourclinic.com',
  currency: 'PKR',
  working_hours_start: '09:00',
  working_hours_end: '21:00',
  appointment_duration: 30,
  slot_interval: 30,
  enable_sms_reminders: true,
  reminder_hours_before: 2,
  timezone: 'Asia/Karachi',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('clinic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [profile, setProfile] = useState({ name: '', email: '', role: 'Admin' });
  const [pktTime, setPktTime] = useState('');

  // Live PKT Clock
  useEffect(() => {
    const updatePKT = () => {
      const now = new Date();
      setPktTime(
        new Intl.DateTimeFormat('en-PK', {
          timeZone: 'Asia/Karachi',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    };
    updatePKT();
    const interval = setInterval(updatePKT, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: settingsData } = await supabase
          .from('clinic_settings')
          .select('*')
          .single();

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (settingsData) setSettings({ ...defaultSettings, ...settingsData });
        if (profileData) setProfile({ name: profileData.full_name, email: profileData.email, role: profileData.role });
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinic_settings')
        .upsert(settings, { onConflict: 'id' });

      if (error) throw error;
      toast.success('Settings saved!', {
        icon: 'Success',
        style: { background: '#10b981', color: 'white' },
      });
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-teal-50">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-teal-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Clinic Settings
            </h1>
            <p className="text-gray-600 mt-2">Manage clinic configuration and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 p-5 space-y-2 sticky top-6">
                {[
                  { id: 'clinic', label: 'Clinic Info', icon: Building2 },
                  { id: 'schedule', label: 'Schedule', icon: Clock },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'profile', label: 'Profile', icon: User },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform ${activeTab === tab.id ? 'rotate-90' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Clinic Info */}
              {activeTab === 'clinic' && (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
                      <Building2 className="w-6 h-6" />
                    </div>
                    Clinic Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Clinic Name" name="clinic_name" value={settings.clinic_name} onChange={handleChange} icon={<Building2 className="w-5 h-5 text-purple-600" />} />
                    <InputField label="Email" name="email" type="email" value={settings.email} onChange={handleChange} icon={<Mail className="w-5 h-5 text-purple-600" />} />
                    <InputField label="Phone" name="phone" value={settings.phone} onChange={handleChange} icon={<Phone className="w-5 h-5 text-purple-600" />} placeholder="+92 300 1234567" />
                    <InputField label="Website" name="website" value={settings.website} onChange={handleChange} icon={<Globe className="w-5 h-5 text-purple-600" />} />
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-5 h-5 text-purple-600" />
                        <textarea
                          name="address"
                          value={settings.address}
                          onChange={handleChange}
                          rows={3}
                          className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                          placeholder="123 Main St, Lahore, Punjab, Pakistan"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              {activeTab === 'schedule' && (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
                      <Clock className="w-6 h-6" />
                    </div>
                    Working Hours
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Opening Time</label>
                      <input type="time" name="working_hours_start" value={settings.working_hours_start} onChange={handleChange} className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Closing Time</label>
                      <input type="time" name="working_hours_end" value={settings.working_hours_end} onChange={handleChange} className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Appointment Duration</label>
                      <select name="appointment_duration" value={settings.appointment_duration} onChange={handleChange} className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600">
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Slot Interval</label>
                      <select name="slot_interval" value={settings.slot_interval} onChange={handleChange} className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600">
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-semibold text-purple-800">Pakistan Time (PKT)</p>
                      <p className="text-xs text-purple-700 font-mono">{pktTime}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
                      <Bell className="w-6 h-6" />
                    </div>
                    SMS Reminders
                  </h2>
                  <label className="flex items-center justify-between p-4 bg-purple-50 rounded-xl cursor-pointer">
                    <div>
                      <p className="font-semibold text-gray-800">Enable SMS Reminders</p>
                      <p className="text-sm text-gray-600">Auto-send SMS to patients</p>
                    </div>
                    <input type="checkbox" name="enable_sms_reminders" checked={settings.enable_sms_reminders} onChange={handleChange} className="w-6 h-6 text-purple-600 rounded focus:ring-purple-500" />
                  </label>
                  {settings.enable_sms_reminders && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Send Reminder</label>
                      <select name="reminder_hours_before" value={settings.reminder_hours_before} onChange={handleChange} className="w-full md:w-64 px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600">
                        <option value={1}>1 hour before</option>
                        <option value={2}>2 hours before</option>
                        <option value={3}>3 hours before</option>
                        <option value={6}>6 hours before</option>
                        <option value={24}>24 hours before</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Profile */}
              {activeTab === 'profile' && (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
                      <User className="w-6 h-6" />
                    </div>
                    Profile & Security
                  </h2>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-lg text-purple-800">{profile.name}</p>
                      <p className="text-sm text-gray-600">{profile.email} • {profile.role}</p>
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                    Change Password
                  </button>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>Save Changes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InputField({ label, icon, required, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {icon}
        </div>
        <input
          {...props}
          className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}