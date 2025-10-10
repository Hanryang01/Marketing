import React from 'react';

const DatePicker = ({ 
  isOpen, 
  onClose, 
  onDateSelect, 
  selectedDate, 
  type, // 'start' | 'end'
  calendarPosition,
  showStartDatePicker,
  showEndDatePicker,
  setShowStartDatePicker,
  setShowEndDatePicker,
  handleOpenCalendar,
  handleDateSelect,
  handleMonthChange,
  getCurrentMonthYear,
  getCalendarDays,
  goToToday,
  editedUser,
  user
}) => {
  if (!isOpen) return null;

  const currentDate = type === 'start' ? (editedUser?.startDate || user?.startDate) : (editedUser?.endDate || user?.endDate);

  return (
    <div className="date-picker-overlay" onClick={onClose}>
      <div 
        className="date-picker" 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: `${calendarPosition.top}px`,
          left: `${calendarPosition.left}px`,
          zIndex: 9999
        }}
      >
        <div className="date-picker-header">
          <button className="today-button" onClick={() => goToToday(type)}>오늘</button>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="date-picker-body">
          <div className="calendar-grid">
            <div className="calendar-header">
              <button onClick={() => handleMonthChange(type, -1)}>&lt;</button>
              <span>{getCurrentMonthYear(type)}</span>
              <button onClick={() => handleMonthChange(type, 1)}>&gt;</button>
            </div>
            <div className="calendar-weekdays">
              <div>일</div>
              <div>월</div>
              <div>화</div>
              <div>수</div>
              <div>목</div>
              <div>금</div>
              <div>토</div>
            </div>
            <div className="calendar-days">
              {getCalendarDays(type, currentDate).map((day, index) => (
                <div
                  key={index}
                  className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                  onClick={() => day.isCurrentMonth && handleDateSelect(day.date, type, onDateSelect)}
                >
                  {day.day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
