// Supabase Configuration Template
// Copy this to supabase-config.js and fill in your values
// DO NOT COMMIT supabase-config.js

const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_ANON_KEY',
  
  restUrl: 'YOUR_SUPABASE_URL/rest/v1',
  
  publicHeaders: {
    apikey: 'YOUR_ANON_KEY',
    Authorization: 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  },
  
  getAuthHeaders: (accessToken) => ({
    apikey: 'YOUR_ANON_KEY',
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  })
};

const ADMIN_CONFIG = {
  table: 'admin_credentials',
  defaultPassword: 'gloria2026'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_CONFIG, ADMIN_CONFIG };
}