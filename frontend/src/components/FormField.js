import React from 'react';

const FormField = ({ label, name, value, onChange, type = 'text', options, placeholder, required, rows }) => {
  const baseClass = "w-full bg-dark-900/50 border border-dark-700/50 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all";

  if (type === 'select') {
    return (
      <div>
        <label className="block text-dark-300 text-sm font-medium mb-2">{label}</label>
        <select name={name} value={value || ''} onChange={onChange} className={baseClass} required={required}>
          <option value="">Select {label}</option>
          {options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }
  if (type === 'textarea') {
    return (
      <div>
        <label className="block text-dark-300 text-sm font-medium mb-2">{label}</label>
        <textarea name={name} value={value || ''} onChange={onChange} className={baseClass} placeholder={placeholder} required={required} rows={rows || 3} />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-dark-300 text-sm font-medium mb-2">{label}</label>
      <input type={type} name={name} value={value || ''} onChange={onChange} className={baseClass} placeholder={placeholder} required={required} />
    </div>
  );
};

export default FormField;
