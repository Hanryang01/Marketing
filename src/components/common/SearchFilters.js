import React from 'react';
import './SearchFilters.css';

const SearchFilters = ({ filters, onFilterChange, fields }) => {
  return (
    <div className="search-filters">
      {fields.map(field => (
        <div key={field.name} className="filter-group">
          <input
            type="text"
            placeholder={field.placeholder}
            value={filters[field.name] || ''}
            onChange={(e) => onFilterChange(field.name, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
};

export default SearchFilters;
