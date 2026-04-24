import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;
  const sizeClass = size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative ${sizeClass} w-full mx-4 glass rounded-2xl shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-dark-700/50">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-all">
            ✕
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
