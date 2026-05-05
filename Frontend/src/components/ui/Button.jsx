// src/components/ui/Button.jsx
import React from 'react';

const Button = ({ children, onClick, disabled, variant = 'primary', ...props }) => {
  const baseClass = 'px-4 py-2 rounded font-bold transition';
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-300 hover:bg-gray-400 text-black',
  };

  return (
    <button
      className={`${baseClass} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;