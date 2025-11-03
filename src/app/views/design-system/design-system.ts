import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-design-system',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './design-system.html',
  styleUrls: ['./design-system.css']
})
export class DesignSystem {
  // Sample data for interactive examples
  sampleText = 'Sample text for typography examples';
  sampleButtonText = 'Click me';
  isChecked = false;
  selectedOption = 'option1';
  sampleInput = '';
  
  // Tailwind Color Palette
  colors = {
    blue: [
      { name: 'Blue 50', value: '#eff6ff', hex: '#eff6ff', class: 'bg-blue-50' },
      { name: 'Blue 100', value: '#dbeafe', hex: '#dbeafe', class: 'bg-blue-100' },
      { name: 'Blue 200', value: '#bfdbfe', hex: '#bfdbfe', class: 'bg-blue-200' },
      { name: 'Blue 300', value: '#93c5fd', hex: '#93c5fd', class: 'bg-blue-300' },
      { name: 'Blue 400', value: '#60a5fa', hex: '#60a5fa', class: 'bg-blue-400' },
      { name: 'Blue 500', value: '#3b82f6', hex: '#3b82f6', class: 'bg-blue-500' },
      { name: 'Blue 600', value: '#2563eb', hex: '#2563eb', class: 'bg-blue-600' },
      { name: 'Blue 700', value: '#1d4ed8', hex: '#1d4ed8', class: 'bg-blue-700' },
      { name: 'Blue 800', value: '#1e40af', hex: '#1e40af', class: 'bg-blue-800' },
      { name: 'Blue 900', value: '#1e3a8a', hex: '#1e3a8a', class: 'bg-blue-900' }
    ],
    gray: [
      { name: 'Gray 50', value: '#f9fafb', hex: '#f9fafb', class: 'bg-gray-50' },
      { name: 'Gray 100', value: '#f3f4f6', hex: '#f3f4f6', class: 'bg-gray-100' },
      { name: 'Gray 200', value: '#e5e7eb', hex: '#e5e7eb', class: 'bg-gray-200' },
      { name: 'Gray 300', value: '#d1d5db', hex: '#d1d5db', class: 'bg-gray-300' },
      { name: 'Gray 400', value: '#9ca3af', hex: '#9ca3af', class: 'bg-gray-400' },
      { name: 'Gray 500', value: '#6b7280', hex: '#6b7280', class: 'bg-gray-500' },
      { name: 'Gray 600', value: '#4b5563', hex: '#4b5563', class: 'bg-gray-600' },
      { name: 'Gray 700', value: '#374151', hex: '#374151', class: 'bg-gray-700' },
      { name: 'Gray 800', value: '#1f2937', hex: '#1f2937', class: 'bg-gray-800' },
      { name: 'Gray 900', value: '#111827', hex: '#111827', class: 'bg-gray-900' }
    ],
    semantic: [
      { name: 'Green', value: '#10b981', hex: '#10b981', class: 'bg-green-500' },
      { name: 'Yellow', value: '#f59e0b', hex: '#f59e0b', class: 'bg-yellow-500' },
      { name: 'Red', value: '#ef4444', hex: '#ef4444', class: 'bg-red-500' },
      { name: 'Purple', value: '#8b5cf6', hex: '#8b5cf6', class: 'bg-purple-500' },
      { name: 'Pink', value: '#ec4899', hex: '#ec4899', class: 'bg-pink-500' },
      { name: 'Indigo', value: '#6366f1', hex: '#6366f1', class: 'bg-indigo-500' }
    ]
  };

  // Tailwind Spacing Scale
  spacing = [
    { name: '0', value: '0px', class: 'p-0' },
    { name: 'px', value: '1px', class: 'p-px' },
    { name: '0.5', value: '0.125rem', class: 'p-0.5' },
    { name: '1', value: '0.25rem', class: 'p-1' },
    { name: '1.5', value: '0.375rem', class: 'p-1.5' },
    { name: '2', value: '0.5rem', class: 'p-2' },
    { name: '2.5', value: '0.625rem', class: 'p-2.5' },
    { name: '3', value: '0.75rem', class: 'p-3' },
    { name: '3.5', value: '0.875rem', class: 'p-3.5' },
    { name: '4', value: '1rem', class: 'p-4' },
    { name: '5', value: '1.25rem', class: 'p-5' },
    { name: '6', value: '1.5rem', class: 'p-6' },
    { name: '7', value: '1.75rem', class: 'p-7' },
    { name: '8', value: '2rem', class: 'p-8' },
    { name: '9', value: '2.25rem', class: 'p-9' },
    { name: '10', value: '2.5rem', class: 'p-10' },
    { name: '11', value: '2.75rem', class: 'p-11' },
    { name: '12', value: '3rem', class: 'p-12' },
    { name: '14', value: '3.5rem', class: 'p-14' },
    { name: '16', value: '4rem', class: 'p-16' },
    { name: '20', value: '5rem', class: 'p-20' },
    { name: '24', value: '6rem', class: 'p-24' },
    { name: '28', value: '7rem', class: 'p-28' },
    { name: '32', value: '8rem', class: 'p-32' }
  ];

  // Tailwind Border Radius Scale
  borderRadius = [
    { name: 'None', value: '0px', class: 'rounded-none' },
    { name: 'SM', value: '0.125rem', class: 'rounded-sm' },
    { name: 'DEFAULT', value: '0.25rem', class: 'rounded' },
    { name: 'MD', value: '0.375rem', class: 'rounded-md' },
    { name: 'LG', value: '0.5rem', class: 'rounded-lg' },
    { name: 'XL', value: '0.75rem', class: 'rounded-xl' },
    { name: '2XL', value: '1rem', class: 'rounded-2xl' },
    { name: '3XL', value: '1.5rem', class: 'rounded-3xl' },
    { name: 'Full', value: '9999px', class: 'rounded-full' }
  ];

  // Tailwind Shadow Scale
  shadows = [
    { name: 'None', class: 'shadow-none' },
    { name: 'SM', class: 'shadow-sm' },
    { name: 'DEFAULT', class: 'shadow' },
    { name: 'MD', class: 'shadow-md' },
    { name: 'LG', class: 'shadow-lg' },
    { name: 'XL', class: 'shadow-xl' },
    { name: '2XL', class: 'shadow-2xl' },
    { name: 'Inner', class: 'shadow-inner' }
  ];

  // Tailwind Font Sizes
  fontSizes = [
    { name: 'xs', value: '0.75rem', class: 'text-xs' },
    { name: 'sm', value: '0.875rem', class: 'text-sm' },
    { name: 'base', value: '1rem', class: 'text-base' },
    { name: 'lg', value: '1.125rem', class: 'text-lg' },
    { name: 'xl', value: '1.25rem', class: 'text-xl' },
    { name: '2xl', value: '1.5rem', class: 'text-2xl' },
    { name: '3xl', value: '1.875rem', class: 'text-3xl' },
    { name: '4xl', value: '2.25rem', class: 'text-4xl' },
    { name: '5xl', value: '3rem', class: 'text-5xl' },
    { name: '6xl', value: '3.75rem', class: 'text-6xl' },
    { name: '7xl', value: '4.5rem', class: 'text-7xl' },
    { name: '8xl', value: '6rem', class: 'text-8xl' },
    { name: '9xl', value: '8rem', class: 'text-9xl' }
  ];

  // Tailwind Font Weights
  fontWeights = [
    { name: 'Thin', value: '100', class: 'font-thin' },
    { name: 'Extralight', value: '200', class: 'font-extralight' },
    { name: 'Light', value: '300', class: 'font-light' },
    { name: 'Normal', value: '400', class: 'font-normal' },
    { name: 'Medium', value: '500', class: 'font-medium' },
    { name: 'Semibold', value: '600', class: 'font-semibold' },
    { name: 'Bold', value: '700', class: 'font-bold' },
    { name: 'Extrabold', value: '800', class: 'font-extrabold' },
    { name: 'Black', value: '900', class: 'font-black' }
  ];

  // Tailwind Breakpoints
  breakpoints = [
    { name: 'sm', value: '640px', class: 'sm:' },
    { name: 'md', value: '768px', class: 'md:' },
    { name: 'lg', value: '1024px', class: 'lg:' },
    { name: 'xl', value: '1280px', class: 'xl:' },
    { name: '2xl', value: '1536px', class: '2xl:' }
  ];

  // Typography scale
  typography = [
    { name: 'Heading 1', class: 'text-4xl font-bold', example: 'The quick brown fox' },
    { name: 'Heading 2', class: 'text-3xl font-bold', example: 'The quick brown fox' },
    { name: 'Heading 3', class: 'text-2xl font-semibold', example: 'The quick brown fox' },
    { name: 'Heading 4', class: 'text-xl font-semibold', example: 'The quick brown fox' },
    { name: 'Heading 5', class: 'text-lg font-medium', example: 'The quick brown fox' },
    { name: 'Heading 6', class: 'text-base font-medium', example: 'The quick brown fox' },
    { name: 'Body Large', class: 'text-lg', example: 'The quick brown fox jumps over the lazy dog' },
    { name: 'Body', class: 'text-base', example: 'The quick brown fox jumps over the lazy dog' },
    { name: 'Body Small', class: 'text-sm', example: 'The quick brown fox jumps over the lazy dog' },
    { name: 'Caption', class: 'text-xs text-gray-500', example: 'The quick brown fox jumps over the lazy dog' }
  ];



  onButtonClick() {
    alert('Button clicked!');
  }

  onToggleChange() {
  }

  onSelectChange() {
  }

  onInputChange() {
  }
}
